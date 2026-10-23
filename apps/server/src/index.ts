import { buildApp } from './app.js';
import { getConfig } from './config.js';

const config = getConfig();
const app = buildApp({ config });

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`🚀 Liara Copilot API Server listening on http://0.0.0.0:${config.PORT}`);
    console.log(`   Mode: Liara=${config.LIARA_MODE}, LLM=${config.LLM_MODE}`);

    const monitor = (app as unknown as { monitor?: { start(): void } }).monitor;
    if (monitor) {
      monitor.start();
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
