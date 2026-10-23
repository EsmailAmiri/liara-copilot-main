import { z } from 'zod';
import { RiskSchema } from './risk.js';

export const EvidenceSeveritySchema = z.enum(['info', 'warning', 'error']);
export type EvidenceSeverity = z.infer<typeof EvidenceSeveritySchema>;

export const EvidenceItemSchema = z.object({
  id: z.string(), // E1, E2, etc.
  source: z.string(), // liara-api, liara-cli, http-probe, mock, detector
  kind: z.string(), // status, metrics, logs, http, env, releases, plan
  summary: z.string(),
  excerpt: z.string().optional(),
  ts: z.string().optional(),
  severity: EvidenceSeveritySchema.optional(),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const EvidenceBundleSchema = z.object({
  appName: z.string(),
  collectedAt: z.string(),
  items: z.array(EvidenceItemSchema),
  gaps: z.array(z.string()),
});

export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;

export const ActionSuggestionSchema = z.object({
  tool: z.string(),
  args: z.record(z.unknown()),
  rationale_key: z.string(),
  risk: RiskSchema,
});

export type ActionSuggestion = z.infer<typeof ActionSuggestionSchema>;

export const HypothesisSchema = z.object({
  id: z.string(),
  title: z.string(),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string()),
  explanation_key: z.string(),
  suggestedActions: z.array(ActionSuggestionSchema),
});

export type Hypothesis = z.infer<typeof HypothesisSchema>;

export const VerificationVerdictSchema = z.enum([
  'fixed',
  'improved',
  'unchanged',
  'worse',
  'inconclusive',
]);

export type VerificationVerdict = z.infer<typeof VerificationVerdictSchema>;

export const VerificationCheckSchema = z.object({
  name: z.string(),
  pass: z.boolean(),
  detail: z.string().optional(),
});

export type VerificationCheck = z.infer<typeof VerificationCheckSchema>;

export const VerificationResultSchema = z.object({
  verdict: VerificationVerdictSchema,
  before: z.record(z.unknown()),
  after: z.record(z.unknown()),
  checks: z.array(VerificationCheckSchema),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;
