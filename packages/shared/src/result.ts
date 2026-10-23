import { z } from 'zod';

export const ErrCodeSchema = z.enum([
  'NOT_SUPPORTED_BY_API',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'LIARA_ERROR',
  'UNEXPECTED_SHAPE',
  'VALIDATION',
  'APPROVAL_REQUIRED',
  'NOT_ALLOWED',
  'TIMEOUT',
]);

export type ErrCode = z.infer<typeof ErrCodeSchema>;

export type Result<O> =
  { ok: true; data: O } | { ok: false; code: ErrCode; message: string; hint?: string };

export function ok<O>(data: O): Result<O> {
  return { ok: true, data };
}

export function err<O = never>(code: ErrCode, message: string, hint?: string): Result<O> {
  return { ok: false, code, message, hint };
}
