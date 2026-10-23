import { z } from 'zod';
import { promises as dns } from 'node:dns';
import { ok } from '@copilot/shared';
import type { ToolDef } from '../registry.js';
import type { ToolContext } from '../context.js';
import { redact } from '../redact.js';

export const listAppsTool: ToolDef<Record<string, never>> = {
  name: 'list_apps',
  description: 'لیست تمام برنامه‌ها در حساب لیارا / List all apps in account',
  input: z.object({}),
  risk: 'read',
  capability: 'apps.list',
  async execute(_args, ctx: ToolContext) {
    const res = await ctx.client.listApps();
    if (!res.ok) return res;
    return ok(redact(res.data));
  },
};

export const getAppTool: ToolDef<{ app: string }> = {
  name: 'get_app',
  description: 'دریافت مشخصات و جزئیات یک برنامه / Get app details, plan, and status',
  input: z.object({
    app: z.string().describe('شناسه یا نام برنامه / App name'),
  }),
  risk: 'read',
  capability: 'apps.get',
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.getApp(args.app);
    if (!res.ok) return res;
    return ok(redact(res.data));
  },
};

export const getLogsTool: ToolDef<{
  app: string;
  limit?: number;
  since?: string;
  until?: string;
}> = {
  name: 'get_logs',
  description: 'دریافت لاگ‌های اخیر برنامه / Get recent application logs (redacted and truncated)',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
    limit: z.number().optional().default(100).describe('حداکثر تعداد خطوط / Max lines'),
    since: z.string().optional(),
    until: z.string().optional(),
  }),
  risk: 'read',
  capability: 'apps.logs.read',
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.getLogs(args.app, {
      limit: Math.min(args.limit || 100, 200),
      since: args.since,
      until: args.until,
    });
    if (!res.ok) return res;
    const redactedLogs = redact(res.data);
    return ok(redactedLogs);
  },
};

export const getMetricsTool: ToolDef<{ app: string; period?: string }> = {
  name: 'get_metrics',
  description: 'دریافت متریک‌های منابع برنامه (مصرف CPU و RAM) / Get app CPU and RAM metrics',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
    period: z.string().optional().describe('بازه زمانی مثل 1h یا 24h / Period'),
  }),
  risk: 'read',
  capability: 'apps.metrics.read',
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.getMetrics(args.app, { period: args.period });
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const listEnvTool: ToolDef<{ app: string }> = {
  name: 'list_env',
  description: 'مشاهده متغیرهای محیطی برنامه / List env variable names and allowlisted values',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
  }),
  risk: 'read',
  capability: 'apps.env.list',
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.listEnv(args.app);
    if (!res.ok) return res;
    return ok(redact(res.data));
  },
};

export const listReleasesTool: ToolDef<{ app: string }> = {
  name: 'list_releases',
  description: 'مشاهده تاریخچه استقرارها و رلیزهای برنامه / List recent deployments/releases',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
  }),
  risk: 'read',
  capability: 'apps.releases.list',
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.listReleases(args.app);
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const listPlansTool: ToolDef<{ platform?: string }> = {
  name: 'list_plans',
  description:
    'مشاهده لیست پلن‌های سخت‌افزاری و قیمت‌ها / List available hardware plans and pricing',
  input: z.object({
    platform: z.string().optional(),
  }),
  risk: 'read',
  capability: 'apps.plan.list',
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.listPlans(args.platform);
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const checkHttpTool: ToolDef<{ url: string; timeoutMs?: number }> = {
  name: 'check_http',
  description:
    'ارسال درخواست HTTP به آدرس سایت برای بررسی سلامت و پاسخ / Probe public URL for status and latency',
  input: z.object({
    url: z.string().url().describe('آدرس کامل سایت / Full public URL'),
    timeoutMs: z.number().optional().default(5000),
  }),
  risk: 'read',
  async execute(args, ctx: ToolContext) {
    if (ctx.httpProber) {
      const probe = await ctx.httpProber(args.url);
      return ok(redact(probe));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), args.timeoutMs || 5000);
    const start = Date.now();

    try {
      const response = await fetch(args.url, {
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      const text = await response.text();
      const snippet = text.slice(0, 1024);

      return ok(
        redact({
          status: response.status,
          latencyMs,
          bodySnippet: snippet,
          ok: response.ok,
        }),
      );
    } catch (e: unknown) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      return ok({
        status: 0,
        latencyMs,
        bodySnippet: '',
        ok: false,
        error: e instanceof Error ? e.message : 'Connection failed',
      });
    }
  },
};

export const dnsLookupTool: ToolDef<{ domain: string }> = {
  name: 'dns_lookup',
  description: 'بررسی رکوردهای DNS دامنه (A, CNAME, NS) / Look up DNS records for a domain',
  input: z.object({
    domain: z.string().describe('نام دامنه / Domain name'),
  }),
  risk: 'read',
  async execute(args, ctx: ToolContext) {
    if (ctx.dnsResolver) {
      const res = await ctx.dnsResolver(args.domain);
      return ok(res);
    }

    try {
      const [a, cname, ns] = await Promise.allSettled([
        dns.resolve4(args.domain),
        dns.resolveCname(args.domain),
        dns.resolveNs(args.domain),
      ]);

      return ok({
        a: a.status === 'fulfilled' ? a.value : [],
        cname: cname.status === 'fulfilled' ? cname.value : [],
        ns: ns.status === 'fulfilled' ? ns.value : [],
      });
    } catch (e: unknown) {
      return ok({
        a: [],
        cname: [],
        ns: [],
        error: e instanceof Error ? e.message : 'DNS lookup error',
      });
    }
  },
};

export const getCapabilitiesTool: ToolDef<Record<string, never>> = {
  name: 'get_capabilities',
  description: 'مشاهده ماتریس توانمندی‌ها و محدودیت‌های API لیارا / Get Liara capability matrix',
  input: z.object({}),
  risk: 'read',
  async execute(_args, ctx: ToolContext) {
    const res = await ctx.client.getCapabilities();
    if (!res.ok) return res;
    return ok(res.data);
  },
};
