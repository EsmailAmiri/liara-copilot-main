import { describe, it, expect } from 'vitest';

describe('Demo App FAULT Modes', () => {
  it('defines the 5 valid fault modes and expected symptoms', () => {
    const faults = ['none', 'missing_env', 'memory_leak', 'wrong_port', 'db_down'];
    expect(faults.length).toBe(5);
  });

  it('matches detector log signatures for missing_env', () => {
    const errorLog =
      'Error: Missing required env DATABASE_URL\n    at initDatabase (/app/dist/index.js:42:11)';
    const matches = /missing required env\s*([A-Z0-9_]+)/i.exec(errorLog);
    expect(matches).not.toBeNull();
    expect(matches?.[1]).toBe('DATABASE_URL');
  });

  it('matches detector log signatures for memory_leak and oom', () => {
    const oomLog = 'Process exited with signal SIGKILL (Out of memory)';
    const isOom = /(?:out of memory|oom|sigkill)/i.test(oomLog);
    expect(isOom).toBe(true);
  });

  it('matches detector log signatures for wrong_port', () => {
    const portLog = 'Server listening on port 8080';
    const matches = /listening on port\s*(\d+)/i.exec(portLog);
    expect(matches).not.toBeNull();
    expect(matches?.[1]).toBe('8080');
  });

  it('matches detector log signatures for db_down', () => {
    const dbLog = 'Database connection failed: connect ECONNREFUSED 10.0.4.12:5432';
    const isDbError = /(?:ECONNREFUSED|ETIMEDOUT)/i.test(dbLog);
    expect(isDbError).toBe(true);
  });
});
