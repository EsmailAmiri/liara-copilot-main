'use client';

import React, { useState } from 'react';
import type { ApprovalCard as ApprovalCardData } from '@copilot/shared';
import { getCsrfToken } from '@/lib/sse';
import { useI18n } from '@/i18n/context';
import { ShieldAlert, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export interface ApprovalCardProps {
  actionId: string;
  card: ApprovalCardData;
  expiresAt: number;
  onResolved?: (status: 'approved' | 'rejected') => void;
}

export function ApprovalCardComponent({
  actionId,
  card,
  expiresAt,
  onResolved,
}: ApprovalCardProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<'pending' | 'loading' | 'approved' | 'rejected'>('pending');
  const [showDetails, setShowDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const timeLeftSec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

  const handleApprove = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/approvals/${actionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setStatus('approved');
        onResolved?.('approved');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'خطا در ثبت تأیید');
        setStatus('pending');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ارتباط با سرور برقرار نشد');
      setStatus('pending');
    }
  };

  const handleReject = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/approvals/${actionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setStatus('rejected');
        onResolved?.('rejected');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'خطا در ثبت رد درخواست');
        setStatus('pending');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ارتباط با سرور برقرار نشد');
      setStatus('pending');
    }
  };

  return (
    <div className="my-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{card.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              card.risk === 'high'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            }`}
          >
            {card.risk === 'high' ? t.cards.highRisk : t.cards.lowRisk}
          </span>
          {status === 'pending' && timeLeftSec > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {timeLeftSec}s
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
        {card.summary}
      </p>

      {card.impact && card.impact.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.cards.impact}</h4>
          <ul className="mt-1 list-inside list-disc text-xs text-gray-700 dark:text-gray-300 space-y-1">
            {card.impact.map((imp, idx) => (
              <li key={idx}>{imp}</li>
            ))}
          </ul>
        </div>
      )}

      {card.rollback && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium">{t.cards.rollback}</span> {card.rollback}
        </div>
      )}

      {card.details && card.details.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>جزئیات پارامترها</span>
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showDetails && (
            <div className="mt-2 rounded-md bg-white/80 dark:bg-black/40 p-2 text-xs">
              {card.details.map((d, i) => (
                <div
                  key={i}
                  className="flex justify-between py-1 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                >
                  <span className="font-mono text-gray-600 dark:text-gray-400">{d.label}:</span>
                  <span className="font-mono text-gray-900 dark:text-gray-200">{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2 rounded">
          {errorMsg}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-3 pt-2 border-t border-amber-200/50 dark:border-amber-800/40">
        {status === 'pending' && (
          <>
            <button
              onClick={handleReject}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 transition"
            >
              {t.actions.reject}
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
            >
              {t.actions.approve}
            </button>
          </>
        )}
        {status === 'loading' && (
          <span className="text-xs text-gray-500 animate-pulse">{t.actions.executing}</span>
        )}
        {status === 'approved' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {t.actions.approved}
          </span>
        )}
        {status === 'rejected' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <XCircle className="h-4 w-4" />
            {t.actions.rejected}
          </span>
        )}
      </div>
    </div>
  );
}
