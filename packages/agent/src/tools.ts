import { z } from 'zod';
import type { ToolDef, ToolContext } from '@copilot/tools';
import { ok } from '@copilot/shared';
import { collectEvidenceBundle } from './evidence.js';
import { runDiagnosis } from './diagnosis.js';
import { verifyFix } from './verify.js';
import {
  analyzeProjectDirectory,
  recommendPlan,
  type ProjectAnalysis,
} from './project-analyzer.js';

export const collectEvidenceTool: ToolDef<{ app: string; windowMin?: number }> = {
  name: 'collect_evidence',
  description:
    'جمع‌آوری جامع شواهد (لاگ‌ها، متریک‌ها، وضعیت کانتینر، پروب HTTP و متغیرها) / Collect comprehensive evidence bundle',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
    windowMin: z.number().optional().default(15),
  }),
  risk: 'read',
  async execute(args, ctx: ToolContext) {
    const bundle = await collectEvidenceBundle(args.app, ctx, args.windowMin);
    return ok(bundle);
  },
};

export const diagnoseTool: ToolDef<{ app: string }> = {
  name: 'diagnose',
  description:
    'تحلیل شواهد با استفاده از دیتکتورهای مبتنی بر قوانین و رتبه‌بندی فرضیات / Run rule-based detectors and rank hypotheses',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
  }),
  risk: 'read',
  async execute(args, ctx: ToolContext) {
    const bundle = await collectEvidenceBundle(args.app, ctx);
    const hypotheses = runDiagnosis(bundle);
    return ok({ appName: args.app, hypotheses });
  },
};

export const verifyFixTool: ToolDef<{ app: string; expectedStatus?: number }> = {
  name: 'verify_fix',
  description:
    'اعتبارسنجی خودکار وضعیت برنامه و پاسخ‌دهی HTTP پس از انجام تغییرات / Verify fix via polling and comparison',
  input: z.object({
    app: z.string().describe('نام برنامه / App name'),
    expectedStatus: z.number().optional().default(200),
  }),
  risk: 'read',
  async execute(args, ctx: ToolContext) {
    const result = await verifyFix(
      {
        appName: args.app,
        expectedStatus: args.expectedStatus,
      },
      ctx,
    );
    return ok(result);
  },
};

export const analyzeProjectTool: ToolDef<{ projectDir?: string }> = {
  name: 'analyze_project',
  description:
    'شناسایی خودکار فریم‌ورک، پلتفرم و نیازمندی‌های پروژه / Detect project framework, port, and env needs',
  input: z.object({
    projectDir: z.string().optional().default('.'),
  }),
  risk: 'read',
  async execute(args) {
    const analysis = analyzeProjectDirectory(args.projectDir || '.');
    return ok(analysis);
  },
};

export const recommendPlanTool: ToolDef<{ platform: string; expectedRamMB?: number }> = {
  name: 'recommend_plan',
  description:
    'پیشنهاد پلن سخت‌افزاری بهینه با توضیح هزینه و دلایل فنی / Recommend optimal Liara plan',
  input: z.object({
    platform: z.string(),
    expectedRamMB: z.number().optional(),
  }),
  risk: 'read',
  async execute(args) {
    const rec = recommendPlan({
      platform: args.platform as ProjectAnalysis['platform'],
      port: 3000,
      envNeeds: [],
      notes: [],
    });
    return ok(rec);
  },
};

export const AGENT_DIAGNOSTIC_TOOLS: ToolDef[] = [
  collectEvidenceTool,
  diagnoseTool,
  verifyFixTool,
  analyzeProjectTool,
  recommendPlanTool,
];
