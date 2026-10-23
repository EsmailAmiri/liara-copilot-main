import { spawn } from 'node:child_process';
import type { Result } from '@copilot/shared';
import { ok, err } from '@copilot/shared';

export interface CliDriverOptions {
  binaryPath?: string;
  apiToken?: string;
  teamId?: string;
}

export interface RunCliOptions {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  signal?: AbortSignal;
  onLine?: (line: string) => void;
  timeoutMs?: number;
}

export interface CliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class LiaraCliDriver {
  private binaryPath: string;
  private apiToken?: string;
  private teamId?: string;

  constructor(options: CliDriverOptions = {}) {
    this.binaryPath = options.binaryPath || 'liara';
    this.apiToken = options.apiToken;
    this.teamId = options.teamId;
  }

  private redact(str: string): string {
    let result = str;
    if (this.apiToken) {
      result = result.replaceAll(this.apiToken, '‹redacted-token›');
    }
    // Redact any --api-token=... or tokens in output
    result = result.replace(/(--api-token[=\s]+)[^\s]+/gi, '$1‹redacted-token›');
    result = result.replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1‹redacted-token›');
    return result;
  }

  async run(options: RunCliOptions): Promise<Result<CliRunResult>> {
    const fullArgs = [...options.args];
    if (this.apiToken && !fullArgs.some((a) => a.includes('--api-token'))) {
      fullArgs.push(`--api-token=${this.apiToken}`);
    }
    if (this.teamId && !fullArgs.some((a) => a.includes('--team-id'))) {
      fullArgs.push(`--team-id=${this.teamId}`);
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = spawn(this.binaryPath, fullArgs, {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let timeoutTimer: NodeJS.Timeout | undefined;
      if (options.timeoutMs) {
        timeoutTimer = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, options.timeoutMs);
      }

      if (options.signal) {
        if (options.signal.aborted) {
          child.kill('SIGKILL');
          resolve(err('TIMEOUT', 'CLI process aborted before execution'));
          return;
        }
        options.signal.addEventListener('abort', () => {
          child.kill('SIGTERM');
        });
      }

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdout += text;
        if (options.onLine) {
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              options.onLine(this.redact(line));
            }
          }
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        resolve(err('LIARA_ERROR', `Failed to execute Liara CLI: ${error.message}`));
      });

      child.on('close', (code) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (timedOut) {
          resolve(err('TIMEOUT', `CLI execution timed out after ${options.timeoutMs}ms`));
          return;
        }

        const redactedStdout = this.redact(stdout);
        const redactedStderr = this.redact(stderr);

        if (code !== 0) {
          resolve(
            err(
              'LIARA_ERROR',
              `Liara CLI exited with code ${code}: ${redactedStderr || redactedStdout}`,
            ),
          );
          return;
        }

        resolve(
          ok({
            exitCode: code ?? 0,
            stdout: redactedStdout,
            stderr: redactedStderr,
          }),
        );
      });
    });
  }
}
