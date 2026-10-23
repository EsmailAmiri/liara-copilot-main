import { describe, it, expect } from 'vitest';
import { defaultToolRegistry, classifyToolRisk, type ToolContext } from '@copilot/tools';
import { MockLiaraClient } from '@copilot/liara-client';

describe('MCP Tools and Risk Gate', () => {
  const client = new MockLiaraClient('missing_env_500');
  const ctx: ToolContext = {
    client,
    traceId: 'mcp_test_tr',
  };

  it('lists default tools with correct risk classifications', () => {
    const tools = defaultToolRegistry.getAll();
    expect(tools.length).toBeGreaterThanOrEqual(15);

    const listApps = defaultToolRegistry.get('list_apps')!;
    expect(classifyToolRisk(listApps, {}, ctx)).toBe('read');

    const restartApp = defaultToolRegistry.get('restart_app')!;
    expect(classifyToolRisk(restartApp, { app: 'demo-shop' }, ctx)).toBe('high');
  });

  it('returns APPROVAL_REQUIRED when high-risk tool is invoked without confirmation', async () => {
    const tool = defaultToolRegistry.get('restart_app')!;
    const risk = classifyToolRisk(tool, { app: 'demo-shop' }, ctx);
    expect(risk).toBe('high');

    const args: Record<string, unknown> = { app: 'demo-shop' };
    const isConfirmed = args['confirmed'] === true;
    expect(isConfirmed).toBe(false);

    // Gate logic:
    const blockedResponse = {
      ok: false,
      code: 'APPROVAL_REQUIRED',
      card: tool.describe ? tool.describe(args as never, ctx) : null,
    };

    expect(blockedResponse.code).toBe('APPROVAL_REQUIRED');
    expect(blockedResponse.card?.title).toBe('ری‌استارت برنامه');
  });

  it('executes high-risk tool successfully when confirmed: true', async () => {
    const res = await defaultToolRegistry.executeTool('restart_app', { app: 'demo-shop' }, ctx);
    expect(res.ok).toBe(true);
  });
});
