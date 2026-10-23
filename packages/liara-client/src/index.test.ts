import { describe, it, expect } from 'vitest';
import { MockLiaraClient } from './mock/index.js';
import { ControllableClock } from './mock/clock.js';
import { LiaraCliDriver } from './cli-driver.js';
import { HttpLiaraClient } from './http-client.js';

describe('LiaraClient & Mock Simulator', () => {
  it('handles scenario missing_env_500 state transitions', async () => {
    const clock = new ControllableClock(1000000);
    const mock = new MockLiaraClient('missing_env_500', clock);

    // Initial state: 500 status and missing env in logs
    const initialProbe = mock.getMockHttp('demo-shop');
    expect(initialProbe.status).toBe(500);

    const logs = await mock.getLogs('demo-shop');
    expect(logs.ok).toBe(true);
    if (logs.ok) {
      expect(logs.data.some((l) => l.message.includes('Missing required env DATABASE_URL'))).toBe(
        true,
      );
    }

    // Fix: set DATABASE_URL and restart
    await mock.setEnv('demo-shop', {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/shop',
    });

    // Before restart, still 500
    expect(mock.getMockHttp('demo-shop').status).toBe(500);

    // After restart: status becomes 200
    const restartRes = await mock.restartApp('demo-shop');
    expect(restartRes.ok).toBe(true);
    expect(mock.getMockHttp('demo-shop').status).toBe(200);
  });

  it('handles scenario memory_leak_oom plan upgrade', async () => {
    const clock = new ControllableClock(1000000);
    const mock = new MockLiaraClient('memory_leak_oom', clock);

    // Initial state: 504 status, high memory
    expect(mock.getMockHttp('demo-shop').status).toBe(504);
    const metricsBefore = await mock.getMetrics('demo-shop');
    expect(metricsBefore.ok).toBe(true);
    if (metricsBefore.ok) {
      const last = metricsBefore.data[metricsBefore.data.length - 1];
      expect(last?.memoryPercent).toBeGreaterThan(90);
    }

    // Fix: change plan to standard-2g
    const changeRes = await mock.changePlan('demo-shop', 'standard-2g');
    expect(changeRes.ok).toBe(true);

    // After fix: 200 status, lower memory percent
    expect(mock.getMockHttp('demo-shop').status).toBe(200);
    const metricsAfter = await mock.getMetrics('demo-shop');
    if (metricsAfter.ok) {
      const last = metricsAfter.data[metricsAfter.data.length - 1];
      expect(last?.memoryPercent).toBeLessThan(50);
    }
  });

  it('handles scenario wrong_port port configuration', async () => {
    const mock = new MockLiaraClient('wrong_port');
    expect(mock.getMockHttp('demo-shop').status).toBe(502);

    await mock.setEnv('demo-shop', { PORT: '3000' });
    await mock.restartApp('demo-shop');
    expect(mock.getMockHttp('demo-shop').status).toBe(200);
  });

  it('handles scenario fresh_project create and deploy', async () => {
    const mock = new MockLiaraClient('fresh_project');
    const appsListBefore = await mock.listApps();
    expect(appsListBefore.ok).toBe(true);
    if (appsListBefore.ok) {
      expect(appsListBefore.data.length).toBe(0);
    }

    const createRes = await mock.createApp({ name: 'my-new-site', platform: 'node' });
    expect(createRes.ok).toBe(true);

    const deployRes = await mock.deploy('my-new-site', {});
    expect(deployRes.ok).toBe(true);
    expect(mock.getMockHttp('my-new-site').status).toBe(200);
  });
});

describe('LiaraCliDriver', () => {
  it('runs echo command and redacts token', async () => {
    const secret = 'super-secret-token-xyz';
    const driver = new LiaraCliDriver({
      binaryPath: 'node',
      apiToken: secret,
    });

    const lines: string[] = [];
    const res = await driver.run({
      args: ['-e', 'console.log("Token: " + process.argv.slice(1).join(" "))', '--'],
      onLine: (line) => lines.push(line),
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.stdout).not.toContain(secret);
      expect(res.data.stdout).toContain('‹redacted-token›');
    }
    expect(lines.some((l) => l.includes('‹redacted-token›'))).toBe(true);
  });

  it('handles process abort signal', async () => {
    const driver = new LiaraCliDriver({ binaryPath: 'node' });
    const controller = new AbortController();
    controller.abort();

    const res = await driver.run({
      args: ['-e', 'setTimeout(()=>{}, 5000)'],
      signal: controller.signal,
    });

    expect(res.ok).toBe(false);
  });
});

describe('HttpLiaraClient Error Normalization', () => {
  it('normalizes network and status errors appropriately', async () => {
    // Pointing to an invalid localhost port should produce connection error or timeout
    const client = new HttpLiaraClient({
      apiToken: 'fake-token',
      baseURL: 'http://127.0.0.1:59999',
      timeoutMs: 300,
      maxRetries: 0,
    });

    const res = await client.listApps();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(['LIARA_ERROR', 'TIMEOUT']).toContain(res.code);
    }
  });
});
