import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from root or current directory
loadDotenv({ path: resolve(process.cwd(), '.env') });
loadDotenv({ path: resolve(process.cwd(), '../../.env') });

const ConfigSchema = z.object({
  LIARA_MODE: z.enum(['mock', 'live']).default('mock'),
  LLM_MODE: z.enum(['mock', 'live']).default('mock'),

  LIARA_API_TOKEN: z.string().optional(),
  LIARA_API_BASE_URL: z.string().default('https://api.liara.ir'),
  LIARA_TEAM_ID: z.string().optional(),
  LIARA_APP_ALLOWLIST: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    ),

  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  LLM_NATIVE_TOOLS: z
    .string()
    .optional()
    .default('1')
    .transform((val) => val !== '0'),

  PORT: z
    .string()
    .optional()
    .default('3001')
    .transform((val) => parseInt(process.env.SERVER_PORT || val, 10)),
  DATA_DIR: z.string().default('./data'),
  APP_PASSCODE: z.string().default('change-me'),
  SESSION_SECRET: z.string().default('change-me-long-random-secret-key-32-chars!'),
  APPROVAL_TTL_SECONDS: z
    .string()
    .optional()
    .default('300')
    .transform((val) => parseInt(val, 10)),
  MONITOR_INTERVAL_SECONDS: z
    .string()
    .optional()
    .default('60')
    .transform((val) => parseInt(val, 10)),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
});

export type ServerConfig = z.infer<typeof ConfigSchema>;

let cachedConfig: ServerConfig | null = null;

export function getConfig(): ServerConfig {
  if (!cachedConfig) {
    const parsed = ConfigSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error('❌ Configuration validation failed:', parsed.error.format());
      throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
    }
    cachedConfig = parsed.data;
  }
  return cachedConfig;
}
