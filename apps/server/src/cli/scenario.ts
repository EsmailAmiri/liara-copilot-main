import { resolve } from 'node:path';
import { config } from 'dotenv';
import { MockLiaraClient, type ScenarioId } from '@copilot/liara-client';
import { MockScriptedLLM, AgentLoop } from '@copilot/agent';
import { defaultToolRegistry, type ToolContext } from '@copilot/tools';
import { ApprovalStore } from '../approvals/store.js';
import { ApprovalGate } from '../approvals/gate.js';
import type { ServerEvent, VerificationResult } from '@copilot/shared';

// Load environment variables if present
config({ path: resolve(process.cwd(), '.env') });

const scenarioId = (process.argv[2] || 'missing_env_500') as ScenarioId;
const autoApprove = process.argv.includes('--auto-approve');
const isLive = process.argv.includes('--live');

async function runScenario() {
  console.log(`\n===============================================================`);
  console.log(
    `🎬 Running Scenario: "${scenarioId}" (Auto-Approve: ${autoApprove}, Live: ${isLive})`,
  );
  console.log(`===============================================================\n`);

  const mockClient = new MockLiaraClient(scenarioId);
  const mockLLM = new MockScriptedLLM(scenarioId);

  const store = new ApprovalStore(':memory:');
  const gate = new ApprovalGate({ store, ttlSeconds: 300 });

  const ctx: ToolContext = {
    client: mockClient,
    traceId: `tr_sc_${Date.now()}`,
    conversationId: `conv_${scenarioId}`,
  };

  let lastVerification: VerificationResult | undefined;

  const loop = new AgentLoop({
    llm: mockLLM,
    context: ctx,
    conversationId: `conv_${scenarioId}`,
    autoApprove,
    onEvent: (event: ServerEvent) => {
      switch (event.type) {
        case 'message.delta':
          process.stdout.write(event.delta);
          break;
        case 'message.done':
          console.log('\n--- [Message Done] ---\n');
          break;
        case 'timeline.step':
          console.log(
            `⏱️ [Timeline] ${event.step.status.toUpperCase()}: ${event.step.title} (${event.step.tool})`,
          );
          break;
        case 'approval.required':
          console.log(
            `\n🛡️ [Approval Required] ${event.card.title} (Action ID: ${event.actionId})`,
          );
          console.log(`   Summary: ${event.card.summary}`);
          console.log(`   Impact: ${event.card.impact.join(', ')}`);
          break;
        case 'diagnosis.ready':
          console.log(`\n🩺 [Diagnosis Ready] Top Hypotheses:`);
          for (const h of event.hypotheses) {
            console.log(
              `   • ${h.title} (اطمینان: ${Math.round(h.confidence * 100)}%, شواهد: ${h.evidenceIds.join(', ')})`,
            );
          }
          console.log('');
          break;
        case 'verification.result':
          lastVerification = event.result;
          console.log(`\n🔍 [Verification Result] Verdict: ${event.result.verdict.toUpperCase()}`);
          for (const ch of event.result.checks) {
            console.log(`   ${ch.pass ? '✅' : '❌'} ${ch.name}: ${ch.detail || ''}`);
          }
          console.log('');
          break;
      }
    },
    proposeApprovalFn: async (tool, args) => {
      return gate.propose({
        conversationId: `conv_${scenarioId}`,
        tool,
        args,
        ctx,
      });
    },
    approveActionFn: async (actionId) => {
      const res = await gate.approve(actionId, async (toolName, args) => {
        return defaultToolRegistry.executeTool(toolName, args, ctx);
      });
      if (!res.ok) {
        throw new Error(`Approval failed: ${res.message}`);
      }
      return res.data;
    },
  });

  // Prompt based on scenario
  let userPrompt = 'سلام، سایتم با مشکل مواجه شده و خطای ۵۰۰ می‌دهد. لطفاً بررسی کن.';
  if (scenarioId === 'memory_leak_oom') {
    userPrompt = 'سایتم بسیار کند شده و مرتباً ری‌استارت می‌شود. علت چیست؟';
  } else if (scenarioId === 'wrong_port') {
    userPrompt = 'سایت پیام 502 Bad Gateway می‌دهد و در دسترس نیست.';
  } else if (scenarioId === 'fresh_project') {
    userPrompt = 'می‌خواهم این پروژه جدید را روی لیارا دیپلوی کنم.';
  } else if (scenarioId === 'db_down') {
    userPrompt = 'دیتابیس در دسترسم نیست و خطای ارتباطی دارم.';
  } else if (scenarioId === 'api_gap') {
    userPrompt = 'می‌خواهم لاگ‌های زنده‌ام را به صورت استریم استخراج کنم.';
  }

  console.log(`👤 User: "${userPrompt}"\n`);
  const initialResult = await loop.run([{ role: 'user', content: userPrompt }]);

  // If the agent waited for approval and autoApprove was off, we simulate human approval
  if (
    initialResult.status === 'waiting_for_approval' &&
    initialResult.pendingAction &&
    autoApprove
  ) {
    console.log(`\nExecuting human approval for ${initialResult.pendingAction.id}...`);
    await gate.approve(initialResult.pendingAction.id, async (toolName, args) => {
      return defaultToolRegistry.executeTool(toolName, args, ctx);
    });

    console.log(`\nTriggering continuation turn after approval...`);
    await loop.run([
      ...initialResult.messages,
      {
        role: 'user',
        content: `Approved action executed: ${initialResult.pendingAction.tool}`,
      },
    ]);
  }

  console.log(`\n===============================================================`);
  console.log(`🏁 Scenario "${scenarioId}" Finished!`);
  if (lastVerification) {
    console.log(`📊 Final Verification Verdict: ${lastVerification.verdict.toUpperCase()}`);
  }
  console.log(`===============================================================\n`);
}

runScenario().catch((err) => {
  console.error('Scenario execution failed:', err);
  process.exit(1);
});
