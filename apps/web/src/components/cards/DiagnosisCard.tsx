'use client';

import React, { useState } from 'react';
import type { Hypothesis } from '@copilot/shared';
import { useI18n } from '@/i18n/context';
import { Stethoscope, FileText, ChevronRight } from 'lucide-react';

export interface DiagnosisCardProps {
  appName: string;
  hypotheses: Hypothesis[];
}

export function DiagnosisCardComponent({ appName, hypotheses }: DiagnosisCardProps) {
  const { t } = useI18n();
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);

  return (
    <div className="my-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-800/40 pb-2.5">
        <Stethoscope className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {t.cards.diagnosisTitle} — {appName}
        </h3>
      </div>

      <div className="mt-3 space-y-3">
        {hypotheses.map((h, i) => {
          const pct = Math.round(h.confidence * 100);
          return (
            <div
              key={h.id || i}
              className="rounded-lg bg-white/90 dark:bg-black/30 p-3 border border-indigo-100/70 dark:border-indigo-900/40 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold dark:bg-indigo-900 dark:text-indigo-300">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {h.title}
                  </span>
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {pct}٪
                </span>
              </div>

              {/* Confidence Bar */}
              <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Evidence Chips */}
              {h.evidenceIds && h.evidenceIds.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {t.cards.evidence}
                  </span>
                  {h.evidenceIds.map((eid) => (
                    <button
                      key={eid}
                      onClick={() => setSelectedEvidence(selectedEvidence === eid ? null : eid)}
                      className="px-2 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                    >
                      {eid}
                    </button>
                  ))}
                </div>
              )}

              {/* Suggested Actions */}
              {h.suggestedActions && h.suggestedActions.length > 0 && (
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-indigo-500" />
                  <span>{t.cards.suggestedFix}</span>
                  <code className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {h.suggestedActions[0]?.tool}
                  </code>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedEvidence && (
        <div className="mt-3 p-2.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 font-mono">
          مدرک استناد شده: {selectedEvidence}
        </div>
      )}
    </div>
  );
}
