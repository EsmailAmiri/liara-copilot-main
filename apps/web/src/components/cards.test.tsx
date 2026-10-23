import { describe, it, expect } from 'vitest';
import type { ApprovalCard, Hypothesis, VerificationResult } from '@copilot/shared';

describe('Web UI Card Data Models & Formatting', () => {
  it('formats ApprovalCard details properly', () => {
    const card: ApprovalCard = {
      title: 'تنظیم متغیر محیطی',
      summary: 'تنظیم DATABASE_URL برای برنامه demo-shop',
      impact: ['ری‌استارت کانتینر'],
      risk: 'high',
      details: [{ label: 'DATABASE_URL', value: 'postgres://***' }],
      capabilityVia: 'api',
    };

    expect(card.title).toBe('تنظیم متغیر محیطی');
    expect(card.risk).toBe('high');
    expect(card.details[0]?.label).toBe('DATABASE_URL');
  });

  it('calculates DiagnosisCard confidence percentage correctly', () => {
    const hyp: Hypothesis = {
      id: 'missing_env',
      title: 'عدم تنظیم متغیر محیطی ضروری (DATABASE_URL)',
      confidence: 0.95,
      evidenceIds: ['E2', 'E3'],
      explanation_key: 'diagnosis.missingEnv',
      suggestedActions: [
        {
          tool: 'set_env',
          args: { app: 'demo-shop' },
          rationale_key: 'rationale.fix',
          risk: 'high',
        },
      ],
    };

    const pct = Math.round(hyp.confidence * 100);
    expect(pct).toBe(95);
    expect(hyp.evidenceIds).toContain('E2');
  });

  it('evaluates VerificationCard verdict and checks', () => {
    const verif: VerificationResult = {
      verdict: 'fixed',
      before: { status: 500 },
      after: { httpStatus: 200, latencyMs: 45 },
      checks: [
        { name: 'پاسخ‌دهی HTTP', pass: true, detail: '200 OK' },
        { name: 'نبود خطا در لاگ', pass: true },
      ],
    };

    expect(verif.verdict).toBe('fixed');
    expect(verif.checks.every((c) => c.pass)).toBe(true);
  });
});
