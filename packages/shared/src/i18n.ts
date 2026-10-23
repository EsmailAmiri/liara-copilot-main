export type Locale = 'fa' | 'en';

export interface TranslationDictionary {
  common: {
    appName: string;
    tagline: string;
    mockBadge: string;
    liveBadge: string;
    cancel: string;
    approve: string;
    reject: string;
    investigate: string;
    retry: string;
    details: string;
    fixed: string;
    improved: string;
    unchanged: string;
    worse: string;
    inconclusive: string;
  };
  approval: {
    pending: string;
    approved: string;
    rejected: string;
    expired: string;
    executed: string;
    whatWillHappen: string;
    impactTitle: string;
    rollbackTitle: string;
    detailsTitle: string;
    expiresIn: string;
  };
  diagnosis: {
    title: string;
    confidence: string;
    causes: string;
    evidence: string;
    suggestedFix: string;
  };
  verification: {
    title: string;
    before: string;
    after: string;
    checks: string;
    status: string;
  };
  limitation: {
    title: string;
    apiUnsupported: string;
    manualSteps: string;
  };
}

export type I18nKey =
  | 'common.appName'
  | 'common.tagline'
  | 'common.mockBadge'
  | 'common.liveBadge'
  | 'common.cancel'
  | 'common.approve'
  | 'common.reject'
  | 'common.investigate'
  | 'common.retry'
  | 'common.details'
  | 'common.fixed'
  | 'common.improved'
  | 'common.unchanged'
  | 'common.worse'
  | 'common.inconclusive'
  | 'approval.pending'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.expired'
  | 'approval.executed'
  | 'approval.whatWillHappen'
  | 'approval.impactTitle'
  | 'approval.rollbackTitle'
  | 'approval.detailsTitle'
  | 'approval.expiresIn'
  | 'diagnosis.title'
  | 'diagnosis.confidence'
  | 'diagnosis.causes'
  | 'diagnosis.evidence'
  | 'diagnosis.suggestedFix'
  | 'verification.title'
  | 'verification.before'
  | 'verification.after'
  | 'verification.checks'
  | 'verification.status'
  | 'limitation.title'
  | 'limitation.apiUnsupported'
  | 'limitation.manualSteps';
