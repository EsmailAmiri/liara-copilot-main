const ENV_ALLOWLIST = new Set(['NODE_ENV', 'PORT', 'TZ', 'LOG_LEVEL']);

export function isEnvKeyAllowlisted(key: string): boolean {
  return ENV_ALLOWLIST.has(key.toUpperCase());
}

export function redactString(text: string): string {
  if (!text) return text;

  let redacted = text;

  // 1. Redact PEM private keys
  redacted = redacted.replace(
    /-----BEGIN[ A-Z_-]*PRIVATE KEY-----[\s\S]*?-----END[ A-Z_-]*PRIVATE KEY-----/g,
    '‹redacted-private-key›',
  );

  // 2. Redact URLs with credentials (e.g. postgres://user:pass@host:5432/db)
  redacted = redacted.replace(
    /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^:\s/@]+):([^@\s/]+)@/g,
    '$1‹redacted›:‹redacted›@',
  );

  // 3. Redact Bearer / API tokens
  redacted = redacted.replace(/(Bearer\s+)[A-Za-z0-9._~+/-]{10,}/gi, '$1‹redacted-token›');
  redacted = redacted.replace(/(--api-token[=\s]+)[^\s]+/gi, '$1‹redacted-token›');

  // 4. Redact password=..., secret=..., token=... in query strings or logs
  redacted = redacted.replace(
    /((?:password|passwd|secret|api_key|apikey|token|auth_token)\s*[:=]\s*["']?)[^"',\s;]{3,}(["']?)/gi,
    '$1‹redacted›$2',
  );

  // 5. Redact very long random hex or base64 strings (>= 40 chars without spaces)
  redacted = redacted.replace(/\b[0-9a-fA-F]{40,64}\b/g, '‹redacted-hash›');

  return redacted;
}

export function redactEnvVars(env: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (isEnvKeyAllowlisted(key)) {
      result[key] = value;
    } else {
      result[key] = '‹redacted›';
    }
  }
  return result;
}

export function redact<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return redactString(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redact(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key === 'env' || key === 'variables') {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          copy[key] = redactEnvVars(value as Record<string, string>);
          continue;
        }
      }
      if (key === 'value' && (data as Record<string, unknown>)['key']) {
        const envKey = String((data as Record<string, unknown>)['key']);
        if (!isEnvKeyAllowlisted(envKey)) {
          copy[key] = '‹redacted›';
          continue;
        }
      }
      copy[key] = redact(value);
    }
    return copy as T;
  }

  return data;
}
