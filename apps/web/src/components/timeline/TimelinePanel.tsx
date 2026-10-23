'use client';

import React from 'react';
import type { TimelineStep } from '@copilot/shared';
import { useI18n } from '@/i18n/context';
import { Activity, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

export interface TimelinePanelProps {
  steps: TimelineStep[];
}

export function TimelinePanel({ steps }: TimelinePanelProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r dark:border-gray-800 p-4 overflow-y-auto">
      <div className="flex items-center gap-2 border-b dark:border-gray-800 pb-3 mb-4">
        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          {t.timeline.title}
        </h2>
      </div>

      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-xs">
          <Clock className="h-8 w-8 mb-2 stroke-1 opacity-50" />
          <span>{t.timeline.empty}</span>
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((s) => {
            const isCompleted = s.status === 'completed';
            const isFailed = s.status === 'failed';
            const isRunning = s.status === 'running';

            return (
              <div key={s.id} className="relative flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {isFailed && <XCircle className="h-4 w-4 text-rose-500" />}
                  {isRunning && (
                    <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  )}
                  {s.status === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                      {s.title}
                    </span>
                    {s.durationMs !== undefined && (
                      <span className="text-[10px] text-gray-400 font-mono">{s.durationMs}ms</span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {s.tool}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      {s.source}
                    </span>
                  </div>

                  {s.error && (
                    <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.error}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
