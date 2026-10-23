import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalStore } from './store.js';
import { ApprovalGate } from './gate.js';
import { defaultToolRegistry, type ToolContext } from '@copilot/tools';
import { MockLiaraClient } from '@copilot/liara-client';
import { ok } from '@copilot/shared';

describe('ApprovalGate', () => {
  let store: ApprovalStore;
  let gate: ApprovalGate;
  let ctx: ToolContext;

  beforeEach(() => {
    store = new ApprovalStore(':memory:');
    gate = new ApprovalGate({ store, ttlSeconds: 2 }); // 2-second TTL for fast expiry testing
    ctx = {
      client: new MockLiaraClient('healthy'),
      traceId: 'tr_test',
    };
  });

  it('creates pending action with describe card and audit entry', async () => {
    const tool = defaultToolRegistry.get('restart_app')!;
    const action = await gate.propose({
      conversationId: 'c1',
      tool,
      args: { app: 'demo-shop' },
      ctx,
    });

    expect(action.status).toBe('pending');
    expect(action.risk).toBe('high');
    expect(action.card.title).toBe('ری‌استارت برنامه');

    const retrieved = store.getPendingAction(action.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.tool).toBe('restart_app');

    const audit = store.getAuditLogs();
    expect(audit.length).toBeGreaterThan(0);
    expect(audit[0]?.action).toBe('propose_action');
  });

  it('successfully approves and executes tool', async () => {
    const tool = defaultToolRegistry.get('restart_app')!;
    const action = await gate.propose({
      conversationId: 'c1',
      tool,
      args: { app: 'demo-shop' },
      ctx,
    });

    let executed = false;
    const res = await gate.approve(action.id, async (toolName, args) => {
      expect(toolName).toBe('restart_app');
      expect(args.app).toBe('demo-shop');
      executed = true;
      return ok({ restarted: true });
    });

    expect(res.ok).toBe(true);
    expect(executed).toBe(true);

    const updated = store.getPendingAction(action.id);
    expect(updated?.status).toBe('executed');
  });

  it('prevents replay (single-use)', async () => {
    const tool = defaultToolRegistry.get('restart_app')!;
    const action = await gate.propose({
      conversationId: 'c1',
      tool,
      args: { app: 'demo-shop' },
      ctx,
    });

    // First approval
    const first = await gate.approve(action.id, async () => ok({}));
    expect(first.ok).toBe(true);

    // Replay attempt
    const replay = await gate.approve(action.id, async () => ok({}));
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(replay.code).toBe('NOT_ALLOWED');
    }
  });

  it('enforces expiration TTL', async () => {
    const tool = defaultToolRegistry.get('restart_app')!;
    const action = await gate.propose({
      conversationId: 'c1',
      tool,
      args: { app: 'demo-shop' },
      ctx,
    });

    // Wait past the 2-second TTL
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const res = await gate.approve(action.id, async () => ok({}));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('NOT_ALLOWED');
      expect(res.message).toContain('expired');
    }

    const updated = store.getPendingAction(action.id);
    expect(updated?.status).toBe('expired');
  });

  it('prevents cross-conversation approval', async () => {
    const tool = defaultToolRegistry.get('restart_app')!;
    const action = await gate.propose({
      conversationId: 'conv-A',
      tool,
      args: { app: 'demo-shop' },
      ctx,
    });

    const res = await gate.approve(action.id, async () => ok({}), { conversationId: 'conv-B' });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('FORBIDDEN');
    }
  });

  it('detects tampering with stored arguments', async () => {
    const tool = defaultToolRegistry.get('restart_app')!;
    const action = await gate.propose({
      conversationId: 'c1',
      tool,
      args: { app: 'demo-shop' },
      ctx,
    });

    // Tamper with the database row directly
    store
      .getDbForTesting()
      .prepare('UPDATE pending_actions SET args_json = ? WHERE id = ?')
      .run(JSON.stringify({ app: 'malicious-hacked-app' }), action.id);

    const res = await gate.approve(action.id, async () => ok({}));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('NOT_ALLOWED');
      expect(res.message).toContain('Tamper detected');
    }
  });

  it('supports rejection', async () => {
    const tool = defaultToolRegistry.get('restart_app')!;
    const action = await gate.propose({
      conversationId: 'c1',
      tool,
      args: { app: 'demo-shop' },
      ctx,
    });

    const res = await gate.reject(action.id);
    expect(res.ok).toBe(true);

    const updated = store.getPendingAction(action.id);
    expect(updated?.status).toBe('rejected');

    // Cannot approve rejected action
    const approveRes = await gate.approve(action.id, async () => ok({}));
    expect(approveRes.ok).toBe(false);
  });
});
