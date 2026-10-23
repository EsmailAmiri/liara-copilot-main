import type { CapabilityVia } from './risk.js';

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

export type CapabilityStatus = 'supported' | 'partial' | 'unsupported' | 'unknown';

export type CapabilityId =
  | 'auth.verify'
  | 'apps.list'
  | 'apps.get'
  | 'apps.create'
  | 'apps.delete'
  | 'apps.deploy.source'
  | 'apps.deploy.image'
  | 'apps.releases.list'
  | 'apps.restart'
  | 'apps.stop_start'
  | 'apps.logs.read'
  | 'apps.logs.stream'
  | 'apps.metrics.read'
  | 'apps.env.list'
  | 'apps.env.set'
  | 'apps.env.unset'
  | 'apps.plan.list'
  | 'apps.plan.change'
  | 'apps.domains.list'
  | 'apps.domains.add'
  | 'dns.records.list'
  | 'dns.records.add'
  | 'databases.list'
  | 'account.balance';

export interface CapabilityEntry {
  id: CapabilityId;
  label: string;
  status: CapabilityStatus;
  via: CapabilityVia;
  notes?: string;
  lastCheckedAt?: string;
  restartsApp?: boolean;
}
