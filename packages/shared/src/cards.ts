import { z } from 'zod';
import { CapabilityViaSchema } from './risk.js';

export const ApprovalCardSchema = z.object({
  title: z.string(),
  summary: z.string(),
  impact: z.array(z.string()),
  rollback: z.string().optional(),
  risk: z.enum(['low', 'high']),
  details: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
  capabilityVia: CapabilityViaSchema,
});

export type ApprovalCard = z.infer<typeof ApprovalCardSchema>;

export const PendingActionStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'expired',
  'executed',
  'failed',
]);

export type PendingActionStatus = z.infer<typeof PendingActionStatusSchema>;

export const PendingActionSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  tool: z.string(),
  args: z.record(z.unknown()),
  argsHash: z.string(),
  card: ApprovalCardSchema,
  risk: z.enum(['low', 'high']),
  createdAt: z.number(),
  expiresAt: z.number(),
  status: PendingActionStatusSchema,
  resolvedAt: z.number().optional(),
  executedAt: z.number().optional(),
  error: z.string().optional(),
});

export type PendingAction = z.infer<typeof PendingActionSchema>;

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actor: 'user' | 'agent' | 'monitor' | 'system';
  action: string;
  tool?: string;
  risk?: string;
  conversationId?: string;
  traceId?: string;
  details?: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'pending' | 'rejected';
}
