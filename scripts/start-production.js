import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const webPort = process.env.PORT || '3000';
const serverPort = process.env.SERVER_PORT || '3001';

console.log(`[Production] Starting Liara Copilot...`);
console.log(`[Production] Frontend port: ${webPort}`);
console.log(`[Production] Backend API port: ${serverPort}`);

// Start Fastify API server
const server = spawn('node', ['apps/server/dist/index.js'], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: serverPort,
    SERVER_PORT: serverPort,
  },
  stdio: 'inherit',
});

// Start Next.js web frontend
const web = spawn(
  'pnpm',
  ['--filter', '@copilot/web', 'start'],
  {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: webPort,
      HOSTNAME: '0.0.0.0',
      API_URL: process.env.API_URL || `http://127.0.0.1:${serverPort}`,
    },
    stdio: 'inherit',
  },
);

let isShuttingDown = false;
function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('[Production] Terminating services...');
  try {
    server.kill('SIGTERM');
  } catch {}
  try {
    web.kill('SIGTERM');
  } catch {}
  setTimeout(() => process.exit(exitCode), 2000);
}

server.on('exit', (code) => {
  console.error(`[Production] Server process exited with code ${code}`);
  if (code !== 0) {
    shutdown(code ?? 1);
  }
});

web.on('exit', (code) => {
  console.error(`[Production] Web process exited with code ${code}`);
  if (code !== 0) {
    shutdown(code ?? 1);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
