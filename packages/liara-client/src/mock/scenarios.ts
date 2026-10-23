import type { AppDetails, LogEntry, MetricSample, PlanInfo } from '../client.js';

export type ScenarioId =
  | 'healthy'
  | 'fresh_project'
  | 'missing_env_500'
  | 'memory_leak_oom'
  | 'wrong_port'
  | 'db_down'
  | 'api_gap';

export interface AppMockState {
  app: AppDetails;
  env: Record<string, string>;
  logs: LogEntry[];
  metrics: MetricSample[];
  httpStatus: number;
  httpLatencyMs: number;
  httpBody: string;
}

export const MOCK_PLANS: PlanInfo[] = [
  {
    id: 'standard-512m',
    name: 'استاندارد ۵۱۲ مگابایت',
    cpu: 0.5,
    ram: 512,
    disk: 10,
    pricePerHour: 200,
    pricePerMonth: 144000,
  },
  {
    id: 'standard-1g',
    name: 'استاندارد ۱ گیگابایت',
    cpu: 1,
    ram: 1024,
    disk: 15,
    pricePerHour: 400,
    pricePerMonth: 288000,
  },
  {
    id: 'standard-2g',
    name: 'استاندارد ۲ گیگابایت',
    cpu: 2,
    ram: 2048,
    disk: 25,
    pricePerHour: 800,
    pricePerMonth: 576000,
  },
  {
    id: 'standard-4g',
    name: 'استاندارد ۴ گیگابایت',
    cpu: 4,
    ram: 4096,
    disk: 40,
    pricePerHour: 1600,
    pricePerMonth: 1152000,
  },
];

export function getInitialScenarioState(id: ScenarioId, now: number): Record<string, AppMockState> {
  const ts = new Date(now).toISOString();

  switch (id) {
    case 'fresh_project':
      return {};

    case 'healthy':
      return {
        'demo-shop': {
          app: {
            project_id: 'demo-shop',
            name: 'demo-shop',
            platform: 'node',
            status: 'running',
            plan: 'standard-1g',
            port: 3000,
            defaultSubdomain: 'demo-shop.iran.liara.run',
            domains: ['demo-shop.iran.liara.run'],
            created_at: ts,
            updated_at: ts,
            lastRelease: {
              id: 'rel_001',
              status: 'ready',
              createdAt: ts,
            },
          },
          env: {
            NODE_ENV: 'production',
            PORT: '3000',
            DATABASE_URL: 'postgres://user:pass@db:5432/shop',
          },
          logs: [
            { timestamp: ts, level: 'info', message: 'Application initialized in production mode' },
            {
              timestamp: ts,
              level: 'info',
              message: 'Connected to database postgres://user:pass@db:5432/shop',
            },
            { timestamp: ts, level: 'info', message: 'Server listening on port 3000' },
          ],
          metrics: [
            {
              timestamp: now - 300000,
              cpuPercent: 12,
              memoryMB: 280,
              memoryLimitMB: 1024,
              memoryPercent: 27,
            },
            {
              timestamp: now - 180000,
              cpuPercent: 15,
              memoryMB: 290,
              memoryLimitMB: 1024,
              memoryPercent: 28,
            },
            {
              timestamp: now,
              cpuPercent: 14,
              memoryMB: 295,
              memoryLimitMB: 1024,
              memoryPercent: 29,
            },
          ],
          httpStatus: 200,
          httpLatencyMs: 45,
          httpBody: '{"status":"ok","items":[{"id":1,"name":"کالای نمونه"}]}',
        },
      };

    case 'missing_env_500':
      return {
        'demo-shop': {
          app: {
            project_id: 'demo-shop',
            name: 'demo-shop',
            platform: 'node',
            status: 'running',
            plan: 'standard-512m',
            port: 3000,
            defaultSubdomain: 'demo-shop.iran.liara.run',
            domains: ['demo-shop.iran.liara.run'],
            created_at: ts,
            updated_at: ts,
            lastRelease: {
              id: 'rel_002',
              status: 'ready',
              createdAt: ts,
            },
          },
          env: {
            NODE_ENV: 'production',
            PORT: '3000',
            // DATABASE_URL is deliberately missing!
          },
          logs: [
            { timestamp: ts, level: 'info', message: 'Server starting on port 3000' },
            { timestamp: ts, level: 'error', message: 'Error: Missing required env DATABASE_URL' },
            {
              timestamp: ts,
              level: 'error',
              message: '    at initDatabase (/app/dist/index.js:42:11)',
            },
            { timestamp: ts, level: 'error', message: 'GET / 500 Internal Server Error in 12ms' },
          ],
          metrics: [
            {
              timestamp: now - 180000,
              cpuPercent: 5,
              memoryMB: 120,
              memoryLimitMB: 512,
              memoryPercent: 23,
            },
            { timestamp: now, cpuPercent: 6, memoryMB: 125, memoryLimitMB: 512, memoryPercent: 24 },
          ],
          httpStatus: 500,
          httpLatencyMs: 80,
          httpBody:
            '{"error":"Internal Server Error","message":"Missing required env DATABASE_URL"}',
        },
      };

    case 'memory_leak_oom':
      return {
        'demo-shop': {
          app: {
            project_id: 'demo-shop',
            name: 'demo-shop',
            platform: 'node',
            status: 'running',
            plan: 'standard-512m',
            port: 3000,
            defaultSubdomain: 'demo-shop.iran.liara.run',
            domains: ['demo-shop.iran.liara.run'],
            created_at: ts,
            updated_at: ts,
            lastRelease: {
              id: 'rel_003',
              status: 'ready',
              createdAt: ts,
            },
          },
          env: {
            NODE_ENV: 'production',
            PORT: '3000',
            FAULT: 'memory_leak',
          },
          logs: [
            {
              timestamp: ts,
              level: 'warn',
              message: 'Memory consumption rising rapidly: 470MB / 512MB (92%)',
            },
            {
              timestamp: ts,
              level: 'error',
              message: 'Process exited with signal SIGKILL (Out of memory)',
            },
            {
              timestamp: ts,
              level: 'info',
              message: 'Container restarted by orchestrator (exit code 137)',
            },
          ],
          metrics: [
            {
              timestamp: now - 360000,
              cpuPercent: 25,
              memoryMB: 280,
              memoryLimitMB: 512,
              memoryPercent: 55,
            },
            {
              timestamp: now - 180000,
              cpuPercent: 45,
              memoryMB: 440,
              memoryLimitMB: 512,
              memoryPercent: 86,
            },
            {
              timestamp: now,
              cpuPercent: 65,
              memoryMB: 495,
              memoryLimitMB: 512,
              memoryPercent: 96,
            },
          ],
          httpStatus: 504,
          httpLatencyMs: 2500,
          httpBody: '<html><body>504 Gateway Time-out</body></html>',
        },
      };

    case 'wrong_port':
      return {
        'demo-shop': {
          app: {
            project_id: 'demo-shop',
            name: 'demo-shop',
            platform: 'node',
            status: 'running',
            plan: 'standard-512m',
            port: 3000, // Liara configured for 3000
            defaultSubdomain: 'demo-shop.iran.liara.run',
            domains: ['demo-shop.iran.liara.run'],
            created_at: ts,
            updated_at: ts,
            lastRelease: {
              id: 'rel_004',
              status: 'ready',
              createdAt: ts,
            },
          },
          env: {
            NODE_ENV: 'production',
            PORT: '8080', // App listening on 8080 instead of 3000!
          },
          logs: [
            { timestamp: ts, level: 'info', message: 'Server listening on port 8080' },
            {
              timestamp: ts,
              level: 'warn',
              message: 'Health check probe to port 3000 failed: ECONNREFUSED 127.0.0.1:3000',
            },
          ],
          metrics: [
            {
              timestamp: now - 180000,
              cpuPercent: 5,
              memoryMB: 90,
              memoryLimitMB: 512,
              memoryPercent: 17,
            },
            { timestamp: now, cpuPercent: 4, memoryMB: 92, memoryLimitMB: 512, memoryPercent: 18 },
          ],
          httpStatus: 502,
          httpLatencyMs: 30,
          httpBody: '<html><body>502 Bad Gateway - Connection refused on port 3000</body></html>',
        },
      };

    case 'db_down':
      return {
        'demo-shop': {
          app: {
            project_id: 'demo-shop',
            name: 'demo-shop',
            platform: 'node',
            status: 'running',
            plan: 'standard-1g',
            port: 3000,
            defaultSubdomain: 'demo-shop.iran.liara.run',
            domains: ['demo-shop.iran.liara.run'],
            created_at: ts,
            updated_at: ts,
            lastRelease: {
              id: 'rel_005',
              status: 'ready',
              createdAt: ts,
            },
          },
          env: {
            NODE_ENV: 'production',
            PORT: '3000',
            DATABASE_URL: 'postgres://postgres:pass@db.internal:5432/main',
            FAULT: 'db_down',
          },
          logs: [
            { timestamp: ts, level: 'info', message: 'Server listening on port 3000' },
            {
              timestamp: ts,
              level: 'error',
              message: 'Database connection failed: connect ECONNREFUSED 10.0.4.12:5432',
            },
            {
              timestamp: ts,
              level: 'error',
              message: 'SequelizeConnectionRefusedError: connect ECONNREFUSED 10.0.4.12:5432',
            },
          ],
          metrics: [
            {
              timestamp: now - 180000,
              cpuPercent: 8,
              memoryMB: 180,
              memoryLimitMB: 1024,
              memoryPercent: 17,
            },
            {
              timestamp: now,
              cpuPercent: 10,
              memoryMB: 185,
              memoryLimitMB: 1024,
              memoryPercent: 18,
            },
          ],
          httpStatus: 500,
          httpLatencyMs: 1200,
          httpBody: '{"error":"Database unreachable","code":"ECONNREFUSED"}',
        },
      };

    case 'api_gap':
      return {
        'demo-shop': {
          app: {
            project_id: 'demo-shop',
            name: 'demo-shop',
            platform: 'node',
            status: 'running',
            plan: 'standard-512m',
            port: 3000,
            defaultSubdomain: 'demo-shop.iran.liara.run',
            domains: ['demo-shop.iran.liara.run'],
            created_at: ts,
            updated_at: ts,
            lastRelease: {
              id: 'rel_006',
              status: 'ready',
              createdAt: ts,
            },
          },
          env: {
            NODE_ENV: 'production',
            PORT: '3000',
          },
          logs: [{ timestamp: ts, level: 'info', message: 'Server listening on port 3000' }],
          metrics: [
            {
              timestamp: now,
              cpuPercent: 10,
              memoryMB: 150,
              memoryLimitMB: 512,
              memoryPercent: 29,
            },
          ],
          httpStatus: 200,
          httpLatencyMs: 50,
          httpBody: '{"status":"ok"}',
        },
      };
  }
}
