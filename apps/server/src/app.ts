import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import type { ServerConfig } from './config.js';
import { getConfig } from './config.js';
import { AppDatabase } from './db/database.js';
import { defaultEventBus, EventBus } from './events/bus.js';
import { ApprovalGate } from './approvals/gate.js';
import { MonitorScheduler } from './monitor/scheduler.js';
import type { LiaraClient } from '@copilot/liara-client';
import { HttpLiaraClient, MockLiaraClient, LiaraCliDriver } from '@copilot/liara-client';
import { defaultToolRegistry, type ToolContext } from '@copilot/tools';
import {
  AgentLoop,
  MockScriptedLLM,
  OpenAILLMAdapter,
  type LLMAdapter,
  type LLMMessage,
} from '@copilot/agent';
import {
  checkRateLimit,
  generateCsrfToken,
  recordFailedAttempt,
  resetRateLimit,
  requireAuth,
  signSession,
  verifyPasscode,
  verifySession,
} from './auth.js';
import type { ServerEvent } from '@copilot/shared';

export interface AppServerOptions {
  config?: ServerConfig;
  db?: AppDatabase;
  client?: LiaraClient;
  llm?: LLMAdapter;
  bus?: EventBus;
}

export function buildApp(options: AppServerOptions = {}): FastifyInstance {
  const config = options.config || getConfig();
  const db = options.db || new AppDatabase(`${config.DATA_DIR}/copilot.sqlite`);
  const bus = options.bus || defaultEventBus;

  // Initialize LiaraClient (Mock or Live)
  let client: LiaraClient;
  if (options.client) {
    client = options.client;
  } else if (config.LIARA_MODE === 'live' && config.LIARA_API_TOKEN) {
    client = new HttpLiaraClient({
      apiToken: config.LIARA_API_TOKEN,
      baseURL: config.LIARA_API_BASE_URL,
      teamId: config.LIARA_TEAM_ID,
    });
  } else {
    client = new MockLiaraClient('missing_env_500');
  }

  // Initialize LLM (Mock or Live)
  let llm: LLMAdapter;
  if (options.llm) {
    llm = options.llm;
  } else if (config.LLM_MODE === 'live' && config.LLM_API_KEY) {
    llm = new OpenAILLMAdapter({
      apiKey: config.LLM_API_KEY,
      baseURL: config.LLM_BASE_URL,
      model: config.LLM_MODEL,
      nativeTools: config.LLM_NATIVE_TOOLS,
    });
  } else {
    llm = new MockScriptedLLM('missing_env_500');
  }

  const cliDriver = new LiaraCliDriver({
    apiToken: config.LIARA_API_TOKEN,
    teamId: config.LIARA_TEAM_ID,
  });

  const gate = new ApprovalGate({
    store: db.approvalStore,
    ttlSeconds: config.APPROVAL_TTL_SECONDS,
  });

  const monitor = new MonitorScheduler({
    client,
    db,
    bus,
    intervalSeconds: config.MONITOR_INTERVAL_SECONDS,
    allowlist: config.LIARA_APP_ALLOWLIST,
  });

  const app = Fastify({
    logger: false,
  });

  app.decorate('config', config);

  // Plugins
  app.register(cookie, {
    secret: config.SESSION_SECRET,
  });

  app.register(cors, {
    origin: [config.WEB_ORIGIN, 'http://localhost:3000'],
    credentials: true,
  });

  // 1. Healthz
  app.get('/healthz', async () => {
    return {
      ok: true,
      mode: {
        liara: config.LIARA_MODE,
        llm: config.LLM_MODE,
      },
    };
  });

  // 2. Config status
  app.get('/api/config/status', async () => {
    const capsRes = await client.getCapabilities();
    return {
      liaraMode: config.LIARA_MODE,
      llmMode: config.LLM_MODE,
      hasLiaraToken: !!config.LIARA_API_TOKEN,
      hasLlmKey: !!config.LLM_API_KEY,
      allowlist: config.LIARA_APP_ALLOWLIST,
      capabilitiesCount: capsRes.ok ? capsRes.data.length : 0,
    };
  });

  // 3. Auth routes
  app.post('/api/auth/login', async (req, reply) => {
    const ip = req.ip;
    if (!checkRateLimit(ip)) {
      return reply.status(429).send({
        ok: false,
        error: 'Too many failed login attempts. Please wait 1 minute.',
      });
    }

    const body = (req.body as { passcode?: string }) || {};
    if (!body.passcode || !verifyPasscode(body.passcode, config.APP_PASSCODE)) {
      recordFailedAttempt(ip);
      return reply.status(401).send({ ok: false, error: 'رمز عبور وارد شده نادرست است' });
    }

    resetRateLimit(ip);
    const sessionId = randomUUID();
    const sessionCookieValue = signSession(sessionId, config.SESSION_SECRET);
    const csrfToken = generateCsrfToken();

    reply.setCookie('copilot_session', sessionCookieValue, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    reply.setCookie('copilot_csrf', csrfToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });

    return { ok: true, csrfToken };
  });

  app.get('/api/auth/me', async (req) => {
    const cookieVal = req.cookies['copilot_session'];
    if (!cookieVal) return { authenticated: false };
    const valid = verifySession(cookieVal, config.SESSION_SECRET);
    return { authenticated: !!valid };
  });

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.clearCookie('copilot_session', { path: '/' });
    reply.clearCookie('copilot_csrf', { path: '/' });
    return { ok: true };
  });

  // 4. Apps & Dashboard route (cached 15s)
  let cachedApps: { data: unknown; ts: number } | null = null;
  app.get('/api/apps', { preHandler: requireAuth }, async () => {
    const now = Date.now();
    if (cachedApps && now - cachedApps.ts < 15000) {
      return cachedApps.data;
    }
    const res = await client.listApps();
    const data = res.ok ? res.data : [];
    cachedApps = { data, ts: now };
    return data;
  });

  app.get('/api/apps/:name', { preHandler: requireAuth }, async (req, reply) => {
    const params = req.params as { name: string };
    const res = await client.getApp(params.name);
    if (!res.ok) {
      return reply.status(404).send({ ok: false, error: res.message });
    }
    return res.data;
  });

  // 5. Capabilities matrix
  app.get('/api/capabilities', async () => {
    const res = await client.getCapabilities();
    return res.ok ? res.data : [];
  });

  // 6. Conversations routes
  app.get('/api/conversations', { preHandler: requireAuth }, async () => {
    return db.listConversations();
  });

  app.post('/api/conversations', { preHandler: requireAuth }, async (req) => {
    const body = (req.body as { title?: string }) || {};
    const id = `conv_${randomUUID()}`;
    return db.createConversation(id, body.title || 'گفتگوی جدید');
  });

  app.get('/api/conversations/:id/messages', { preHandler: requireAuth }, async (req) => {
    const params = req.params as { id: string };
    return db.getMessages(params.id);
  });

  // 7. Chat SSE route
  app.post('/api/chat', { preHandler: requireAuth }, async (req, reply) => {
    const body = (req.body as { conversationId: string; message: string }) || {};
    if (!body.conversationId || !body.message) {
      return reply
        .status(400)
        .send({ ok: false, error: 'conversationId and message are required' });
    }

    // Set unbuffered SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');

    const conversationId = body.conversationId;
    let conv = db.getConversation(conversationId);
    if (!conv) {
      conv = db.createConversation(conversationId);
    }

    // Save user message
    const userMsg: LLMMessage = { role: 'user', content: body.message };
    db.saveMessage(conversationId, userMsg);

    const history = db.getMessages(conversationId);
    const traceId = `tr_${randomUUID()}`;

    const toolContext: ToolContext = {
      client,
      cliDriver,
      traceId,
      conversationId,
      appNameAllowlist: config.LIARA_APP_ALLOWLIST,
    };

    const sendSseEvent = (event: ServerEvent) => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    };

    const loop = new AgentLoop({
      llm,
      context: toolContext,
      conversationId,
      onEvent: (event) => {
        bus.emitEvent(event);
        sendSseEvent(event);
      },
      proposeApprovalFn: async (tool, args) => {
        return gate.propose({
          conversationId,
          tool,
          args,
          ctx: toolContext,
        });
      },
      approveActionFn: async (actionId) => {
        const res = await gate.approve(actionId, async (toolName, args) => {
          return defaultToolRegistry.executeTool(toolName, args, toolContext);
        });
        if (!res.ok) throw new Error(res.message);
        return res.data;
      },
    });

    try {
      const loopResult = await loop.run(history);
      // Save newly added messages (assistant, tool) to SQLite
      for (let i = history.length; i < loopResult.messages.length; i++) {
        const newMsg = loopResult.messages[i];
        if (newMsg) {
          db.saveMessage(conversationId, newMsg);
        }
      }
    } catch (e: unknown) {
      sendSseEvent({
        type: 'error',
        conversationId,
        code: 'EXECUTION_ERROR',
        message: e instanceof Error ? e.message : 'Unknown execution error',
      });
    } finally {
      reply.raw.end();
    }
  });

  // 8. Approvals routes
  app.get('/api/approvals/:id', { preHandler: requireAuth }, async (req, reply) => {
    const params = req.params as { id: string };
    const action = db.approvalStore.getPendingAction(params.id);
    if (!action) {
      return reply.status(404).send({ ok: false, error: 'Approval action not found' });
    }
    return action;
  });

  app.post('/api/approvals/:id/approve', { preHandler: requireAuth }, async (req, reply) => {
    const params = req.params as { id: string };
    const toolContext: ToolContext = {
      client,
      cliDriver,
      traceId: `tr_appr_${Date.now()}`,
    };

    const startTime = Date.now();
    const res = await gate.approve(
      params.id,
      async (toolName, args) => {
        return defaultToolRegistry.executeTool(toolName, args, toolContext);
      },
      { actor: 'user' },
    );

    if (!res.ok) {
      return reply.status(400).send({ ok: false, code: res.code, error: res.message });
    }

    const durationMs = Date.now() - startTime;

    bus.emitEvent({
      type: 'approval.resolved',
      conversationId: res.data.action.conversationId,
      actionId: res.data.action.id,
      status: 'approved',
      resolvedAt: Date.now(),
    });

    bus.emitEvent({
      type: 'timeline.step',
      conversationId: res.data.action.conversationId,
      step: {
        id: `step_${res.data.action.id}`,
        title: `تکمیل اجرای تأییدشده: ${res.data.action.tool}`,
        tool: res.data.action.tool,
        status: 'completed',
        source: 'liara-api',
        durationMs,
        timestamp: Date.now(),
      },
    });

    return { ok: true, action: res.data.action, result: res.data.result };
  });

  app.post('/api/approvals/:id/reject', { preHandler: requireAuth }, async (req, reply) => {
    const params = req.params as { id: string };
    const res = await gate.reject(params.id, { actor: 'user' });
    if (!res.ok) {
      return reply.status(400).send({ ok: false, code: res.code, error: res.message });
    }

    bus.emitEvent({
      type: 'approval.resolved',
      conversationId: res.data.conversationId,
      actionId: res.data.id,
      status: 'rejected',
      resolvedAt: Date.now(),
    });

    bus.emitEvent({
      type: 'timeline.step',
      conversationId: res.data.conversationId,
      step: {
        id: `step_${res.data.id}`,
        title: `لغو درخواست: ${res.data.tool}`,
        tool: res.data.tool,
        status: 'cancelled',
        source: 'system',
        timestamp: Date.now(),
      },
    });

    return { ok: true, action: res.data };
  });

  // 9. Audit routes
  app.get('/api/audit', { preHandler: requireAuth }, async (req) => {
    const query = (req.query as { limit?: string; export?: string }) || {};
    const limit = query.limit ? parseInt(query.limit, 10) : 100;
    const logs = db.approvalStore.getAuditLogs(limit);
    return logs;
  });

  // 10. Alerts route
  app.get('/api/alerts', { preHandler: requireAuth }, async () => {
    return db.listAlerts(50);
  });

  app.post('/api/alerts/:id/resolve', { preHandler: requireAuth }, async (req) => {
    const params = req.params as { id: string };
    db.resolveAlert(params.id);
    return { ok: true };
  });

  app.delete('/api/alerts/:id', { preHandler: requireAuth }, async (req) => {
    const params = req.params as { id: string };
    db.deleteAlert(params.id);
    return { ok: true };
  });

  app.post('/api/alerts/clear-resolved', { preHandler: requireAuth }, async () => {
    db.clearResolvedAlerts();
    return { ok: true };
  });

  app.post('/api/alerts/clear', { preHandler: requireAuth }, async () => {
    db.clearAlerts();
    return { ok: true };
  });

  // Helper method on Fastify instance to access monitor / db in tests
  (app as unknown as Record<string, unknown>)['monitor'] = monitor;
  (app as unknown as Record<string, unknown>)['db'] = db;
  (app as unknown as Record<string, unknown>)['client'] = client;

  return app;
}
