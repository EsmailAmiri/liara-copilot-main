import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  ErrCodeSchema,
  RiskSchema,
  ServerEventSchema,
  ApprovalCardSchema,
  EvidenceBundleSchema,
} from './index.js';

describe('shared module tests', () => {
  it('handles Result ok and err', () => {
    const success = ok({ app: 'test-app' });
    expect(success.ok).toBe(true);
    if (success.ok) {
      expect(success.data.app).toBe('test-app');
    }

    const failure = err('NOT_FOUND', 'App not found', 'Check app name');
    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.code).toBe('NOT_FOUND');
      expect(failure.hint).toBe('Check app name');
    }
  });

  it('validates ErrCodeSchema and RiskSchema', () => {
    expect(ErrCodeSchema.safeParse('NOT_SUPPORTED_BY_API').success).toBe(true);
    expect(ErrCodeSchema.safeParse('INVALID_CODE').success).toBe(false);

    expect(RiskSchema.safeParse('read').success).toBe(true);
    expect(RiskSchema.safeParse('low').success).toBe(true);
    expect(RiskSchema.safeParse('high').success).toBe(true);
    expect(RiskSchema.safeParse('medium').success).toBe(false);
  });

  it('validates ApprovalCard schema', () => {
    const validCard = {
      title: 'ری‌استارت برنامه',
      summary: 'برنامه برای اعمال تغییرات ری‌استارت می‌شود.',
      impact: ['قطع موقت ارتباط به مدت ۱۰ ثانیه'],
      rollback: 'نیاز به رول‌بک ندارد',
      risk: 'high' as const,
      details: [{ label: 'نام برنامه', value: 'my-app' }],
      capabilityVia: 'api' as const,
    };
    const parsed = ApprovalCardSchema.safeParse(validCard);
    expect(parsed.success).toBe(true);
  });

  it('validates ServerEventSchema discriminated union', () => {
    const deltaEvent = {
      type: 'message.delta' as const,
      conversationId: 'c1',
      delta: 'سلام',
    };
    expect(ServerEventSchema.safeParse(deltaEvent).success).toBe(true);

    const stepEvent = {
      type: 'timeline.step' as const,
      conversationId: 'c1',
      step: {
        id: 's1',
        title: 'بررسی وضعیت برنامه',
        tool: 'get_app',
        status: 'completed' as const,
        source: 'liara-api' as const,
        durationMs: 120,
        timestamp: Date.now(),
      },
    };
    expect(ServerEventSchema.safeParse(stepEvent).success).toBe(true);
  });

  it('validates EvidenceBundle schema', () => {
    const bundle = {
      appName: 'test-app',
      collectedAt: new Date().toISOString(),
      items: [
        {
          id: 'E1',
          source: 'liara-api',
          kind: 'status',
          summary: 'Status is running',
        },
      ],
      gaps: ['metrics: timeout'],
    };
    expect(EvidenceBundleSchema.safeParse(bundle).success).toBe(true);
  });
});
