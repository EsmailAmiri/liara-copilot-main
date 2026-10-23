import type { LiaraClient, LiaraCliDriver } from '@copilot/liara-client';

export interface HttpProbeResult {
  status: number;
  latencyMs: number;
  bodySnippet: string;
  headers?: Record<string, string>;
  error?: string;
}

export interface DnsLookupResult {
  a: string[];
  cname: string[];
  ns: string[];
  error?: string;
}

export interface ToolContext {
  client: LiaraClient;
  cliDriver?: LiaraCliDriver;
  httpProber?: (url: string) => Promise<HttpProbeResult>;
  dnsResolver?: (domain: string) => Promise<DnsLookupResult>;
  traceId: string;
  conversationId?: string;
  source?: 'liara-api' | 'liara-cli' | 'http-probe' | 'mock';
  appNameAllowlist?: string[];
}
