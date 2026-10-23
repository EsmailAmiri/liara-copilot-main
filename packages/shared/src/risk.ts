import { z } from 'zod';

export const RiskSchema = z.enum(['read', 'low', 'high']);
export type Risk = z.infer<typeof RiskSchema>;

export const CapabilityViaSchema = z.enum(['api', 'cli', 'none']);
export type CapabilityVia = z.infer<typeof CapabilityViaSchema>;
