import type { ToolContext } from '@copilot/tools';
import type { EvidenceBundle, EvidenceItem } from '@copilot/shared';

export async function collectEvidenceBundle(
  appName: string,
  ctx: ToolContext,
  _windowMin = 15,
): Promise<EvidenceBundle> {
  const items: EvidenceItem[] = [];
  const gaps: string[] = [];
  let itemCounter = 1;

  const nextId = () => `E${itemCounter++}`;
  const now = new Date().toISOString();

  // Helper with per-source timeout
  async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    sourceName: string,
  ): Promise<T | null> {
    const timer = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    try {
      const res = await Promise.race([promise, timer]);
      if (res === null) {
        gaps.push(`${sourceName}: Timeout after ${timeoutMs}ms`);
      }
      return res;
    } catch (e: unknown) {
      gaps.push(`${sourceName}: ${e instanceof Error ? e.message : 'Error'}`);
      return null;
    }
  }

  // 1. Gather status, metrics, logs, env, releases in parallel
  const [appRes, metricsRes, logsRes, envRes, releasesRes] = await Promise.all([
    withTimeout(ctx.client.getApp(appName), 4000, 'app_details'),
    withTimeout(ctx.client.getMetrics(appName), 4000, 'metrics'),
    withTimeout(ctx.client.getLogs(appName, { limit: 100 }), 4000, 'logs'),
    withTimeout(ctx.client.listEnv(appName), 3000, 'env'),
    withTimeout(ctx.client.listReleases(appName), 3000, 'releases'),
  ]);

  // Process App Details
  let defaultDomain = '';
  if (appRes && appRes.ok) {
    const app = appRes.data;
    defaultDomain = app.defaultSubdomain || (app.domains && app.domains[0]) || '';
    items.push({
      id: nextId(),
      source: 'liara-api',
      kind: 'status',
      summary: `وضعیت برنامه: ${app.status} | پلتفرم: ${app.platform} | پلن: ${app.plan}`,
      excerpt: JSON.stringify({ status: app.status, plan: app.plan, port: app.port }),
      ts: app.updated_at || now,
      severity: app.status === 'running' ? 'info' : 'error',
    });
  } else if (appRes && !appRes.ok) {
    gaps.push(`app_details: ${appRes.message}`);
  }

  // Process Metrics
  if (metricsRes && metricsRes.ok) {
    const samples = metricsRes.data;
    if (samples.length > 0) {
      const latest = samples[samples.length - 1];
      const maxRam = Math.max(...samples.map((s) => s.memoryPercent));
      const maxCpu = Math.max(...samples.map((s) => s.cpuPercent));
      items.push({
        id: nextId(),
        source: 'liara-api',
        kind: 'metrics',
        summary: `مصرف رم فعلی: ${latest?.memoryPercent ?? 0}% (حداکثر ${maxRam}%) | مصرف پردازنده: ${latest?.cpuPercent ?? 0}% (حداکثر ${maxCpu}%)`,
        excerpt: JSON.stringify({
          latestMemoryPercent: latest?.memoryPercent,
          latestCpuPercent: latest?.cpuPercent,
          maxRamPercent: maxRam,
          maxCpuPercent: maxCpu,
        }),
        severity: maxRam > 85 ? 'error' : maxRam > 70 ? 'warning' : 'info',
      });
    }
  } else if (metricsRes && !metricsRes.ok) {
    gaps.push(`metrics: ${metricsRes.message}`);
  }

  // Process Logs
  if (logsRes && logsRes.ok) {
    const logs = logsRes.data;
    const errorLogs = logs.filter(
      (l) => l.level === 'error' || /error|exception|fail|fatal|oom|sigkill|crash/i.test(l.message),
    );

    if (errorLogs.length > 0) {
      const topErrors = errorLogs
        .slice(-5)
        .map((l) => l.message)
        .join('\n');
      items.push({
        id: nextId(),
        source: 'liara-api',
        kind: 'logs',
        summary: `یافتن ${errorLogs.length} لاگ خطا در بازه اخیر`,
        excerpt: topErrors,
        severity: 'error',
      });
    } else {
      items.push({
        id: nextId(),
        source: 'liara-api',
        kind: 'logs',
        summary: 'هیچ لاگ خطایی در گزارش‌های اخیر یافت نشد',
        severity: 'info',
      });
    }
  } else if (logsRes && !logsRes.ok) {
    gaps.push(`logs: ${logsRes.message}`);
  }

  // Process Env
  if (envRes && envRes.ok) {
    const envVars = envRes.data;
    const keys = envVars.map((e) => e.key);
    items.push({
      id: nextId(),
      source: 'liara-api',
      kind: 'env',
      summary: `تعداد ${keys.length} متغیر محیطی تنظیم شده: ${keys.join(', ')}`,
      excerpt: keys.join(', '),
      severity: 'info',
    });
  } else if (envRes && !envRes.ok) {
    gaps.push(`env: ${envRes.message}`);
  }

  // Process Releases
  if (releasesRes && releasesRes.ok) {
    const rels = releasesRes.data;
    if (rels.length > 0) {
      const latest = rels[0];
      items.push({
        id: nextId(),
        source: 'liara-api',
        kind: 'releases',
        summary: `آخرین استقرار: ${latest?.id} با وضعیت ${latest?.status}`,
        ts: latest?.createdAt,
        severity: latest?.status === 'ready' ? 'info' : 'warning',
      });
    }
  }

  // HTTP Probe
  if (defaultDomain) {
    const url = defaultDomain.startsWith('http') ? defaultDomain : `https://${defaultDomain}`;
    let httpResult: {
      status: number;
      latencyMs: number;
      bodySnippet: string;
      error?: string;
    } | null = null;

    if (ctx.httpProber) {
      httpResult = await withTimeout(ctx.httpProber(url), 5000, 'http_probe');
    } else if ('getMockHttp' in (ctx.client as unknown as Record<string, unknown>)) {
      const mockHttp = (
        ctx.client as unknown as {
          getMockHttp(app: string): { status: number; latencyMs: number; body: string };
        }
      ).getMockHttp(appName);
      httpResult = {
        status: mockHttp.status,
        latencyMs: mockHttp.latencyMs,
        bodySnippet: mockHttp.body.slice(0, 500),
      };
    }

    if (httpResult) {
      items.push({
        id: nextId(),
        source: 'http-probe',
        kind: 'http',
        summary: `پاسخ HTTP پروب: وضعیت ${httpResult.status} در ${httpResult.latencyMs} میلی‌ثانیه`,
        excerpt: httpResult.bodySnippet || httpResult.error,
        severity: httpResult.status >= 500 || httpResult.status === 0 ? 'error' : 'info',
      });
    }
  }

  return {
    appName,
    collectedAt: now,
    items,
    gaps,
  };
}
