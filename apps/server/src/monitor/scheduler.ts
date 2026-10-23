import { randomUUID } from 'node:crypto';
import type { Alert } from '@copilot/shared';
import type { LiaraClient } from '@copilot/liara-client';
import type { AppDatabase } from '../db/database.js';
import type { EventBus } from '../events/bus.js';

export interface MonitorOptions {
  client: LiaraClient;
  db: AppDatabase;
  bus: EventBus;
  intervalSeconds?: number;
  allowlist?: string[];
}

export class MonitorScheduler {
  private client: LiaraClient;
  private db: AppDatabase;
  private bus: EventBus;
  private intervalMs: number;
  private allowlist: string[];
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(options: MonitorOptions) {
    this.client = options.client;
    this.db = options.db;
    this.bus = options.bus;
    this.intervalMs = (options.intervalSeconds || 60) * 1000;
    this.allowlist = options.allowlist || [];
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.checkAllApps().catch((err) => {
        console.error('Monitor check cycle failed:', err);
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.isRunning = false;
  }

  async checkAllApps(): Promise<Alert[]> {
    const appsRes = await this.client.listApps();
    if (!appsRes.ok) return [];

    const generatedAlerts: Alert[] = [];
    const apps = appsRes.data.filter((a) => {
      if (this.allowlist.length > 0) {
        return this.allowlist.includes(a.name);
      }
      return true;
    });

    for (const app of apps) {
      const alerts = await this.checkApp(app.name);
      generatedAlerts.push(...alerts);
    }

    return generatedAlerts;
  }

  async checkApp(appName: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const now = Date.now();

    // 1. Check Metrics (RAM >= 85%)
    const metricsRes = await this.client.getMetrics(appName);
    if (metricsRes.ok && metricsRes.data.length > 0) {
      const latest = metricsRes.data[metricsRes.data.length - 1];
      if (latest && latest.memoryPercent >= 85) {
        const ruleTitle = 'فشار شدید حافظه رم';
        const existing = this.db.getActiveAlert(appName, ruleTitle);
        if (!existing) {
          const alert: Alert = {
            id: `alt_${randomUUID()}`,
            appName,
            severity: 'critical',
            title: ruleTitle,
            message: `مصرف حافظه رم برنامه ${appName} به ${latest.memoryPercent}٪ رسیده است. خطر وقوع OOM Kill وجود دارد.`,
            status: 'active',
            timestamp: now,
          };
          this.db.saveAlert(alert);
          this.bus.emitEvent({ type: 'alert', alert });
          alerts.push(alert);
        }
      }
    }

    // 2. Check Logs for OOM or crash signatures
    const logsRes = await this.client.getLogs(appName, { limit: 30 });
    if (logsRes.ok) {
      const oomLog = logsRes.data.find((l) => /sigkill|out of memory|oom/i.test(l.message));
      if (oomLog) {
        const ruleTitle = 'توقف کانتینر به دلیل اتمام حافظه (OOM)';
        const existing = this.db.getActiveAlert(appName, ruleTitle);
        if (!existing) {
          const alert: Alert = {
            id: `alt_${randomUUID()}`,
            appName,
            severity: 'critical',
            title: ruleTitle,
            message: `کانتینر برنامه ${appName} به دلیل اتمام حافظه متوقف شده است.`,
            status: 'active',
            timestamp: now,
          };
          this.db.saveAlert(alert);
          this.bus.emitEvent({ type: 'alert', alert });
          alerts.push(alert);
        }
      }
    }

    // 3. Check HTTP Probe if mock or available
    if ('getMockHttp' in (this.client as unknown as Record<string, unknown>)) {
      const mock = (
        this.client as unknown as {
          getMockHttp(app: string): { status: number; latencyMs: number };
        }
      ).getMockHttp(appName);
      if (mock.status >= 500 || mock.status === 0) {
        const ruleTitle = 'خطای دسترسی HTTP';
        const existing = this.db.getActiveAlert(appName, ruleTitle);
        if (!existing) {
          const alert: Alert = {
            id: `alt_${randomUUID()}`,
            appName,
            severity: 'warning',
            title: ruleTitle,
            message: `سایت با کد وضعیت ${mock.status} پاسخ می‌دهد و در دسترس کاربران نیست.`,
            status: 'active',
            timestamp: now,
          };
          this.db.saveAlert(alert);
          this.bus.emitEvent({ type: 'alert', alert });
          alerts.push(alert);
        }
      }
    }

    return alerts;
  }
}
