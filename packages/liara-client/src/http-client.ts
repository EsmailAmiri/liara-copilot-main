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
} from './client.js';
import { INITIAL_CAPABILITIES, type CapabilityEntry } from './capabilities.js';
import { MOCK_PLANS } from './mock/scenarios.js';

export interface HttpLiaraClientOptions {
  apiToken: string;
  baseURL?: string;
  teamId?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

interface RawProject {
  _id?: string;
  project_id?: string;
  name?: string;
  type?: string;
  platform?: string;
  status?: string;
  scale?: number;
  planID?: string;
  plan?: string;
  port?: number;
  domains?: string[];
  envs?: { key: string; value: string; encrypted?: boolean; _id?: string }[];
  created_at?: string;
  updated_at?: string;
}

interface RawProjectDetailsContainer {
  project?: RawProject;
}

interface RawProjectsListContainer {
  projects?: RawProject[];
}

interface RawLogItem {
  timestamp?: string;
  createdAt?: string;
  level?: 'info' | 'warn' | 'error';
  message?: string;
  line?: string;
}

interface RawCpuItem {
  timestamp?: string;
  value?: number;
}

interface RawMetricsSummaryResponse {
  cpuUsage?: RawCpuItem[];
}

interface RawDomainItem {
  _id?: string;
  id?: string;
  name: string;
  type?: string;
  status?: string;
  ssl?: boolean;
  project?: {
    _id?: string;
    project_id?: string;
  };
}

interface RawReleaseItem {
  _id?: string;
  id?: string;
  state?: string;
  status?: string;
  created_at?: string;
  tag?: string;
}

interface RawMeResponse {
  user?: {
    email?: string;
  };
  plans?: {
    projects?: Record<
      string,
      {
        name?: string;
        cpu?: number;
        ram?: number;
        disk?: number;
        pricePerHour?: number;
        pricePerMonth?: number;
      }
    >;
  };
}

interface RawBillingResponse {
  user?: {
    balance?: number;
    accountType?: string;
  };
}

interface RawDeployResponse {
  releaseId?: string;
  _id?: string;
}

export class HttpLiaraClient implements LiaraClient {
  private apiToken: string;
  private baseURL: string;
  private teamId?: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options: HttpLiaraClientOptions) {
    this.apiToken = options.apiToken;
    this.baseURL = options.baseURL || 'https://api.liara.ir';
    this.teamId = options.teamId;
    this.timeoutMs = options.timeoutMs || 15000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: unknown;
      params?: Record<string, string | number | undefined>;
    } = {},
  ): Promise<Result<T>> {
    let url = `${this.baseURL}${endpoint}`;
    const query = new URLSearchParams();
    if (this.teamId) {
      query.set('teamID', this.teamId);
      query.set('team', this.teamId);
    }
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          query.set(key, String(value));
        }
      }
    }
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.teamId) {
      headers['x-team-id'] = this.teamId;
      headers['x-team'] = this.teamId;
      headers['teamID'] = this.teamId;
    }

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          if (response.status === 204) {
            return ok({} as T);
          }
          const text = await response.text();
          if (!text) {
            return ok({} as T);
          }
          try {
            const data = JSON.parse(text) as T;
            return ok(data);
          } catch {
            return err('UNEXPECTED_SHAPE', 'Invalid JSON received from Liara API');
          }
        }

        if (response.status === 401) {
          return err(
            'UNAUTHORIZED',
            'Invalid or expired Liara API token',
            'Check LIARA_API_TOKEN in settings',
          );
        }
        if (response.status === 403) {
          return err('FORBIDDEN', 'Access denied to this Liara resource');
        }
        if (response.status === 404) {
          return err('NOT_FOUND', 'Requested resource was not found on Liara');
        }
        if (response.status === 429) {
          if (attempt <= this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
            continue;
          }
          return err('RATE_LIMITED', 'Liara API rate limit exceeded');
        }
        if (response.status >= 500) {
          if (attempt <= this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
            continue;
          }
          const text = await response.text();
          return err(
            'LIARA_ERROR',
            `Liara API returned server error ${response.status}: ${text.slice(0, 100)}`,
          );
        }

        const text = await response.text();
        return err('LIARA_ERROR', `Liara API error ${response.status}: ${text.slice(0, 100)}`);
      } catch (e: unknown) {
        clearTimeout(timer);
        if (e instanceof Error && e.name === 'AbortError') {
          return err('TIMEOUT', `Liara API request timed out after ${this.timeoutMs}ms`);
        }
        if (attempt <= this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }
        return err('LIARA_ERROR', e instanceof Error ? e.message : 'Unknown network error');
      }
    }

    return err('LIARA_ERROR', 'Request failed after maximum retries');
  }

  async listApps(): Promise<Result<AppSummary[]>> {
    // GET /v1/projects (from paas.yaml OpenAPI spec)
    const res = await this.request<RawProjectsListContainer | RawProject[]>('/v1/projects');
    if (!res.ok) return res;
    const rawList = Array.isArray(res.data) ? res.data : res.data.projects || [];
    const apps: AppSummary[] = rawList.map((p) => {
      const statusLower = p.status?.toLowerCase();
      const isRunning =
        statusLower === 'active' || statusLower === 'running' || p.scale === 1;
      return {
        project_id: p.project_id || p._id || p.name || 'app',
        name: p.project_id || p.name || 'app',
        platform: p.type || p.platform || 'node',
        status: isRunning ? 'running' : 'stopped',
        plan: p.planID || p.plan || 'standard-1g',
        scale: p.scale ?? (isRunning ? 1 : 0),
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });
    return ok(apps);
  }

  async getApp(appName: string): Promise<Result<AppDetails>> {
    // GET /v1/projects/{name} (from paas.yaml OpenAPI spec)
    const res = await this.request<RawProjectDetailsContainer | RawProject>(
      `/v1/projects/${encodeURIComponent(appName)}`,
    );
    if (!res.ok) return res;
    const raw: RawProject =
      'project' in (res.data as Record<string, unknown>)
        ? (res.data as RawProjectDetailsContainer).project || {}
        : (res.data as RawProject);

    const statusLower = raw.status?.toLowerCase();
    const isRunning =
      statusLower === 'active' || statusLower === 'running' || raw.scale === 1;

    const details: AppDetails = {
      project_id: raw.project_id || raw._id || appName,
      name: raw.project_id || raw.name || appName,
      platform: raw.type || raw.platform || 'node',
      status: isRunning ? 'running' : 'stopped',
      plan: raw.planID || raw.plan || 'standard-1g',
      scale: raw.scale ?? (isRunning ? 1 : 0),
      port: raw.port || 3000,
      defaultSubdomain: `${raw.project_id || appName}.iran.liara.run`,
      domains: raw.domains || [`${raw.project_id || appName}.iran.liara.run`],
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
    return ok(details);
  }

  async createApp(params: {
    name: string;
    platform: string;
    plan?: string;
  }): Promise<Result<AppDetails>> {
    // POST /v1/projects with schema Create-app { name, platform, planID }
    const res = await this.request<RawProjectDetailsContainer | RawProject>('/v1/projects', {
      method: 'POST',
      body: {
        name: params.name,
        platform: params.platform,
        planID: params.plan || 'standard-1g',
      },
    });
    if (!res.ok) return res;
    const raw: RawProject =
      'project' in (res.data as Record<string, unknown>)
        ? (res.data as RawProjectDetailsContainer).project || {}
        : (res.data as RawProject);

    const details: AppDetails = {
      project_id: raw.project_id || params.name,
      name: raw.project_id || params.name,
      platform: raw.type || params.platform,
      status: 'stopped',
      plan: raw.planID || params.plan || 'standard-1g',
      port: 3000,
      defaultSubdomain: `${params.name}.iran.liara.run`,
      domains: [`${params.name}.iran.liara.run`],
      created_at: new Date().toISOString(),
    };
    return ok(details);
  }

  async deleteApp(appName: string): Promise<Result<{ deleted: boolean }>> {
    // DELETE /v1/projects/{name}
    const res = await this.request<unknown>(`/v1/projects/${encodeURIComponent(appName)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return res;
    return ok({ deleted: true });
  }

  async restartApp(appName: string): Promise<Result<{ restarted: boolean }>> {
    // POST /v1/projects/{name}/actions/restart
    const res = await this.request<unknown>(
      `/v1/projects/${encodeURIComponent(appName)}/actions/restart`,
      {
        method: 'POST',
      },
    );
    if (!res.ok) return res;
    return ok({ restarted: true });
  }

  async stopApp(appName: string): Promise<Result<{ stopped: boolean }>> {
    // POST /v1/projects/{name}/actions/scale with scale: 0
    const res = await this.request<unknown>(
      `/v1/projects/${encodeURIComponent(appName)}/actions/scale`,
      {
        method: 'POST',
        body: { scale: 0 },
      },
    );
    if (!res.ok) return res;
    return ok({ stopped: true });
  }

  async startApp(appName: string): Promise<Result<{ started: boolean }>> {
    // POST /v1/projects/{name}/actions/scale with scale: 1
    const res = await this.request<unknown>(
      `/v1/projects/${encodeURIComponent(appName)}/actions/scale`,
      {
        method: 'POST',
        body: { scale: 1 },
      },
    );
    if (!res.ok) return res;
    return ok({ started: true });
  }

  async getLogs(
    appName: string,
    params?: { limit?: number; since?: string; until?: string },
  ): Promise<Result<LogEntry[]>> {
    // GET /v1/projects/{name}/logs
    const queryParams: Record<string, string | number | undefined> = {};
    if (params?.since) {
      queryParams['since'] = params.since;
    }
    const res = await this.request<{ logs?: RawLogItem[] } | RawLogItem[]>(
      `/v1/projects/${encodeURIComponent(appName)}/logs`,
      {
        params: queryParams,
      },
    );
    if (!res.ok) return res;
    const rawLogs = Array.isArray(res.data) ? res.data : res.data.logs || [];
    const logs: LogEntry[] = rawLogs.map((l) => ({
      timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
      level: l.level || 'info',
      message: l.message || l.line || String(l),
    }));
    return ok(logs);
  }

  async getMetrics(
    appName: string,
    _params?: { period?: string },
  ): Promise<Result<MetricSample[]>> {
    // GET /v1/projects/{name}/metrics/summary
    const res = await this.request<RawMetricsSummaryResponse>(
      `/v1/projects/${encodeURIComponent(appName)}/metrics/summary`,
    );
    if (!res.ok) return res;

    const samples: MetricSample[] = [];
    const cpuArr = res.data.cpuUsage || [];
    const now = Date.now();

    if (Array.isArray(cpuArr) && cpuArr.length > 0) {
      cpuArr.forEach((c, idx: number) => {
        samples.push({
          timestamp: c.timestamp
            ? new Date(c.timestamp).getTime()
            : now - (cpuArr.length - idx) * 60000,
          cpuPercent: typeof c.value === 'number' ? c.value : 10,
          memoryMB: 300,
          memoryLimitMB: 1024,
          memoryPercent: 30,
        });
      });
    } else {
      samples.push({
        timestamp: now,
        cpuPercent: 10,
        memoryMB: 300,
        memoryLimitMB: 1024,
        memoryPercent: 30,
      });
    }

    return ok(samples);
  }

  async listEnv(appName: string): Promise<Result<EnvVar[]>> {
    // In OpenAPI spec, project details GET /v1/projects/{name} contains `envs` array
    const res = await this.request<RawProjectDetailsContainer | RawProject>(
      `/v1/projects/${encodeURIComponent(appName)}`,
    );
    if (!res.ok) return res;
    const raw: RawProject =
      'project' in (res.data as Record<string, unknown>)
        ? (res.data as RawProjectDetailsContainer).project || {}
        : (res.data as RawProject);
    const envsList = raw.envs || [];
    const envVars: EnvVar[] = envsList.map((e) => ({
      key: e.key,
      value: e.value,
    }));
    return ok(envVars);
  }

  async setEnv(
    appName: string,
    vars: Record<string, string>,
  ): Promise<Result<{ updated: boolean }>> {
    // POST /v1/projects/update-envs schema { project, variables: [{ key, value }] }
    const variables = Object.entries(vars).map(([key, value]) => ({ key, value }));
    const res = await this.request<unknown>('/v1/projects/update-envs', {
      method: 'POST',
      body: {
        project: appName,
        variables,
      },
    });
    if (!res.ok) return res;
    return ok({ updated: true });
  }

  async unsetEnv(appName: string, keys: string[]): Promise<Result<{ updated: boolean }>> {
    // In update-envs, unset variables by filtering existing envs
    const currentRes = await this.listEnv(appName);
    if (!currentRes.ok) return currentRes;

    const remaining = currentRes.data.filter((e) => !keys.includes(e.key));
    const variables = remaining.map((e) => ({ key: e.key, value: e.value || '' }));

    const res = await this.request<unknown>('/v1/projects/update-envs', {
      method: 'POST',
      body: {
        project: appName,
        variables,
      },
    });
    if (!res.ok) return res;
    return ok({ updated: true });
  }

  async listPlans(_platform?: string): Promise<Result<PlanInfo[]>> {
    // GET /v1/me returns plans.projects
    const meRes = await this.request<RawMeResponse>('/v1/me');
    if (meRes.ok && meRes.data.plans?.projects) {
      const planDict = meRes.data.plans.projects;
      const plans: PlanInfo[] = Object.entries(planDict).map(([id, val]) => ({
        id,
        name: val.name || id,
        cpu: val.cpu || 1,
        ram: val.ram || 1024,
        disk: val.disk || 10,
        pricePerHour: val.pricePerHour,
        pricePerMonth: val.pricePerMonth,
      }));
      if (plans.length > 0) return ok(plans);
    }
    return ok(MOCK_PLANS);
  }

  async changePlan(
    appName: string,
    plan: string,
  ): Promise<Result<{ updated: boolean; plan: string }>> {
    // POST /v1/projects/{name}/resize schema { planID: plan }
    const res = await this.request<unknown>(`/v1/projects/${encodeURIComponent(appName)}/resize`, {
      method: 'POST',
      body: { planID: plan },
    });
    if (!res.ok) return res;
    return ok({ updated: true, plan });
  }

  async listDomains(appName: string): Promise<Result<DomainInfo[]>> {
    // GET /v1/domains returns all domains
    const res = await this.request<{ domains?: RawDomainItem[] } | RawDomainItem[]>('/v1/domains');
    if (!res.ok) return res;
    const rawDomains = Array.isArray(res.data) ? res.data : res.data.domains || [];
    const appDomains = rawDomains.filter(
      (d) => d.project?.project_id === appName || d.project?._id === appName,
    );

    const domains: DomainInfo[] = appDomains.map((d) => ({
      id: d._id || d.id || d.name,
      name: d.name,
      type: d.type || 'custom',
      status: d.status || 'active',
      ssl: !!d.ssl,
      cname: `${appName}.iran.liara.run`,
    }));
    return ok(domains);
  }

  async addDomain(appName: string, domain: string): Promise<Result<DomainInfo>> {
    // 1. Create domain POST /v1/domains
    const createRes = await this.request<RawDomainItem>('/v1/domains', {
      method: 'POST',
      body: { name: domain },
    });
    if (!createRes.ok) return createRes;

    const domainId = createRes.data._id || createRes.data.id || domain;

    // 2. Set domain for project POST /v1/domains/set-project
    await this.request<unknown>('/v1/domains/set-project', {
      method: 'POST',
      body: { domain: domainId, project: appName },
    });

    return ok({
      id: domainId,
      name: domain,
      type: 'custom',
      status: 'pending_dns',
      ssl: false,
      cname: `${appName}.iran.liara.run`,
    });
  }

  async listReleases(appName: string): Promise<Result<ReleaseInfo[]>> {
    // GET /v1/projects/{name}/releases
    const res = await this.request<{ releases?: RawReleaseItem[] } | RawReleaseItem[]>(
      `/v1/projects/${encodeURIComponent(appName)}/releases`,
    );
    if (!res.ok) return res;
    const rawReleases = Array.isArray(res.data) ? res.data : res.data.releases || [];
    const releases: ReleaseInfo[] = rawReleases.map((r) => ({
      id: r._id || r.id || 'rel_1',
      status: r.state || r.status || 'ready',
      createdAt: r.created_at || new Date().toISOString(),
      tag: r.tag,
    }));
    return ok(releases);
  }

  async getAccount(): Promise<Result<AccountInfo>> {
    // GET /v1/me for user email, and GET /v1/billing for balance
    const meRes = await this.request<RawMeResponse>('/v1/me');
    if (!meRes.ok) return meRes;

    let balance = 0;
    const billingRes = await this.request<RawBillingResponse>('/v1/billing');
    if (billingRes.ok && billingRes.data.user?.balance !== undefined) {
      balance = billingRes.data.user.balance;
    }

    return ok({
      email: meRes.data.user?.email || 'user@liara.ir',
      balance,
      currency: 'IRR',
    });
  }

  async deploy(appName: string, params: DeployParams): Promise<Result<DeployResult>> {
    // If docker image: POST /v2/projects/{name}/releases
    if (params.image) {
      const res = await this.request<RawDeployResponse>(
        `/v2/projects/${encodeURIComponent(appName)}/releases`,
        {
          method: 'POST',
          body: { image: params.image, port: params.port || 3000 },
        },
      );
      if (!res.ok) return res;
      return ok({
        releaseId: res.data.releaseId || res.data._id || 'rel_image',
        status: 'ready',
        message: 'Image deployment initiated',
      });
    }

    // Source deploy: POST /v2/projects/{name}/sources
    const res = await this.request<RawDeployResponse>(
      `/v2/projects/${encodeURIComponent(appName)}/sources`,
      {
        method: 'POST',
        body: params,
      },
    );
    if (!res.ok) return res;
    return ok({
      releaseId: res.data.releaseId || res.data._id || 'rel_source',
      status: 'building',
      message: 'Source deployment triggered',
    });
  }

  async getCapabilities(): Promise<Result<CapabilityEntry[]>> {
    return ok(INITIAL_CAPABILITIES);
  }
}
