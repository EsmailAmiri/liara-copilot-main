import type { Risk } from '@copilot/shared';
import type { ToolContext } from './context.js';

export interface BaseToolDef {
  name: string;
  risk: Risk | ((args: unknown, ctx: ToolContext) => Risk);
}

export function classifyToolRisk(
  tool: BaseToolDef | undefined,
  args: unknown,
  ctx: ToolContext,
): Risk {
  if (!tool) {
    // Single source of truth: unknown tools default to high
    return 'high';
  }

  if (typeof tool.risk === 'function') {
    try {
      return tool.risk(args, ctx);
    } catch {
      return 'high';
    }
  }

  return tool.risk || 'high';
}
