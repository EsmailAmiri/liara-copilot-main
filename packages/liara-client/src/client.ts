import type { Result } from '@copilot/shared';
import type { CapabilityEntry } from './capabilities.js';

export interface AppSummary {
  project_id: string;
  name: string;
  platform: string;
  status: 'running' | 'stopped' | 'starting' | 'failed' | 'unknown';
  plan: string;
  scale?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AppDetails extends AppSummary {
  node_version?: string;
  port?: number;
  defaultSubdomain?: string;
  domains?: string[];
  lastRelease?: {
    id: string;
    status: string;
    createdAt: string;
  };
}

export interface LogEntry {
  timestamp: string;
  level?: 'info' | 'warn' | 'error';
  message: string;
}

export interface MetricSample {
  timestamp: number;
  cpuPercent: number;
  memoryMB: number;
  memoryLimitMB: number;
  memoryPercent: number;
  diskPercent?: number;
  networkInMB?: number;
  networkOutMB?: number;
}

export interface EnvVar {
  key: string;
  value?: string;
}

export interface PlanInfo {
  id: string;
  name: string;
  cpu: number;
  ram: number;
  disk: number;
  pricePerHour?: number;
  pricePerMonth?: number;
}

export interface ReleaseInfo {
  id: string;
  status: string;
  createdAt: string;
  tag?: string;
}

export interface DomainInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  ssl: boolean;
  cname?: string;
}

export interface AccountInfo {
  email: string;
  balance?: number;
  currency?: string;
}

export interface DeployParams {
  sourcePath?: string;
  image?: string;
  platform?: string;
  port?: number;
}

export interface DeployResult {
  releaseId: string;
  status: string;
  message?: string;
}

export interface LiaraClient {
  listApps(): Promise<Result<AppSummary[]>>;
  getApp(appName: string): Promise<Result<AppDetails>>;
  createApp(params: { name: string; platform: string; plan?: string }): Promise<Result<AppDetails>>;
  deleteApp(appName: string): Promise<Result<{ deleted: boolean }>>;
  restartApp(appName: string): Promise<Result<{ restarted: boolean }>>;
  stopApp(appName: string): Promise<Result<{ stopped: boolean }>>;
  startApp(appName: string): Promise<Result<{ started: boolean }>>;
  getLogs(
    appName: string,
    params?: { limit?: number; since?: string; until?: string },
  ): Promise<Result<LogEntry[]>>;
  getMetrics(appName: string, params?: { period?: string }): Promise<Result<MetricSample[]>>;
  listEnv(appName: string): Promise<Result<EnvVar[]>>;
  setEnv(appName: string, vars: Record<string, string>): Promise<Result<{ updated: boolean }>>;
  unsetEnv(appName: string, keys: string[]): Promise<Result<{ updated: boolean }>>;
  listPlans(platform?: string): Promise<Result<PlanInfo[]>>;
  changePlan(appName: string, plan: string): Promise<Result<{ updated: boolean; plan: string }>>;
  listDomains(appName: string): Promise<Result<DomainInfo[]>>;
  addDomain(appName: string, domain: string): Promise<Result<DomainInfo>>;
  listReleases(appName: string): Promise<Result<ReleaseInfo[]>>;
  getAccount(): Promise<Result<AccountInfo>>;
  deploy(appName: string, params: DeployParams): Promise<Result<DeployResult>>;
  getCapabilities(): Promise<Result<CapabilityEntry[]>>;
}
