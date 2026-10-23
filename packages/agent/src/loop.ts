import { randomUUID } from 'node:crypto';
import type { ServerEvent, PendingAction, Hypothesis, VerificationResult } from '@copilot/shared';
import {
  defaultToolRegistry,
  ToolRegistry,
  ToolDef,
  ToolContext,
  classifyToolRisk,
  redact,
} from '@copilot/tools';
import type { LLMAdapter, LLMMessage, LLMTool } from './llm/types.js';
import { SYSTEM_PROMPT_FA } from './prompts/system.fa.js';
import { AGENT_DIAGNOSTIC_TOOLS } from './tools.js';

export interface AgentLoopOptions {
  llm: LLMAdapter;
  registry?: ToolRegistry;
  context: ToolContext;
  conversationId: string;
  systemPrompt?: string;
  maxSteps?: number;
  onEvent?: (event: ServerEvent) => void | Promise<void>;
  proposeApprovalFn?: (tool: ToolDef, args: Record<string, unknown>) => Promise<PendingAction>;
  approveActionFn?: (actionId: string) => Promise<unknown>;
  autoApprove?: boolean;
}

export class AgentLoop {
  private llm: LLMAdapter;
  private registry: ToolRegistry;
  private context: ToolContext;
  private conversationId: string;
  private systemPrompt: string;
  private maxSteps: number;
  private onEvent?: (event: ServerEvent) => void | Promise<void>;
  private proposeApprovalFn?: (
    tool: ToolDef,
    args: Record<string, unknown>,
  ) => Promise<PendingAction>;
  private approveActionFn?: (actionId: string) => Promise<unknown>;
  private autoApprove: boolean;

  constructor(options: AgentLoopOptions) {
    this.llm = options.llm;
    this.registry = options.registry || defaultToolRegistry;
    this.context = options.context;
    this.conversationId = options.conversationId;
    this.systemPrompt = options.systemPrompt || SYSTEM_PROMPT_FA;
    this.maxSteps = options.maxSteps || 12;
    this.onEvent = options.onEvent;
    this.proposeApprovalFn = options.proposeApprovalFn;
    this.approveActionFn = options.approveActionFn;
    this.autoApprove = options.autoApprove ?? false;

    // Ensure agent diagnostic tools are registered
    for (const tool of AGENT_DIAGNOSTIC_TOOLS) {
      if (!this.registry.get(tool.name)) {
        this.registry.register(tool);
      }
    }
  }

  private async emit(event: ServerEvent) {
    if (this.onEvent) {
      await this.onEvent(event);
    }
  }

  async run(messages: LLMMessage[]): Promise<{
    messages: LLMMessage[];
    status: 'completed' | 'waiting_for_approval';
    pendingAction?: PendingAction;
  }> {
    const history: LLMMessage[] = [...messages];

    // Ensure system prompt is at the top
    if (history.length === 0 || history[0]?.role !== 'system') {
      history.unshift({ role: 'system', content: this.systemPrompt });
    }

    const toolsVisible: LLMTool[] = this.registry.getAll().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: {},
      },
    }));

    let step = 0;
    while (step < this.maxSteps) {
      step++;
      const chatStream = this.llm.chat({
        messages: history,
        tools: toolsVisible,
      });

      let assistantText = '';
      const toolCallsToExecute: { id: string; name: string; args: Record<string, unknown> }[] = [];

      for await (const chunk of chatStream) {
        if (chunk.type === 'text.delta') {
          assistantText += chunk.delta;
          await this.emit({
            type: 'message.delta',
            conversationId: this.conversationId,
            delta: chunk.delta,
          });
        } else if (chunk.type === 'tool_call') {
          toolCallsToExecute.push(chunk.toolCall);
        }
      }

      if (toolCallsToExecute.length > 0) {
        history.push({
          role: 'assistant',
          content: assistantText || '',
          tool_calls: toolCallsToExecute.map((tc) => ({
            id: tc.id,
            name: tc.name,
            args: tc.args,
          })),
        });
      } else if (assistantText) {
        history.push({ role: 'assistant', content: assistantText });
      }

      if (toolCallsToExecute.length === 0) {
        // No more tool calls; the assistant turn is complete
        await this.emit({
          type: 'message.done',
          conversationId: this.conversationId,
          content: assistantText,
        });
        return { messages: history, status: 'completed' };
      }

      // Execute each tool call
      for (const call of toolCallsToExecute) {
        const tool = this.registry.get(call.name);
        const stepId = `step_${randomUUID()}`;

        await this.emit({
          type: 'tool.started',
          conversationId: this.conversationId,
          stepId,
          tool: call.name,
          args: redact(call.args),
          traceId: this.context.traceId,
        });

        // 1. Check risk
        const risk = classifyToolRisk(tool, call.args, this.context);

        // 2. High-risk approval gate check
        if (risk === 'high' && this.proposeApprovalFn) {
          const pendingAction = await this.proposeApprovalFn(tool!, call.args);

          await this.emit({
            type: 'timeline.step',
            conversationId: this.conversationId,
            step: {
              id: stepId,
              title: `نیاز به تأیید کاربر: ${call.name}`,
              tool: call.name,
              status: 'pending',
              source: 'liara-api',
              timestamp: Date.now(),
            },
          });

          await this.emit({
            type: 'approval.required',
            conversationId: this.conversationId,
            actionId: pendingAction.id,
            card: pendingAction.card,
            expiresAt: pendingAction.expiresAt,
          });

          if (this.autoApprove && this.approveActionFn) {
            // Auto-approve in headless test mode
            const approvedResult = await this.approveActionFn(pendingAction.id);
            history.push({
              role: 'tool',
              name: call.name,
              tool_call_id: call.id,
              content: JSON.stringify(redact(approvedResult)),
            });

            await this.emit({
              type: 'timeline.step',
              conversationId: this.conversationId,
              step: {
                id: stepId,
                title: `اجرای تأییدشده ${call.name}`,
                tool: call.name,
                status: 'completed',
                source: 'liara-api',
                timestamp: Date.now(),
              },
            });
            continue;
          } else {
            // Normal mode: end turn and wait for user approval
            history.push({
              role: 'tool',
              name: call.name,
              tool_call_id: call.id,
              content: JSON.stringify({
                status: 'pending_approval',
                approvalId: pendingAction.id,
                message: 'عملیات برای اجرا نیازمند تأیید کاربر است.',
              }),
            });

            await this.emit({
              type: 'message.done',
              conversationId: this.conversationId,
              content: assistantText,
            });

            return {
              messages: history,
              status: 'waiting_for_approval',
              pendingAction,
            };
          }
        }

        await this.emit({
          type: 'timeline.step',
          conversationId: this.conversationId,
          step: {
            id: stepId,
            title: `اجرای ابزار ${call.name}`,
            tool: call.name,
            status: 'running',
            source: 'liara-api',
            timestamp: Date.now(),
          },
        });

        // 3. Execute low or read tool
        const startTime = Date.now();
        const execResult = await this.registry.executeTool(call.name, call.args, this.context);
        const durationMs = Date.now() - startTime;

        await this.emit({
          type: 'tool.finished',
          conversationId: this.conversationId,
          stepId,
          tool: call.name,
          ok: execResult.ok,
          error: !execResult.ok ? execResult.message : undefined,
          durationMs,
          traceId: this.context.traceId,
        });

        await this.emit({
          type: 'timeline.step',
          conversationId: this.conversationId,
          step: {
            id: stepId,
            title: `تکمیل ${call.name}`,
            tool: call.name,
            status: execResult.ok ? 'completed' : 'failed',
            source: 'liara-api',
            durationMs,
            error: !execResult.ok ? execResult.message : undefined,
            timestamp: Date.now(),
          },
        });

        // If tool was diagnose, emit diagnosis.ready
        if (call.name === 'diagnose' && execResult.ok) {
          const diagData = execResult.data as { appName: string; hypotheses: Hypothesis[] };
          await this.emit({
            type: 'diagnosis.ready',
            conversationId: this.conversationId,
            appName: diagData.appName,
            hypotheses: diagData.hypotheses,
          });
        }

        // If tool was verify_fix, emit verification.result
        if (call.name === 'verify_fix' && execResult.ok) {
          await this.emit({
            type: 'verification.result',
            conversationId: this.conversationId,
            appName: (call.args.app as string) || 'app',
            result: execResult.data as VerificationResult,
          });
        }

        history.push({
          role: 'tool',
          name: call.name,
          tool_call_id: call.id,
          content: JSON.stringify(execResult.ok ? execResult.data : { error: execResult.message }),
        });
      }
    }

    return { messages: history, status: 'completed' };
  }
}
