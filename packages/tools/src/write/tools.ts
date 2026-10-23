import { z } from 'zod';
import type { ApprovalCard } from '@copilot/shared';
import { ok } from '@copilot/shared';
import type { ToolDef } from '../registry.js';
import type { ToolContext } from '../context.js';
import { redact } from '../redact.js';

export const createAppTool: ToolDef<{
  name: string;
  platform: string;
  plan?: string;
}> = {
  name: 'create_app',
  description: 'ایجاد یک برنامه جدید در لیارا / Create a new empty application on Liara',
  input: z.object({
    name: z.string().describe('شناسه برنامه (حروف کوچک و خط فاصله) / App name'),
    platform: z.string().describe('پلتفرم اجرا (مانند node, python, php, docker) / Platform'),
    plan: z.string().optional().describe('شناسه پلن منابع / Plan id'),
  }),
  risk: 'low',
  capability: 'apps.create',
  describe(args): ApprovalCard {
    return {
      title: 'ایجاد برنامه جدید',
      summary: `ایجاد برنامه خالی به نام "${args.name}" روی پلتفرم "${args.platform}"`,
      impact: ['یک برنامه ابری جدید ساخته می‌شود و آماده استقرار خواهد بود'],
      rollback: 'در صورت نیاز می‌توان برنامه را حذف کرد',
      risk: 'low',
      details: [
        { label: 'نام برنامه', value: args.name },
        { label: 'پلتفرم', value: args.platform },
        { label: 'پلن', value: args.plan || 'standard-1g' },
      ],
      capabilityVia: 'api',
    };
  },
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.createApp(args);
    if (!res.ok) return res;
    return ok(redact(res.data));
  },
};

export const setEnvTool: ToolDef<{
  app: string;
  variables: Record<string, string>;
}> = {
  name: 'set_env',
  description: 'تنظیم متغیرهای محیطی برنامه / Set environment variables for an application',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
    variables: z.record(z.string()).describe('کلید و مقدار متغیرها / Key-value variables'),
  }),
  risk: 'high',
  capability: 'apps.env.set',
  describe(args): ApprovalCard {
    return {
      title: 'تنظیم متغیرهای محیطی',
      summary: `تنظیم یا به‌روزرسانی متغیرهای محیطی برای برنامه "${args.app}"`,
      impact: [
        'برنامه برای اعمال متغیرها ری‌استارت خواهد شد و حدود ۱۰ تا ۳۰ ثانیه قطع موقت خواهد داشت',
      ],
      rollback: 'امکان حذف یا تغییر مجدد مقادیر وجود دارد',
      risk: 'high',
      details: Object.entries(args.variables).map(([k, v]) => ({
        label: k,
        value: redact(v),
      })),
      capabilityVia: 'api',
    };
  },
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.setEnv(args.app, args.variables);
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const unsetEnvTool: ToolDef<{
  app: string;
  keys: string[];
}> = {
  name: 'unset_env',
  description: 'حذف متغیرهای محیطی از برنامه / Remove environment variables from an application',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
    keys: z.array(z.string()).describe('لیست کلیدهای متغیرها / Env keys to delete'),
  }),
  risk: 'high',
  capability: 'apps.env.unset',
  describe(args): ApprovalCard {
    return {
      title: 'حذف متغیر محیطی',
      summary: `حذف متغیرهای [${args.keys.join(', ')}] از برنامه "${args.app}"`,
      impact: ['برنامه بلافاصله ری‌استارت شده و متغیرها در دسترس آن نخواهند بود'],
      rollback: 'امکان افزودن مجدد متغیرها با set_env وجود دارد',
      risk: 'high',
      details: args.keys.map((k) => ({ label: 'کلید متغیر', value: k })),
      capabilityVia: 'api',
    };
  },
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.unsetEnv(args.app, args.keys);
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const restartAppTool: ToolDef<{ app: string }> = {
  name: 'restart_app',
  description: 'راه‌اندازی مجدد کانتینر برنامه / Restart application container',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
  }),
  risk: 'high',
  capability: 'apps.restart',
  describe(args): ApprovalCard {
    return {
      title: 'ری‌استارت برنامه',
      summary: `راه‌اندازی مجدد کانتینر برنامه "${args.app}"`,
      impact: ['سایت حدود ۱۰ تا ۳۰ ثانیه موقتاً از دسترس خارج خواهد شد'],
      rollback: 'این عملیات خودکار تمام می‌شود و کانتینر جدید لود خواهد شد',
      risk: 'high',
      details: [{ label: 'نام برنامه', value: args.app }],
      capabilityVia: 'api',
    };
  },
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.restartApp(args.app);
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const stopAppTool: ToolDef<{ app: string }> = {
  name: 'stop_app',
  description: 'توقف برنامه / Stop application container',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
  }),
  risk: 'high',
  capability: 'apps.stop_start',
  describe(args): ApprovalCard {
    return {
      title: 'توقف برنامه',
      summary: `خاموش کردن برنامه "${args.app}"`,
      impact: ['برنامه کاملاً متوقف می‌شود و تا استارت مجدد پاسخگو نخواهد بود'],
      rollback: 'می‌توان با ابزار start_app برنامه را مجدداً روشن کرد',
      risk: 'high',
      details: [{ label: 'نام برنامه', value: args.app }],
      capabilityVia: 'api',
    };
  },
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.stopApp(args.app);
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const startAppTool: ToolDef<{ app: string }> = {
  name: 'start_app',
  description: 'شروع مجدد برنامه متوقف‌شده / Start a stopped application container',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
  }),
  risk: 'high',
  capability: 'apps.stop_start',
  describe(args): ApprovalCard {
    return {
      title: 'شروع برنامه',
      summary: `روشن کردن برنامه متوقف‌شده "${args.app}"`,
      impact: ['کانتینر برنامه بالا آمده و ترافیک دریافت خواهد کرد'],
      details: [{ label: 'نام برنامه', value: args.app }],
      risk: 'high',
      capabilityVia: 'api',
    };
  },
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.startApp(args.app);
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const changePlanTool: ToolDef<{
  app: string;
  plan: string;
}> = {
  name: 'change_plan',
  description: 'تغییر پلن و اندازه منابع سخت‌افزاری برنامه / Change application plan or resources',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
    plan: z.string().describe('شناسه پلن جدید / New plan id'),
  }),
  risk: 'high',
  capability: 'apps.plan.change',
  describe(args): ApprovalCard {
    return {
      title: 'تغییر پلن سخت‌افزاری',
      summary: `تغییر پلن و افزایش/کاهش منابع برنامه "${args.app}" به پلن "${args.plan}"`,
      impact: [
        'کانتینر برای اعمال منابع جدید ری‌استارت خواهد شد',
        'هزینه محاسبه‌شده منابع بر اساس تعرفه پلن تغییر خواهد کرد',
      ],
      rollback: 'می‌توان پلن را در هر زمان به مقدار قبل یا پلن دیگری تغییر داد',
      risk: 'high',
      details: [
        { label: 'نام برنامه', value: args.app },
        { label: 'پلن جدید', value: args.plan },
      ],
      capabilityVia: 'api',
    };
  },
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.changePlan(args.app, args.plan);
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const addDomainTool: ToolDef<{
  app: string;
  domain: string;
}> = {
  name: 'add_domain',
  description: 'اتصال دامنه اختصاصی به برنامه / Add custom domain to an application',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
    domain: z.string().describe('نام دامنه اختصاصی (مانند example.com) / Domain name'),
  }),
  risk: 'high',
  capability: 'apps.domains.add',
  describe(args): ApprovalCard {
    return {
      title: 'اتصال دامنه اختصاصی',
      summary: `افزودن دامنه "${args.domain}" به برنامه "${args.app}"`,
      impact: [
        'دامنه در لیارا ثبت شده و برای فعال‌سازی کامل نیاز به تنظیم رکورد CNAME در رجیسترار دارد',
      ],
      rollback: 'امکان حذف دامنه در هر زمان وجود دارد',
      risk: 'high',
      details: [
        { label: 'نام برنامه', value: args.app },
        { label: 'دامنه', value: args.domain },
      ],
      capabilityVia: 'api',
    };
  },
  async execute(args, ctx: ToolContext) {
    const res = await ctx.client.addDomain(args.app, args.domain);
    if (!res.ok) return res;
    return ok(res.data);
  },
};

export const deployTool: ToolDef<{
  app: string;
  sourcePath?: string;
  image?: string;
  port?: number;
}> = {
  name: 'deploy',
  description: 'استقرار نسخه جدید برنامه / Deploy project source or Docker image to application',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
    sourcePath: z.string().optional().describe('مسیر فایل‌های پروژه / Source path'),
    image: z.string().optional().describe('ایمیج داکر / Docker image name'),
    port: z.number().optional().describe('پورت سرویس / Port'),
  }),
  risk: 'high',
  capability: 'apps.deploy.source',
  describe(args): ApprovalCard {
    return {
      title: 'استقرار نسخه جدید (Deploy)',
      summary: `انتشار و استقرار پروژه روی برنامه "${args.app}"`,
      impact: [
        'نسخه جدید بیلد شده و جایگزین نسخه قبلی در حال اجرا خواهد شد',
        'طی فرآیند بیلد و جابجایی ترافیک، ممکن است سایت دچار تأخیر یا قطعی کوتاه شود',
      ],
      rollback: 'امکان بازگشت به ریلیزهای پیشین وجود دارد',
      risk: 'high',
      details: [
        { label: 'نام برنامه', value: args.app },
        { label: 'نوع استقرار', value: args.image ? `Docker Image: ${args.image}` : 'Source Code' },
      ],
      capabilityVia: 'cli',
    };
  },
  async execute(args, ctx: ToolContext) {
    if (args.sourcePath && !args.image && ctx.cliDriver) {
      const cliRes = await ctx.cliDriver.run({
        args: [
          'deploy',
          '--app',
          args.app,
          '--path',
          args.sourcePath,
          '--no-app-logs',
          ...(args.port ? ['--port', String(args.port)] : []),
        ],
      });
      if (!cliRes.ok) return cliRes;
      return ok({
        releaseId: 'rel_cli',
        status: 'ready',
        message: 'استقرار سورس کد با موفقیت از طریق Liara CLI انجام شد.',
      });
    }

    const res = await ctx.client.deploy(args.app, {
      sourcePath: args.sourcePath,
      image: args.image,
      port: args.port,
    });
    if (!res.ok) return res;
    return ok(res.data);
  },
};
