import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { AppDatabase } from './db/database.js';
import { MockLiaraClient } from '@copilot/liara-client';
import { MockScriptedLLM } from '@copilot/agent';
import { MonitorScheduler } from './monitor/scheduler.js';
import { EventBus } from './events/bus.js';
import { computeArgsHash } from './approvals/hash.js';

describe('Fastify Server Integration Tests', () => {
  let app: FastifyInstance;
  let db: AppDatabase;
  let client: MockLiaraClient;
  let llm: MockScriptedLLM;
  let bus: EventBus;

  beforeEach(() => {
    db = new AppDatabase(':memory:');
    client = new MockLiaraClient('missing_env_500');
    llm = new MockScriptedLLM('missing_env_500');
    bus = new EventBus();

    app = buildApp({
      config: {
        LIARA_MODE: 'mock',
        LLM_MODE: 'mock',
        LIARA_API_BASE_URL: 'https://api.iran.liara.ir',
        LIARA_APP_ALLOWLIST: [],
        LLM_MODEL: 'gpt-4o-mini',
        LLM_NATIVE_TOOLS: true,
        PORT: 3001,
        DATA_DIR: './data',
        APP_PASSCODE: 'secret-passcode-123',
        SESSION_SECRET: 'test-session-secret-key-must-be-long!',
        APPROVAL_TTL_SECONDS: 300,
        MONITOR_INTERVAL_SECONDS: 60,
        WEB_ORIGIN: 'http://localhost:3000',
      },
      db,
      client,
      llm,
      bus,
    });
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('GET /healthz returns 200 with mode', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.mode.liara).toBe('mock');
  });

  it('Auth: login, session cookies, rate-limit, and protected route access', async () => {
    // 1. Wrong passcode
    const failRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { passcode: 'wrong-pass' },
    });
    expect(failRes.statusCode).toBe(401);

    // 2. Correct passcode
    const successRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { passcode: 'secret-passcode-123' },
    });
    expect(successRes.statusCode).toBe(200);
    expect(successRes.headers['set-cookie']).toBeDefined();

    const cookies = successRes.cookies;
    const sessionCookie = cookies.find((c) => c.name === 'copilot_session');
    const csrfCookie = cookies.find((c) => c.name === 'copilot_csrf');
    expect(sessionCookie).toBeDefined();
    expect(csrfCookie).toBeDefined();

    // 3. Unauthenticated access to /api/apps fails
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/api/apps',
    });
    expect(unauthRes.statusCode).toBe(401);

    // 4. Authenticated access to /api/apps succeeds
    const authRes = await app.inject({
      method: 'GET',
      url: '/api/apps',
      cookies: {
        copilot_session: sessionCookie?.value || '',
      },
    });
    expect(authRes.statusCode).toBe(200);
    const apps = authRes.json();
    expect(Array.isArray(apps)).toBe(true);
  });

  it('POST /api/chat streams SSE events with mock LLM', async () => {
    // Login first
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { passcode: 'secret-passcode-123' },
    });
    const sessionCookie = loginRes.cookies.find((c) => c.name === 'copilot_session')?.value || '';
    const csrfToken = loginRes.cookies.find((c) => c.name === 'copilot_csrf')?.value || '';

    const chatRes = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers: {
        'x-csrf-token': csrfToken,
      },
      cookies: {
        copilot_session: sessionCookie,
        copilot_csrf: csrfToken,
      },
      payload: {
        conversationId: 'conv_test_1',
        message: 'چرا سایتم خطای ۵۰۰ می‌دهد؟',
      },
    });

    expect(chatRes.statusCode).toBe(200);
    expect(chatRes.headers['content-type']).toContain('text/event-stream');
    const body = chatRes.body;
    expect(body).toContain('event: message.delta');
    expect(body).toContain('event: tool.started');
  });

  it('Approvals flow end-to-end: propose, approve, execute, and replay protection', async () => {
    // Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { passcode: 'secret-passcode-123' },
    });
    const sessionCookie = loginRes.cookies.find((c) => c.name === 'copilot_session')?.value || '';
    const csrfToken = loginRes.cookies.find((c) => c.name === 'copilot_csrf')?.value || '';

    // Create a pending action in db
    db.approvalStore.savePendingAction({
      id: 'act_test_123',
      conversationId: 'c1',
      tool: 'restart_app',
      args: { app: 'demo-shop' },
      argsHash: computeArgsHash({ app: 'demo-shop' }),
      card: {
        title: 'ری‌استارت برنامه',
        summary: 'راه‌اندازی مجدد کانتینر',
        impact: ['قطعی ۱۰ ثانیه‌ای'],
        risk: 'high',
        details: [{ label: 'نام برنامه', value: 'demo-shop' }],
        capabilityVia: 'api',
      },
      risk: 'high',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
      status: 'pending',
    });

    // Approve the action
    const approveRes = await app.inject({
      method: 'POST',
      url: '/api/approvals/act_test_123/approve',
      headers: {
        'x-csrf-token': csrfToken,
      },
      cookies: {
        copilot_session: sessionCookie,
        copilot_csrf: csrfToken,
      },
    });

    expect(approveRes.statusCode).toBe(200);
    const body = approveRes.json();
    expect(body.ok).toBe(true);

    // Replay attempt should be rejected with 400
    const replayRes = await app.inject({
      method: 'POST',
      url: '/api/approvals/act_test_123/approve',
      headers: {
        'x-csrf-token': csrfToken,
      },
      cookies: {
        copilot_session: sessionCookie,
        copilot_csrf: csrfToken,
      },
    });
    expect(replayRes.statusCode).toBe(400);
  });

  it('Monitor scheduler raises and dedupes an alert on memory_leak_oom', async () => {
    const oomClient = new MockLiaraClient('memory_leak_oom');
    const monitor = new MonitorScheduler({
      client: oomClient,
      db,
      bus,
    });

    // 1. Run check cycle -> should create alert
    const firstAlerts = await monitor.checkApp('demo-shop');
    expect(firstAlerts.length).toBeGreaterThan(0);
    expect(firstAlerts[0]?.severity).toBe('critical');

    const dbAlerts = db.listAlerts();
    expect(dbAlerts.length).toBeGreaterThan(0);

    // 2. Run check cycle again -> should dedupe and not add duplicates
    const secondAlerts = await monitor.checkApp('demo-shop');
    expect(secondAlerts.length).toBe(0);

    const dbAlertsAfter = db.listAlerts();
    expect(dbAlertsAfter.length).toBe(dbAlerts.length);
  });
});
