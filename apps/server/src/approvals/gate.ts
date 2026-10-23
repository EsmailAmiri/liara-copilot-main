import { randomUUID } from 'node:crypto';
import type { Result, PendingAction, ApprovalCard } from '@copilot/shared';
import { ok, err } from '@copilot/shared';
import type { ToolDef, ToolContext } from '@copilot/tools';
import { computeArgsHash } from './hash.js';
import { ApprovalStore } from './store.js';

export interface ApprovalGateOptions {
  store: ApprovalStore;
  ttlSeconds?: number;
}

export class ApprovalGate {
  private store: ApprovalStore;
  private ttlSeconds: number;

  constructor(options: ApprovalGateOptions) {
    this.store = options.store;
    this.ttlSeconds = options.ttlSeconds || 300;
  }

  async propose(params: {
    conversationId: string;
    tool: ToolDef;
    args: Record<string, unknown>;
    ctx: ToolContext;
  }): Promise<PendingAction> {
    const actionId = `act_${randomUUID()}`;
    const now = Date.now();
    const expiresAt = now + this.ttlSeconds * 1000;
    const argsHash = computeArgsHash(params.args);

    let card: ApprovalCard;
    if (params.tool.describe) {
      card = params.tool.describe(params.args, params.ctx);
    } else {
      card = {
        title: `اجرای دستور ${params.tool.name}`,
        summary: `اجرای ابزار ${params.tool.name}`,
        impact: ['تغییر در زیرساخت یا کانتینر برنامه'],
        risk: 'high',
        details: Object.entries(params.args).map(([k, v]) => ({
          label: k,
          value: String(v),
        })),
        capabilityVia: 'api',
      };
    }

    const action: PendingAction = {
      id: actionId,
      conversationId: params.conversationId,
      tool: params.tool.name,
      args: params.args,
      argsHash,
      card,
      risk: card.risk,
      createdAt: now,
      expiresAt,
      status: 'pending',
    };

    this.store.savePendingAction(action);

    this.store.addAudit({
      id: randomUUID(),
      timestamp: now,
      actor: 'agent',
      action: 'propose_action',
      tool: params.tool.name,
      risk: card.risk,
      conversationId: params.conversationId,
      traceId: params.ctx.traceId,
      details: { actionId, args: params.args, card },
      outcome: 'pending',
    });

    return action;
  }

  async approve(
    actionId: string,
    executeFn: (toolName: string, args: Record<string, unknown>) => Promise<Result<unknown>>,
    options: { actor?: 'user' | 'system'; conversationId?: string } = {},
  ): Promise<Result<{ action: PendingAction; result: unknown }>> {
    const action = this.store.getPendingAction(actionId);
    const now = Date.now();

    if (!action) {
      return err('NOT_FOUND', `Pending action ${actionId} not found`);
    }

    // 1. Cross-conversation check
    if (options.conversationId && action.conversationId !== options.conversationId) {
      return err('FORBIDDEN', 'Action belongs to another conversation');
    }

    // 2. Replay check (single-use)
    if (action.status !== 'pending') {
      return err('NOT_ALLOWED', `Action ${actionId} is already ${action.status}`);
    }

    // 3. Expiry check
    if (now > action.expiresAt) {
      this.store.updateActionStatus(actionId, 'expired', { resolvedAt: now });
      this.store.addAudit({
        id: randomUUID(),
        timestamp: now,
        actor: options.actor || 'user',
        action: 'expire_action',
        tool: action.tool,
        conversationId: action.conversationId,
        details: { actionId },
        outcome: 'failure',
      });
      return err('NOT_ALLOWED', `Pending action ${actionId} has expired`);
    }

    // 4. Tamper check: hash re-verification
    const currentHash = computeArgsHash(action.args);
    if (currentHash !== action.argsHash) {
      this.store.updateActionStatus(actionId, 'rejected', {
        resolvedAt: now,
        error: 'Arguments tamper detected',
      });
      this.store.addAudit({
        id: randomUUID(),
        timestamp: now,
        actor: 'system',
        action: 'tamper_detected',
        tool: action.tool,
        conversationId: action.conversationId,
        details: { actionId, expectedHash: action.argsHash, actualHash: currentHash },
        outcome: 'failure',
      });
      return err('NOT_ALLOWED', 'Tamper detected: stored arguments hash mismatch');
    }

    // 5. Mark approved & execute
    this.store.updateActionStatus(actionId, 'approved', { resolvedAt: now });

    this.store.addAudit({
      id: randomUUID(),
      timestamp: now,
      actor: options.actor || 'user',
      action: 'approve_action',
      tool: action.tool,
      conversationId: action.conversationId,
      details: { actionId },
      outcome: 'success',
    });

    try {
      const execResult = await executeFn(action.tool, action.args);
      if (execResult.ok) {
        this.store.updateActionStatus(actionId, 'executed', { executedAt: Date.now() });
        this.store.addAudit({
          id: randomUUID(),
          timestamp: Date.now(),
          actor: 'system',
          action: 'execute_action',
          tool: action.tool,
          conversationId: action.conversationId,
          details: { actionId, result: execResult.data },
          outcome: 'success',
        });
        return ok({ action, result: execResult.data });
      } else {
        this.store.updateActionStatus(actionId, 'failed', {
          executedAt: Date.now(),
          error: execResult.message,
        });
        this.store.addAudit({
          id: randomUUID(),
          timestamp: Date.now(),
          actor: 'system',
          action: 'execute_action',
          tool: action.tool,
          conversationId: action.conversationId,
          details: { actionId, error: execResult.message },
          outcome: 'failure',
        });
        return err(execResult.code, execResult.message, execResult.hint);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown execution failure';
      this.store.updateActionStatus(actionId, 'failed', { executedAt: Date.now(), error: msg });
      return err('LIARA_ERROR', msg);
    }
  }

  async reject(
    actionId: string,
    options: { actor?: 'user'; conversationId?: string } = {},
  ): Promise<Result<PendingAction>> {
    const action = this.store.getPendingAction(actionId);
    const now = Date.now();

    if (!action) {
      return err('NOT_FOUND', `Pending action ${actionId} not found`);
    }

    if (options.conversationId && action.conversationId !== options.conversationId) {
      return err('FORBIDDEN', 'Action belongs to another conversation');
    }

    if (action.status !== 'pending') {
      return err('NOT_ALLOWED', `Action ${actionId} is already ${action.status}`);
    }

    this.store.updateActionStatus(actionId, 'rejected', { resolvedAt: now });

    this.store.addAudit({
      id: randomUUID(),
      timestamp: now,
      actor: options.actor || 'user',
      action: 'reject_action',
      tool: action.tool,
      conversationId: action.conversationId,
      details: { actionId },
      outcome: 'rejected',
    });

    const updated = this.store.getPendingAction(actionId)!;
    return ok(updated);
  }
}
