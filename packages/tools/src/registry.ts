import { z } from 'zod';
import type { Result, Risk, ApprovalCard } from '@copilot/shared';
import { err } from '@copilot/shared';
import type { CapabilityId } from '@copilot/liara-client';
import type { ToolContext } from './context.js';
import {
  listAppsTool,
  getAppTool,
  getLogsTool,
  getMetricsTool,
  listEnvTool,
  listReleasesTool,
  listPlansTool,
  checkHttpTool,
  dnsLookupTool,
  getCapabilitiesTool,
} from './read/tools.js';
import {
  createAppTool,
  setEnvTool,
  unsetEnvTool,
  restartAppTool,
  stopAppTool,
  startAppTool,
  changePlanTool,
  addDomainTool,
  deployTool,
} from './write/tools.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ToolDef<I = any, O = any> {
  name: string;
  description: string;
  input: z.ZodType<I>;
  risk: Risk | ((args: I, ctx: ToolContext) => Risk);
  capability?: CapabilityId;
  describe?(args: I, ctx: ToolContext): ApprovalCard;
  execute(args: I, ctx: ToolContext): Promise<Result<O>>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDef>();

  constructor() {
    this.registerDefaults();
  }

  register(tool: ToolDef): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDef | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDef[] {
    return Array.from(this.tools.values());
  }

  private registerDefaults(): void {
    // Read tools
    this.register(listAppsTool);
    this.register(getAppTool);
    this.register(getLogsTool);
    this.register(getMetricsTool);
    this.register(listEnvTool);
    this.register(listReleasesTool);
    this.register(listPlansTool);
    this.register(checkHttpTool);
    this.register(dnsLookupTool);
    this.register(getCapabilitiesTool);

    // Write tools
    this.register(createAppTool);
    this.register(setEnvTool);
    this.register(unsetEnvTool);
    this.register(restartAppTool);
    this.register(stopAppTool);
    this.register(startAppTool);
    this.register(changePlanTool);
    this.register(addDomainTool);
    this.register(deployTool);
  }

  async executeTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<Result<unknown>> {
    const tool = this.tools.get(name);
    if (!tool) {
      return err('NOT_FOUND', `Tool "${name}" not found`);
    }

    // 1. Zod input validation
    const parsed = tool.input.safeParse(rawArgs);
    if (!parsed.success) {
      return err('VALIDATION', `Invalid arguments for tool ${name}: ${parsed.error.message}`);
    }
    const args = parsed.data;

    // 2. Allowlist enforcement
    if (ctx.appNameAllowlist && ctx.appNameAllowlist.length > 0) {
      const appName =
        (args as Record<string, unknown>)?.['app'] || (args as Record<string, unknown>)?.['name'];
      if (typeof appName === 'string' && !ctx.appNameAllowlist.includes(appName)) {
        return err('NOT_ALLOWED', `App "${appName}" is not in the allowed apps list`);
      }
    }

    // 3. Capability enforcement
    if (tool.capability) {
      const capsRes = await ctx.client.getCapabilities();
      if (capsRes.ok) {
        const cap = capsRes.data.find((c) => c.id === tool.capability);
        if (cap && cap.status === 'unsupported') {
          return err(
            'NOT_SUPPORTED_BY_API',
            `قابلیت "${tool.capability}" در حال حاضر توسط API لیارا پشتیبانی نمی‌شود`,
            cap.notes
              ? `${cap.notes} - لطفاً این عملیات را به صورت دستی در پنل کاربری لیارا انجام دهید.`
              : 'لطفاً این عملیات را به صورت دستی در پنل کاربری لیارا انجام دهید.',
          );
        }
      }
    }

    // 4. Execution
    try {
      return await tool.execute(args, ctx);
    } catch (e: unknown) {
      return err('LIARA_ERROR', e instanceof Error ? e.message : 'Unknown tool execution error');
    }
  }
}

export const defaultToolRegistry = new ToolRegistry();
