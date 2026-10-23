import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { HttpLiaraClient } from '../packages/liara-client/src/http-client.js';

config({ path: resolve(process.cwd(), '.env') });

const validFaults = ['none', 'missing_env', 'memory_leak', 'wrong_port', 'db_down'] as const;
type FaultMode = (typeof validFaults)[number];

const targetFault = (process.argv[2] || 'none') as FaultMode;

if (!validFaults.includes(targetFault)) {
  console.error(
    `❌ Invalid fault mode "${targetFault}". Must be one of: ${validFaults.join(', ')}`,
  );
  process.exit(1);
}

const appArgIdx = process.argv.indexOf('--app');
const targetApp =
  appArgIdx !== -1 ? process.argv[appArgIdx + 1] : process.env.DEMO_APP_NAME || 'demo-shop';

async function main() {
  console.log(`\n🔧 Setting Demo App FAULT mode to: "${targetFault}" on app "${targetApp}"`);

  // 1. Update local .env if present
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    let envContent = readFileSync(envPath, 'utf-8');
    if (/FAULT=.*/.test(envContent)) {
      envContent = envContent.replace(/FAULT=.*/, `FAULT=${targetFault}`);
    } else {
      envContent += `\nFAULT=${targetFault}\n`;
    }
    writeFileSync(envPath, envContent, 'utf-8');
    console.log(`✅ Updated local .env: FAULT=${targetFault}`);
  }

  // 2. If live mode and token present, update remote app on Liara
  const token = process.env.LIARA_API_TOKEN;
  if (process.env.LIARA_MODE === 'live' && token && targetApp) {
    console.log(`☁️ Updating FAULT on remote Liara app "${targetApp}"...`);
    const client = new HttpLiaraClient({
      apiToken: token,
      teamId: process.env.LIARA_TEAM_ID,
    });
    const res = await client.setEnv(targetApp, { FAULT: targetFault });
    if (res.ok) {
      console.log(`✅ Successfully updated FAULT on Liara app "${targetApp}"!`);
      const restartRes = await client.restartApp(targetApp);
      if (restartRes.ok) {
        console.log(`🔄 Restarted app "${targetApp}" to apply new fault mode.`);
      }
    } else {
      console.error(`⚠️ Failed to update remote app: ${res.message}`);
    }
  }

  console.log(`\nSymptom summary for "${targetFault}":`);
  switch (targetFault) {
    case 'none':
      console.log('• App is healthy, returns 200 OK.');
      break;
    case 'missing_env':
      console.log('• Missing DATABASE_URL -> returns 500 Internal Server Error.');
      break;
    case 'memory_leak':
      console.log('• High memory usage (RAM >= 85%) -> causes OOM Kill / restarts.');
      break;
    case 'wrong_port':
      console.log('• Listens on port 8080 instead of 3000 -> 502 Bad Gateway.');
      break;
    case 'db_down':
      console.log('• Database unreachable -> ECONNREFUSED error on data endpoints.');
      break;
  }
}

main().catch(console.error);
