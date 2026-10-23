'use client';

import React from 'react';
import { useI18n } from '@/i18n/context';
import { Info, ExternalLink } from 'lucide-react';

export interface LimitationCardProps {
  title?: string;
  message: string;
  hint?: string;
  manualSteps?: string[];
}

export function LimitationCardComponent({
  title,
  message,
  hint,
  manualSteps = [],
}: LimitationCardProps) {
  const { t } = useI18n();

  return (
    <div className="my-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/20 p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-sky-100 dark:border-sky-800/40 pb-2.5">
        <Info className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {title || t.cards.limitationTitle}
        </h3>
      </div>

      <p className="mt-2.5 text-xs text-gray-800 dark:text-gray-200 leading-relaxed">{message}</p>

      {hint && (
        <div className="mt-2 text-xs text-sky-800 dark:text-sky-300 bg-sky-100/60 dark:bg-sky-900/40 p-2 rounded">
          {hint}
        </div>
      )}

      {manualSteps.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
            مراحل دستی در پنل کاربری:
          </span>
          <ol className="list-decimal list-inside text-xs text-gray-700 dark:text-gray-300 space-y-1">
            {manualSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-sky-100 dark:border-sky-800/40 flex justify-end">
        <a
          href="https://console.liara.ir"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline"
        >
          <span>ورود به کنسول لیارا</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
