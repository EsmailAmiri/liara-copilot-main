export interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  verified: boolean;
  notes?: string;
}

export const endpoints = {
  getAccount: {
    method: 'GET',
    path: '/v1/me',
    verified: true,
    notes: 'Account identity and user profile (from me.yaml OpenAPI spec)',
  },
  getBilling: {
    method: 'GET',
    path: '/v1/billing',
    verified: true,
    notes: 'Current balance and billing configuration (from billing.yaml OpenAPI spec)',
  },
  listApps: {
    method: 'GET',
    path: '/v1/projects',
    verified: true,
    notes: 'List all apps / projects (from paas.yaml OpenAPI spec)',
  },
  getApp: {
    method: 'GET',
    path: '/v1/projects/:name',
    verified: true,
    notes: 'Get app details and environment variables (from paas.yaml OpenAPI spec)',
  },
  createApp: {
    method: 'POST',
    path: '/v1/projects',
    verified: true,
    notes: 'Create empty app with { name, platform, planID } (from paas.yaml OpenAPI spec)',
  },
  deleteApp: {
    method: 'DELETE',
    path: '/v1/projects/:name',
    verified: true,
    notes: 'Delete app (from paas.yaml OpenAPI spec)',
  },
  scaleApp: {
    method: 'POST',
    path: '/v1/projects/:name/actions/scale',
    verified: true,
    notes: 'Power on (scale: 1) or power off (scale: 0) app (from paas.yaml OpenAPI spec)',
  },
  restartApp: {
    method: 'POST',
    path: '/v1/projects/:name/actions/restart',
    verified: true,
    notes: 'Restart app container (from paas.yaml OpenAPI spec)',
  },
  getLogs: {
    method: 'GET',
    path: '/v1/projects/:name/logs',
    verified: true,
    notes: 'Query logs with since param (from paas.yaml OpenAPI spec)',
  },
  getMetricsSummary: {
    method: 'GET',
    path: '/v1/projects/:name/metrics/summary',
    verified: true,
    notes: 'Summary metrics (CPU, RAM, disk, network) (from paas.yaml OpenAPI spec)',
  },
  updateEnvs: {
    method: 'POST',
    path: '/v1/projects/update-envs',
    verified: true,
    notes:
      'Batch update or set environment variables: { project, variables: [{ key, value }] } (from paas.yaml OpenAPI spec)',
  },
  changePlan: {
    method: 'POST',
    path: '/v1/projects/:name/resize',
    verified: true,
    notes: 'Resize plan/resources: { planID } (from paas.yaml OpenAPI spec)',
  },
  listDomains: {
    method: 'GET',
    path: '/v1/domains',
    verified: true,
    notes: 'List attached custom domains (from paas.yaml OpenAPI spec)',
  },
  createDomain: {
    method: 'POST',
    path: '/v1/domains',
    verified: true,
    notes: 'Register domain in Liara (from paas.yaml OpenAPI spec)',
  },
  setDomainProject: {
    method: 'POST',
    path: '/v1/domains/set-project',
    verified: true,
    notes: 'Attach domain to project (from paas.yaml OpenAPI spec)',
  },
  enableSsl: {
    method: 'POST',
    path: '/v1/domains/provision-ssl-certs',
    verified: true,
    notes: 'Provision SSL certificate for domain (from paas.yaml OpenAPI spec)',
  },
  listReleases: {
    method: 'GET',
    path: '/v1/projects/:name/releases',
    verified: true,
    notes: 'Recent deployment releases (from paas.yaml OpenAPI spec)',
  },
  deploySource: {
    method: 'POST',
    path: '/v2/projects/:name/sources',
    verified: true,
    notes: 'Deploy .tar.gz source code package (from paas.yaml OpenAPI spec)',
  },
  deployImage: {
    method: 'POST',
    path: '/v2/projects/:name/releases',
    verified: true,
    notes: 'Deploy Docker image release (from paas.yaml OpenAPI spec)',
  },
  listDnsZones: {
    method: 'GET',
    path: '/api/v1/zones',
    verified: true,
    notes: 'List DNS zones on https://dns-service.liara.ir (from dns.yaml OpenAPI spec)',
  },
  listDatabases: {
    method: 'GET',
    path: '/v1/databases',
    verified: true,
    notes: 'List all managed databases (from dbaas.yaml OpenAPI spec)',
  },
  createDatabase: {
    method: 'POST',
    path: '/v1/databases',
    verified: true,
    notes: 'Create managed database (from dbaas.yaml OpenAPI spec)',
  },
} as const satisfies Record<string, EndpointDef>;

export type EndpointKey = keyof typeof endpoints;
