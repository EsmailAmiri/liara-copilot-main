import { z } from 'zod';
import { ApprovalCardSchema } from './cards.js';
import { HypothesisSchema, VerificationResultSchema } from './evidence.js';

export const TimelineStepStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export type TimelineStepStatus = z.infer<typeof TimelineStepStatusSchema>;

export const TimelineStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  tool: z.string(),
  status: TimelineStepStatusSchema,
  source: z.enum(['liara-api', 'liara-cli', 'http-probe', 'mock', 'system']),
  durationMs: z.number().optional(),
  details: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.number(),
});

export type TimelineStep = z.infer<typeof TimelineStepSchema>;

export const AlertSchema = z.object({
  id: z.string(),
  appName: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string(),
  message: z.string(),
  timestamp: z.number(),
  status: z.enum(['active', 'investigating', 'resolved']),
  evidenceIds: z.array(z.string()).optional(),
});

export type Alert = z.infer<typeof AlertSchema>;

// Individual SSE Event Data Schemas
export const MessageDeltaEventSchema = z.object({
  type: z.literal('message.delta'),
  conversationId: z.string(),
  delta: z.string(),
});

export const MessageDoneEventSchema = z.object({
  type: z.literal('message.done'),
  conversationId: z.string(),
  content: z.string(),
  usage: z
    .object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .optional(),
});

export const ToolStartedEventSchema = z.object({
  type: z.literal('tool.started'),
  conversationId: z.string(),
  stepId: z.string(),
  tool: z.string(),
  args: z.record(z.unknown()),
  traceId: z.string(),
});

export const ToolFinishedEventSchema = z.object({
  type: z.literal('tool.finished'),
  conversationId: z.string(),
  stepId: z.string(),
  tool: z.string(),
  ok: z.boolean(),
  error: z.string().optional(),
  durationMs: z.number(),
  traceId: z.string(),
});

export const TimelineStepEventSchema = z.object({
  type: z.literal('timeline.step'),
  conversationId: z.string(),
  step: TimelineStepSchema,
});

export const ApprovalRequiredEventSchema = z.object({
  type: z.literal('approval.required'),
  conversationId: z.string(),
  actionId: z.string(),
  card: ApprovalCardSchema,
  expiresAt: z.number(),
});

export const ApprovalResolvedEventSchema = z.object({
  type: z.literal('approval.resolved'),
  conversationId: z.string(),
  actionId: z.string(),
  status: z.enum(['approved', 'rejected', 'expired']),
  resolvedAt: z.number(),
});

export const DiagnosisReadyEventSchema = z.object({
  type: z.literal('diagnosis.ready'),
  conversationId: z.string(),
  appName: z.string(),
  hypotheses: z.array(HypothesisSchema),
  evidenceBundleSummary: z.string().optional(),
});

export const VerificationResultEventSchema = z.object({
  type: z.literal('verification.result'),
  conversationId: z.string(),
  appName: z.string(),
  result: VerificationResultSchema,
});

export const AlertEventSchema = z.object({
  type: z.literal('alert'),
  alert: AlertSchema,
});

export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  conversationId: z.string().optional(),
  code: z.string(),
  message: z.string(),
  hint: z.string().optional(),
});

export const ServerEventSchema = z.discriminatedUnion('type', [
  MessageDeltaEventSchema,
  MessageDoneEventSchema,
  ToolStartedEventSchema,
  ToolFinishedEventSchema,
  TimelineStepEventSchema,
  ApprovalRequiredEventSchema,
  ApprovalResolvedEventSchema,
  DiagnosisReadyEventSchema,
  VerificationResultEventSchema,
  AlertEventSchema,
  ErrorEventSchema,
]);

export type ServerEvent = z.infer<typeof ServerEventSchema>;
export type ServerEventType = ServerEvent['type'];
