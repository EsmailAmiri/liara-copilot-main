import type { VerificationResult, VerificationCheck, VerificationVerdict } from '@copilot/shared';
import type { ToolContext } from '@copilot/tools';

export interface VerifyFixOptions {
  appName: string;
  expectedStatus?: number;
  maxRetries?: number;
  retryIntervalMs?: number;
}

export async function verifyFix(
  options: VerifyFixOptions,
  ctx: ToolContext,
): Promise<VerificationResult> {
  const { appName, expectedStatus = 200, maxRetries = 3, retryIntervalMs = 500 } = options;

  const checks: VerificationCheck[] = [];
  let finalStatus = 0;
  let finalLatency = 0;
  let hasErrorInLogs = false;
  let currentRamPercent = 0;

  // Poll HTTP status and check logs/metrics
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 1. HTTP Probe
    let status = 0;
    let latencyMs = 0;

    if (ctx.httpProber) {
      const probe = await ctx.httpProber(`https://${appName}.iran.liara.run`);
      status = probe.status;
      latencyMs = probe.latencyMs;
    } else if ('getMockHttp' in (ctx.client as unknown as Record<string, unknown>)) {
      const mock = (
        ctx.client as unknown as { getMockHttp(app: string): { status: number; latencyMs: number } }
      ).getMockHttp(appName);
      status = mock.status;
      latencyMs = mock.latencyMs;
    }

    finalStatus = status;
    finalLatency = latencyMs;

    if (status === expectedStatus) {
      break;
    }

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, retryIntervalMs));
    }
  }

  // 2. Check Logs (focusing on post-restart/post-action entries)
  const logsRes = await ctx.client.getLogs(appName, { limit: 20 });
  if (logsRes.ok) {
    const logs = logsRes.data;
    let recentLogs = logs;
    for (let i = logs.length - 1; i >= 0; i--) {
      if (/restarting|container started|deploying/i.test(logs[i]?.message || '')) {
        recentLogs = logs.slice(i + 1);
        break;
      }
    }
    const errorLogs = recentLogs.filter(
      (l) => l.level === 'error' || /fatal|sigkill|crash/i.test(l.message),
    );
    hasErrorInLogs = errorLogs.length > 0;
  }

  // 3. Check Metrics
  const metricsRes = await ctx.client.getMetrics(appName);
  if (metricsRes.ok && metricsRes.data.length > 0) {
    const latest = metricsRes.data[metricsRes.data.length - 1];
    currentRamPercent = latest ? latest.memoryPercent : 0;
  }

  // Check 1: HTTP Response Check
  const httpPass = finalStatus === expectedStatus || (finalStatus >= 200 && finalStatus < 400);
  checks.push({
    name: 'بررسی پاسخ‌دهی HTTP وب‌سایت',
    pass: httpPass,
    detail: `کد وضعیت دریافتی: ${finalStatus} (پاسخ در ${finalLatency}ms)`,
  });

  // Check 2: Error Logs Check
  checks.push({
    name: 'عدم ثبت خطاهای بحرانی جدید در لاگ‌ها',
    pass: !hasErrorInLogs,
    detail: hasErrorInLogs ? 'خطاهای جدید در لاگ ثبت شده است' : 'هیچ خطای بحرانی جدیدی ثبت نشد',
  });

  // Check 3: Resource Headroom Check
  const memoryPass = currentRamPercent < 85;
  checks.push({
    name: 'میزان پایداری مصرف حافظه رم (زیر ۸۵٪)',
    pass: memoryPass,
    detail: `مصرف رم فعلی: ${currentRamPercent}%`,
  });

  let verdict: VerificationVerdict = 'fixed';
  const passedCount = checks.filter((c) => c.pass).length;

  if (passedCount === checks.length) {
    verdict = 'fixed';
  } else if (passedCount > 0 && httpPass) {
    verdict = 'improved';
  } else if (passedCount === 0) {
    verdict = 'worse';
  } else {
    verdict = 'unchanged';
  }

  return {
    verdict,
    before: {
      status: 'error',
      note: 'بروز خطا قبل از انجام عملیات اصلاحی',
    },
    after: {
      httpStatus: finalStatus,
      latencyMs: finalLatency,
      memoryPercent: currentRamPercent,
      errorInLogs: hasErrorInLogs,
    },
    checks,
  };
}
