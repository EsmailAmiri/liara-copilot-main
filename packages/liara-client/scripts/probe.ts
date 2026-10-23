import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpLiaraClient } from '../src/http-client.js';
import { MockLiaraClient } from '../src/mock/index.js';
import type { LiaraClient } from '../src/client.js';
import { CapabilityEntry, INITIAL_CAPABILITIES } from '../src/capabilities.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../..');

async function runProbe() {
  const allowWrite = process.argv.includes('--allow-write');
  const token = process.env.LIARA_API_TOKEN;
  const isLive = process.env.LIARA_MODE === 'live' && !!token;

  console.log(
    `\n🔍 Starting Liara API Probe (Mode: ${isLive ? 'LIVE' : 'MOCK'}, Allow-Write: ${allowWrite})`,
  );

  let client: LiaraClient;
  if (isLive && token) {
    client = new HttpLiaraClient({
      apiToken: token,
      teamId: process.env.LIARA_TEAM_ID,
    });
  } else {
    client = new MockLiaraClient('healthy');
  }

  const results: CapabilityEntry[] = JSON.parse(JSON.stringify(INITIAL_CAPABILITIES));
  const checkedAt = new Date().toISOString();

  // Helper to update capability
  function updateCap(id: string, update: Partial<CapabilityEntry>) {
    const item = results.find((c) => c.id === id);
    if (item) {
      Object.assign(item, update, { lastCheckedAt: checkedAt });
    }
  }

  // 1. Verify Auth
  console.log('Testing auth.verify & account...');
  const accountRes = await client.getAccount();
  if (accountRes.ok) {
    updateCap('auth.verify', { status: 'supported', notes: `Verified (${accountRes.data.email})` });
    updateCap('account.balance', {
      status: 'supported',
      notes: `Balance: ${accountRes.data.balance ?? 0}`,
    });
  } else {
    updateCap('auth.verify', { status: 'unsupported', notes: accountRes.message });
  }

  // 2. List Apps
  console.log('Testing apps.list...');
  const appsRes = await client.listApps();
  let firstAppName = '';
  if (appsRes.ok) {
    updateCap('apps.list', { status: 'supported', notes: `Found ${appsRes.data.length} apps` });
    if (appsRes.data.length > 0 && appsRes.data[0]) {
      firstAppName = appsRes.data[0].name;
    }
  } else {
    updateCap('apps.list', { status: 'unsupported', notes: appsRes.message });
  }

  // 3. List Plans
  console.log('Testing apps.plan.list...');
  const plansRes = await client.listPlans();
  if (plansRes.ok) {
    updateCap('apps.plan.list', {
      status: 'supported',
      notes: `${plansRes.data.length} plans available`,
    });
  } else {
    updateCap('apps.plan.list', { status: 'unsupported', notes: plansRes.message });
  }

  // 4. Test read endpoints on existing app if present
  if (firstAppName) {
    console.log(`Testing read tools on existing app "${firstAppName}"...`);
    const appRes = await client.getApp(firstAppName);
    if (appRes.ok) updateCap('apps.get', { status: 'supported' });

    const logsRes = await client.getLogs(firstAppName, { limit: 10 });
    if (logsRes.ok) updateCap('apps.logs.read', { status: 'supported' });

    const metricsRes = await client.getMetrics(firstAppName);
    if (metricsRes.ok) updateCap('apps.metrics.read', { status: 'supported' });

    const envRes = await client.listEnv(firstAppName);
    if (envRes.ok) updateCap('apps.env.list', { status: 'supported' });

    const domRes = await client.listDomains(firstAppName);
    if (domRes.ok) updateCap('apps.domains.list', { status: 'supported' });

    const relRes = await client.listReleases(firstAppName);
    if (relRes.ok) updateCap('apps.releases.list', { status: 'supported' });
  }

  // 5. Test write flows if --allow-write
  if (allowWrite) {
    const probeAppName = `copilot-probe-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`Executing write probe on disposable app "${probeAppName}"...`);
    try {
      const createRes = await client.createApp({ name: probeAppName, platform: 'node' });
      if (createRes.ok) {
        updateCap('apps.create', { status: 'supported' });

        const setEnvRes = await client.setEnv(probeAppName, { PROBE_VAR: '1' });
        if (setEnvRes.ok) {
          updateCap('apps.env.set', { status: 'supported', restartsApp: true });
        }

        const restartRes = await client.restartApp(probeAppName);
        if (restartRes.ok) {
          updateCap('apps.restart', { status: 'supported', restartsApp: true });
        }
      }
    } finally {
      console.log(`Cleaning up disposable app "${probeAppName}"...`);
      const delRes = await client.deleteApp(probeAppName);
      if (delRes.ok) {
        updateCap('apps.delete', { status: 'supported' });
      }
    }
  }

  // Write outputs
  const jsonPath = resolve(__dirname, '../capabilities.json');
  writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Saved capabilities JSON to: ${jsonPath}`);

  // Generate markdown table for docs/LIARA_CAPABILITIES.md
  let md = `# Liara API Capabilities Matrix\n\n`;
  md += `> Automatically generated on **${checkedAt}** (Mode: **${isLive ? 'LIVE' : 'MOCK'}**).\n\n`;
  md += `| Capability | Status | Channel | Restarts App | Notes |\n`;
  md += `|---|---|---|---|---|\n`;

  for (const c of results) {
    const statusBadge =
      c.status === 'supported'
        ? '✅ Supported'
        : c.status === 'partial'
          ? '⚠️ Partial'
          : '❌ Unsupported';
    md += `| **${c.id}** (${c.label}) | ${statusBadge} | \`${c.via}\` | ${c.restartsApp ? 'Yes' : 'No'} | ${c.notes || '-'} |\n`;
  }

  const docPath = resolve(rootDir, 'docs/LIARA_CAPABILITIES.md');
  writeFileSync(docPath, md, 'utf-8');
  console.log(`Saved capabilities doc to: ${docPath}`);

  console.log('\n✅ Probe complete!');
}

runProbe().catch((err) => {
  console.error('Probe failed:', err);
  process.exit(1);
});
