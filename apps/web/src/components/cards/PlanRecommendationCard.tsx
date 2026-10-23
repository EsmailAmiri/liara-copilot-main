'use client';

import React from 'react';
import { useI18n } from '@/i18n/context';
import { Layers, CheckCircle } from 'lucide-react';

export interface PlanRecommendationCardProps {
  platform: string;
  recommendedPlan: string;
  rationale: string;
  costEstimate: string;
  onProceed?: () => void;
}

export function PlanRecommendationCardComponent({
  platform,
  recommendedPlan,
  rationale,
  costEstimate,
  onProceed,
}: PlanRecommendationCardProps) {
  const { t } = useI18n();

  return (
    <div className="my-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-purple-100 dark:border-purple-800/40 pb-2.5">
        <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {t.cards.planRecTitle} ({platform})
        </h3>
      </div>

      <div className="mt-3 text-xs text-gray-800 dark:text-gray-200">
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-500 dark:text-gray-400">پلن پیشنهادی:</span>
          <span className="font-bold text-purple-700 dark:text-purple-300 font-mono text-sm">
            {recommendedPlan}
          </span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-500 dark:text-gray-400">برآورد هزینه:</span>
          <span className="text-gray-900 dark:text-gray-100">{costEstimate}</span>
        </div>
        <p className="mt-2 text-gray-700 dark:text-gray-300 leading-relaxed">{rationale}</p>
      </div>

      {onProceed && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onProceed}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition"
          >
            <CheckCircle className="h-4 w-4" />
            <span>ادامه و ایجاد برنامه</span>
          </button>
        </div>
      )}
    </div>
  );
}
