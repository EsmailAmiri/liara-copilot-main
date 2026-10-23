'use client';

import React from 'react';
import type { VerificationResult } from '@copilot/shared';
import { useI18n } from '@/i18n/context';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft } from 'lucide-react';

export interface VerificationCardProps {
  appName: string;
  result: VerificationResult;
}

export function VerificationCardComponent({ appName, result }: VerificationCardProps) {
  const { t } = useI18n();

  const getVerdictBadge = () => {
    switch (result.verdict) {
      case 'fixed':
        return {
          text: t.cards.verdictFixed,
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
          icon: <CheckCircle2 className="h-4 w-4" />,
        };
      case 'improved':
        return {
          text: t.cards.verdictImproved,
          bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
          icon: <CheckCircle2 className="h-4 w-4" />,
        };
      case 'unchanged':
        return {
          text: t.cards.verdictUnchanged,
          bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
          icon: <AlertTriangle className="h-4 w-4" />,
        };
      default:
        return {
          text: t.cards.verdictWorse,
          bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300',
          icon: <XCircle className="h-4 w-4" />,
        };
    }
  };

  const badge = getVerdictBadge();

  return (
    <div className="my-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800/40 pb-2.5">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t.cards.verificationTitle} — {appName}
          </h3>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
        >
          {badge.icon}
          <span>{badge.text}</span>
        </div>
      </div>

      {/* Before / After grid */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-white/80 dark:bg-black/30 p-2.5 border border-gray-100 dark:border-gray-800">
          <span className="font-semibold text-gray-500 block mb-1">قبل از عملیات:</span>
          <div className="text-gray-700 dark:text-gray-300">
            {result.before['note'] ? String(result.before['note']) : 'عدم پایداری یا خطای ۵۰۰'}
          </div>
        </div>
        <div className="rounded-lg bg-white/80 dark:bg-black/30 p-2.5 border border-emerald-200 dark:border-emerald-900/50">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
            وضعیت فعلی (پس از تغییر):
          </span>
          <div className="text-gray-800 dark:text-gray-200 space-y-0.5">
            <div>
              کد HTTP:{' '}
              <span className="font-mono font-bold">
                {String(result.after['httpStatus'] || 200)}
              </span>
            </div>
            {result.after['latencyMs'] !== undefined && (
              <div>
                زمان پاسخ: <span className="font-mono">{String(result.after['latencyMs'])}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Individual checks */}
      <div className="mt-3 space-y-1.5">
        {result.checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {c.pass ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
            )}
            <span
              className={
                c.pass ? 'text-gray-800 dark:text-gray-200' : 'text-rose-600 dark:text-rose-400'
              }
            >
              {c.name}
            </span>
            {c.detail && (
              <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                ({c.detail})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
