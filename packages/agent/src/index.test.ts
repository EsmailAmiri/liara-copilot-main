import { describe, it, expect } from 'vitest';
import {
  oomKillDetector,
  memoryPressureDetector,
  missingEnvDetector,
  portMismatchDetector,
  dbConnectionDetector,
} from './detectors/index.js';
import { runDiagnosis, validateCitations } from './diagnosis.js';
import { analyzeProjectDirectory, recommendPlan } from './project-analyzer.js';
import { MockScriptedLLM } from './llm/mock.js';
import { AgentLoop } from './loop.js';
import { MockLiaraClient } from '@copilot/liara-client';
import type { EvidenceBundle } from '@copilot/shared';
import { ToolContext } from '@copilot/tools';

describe('Detectors', () => {
  it('detects missing_env from logs', () => {
    const bundle: EvidenceBundle = {
      appName: 'test-app',
      collectedAt: new Date().toISOString(),
      items: [
        {
          id: 'E1',
          source: 'liara-api',
          kind: 'logs',
          summary: 'App crashed',
          excerpt: 'Error: Missing required env DATABASE_URL\n    at start (/app/index.js:10)',
        },
      ],
      gaps: [],
    };

    const res = missingEnvDetector.detect(bundle);
    expect(res).not.toBeNull();
    expect(res?.id).toBe('missing_env');
    expect(res?.evidenceIds).toContain('E1');
    expect(res?.suggestedActions[0]?.tool).toBe('set_env');
  });

  it('detects oom_kill and memory_pressure', () => {
    const bundle: EvidenceBundle = {
      appName: 'test-app',
      collectedAt: new Date().toISOString(),
      items: [
        {
          id: 'E1',
          source: 'liara-api',
          kind: 'logs',
          summary: 'Container killed',
          excerpt: 'Process exited with signal SIGKILL (Out of memory)',
        },
        {
          id: 'E2',
          source: 'liara-api',
          kind: 'metrics',
          summary: 'RAM 95%',
          excerpt: JSON.stringify({ latestMemoryPercent: 95, maxRamPercent: 96 }),
        },
      ],
      gaps: [],
    };

    const oom = oomKillDetector.detect(bundle);
    expect(oom).not.toBeNull();
    expect(oom?.id).toBe('oom_kill');

    const pressure = memoryPressureDetector.detect(bundle);
    expect(pressure).not.toBeNull();
    expect(pressure?.id).toBe('memory_pressure');
  });

  it('detects port_mismatch', () => {
    const bundle: EvidenceBundle = {
      appName: 'test-app',
      collectedAt: new Date().toISOString(),
      items: [
        {
          id: 'E1',
          source: 'liara-api',
          kind: 'logs',
          summary: 'Server listening',
          excerpt: 'Server listening on port 8080',
        },
        {
          id: 'E2',
          source: 'http-probe',
          kind: 'http',
          summary: 'HTTP 502 Bad Gateway',
          excerpt: 'Connection refused on port 3000',
        },
      ],
      gaps: [],
    };

    const res = portMismatchDetector.detect(bundle);
    expect(res).not.toBeNull();
    expect(res?.id).toBe('port_mismatch');
  });

  it('detects db_connection error', () => {
    const bundle: EvidenceBundle = {
      appName: 'test-app',
      collectedAt: new Date().toISOString(),
      items: [
        {
          id: 'E1',
          source: 'liara-api',
          kind: 'logs',
          summary: 'DB error',
          excerpt: 'connect ECONNREFUSED 10.0.0.5:5432',
        },
      ],
      gaps: [],
    };

    const res = dbConnectionDetector.detect(bundle);
    expect(res).not.toBeNull();
    expect(res?.id).toBe('db_connection');
  });
});

describe('Diagnosis & Citations', () => {
  it('merges, boosts confidence, and ranks hypotheses', () => {
    const bundle: EvidenceBundle = {
      appName: 'test-app',
      collectedAt: new Date().toISOString(),
      items: [
        {
          id: 'E1',
          source: 'liara-api',
          kind: 'logs',
          summary: 'Missing required env DATABASE_URL',
        },
        {
          id: 'E2',
          source: 'http-probe',
          kind: 'http',
          summary: 'HTTP 500 error',
        },
      ],
      gaps: [],
    };

    const hypotheses = runDiagnosis(bundle);
    expect(hypotheses.length).toBeGreaterThan(0);
    expect(hypotheses[0]?.id).toBe('missing_env');
    expect(hypotheses[0]?.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('validates citations and strips invalid evidence IDs', () => {
    const text = 'علت در [E1] و [E99] ذکر شده است.';
    const validated = validateCitations(text, ['E1', 'E2']);
    expect(validated).toContain('[E1]');
    expect(validated).not.toContain('E99');
  });
});

describe('Project Analyzer & Plan Recommendation', () => {
  it('detects framework and port for node project', () => {
    // Current directory is Node project with package.json
    const analysis = analyzeProjectDirectory('.');
    expect(analysis.platform).toBe('node');
    expect(analysis.port).toBe(3000);

    const rec = recommendPlan(analysis);
    expect(rec.recommendedPlan).toBeDefined();
    expect(rec.costEstimate).toBeDefined();
  });
});

describe('Agent Loop in Mock Mode', () => {
  it('runs troubleshoot flow to completion with auto-approval', async () => {
    const mockClient = new MockLiaraClient('missing_env_500');
    const mockLLM = new MockScriptedLLM('missing_env_500');
    const ctx: ToolContext = {
      client: mockClient,
      traceId: 'tr_test',
    };

    const events: string[] = [];
    const loop = new AgentLoop({
      llm: mockLLM,
      context: ctx,
      conversationId: 'c1',
      autoApprove: true,
      onEvent: (ev) => {
        events.push(ev.type);
      },
      proposeApprovalFn: async (tool, args) => ({
        id: 'act_1',
        conversationId: 'c1',
        tool: tool.name,
        args,
        argsHash: 'hash',
        card: {
          title: 'Action',
          summary: 'Summary',
          impact: [],
          risk: 'high',
          details: [],
          capabilityVia: 'api',
        },
        risk: 'high',
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        status: 'pending',
      }),
      approveActionFn: async (_id) => {
        // Execute tool action
        await mockClient.setEnv('demo-shop', { DATABASE_URL: 'postgres://localhost' });
        await mockClient.restartApp('demo-shop');
        return { success: true };
      },
    });

    const result = await loop.run([{ role: 'user', content: 'چرا سایتم خطای ۵۰۰ می‌دهد؟' }]);

    expect(result.status).toBe('completed');
    expect(events).toContain('tool.started');
    expect(events).toContain('diagnosis.ready');
  });
});
