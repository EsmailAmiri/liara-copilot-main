import { createHash } from 'node:crypto';

export function computeArgsHash(args: unknown): string {
  // Stable JSON stringify with sorted keys
  const serialized = JSON.stringify(args, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce((sorted: Record<string, unknown>, k) => {
          sorted[k] = (val as Record<string, unknown>)[k];
          return sorted;
        }, {});
    }
    return val;
  });

  return createHash('sha256').update(serialized).digest('hex');
}
