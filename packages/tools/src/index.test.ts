import { describe, it, expect } from 'vitest';
import { redact, redactString, redactEnvVars } from './redact.js';
import { classifyToolRisk } from './risk-policy.js';
import { defaultToolRegistry, ToolRegistry } from './registry.js';
import { MockLiaraClient } from '@copilot/liara-client';
import type { ToolContext } from './context.js';
import { ok } from '@copilot/shared';

describe('redact tests', () => {
  it('redacts tokens, URLs with credentials, passwords, and private keys', () => {
    const raw = `
      Connected to postgres://app_user:s3cr3t_pass@db.iran.liara.ir:5432/main_db
      Authorization: Bearer liara_api_token_1234567890abcdef
      --api-token=secret_cli_token_xyz
      password="my-super-secret-password"
      -----BEGIN RSA PRIVATE KEY-----
      MIIEowIBAAKCAQEA0Y1m3...fake...private...key...
      -----END RSA PRIVATE KEY-----
      Hash: 0123456789abcdef0123456789abcdef01234567
    `;

    const redacted = redactString(raw);
    expect(redacted).not.toContain('s3cr3t_pass');
    expect(redacted).not.toContain('liara_api_token_1234567890abcdef');
    expect(redacted).not.toContain('secret_cli_token_xyz');
    expect(redacted).not.toContain('my-super-secret-password');
    expect(redacted).not.toContain('-----BEGIN RSA PRIVATE KEY-----');
    expect(redacted).toContain('‹redacted›');
    expect(redacted).toContain('‹redacted-token›');
    expect(redacted).toContain('‹redacted-private-key›');
  });

  it('redacts env values except allowlisted keys', () => {
    const env = {
      NODE_ENV: 'production',
      PORT: '3000',
      TZ: 'Asia/Tehran',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgres://root:pass@localhost:5432/db',
      SECRET_KEY: 'jwt-very-secret',
    };

    const redacted = redactEnvVars(env);
    expect(redacted.NODE_ENV).toBe('production');
    expect(redacted.PORT).toBe('3000');
    expect(redacted.TZ).toBe('Asia/Tehran');
    expect(redacted.LOG_LEVEL).toBe('info');
    expect(redacted.DATABASE_URL).toBe('‹redacted›');
    expect(redacted.SECRET_KEY).toBe('‹redacted›');
  });

  it('deeply redacts nested structures and arrays', () => {
    const complex = {
      app: 'demo',
      logs: ['Error: connect postgres://user:secret@localhost:5432 failed', 'Normal log entry'],
      env: {
        DATABASE_URL: 'postgres://user:secret@localhost:5432',
        PORT: '3000',
      },
    };

    const cleaned = redact(complex);
    expect(cleaned.logs[0]).not.toContain('secret');
    expect(cleaned.env.DATABASE_URL).toBe('‹redacted›');
    expect(cleaned.env.PORT).toBe('3000');
  });
});

describe('risk policy & registry', () => {
  const dummyCtx: ToolContext = {
    client: new MockLiaraClient('healthy'),
    traceId: 'tr_test',
  };

  it('defaults unknown tools to high risk', () => {
    expect(classifyToolRisk(undefined, {}, dummyCtx)).toBe('high');
  });

  it('correctly classifies read, low, and high tools', () => {
    const listApps = defaultToolRegistry.get('list_apps');
    expect(classifyToolRisk(listApps, {}, dummyCtx)).toBe('read');

    const createApp = defaultToolRegistry.get('create_app');
    expect(classifyToolRisk(createApp, {}, dummyCtx)).toBe('low');

    const restartApp = defaultToolRegistry.get('restart_app');
    expect(classifyToolRisk(restartApp, {}, dummyCtx)).toBe('high');

    const deploy = defaultToolRegistry.get('deploy');
    expect(classifyToolRisk(deploy, {}, dummyCtx)).toBe('high');
  });

  it('enforces appNameAllowlist restriction', async () => {
    const registry = new ToolRegistry();
    const ctx: ToolContext = {
      client: new MockLiaraClient('healthy'),
      traceId: 'tr_1',
      appNameAllowlist: ['allowed-app'],
    };

    const res = await registry.executeTool('get_app', { app: 'forbidden-app' }, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('NOT_ALLOWED');
    }
  });

  it('returns NOT_SUPPORTED_BY_API when capability is unsupported', async () => {
    const registry = new ToolRegistry();
    const mockClient = new MockLiaraClient('healthy');
    // Mock capability returning unsupported for restart
    mockClient.getCapabilities = async () =>
      ok([
        {
          id: 'apps.restart',
          label: 'Restart',
          status: 'unsupported',
          via: 'none',
          notes: 'Restart not supported via REST',
        },
      ]);

    const ctx: ToolContext = {
      client: mockClient,
      traceId: 'tr_2',
    };

    const res = await registry.executeTool('restart_app', { app: 'demo-shop' }, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('NOT_SUPPORTED_BY_API');
      expect(res.hint).toContain('دستی');
    }
  });
});
