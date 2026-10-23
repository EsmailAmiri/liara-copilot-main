import { timingSafeEqual, randomBytes, createHmac } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { getConfig, type ServerConfig } from './config.js';

const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function verifyPasscode(input: string, correct: string): boolean {
  const inputBuffer = Buffer.from(input);
  const correctBuffer = Buffer.from(correct);

  if (inputBuffer.length !== correctBuffer.length) {
    // Prevent timing attack on length mismatch
    timingSafeEqual(inputBuffer, inputBuffer);
    return false;
  }

  return timingSafeEqual(inputBuffer, correctBuffer);
}

export function signSession(sessionId: string, secret: string): string {
  const hmac = createHmac('sha256', secret).update(sessionId).digest('hex');
  return `${sessionId}.${hmac}`;
}

export function verifySession(cookieValue: string, secret: string): string | null {
  const [sessionId, hmac] = cookieValue.split('.');
  if (!sessionId || !hmac) return null;

  const expectedHmac = createHmac('sha256', secret).update(sessionId).digest('hex');
  const hmacBuffer = Buffer.from(hmac);
  const expectedBuffer = Buffer.from(expectedHmac);

  if (hmacBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(hmacBuffer, expectedBuffer)) return null;

  return sessionId;
}

export function generateCsrfToken(): string {
  return randomBytes(24).toString('hex');
}

export function checkRateLimit(ip: string): boolean {
  const record = failedAttempts.get(ip);
  if (!record) return true;

  if (Date.now() < record.lockedUntil) {
    return false;
  }

  if (Date.now() >= record.lockedUntil && record.lockedUntil > 0) {
    failedAttempts.delete(ip);
    return true;
  }

  return true;
}

export function recordFailedAttempt(ip: string): void {
  const record = failedAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  record.count++;
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 60000; // 1 minute lockout
  }
  failedAttempts.set(ip, record);
}

export function resetRateLimit(ip: string): void {
  failedAttempts.delete(ip);
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const serverConfig = (req.server as unknown as { config?: ServerConfig }).config || getConfig();
  const cookie = req.cookies['copilot_session'];
  if (!cookie) {
    reply.status(401).send({ ok: false, error: 'Unauthorized: Session required' });
    return;
  }

  const validSession = verifySession(cookie, serverConfig.SESSION_SECRET);
  if (!validSession) {
    reply.status(401).send({ ok: false, error: 'Unauthorized: Invalid or expired session' });
    return;
  }

  // Check CSRF token on state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = req.cookies['copilot_csrf'];
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      reply.status(403).send({ ok: false, error: 'Forbidden: CSRF validation failed' });
      return;
    }
  }
}
