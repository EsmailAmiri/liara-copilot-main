import Fastify from 'fastify';

const fault = process.env.FAULT || 'none';
const configuredPort = parseInt(process.env.PORT || '3000', 10);
// If fault === 'wrong_port', listen on 8080 instead of configuredPort!
const listenPort = fault === 'wrong_port' ? 8080 : configuredPort;

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: false },
    },
  },
});

// Leaked memory storage for memory_leak fault
const memoryLeakRetainer: Buffer[] = [];

console.log(
  JSON.stringify({
    level: 'info',
    msg: `فروشگاه نمونه راه‌اندازی شد. (حالت خطا: ${fault}, پورت: ${listenPort})`,
    timestamp: new Date().toISOString(),
  }),
);

// If wrong_port fault, also log health probe failure
if (fault === 'wrong_port') {
  console.log(
    JSON.stringify({
      level: 'warn',
      msg: `Health check probe to port 3000 failed: ECONNREFUSED 127.0.0.1:3000`,
      timestamp: new Date().toISOString(),
    }),
  );
}

app.get('/health', async (_req, reply) => {
  if (fault === 'missing_env' && !process.env.DATABASE_URL) {
    console.log(
      JSON.stringify({
        level: 'error',
        msg: 'Error: Missing required env DATABASE_URL\n    at initDatabase (/app/dist/index.js:42:11)',
        timestamp: new Date().toISOString(),
      }),
    );
    return reply.status(500).send({ status: 'error', error: 'Missing required env DATABASE_URL' });
  }

  return { status: 'healthy', fault, port: listenPort };
});

app.get('/', async (_req, reply) => {
  // Fault: missing_env
  if (fault === 'missing_env' && !process.env.DATABASE_URL) {
    console.log(
      JSON.stringify({
        level: 'error',
        msg: 'Error: Missing required env DATABASE_URL',
        timestamp: new Date().toISOString(),
      }),
    );
    return reply.status(500).send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
        <head><title>خطای سرور</title></head>
        <body style="font-family:sans-serif; text-align:center; padding:50px;">
          <h1 style="color:#e11d48;">خطای ۵۰۰ — متغیر محیطی تنظیم نشده است</h1>
          <p>Error: Missing required env DATABASE_URL</p>
        </body>
      </html>
    `);
  }

  // Fault: memory_leak
  if (fault === 'memory_leak') {
    // Retain 4MB per request to simulate rapid leak
    const leakChunk = Buffer.alloc(4 * 1024 * 1024, 'X');
    memoryLeakRetainer.push(leakChunk);
    const usedMB = Math.round(process.memoryUsage().rss / (1024 * 1024));
    console.log(
      JSON.stringify({
        level: 'warn',
        msg: `Memory consumption rising rapidly: ${usedMB}MB / 512MB (${Math.round((usedMB / 512) * 100)}%)`,
        timestamp: new Date().toISOString(),
      }),
    );
    if (usedMB > 480) {
      console.log(
        JSON.stringify({
          level: 'error',
          msg: 'Process exited with signal SIGKILL (Out of memory)',
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }

  // Fault: db_down
  if (fault === 'db_down') {
    console.log(
      JSON.stringify({
        level: 'error',
        msg: 'Database connection failed: connect ECONNREFUSED 10.0.4.12:5432',
        timestamp: new Date().toISOString(),
      }),
    );
    return reply.status(500).send({
      error: 'Database unreachable',
      code: 'ECONNREFUSED',
    });
  }

  // Healthy HTML Page
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8" />
        <title>فروشگاه نمونه — دمو لیارا کوپایلوت</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; text-align: center; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #dcfce7; color: #166534; margin-bottom: 16px; }
          h1 { margin: 0 0 12px; font-size: 24px; }
          p { color: #64748b; font-size: 14px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">وضعیت: کاملاً پایدار (Healthy)</div>
          <h1>فروشگاه نمونه ایرانی</h1>
          <p>این برنامه به عنوان سایت نمونه تستی جهت سناریوهای مانیتورینگ، استقرار و رفع خطای هوشمند لیارا کوپایلوت استفاده می‌شود.</p>
        </div>
      </body>
    </html>
  `;
});

app.get('/api/items', async (_req, reply) => {
  if (fault === 'missing_env' && !process.env.DATABASE_URL) {
    return reply.status(500).send({ error: 'Missing required env DATABASE_URL' });
  }
  if (fault === 'db_down') {
    return reply.status(500).send({ error: 'Database connection failed', code: 'ECONNREFUSED' });
  }

  return {
    items: [
      { id: 1, name: 'سرور ابری لینوکس', price: 250000 },
      { id: 2, name: 'فضای ذخیره‌سازی S3', price: 120000 },
      { id: 3, name: 'پایگاه داده مدیریت‌شده', price: 380000 },
    ],
  };
});

const start = async () => {
  try {
    await app.listen({ port: listenPort, host: '0.0.0.0' });
    console.log(`Server listening on port ${listenPort}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
