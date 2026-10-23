import type { EvidenceBundle, Hypothesis } from '@copilot/shared';

export interface Detector {
  id: string;
  detect(bundle: EvidenceBundle): Hypothesis | null;
}

// 1. OOM Kill Detector
export const oomKillDetector: Detector = {
  id: 'oom_kill',
  detect(bundle) {
    const oomEvidence = bundle.items.filter(
      (it) =>
        it.kind === 'logs' &&
        /(?:out of memory|oom|sigkill|killed process|exit code 137)/i.test(
          it.excerpt || it.summary,
        ),
    );

    if (oomEvidence.length > 0) {
      return {
        id: 'oom_kill',
        title: 'خروج کانتینر به دلیل اتمام حافظه (OOM Kill)',
        confidence: 0.95,
        evidenceIds: oomEvidence.map((e) => e.id),
        explanation_key: 'diagnosis.oomKill',
        suggestedActions: [
          {
            tool: 'change_plan',
            args: { app: bundle.appName, plan: 'standard-2g' },
            rationale_key: 'rationale.upgradeRam',
            risk: 'high',
          },
        ],
      };
    }
    return null;
  },
};

// 2. Memory Pressure Detector
export const memoryPressureDetector: Detector = {
  id: 'memory_pressure',
  detect(bundle) {
    const metricsEvidence = bundle.items.filter((it) => it.kind === 'metrics');
    for (const it of metricsEvidence) {
      if (it.excerpt) {
        try {
          const parsed = JSON.parse(it.excerpt);
          if (parsed.maxRamPercent >= 85 || parsed.latestMemoryPercent >= 85) {
            return {
              id: 'memory_pressure',
              title: 'فشار شدید بر حافظه RAM (بیش از ۸۵٪)',
              confidence: 0.88,
              evidenceIds: [it.id],
              explanation_key: 'diagnosis.memoryPressure',
              suggestedActions: [
                {
                  tool: 'change_plan',
                  args: { app: bundle.appName, plan: 'standard-2g' },
                  rationale_key: 'rationale.upgradePlanRam',
                  risk: 'high',
                },
              ],
            };
          }
        } catch {
          // ignore parse error
        }
      }
    }
    return null;
  },
};

// 3. CPU Saturation Detector
export const cpuSaturationDetector: Detector = {
  id: 'cpu_saturation',
  detect(bundle) {
    const metricsEvidence = bundle.items.filter((it) => it.kind === 'metrics');
    for (const it of metricsEvidence) {
      if (it.excerpt) {
        try {
          const parsed = JSON.parse(it.excerpt);
          if (parsed.maxCpuPercent >= 90) {
            return {
              id: 'cpu_saturation',
              title: 'اشباع پردازنده CPU (بیش از ۹۰٪)',
              confidence: 0.85,
              evidenceIds: [it.id],
              explanation_key: 'diagnosis.cpuSaturation',
              suggestedActions: [
                {
                  tool: 'change_plan',
                  args: { app: bundle.appName, plan: 'standard-2g' },
                  rationale_key: 'rationale.upgradePlanCpu',
                  risk: 'high',
                },
              ],
            };
          }
        } catch {
          // ignore
        }
      }
    }
    return null;
  },
};

// 4. Missing Environment Variable Detector
export const missingEnvDetector: Detector = {
  id: 'missing_env',
  detect(bundle) {
    const logEvidence = bundle.items.filter((it) => it.kind === 'logs');
    const httpEvidence = bundle.items.filter((it) => it.kind === 'http');

    const envMatches: string[] = [];
    const matchedEvidenceIds: string[] = [];

    for (const it of logEvidence) {
      const text = `${it.summary} ${it.excerpt || ''}`;
      const missingMatch = text.match(
        /(?:missing required env|not defined|KeyError|process\.env\.)\s*([A-Z0-9_]+)/i,
      );
      if (missingMatch && missingMatch[1]) {
        envMatches.push(missingMatch[1].toUpperCase());
        matchedEvidenceIds.push(it.id);
      }
    }

    if (envMatches.length > 0) {
      const varName = envMatches[0];
      if (httpEvidence.length > 0) {
        matchedEvidenceIds.push(httpEvidence[0]!.id);
      }

      return {
        id: 'missing_env',
        title: `عدم تنظیم متغیر محیطی ضروری (${varName})`,
        confidence: 0.95,
        evidenceIds: matchedEvidenceIds,
        explanation_key: 'diagnosis.missingEnv',
        suggestedActions: [
          {
            tool: 'set_env',
            args: {
              app: bundle.appName,
              variables: { [varName!]: 'postgres://user:pass@localhost:5432/shop' },
            },
            rationale_key: 'rationale.setMissingEnv',
            risk: 'high',
          },
        ],
      };
    }
    return null;
  },
};

// 5. Port Mismatch Detector
export const portMismatchDetector: Detector = {
  id: 'port_mismatch',
  detect(bundle) {
    const logEvidence = bundle.items.filter((it) => it.kind === 'logs');
    const httpEvidence = bundle.items.filter((it) => it.kind === 'http');

    const evidenceIds: string[] = [];
    let detectedPort: string | null = null;

    for (const it of logEvidence) {
      const text = `${it.summary} ${it.excerpt || ''}`;
      const match = text.match(/listening on port\s*(\d+)/i);
      if (match && match[1]) {
        detectedPort = match[1];
        evidenceIds.push(it.id);
      }
    }

    for (const it of httpEvidence) {
      if (
        it.summary.includes('502') ||
        it.excerpt?.includes('Connection refused') ||
        it.summary.includes('وضعیت 0')
      ) {
        evidenceIds.push(it.id);
      }
    }

    if (detectedPort && detectedPort !== '3000' && evidenceIds.length > 0) {
      return {
        id: 'port_mismatch',
        title: `عدم تطابق پورت برنامه (پورت شنود: ${detectedPort})`,
        confidence: 0.92,
        evidenceIds,
        explanation_key: 'diagnosis.portMismatch',
        suggestedActions: [
          {
            tool: 'set_env',
            args: { app: bundle.appName, variables: { PORT: '3000' } },
            rationale_key: 'rationale.setPortEnv',
            risk: 'high',
          },
        ],
      };
    }

    return null;
  },
};

// 6. Database Connection Failure Detector
export const dbConnectionDetector: Detector = {
  id: 'db_connection',
  detect(bundle) {
    const logEvidence = bundle.items.filter(
      (it) =>
        it.kind === 'logs' &&
        /(?:ECONNREFUSED|ETIMEDOUT|SequelizeConnection|MongoNetworkError|password authentication failed|too many connections)/i.test(
          it.excerpt || it.summary,
        ),
    );

    if (logEvidence.length > 0) {
      return {
        id: 'db_connection',
        title: 'عدم برقراری ارتباط با پایگاه داده (Database Connection Error)',
        confidence: 0.9,
        evidenceIds: logEvidence.map((e) => e.id),
        explanation_key: 'diagnosis.dbConnection',
        suggestedActions: [
          {
            tool: 'get_logs',
            args: { app: bundle.appName, limit: 50 },
            rationale_key: 'rationale.checkDbLogs',
            risk: 'read',
          },
        ],
      };
    }

    return null;
  },
};

// 7. Disk Full Detector
export const diskFullDetector: Detector = {
  id: 'disk_full',
  detect(bundle) {
    const diskLogs = bundle.items.filter(
      (it) =>
        it.kind === 'logs' &&
        /(?:ENOSPC|no space left on device|disk full)/i.test(it.excerpt || it.summary),
    );

    if (diskLogs.length > 0) {
      return {
        id: 'disk_full',
        title: 'پر شدن دیسک برنامه (ENOSPC)',
        confidence: 0.94,
        evidenceIds: diskLogs.map((e) => e.id),
        explanation_key: 'diagnosis.diskFull',
        suggestedActions: [
          {
            tool: 'restart_app',
            args: { app: bundle.appName },
            rationale_key: 'rationale.restartClearTmp',
            risk: 'high',
          },
        ],
      };
    }
    return null;
  },
};

// 8. HTTP 5xx Burst Detector
export const http5xxBurstDetector: Detector = {
  id: 'http_5xx_burst',
  detect(bundle) {
    const httpEvidence = bundle.items.filter(
      (it) => it.kind === 'http' && /(?:وضعیت 5|500|502|503|504)/.test(it.summary),
    );

    if (httpEvidence.length > 0) {
      return {
        id: 'http_5xx_burst',
        title: 'بروز خطاهای سمت سرور (HTTP 5xx)',
        confidence: 0.75,
        evidenceIds: httpEvidence.map((e) => e.id),
        explanation_key: 'diagnosis.http5xxBurst',
        suggestedActions: [
          {
            tool: 'get_logs',
            args: { app: bundle.appName, limit: 100 },
            rationale_key: 'rationale.checkRecentLogs',
            risk: 'read',
          },
        ],
      };
    }
    return null;
  },
};

export const ALL_DETECTORS: Detector[] = [
  oomKillDetector,
  memoryPressureDetector,
  cpuSaturationDetector,
  missingEnvDetector,
  portMismatchDetector,
  dbConnectionDetector,
  diskFullDetector,
  http5xxBurstDetector,
];
