import type { Result } from '@copilot/shared';
import { ok, err } from '@copilot/shared';
import type {
  AccountInfo,
  AppDetails,
  AppSummary,
  DeployParams,
  DeployResult,
  DomainInfo,
  EnvVar,
  LiaraClient,
  LogEntry,
  MetricSample,
  PlanInfo,
  ReleaseInfo,
} from '../client.js';
import { INITIAL_CAPABILITIES, type CapabilityEntry } from '../capabilities.js';
import { Clock, ControllableClock } from './clock.js';
import { AppMockState, getInitialScenarioState, MOCK_PLANS, ScenarioId } from './scenarios.js';

export class MockLiaraClient implements LiaraClient {
  public scenario: ScenarioId;
  public clock: Clock;
  public apps: Record<string, AppMockState>;
  private capabilities: CapabilityEntry[];

  constructor(scenario: ScenarioId = 'healthy', clock?: Clock) {
    this.scenario = scenario;
    this.clock = clock ?? new ControllableClock();
    this.apps = getInitialScenarioState(scenario, this.clock.now());
    this.capabilities = JSON.parse(JSON.stringify(INITIAL_CAPABILITIES));
  }

  setScenario(scenario: ScenarioId): void {
    this.scenario = scenario;
    this.apps = getInitialScenarioState(scenario, this.clock.now());
  }

  async listApps(): Promise<Result<AppSummary[]>> {
    const list: AppSummary[] = Object.values(this.apps).map((s) => ({
      project_id: s.app.project_id,
      name: s.app.name,
      platform: s.app.platform,
      status: s.app.status,
      plan: s.app.plan,
      scale: s.app.scale,
      created_at: s.app.created_at,
      updated_at: s.app.updated_at,
    }));
    return ok(list);
  }

  async getApp(appName: string): Promise<Result<AppDetails>> {
    const appState = this.apps[appName];
    if (!appState) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    return ok(appState.app);
  }

  async createApp(params: {
    name: string;
    platform: string;
    plan?: string;
  }): Promise<Result<AppDetails>> {
    const now = this.clock.now();
    const ts = new Date(now).toISOString();
    const app: AppDetails = {
      project_id: params.name,
      name: params.name,
      platform: params.platform,
      status: 'stopped',
      plan: params.plan || 'standard-1g',
      port: 3000,
      defaultSubdomain: `${params.name}.iran.liara.run`,
      domains: [`${params.name}.iran.liara.run`],
      created_at: ts,
      updated_at: ts,
    };

    this.apps[params.name] = {
      app,
      env: { NODE_ENV: 'production', PORT: '3000' },
      logs: [{ timestamp: ts, level: 'info', message: `Application ${params.name} created` }],
      metrics: [
        { timestamp: now, cpuPercent: 0, memoryMB: 0, memoryLimitMB: 1024, memoryPercent: 0 },
      ],
      httpStatus: 503,
      httpLatencyMs: 20,
      httpBody: '<html><body>503 Service Unavailable - Application not deployed yet</body></html>',
    };

    return ok(app);
  }

  async deleteApp(appName: string): Promise<Result<{ deleted: boolean }>> {
    if (!this.apps[appName]) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    delete this.apps[appName];
    return ok({ deleted: true });
  }

  async restartApp(appName: string): Promise<Result<{ restarted: boolean }>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }

    const now = this.clock.now();
    const ts = new Date(now).toISOString();
    state.logs.push({
      timestamp: ts,
      level: 'info',
      message: 'Restarting application container...',
    });

    // Transition logic:
    // If DATABASE_URL is now set in missing_env_500, app becomes healthy!
    if (this.scenario === 'missing_env_500' && state.env.DATABASE_URL) {
      state.app.status = 'running';
      state.httpStatus = 200;
      state.httpLatencyMs = 45;
      state.httpBody = '{"status":"ok","database":"connected","message":"فروشگاه فعال است"}';
      state.logs.push({
        timestamp: ts,
        level: 'info',
        message: 'Connected to database successfully',
      });
      state.logs.push({ timestamp: ts, level: 'info', message: 'Server listening on port 3000' });
    }

    // If PORT was corrected in wrong_port
    if (this.scenario === 'wrong_port' && (state.env.PORT === '3000' || !state.env.PORT)) {
      state.app.status = 'running';
      state.httpStatus = 200;
      state.httpLatencyMs = 40;
      state.httpBody = '{"status":"ok","port":3000}';
      state.logs.push({ timestamp: ts, level: 'info', message: 'Server listening on port 3000' });
    }

    return ok({ restarted: true });
  }

  async stopApp(appName: string): Promise<Result<{ stopped: boolean }>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    state.app.status = 'stopped';
    state.httpStatus = 503;
    return ok({ stopped: true });
  }

  async startApp(appName: string): Promise<Result<{ started: boolean }>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    state.app.status = 'running';
    return ok({ started: true });
  }

  async getLogs(
    appName: string,
    params?: { limit?: number; since?: string; until?: string },
  ): Promise<Result<LogEntry[]>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    let logs = [...state.logs];
    if (params?.limit && params.limit > 0) {
      logs = logs.slice(-params.limit);
    }
    return ok(logs);
  }

  async getMetrics(
    appName: string,
    _params?: { period?: string },
  ): Promise<Result<MetricSample[]>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    return ok([...state.metrics]);
  }

  async listEnv(appName: string): Promise<Result<EnvVar[]>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    const envVars: EnvVar[] = Object.entries(state.env).map(([key, value]) => ({
      key,
      value,
    }));
    return ok(envVars);
  }

  async setEnv(
    appName: string,
    vars: Record<string, string>,
  ): Promise<Result<{ updated: boolean }>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    for (const [key, value] of Object.entries(vars)) {
      state.env[key] = value;
    }
    const now = this.clock.now();
    const ts = new Date(now).toISOString();
    state.logs.push({
      timestamp: ts,
      level: 'info',
      message: `Environment variables updated: ${Object.keys(vars).join(', ')}`,
    });
    return ok({ updated: true });
  }

  async unsetEnv(appName: string, keys: string[]): Promise<Result<{ updated: boolean }>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    for (const key of keys) {
      delete state.env[key];
    }
    return ok({ updated: true });
  }

  async listPlans(_platform?: string): Promise<Result<PlanInfo[]>> {
    return ok(MOCK_PLANS);
  }

  async changePlan(
    appName: string,
    plan: string,
  ): Promise<Result<{ updated: boolean; plan: string }>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    state.app.plan = plan;
    const now = this.clock.now();
    const ts = new Date(now).toISOString();

    // If upgrading in memory_leak_oom scenario
    if (this.scenario === 'memory_leak_oom') {
      const planObj = MOCK_PLANS.find((p) => p.id === plan);
      const limitMB = planObj ? planObj.ram : 2048;
      state.metrics.push({
        timestamp: now,
        cpuPercent: 20,
        memoryMB: 500,
        memoryLimitMB: limitMB,
        memoryPercent: Math.round((500 / limitMB) * 100),
      });
      state.httpStatus = 200;
      state.httpLatencyMs = 60;
      state.httpBody = '{"status":"ok","note":"Plan upgraded, memory pressure resolved"}';
      state.logs.push({
        timestamp: ts,
        level: 'info',
        message: `Container plan upgraded to ${plan}`,
      });
    }

    return ok({ updated: true, plan });
  }

  async listDomains(appName: string): Promise<Result<DomainInfo[]>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    const domains: DomainInfo[] = (state.app.domains || []).map((d, i) => ({
      id: `dom_${i + 1}`,
      name: d,
      type: d.endsWith('.iran.liara.run') ? 'subdomain' : 'custom',
      status: 'active',
      ssl: true,
      cname: `${state.app.name}.iran.liara.run`,
    }));
    return ok(domains);
  }

  async addDomain(appName: string, domain: string): Promise<Result<DomainInfo>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    if (!state.app.domains) {
      state.app.domains = [];
    }
    state.app.domains.push(domain);
    return ok({
      id: `dom_${Date.now()}`,
      name: domain,
      type: 'custom',
      status: 'pending_dns',
      ssl: false,
      cname: `${state.app.name}.iran.liara.run`,
    });
  }

  async listReleases(appName: string): Promise<Result<ReleaseInfo[]>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }
    const releases: ReleaseInfo[] = state.app.lastRelease
      ? [
          {
            id: state.app.lastRelease.id,
            status: state.app.lastRelease.status,
            createdAt: state.app.lastRelease.createdAt,
          },
        ]
      : [];
    return ok(releases);
  }

  async getAccount(): Promise<Result<AccountInfo>> {
    return ok({
      email: 'demo@liara.ir',
      balance: 5000000,
      currency: 'IRR',
    });
  }

  async deploy(appName: string, _params: DeployParams): Promise<Result<DeployResult>> {
    const state = this.apps[appName];
    if (!state) {
      return err('NOT_FOUND', `App ${appName} not found`);
    }

    const now = this.clock.now();
    const ts = new Date(now).toISOString();
    const releaseId = `rel_${Date.now().toString(36)}`;

    state.logs.push({ timestamp: ts, level: 'info', message: 'Build started...' });
    state.logs.push({ timestamp: ts, level: 'info', message: 'Creating production build' });
    state.logs.push({
      timestamp: ts,
      level: 'info',
      message: 'Build completed successfully in 12s',
    });
    state.logs.push({ timestamp: ts, level: 'info', message: 'Deploying image to cluster...' });
    state.logs.push({
      timestamp: ts,
      level: 'info',
      message: 'Container started, listening on port 3000',
    });

    state.app.status = 'running';
    state.app.lastRelease = {
      id: releaseId,
      status: 'ready',
      createdAt: ts,
    };
    state.httpStatus = 200;
    state.httpLatencyMs = 50;
    state.httpBody = '{"status":"ok","deployed":true}';

    return ok({
      releaseId,
      status: 'ready',
      message: 'Deployment succeeded',
    });
  }

  async getCapabilities(): Promise<Result<CapabilityEntry[]>> {
    return ok(this.capabilities);
  }

  // Helper method for Mock HTTP probing
  getMockHttp(appName: string): { status: number; latencyMs: number; body: string } {
    const state = this.apps[appName];
    if (!state) {
      return { status: 404, latencyMs: 15, body: 'App not found' };
    }
    return {
      status: state.httpStatus,
      latencyMs: state.httpLatencyMs,
      body: state.httpBody,
    };
  }
}
