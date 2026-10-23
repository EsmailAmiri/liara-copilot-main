'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import type { CapabilityEntry } from '@copilot/shared';
import { CheckCircle, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

export function CapabilitiesView() {
  const { t } = useI18n();
  const [capabilities, setCapabilities] = useState<CapabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/capabilities')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setCapabilities(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{t.capabilities}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ماتریس شفاف توانمندی‌ها و محدودیت‌های شناسایی‌شده در API و ابزار خط فرمان لیارا
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-xs text-gray-400 text-center py-12">
            در حال بارگذاری ماتریس توانمندی‌ها...
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto shadow-xs">
            <table className="w-full text-start text-xs">
              <thead className="bg-gray-50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800 text-gray-500">
                <tr>
                  <th className="py-2.5 px-3 text-start">شناسه</th>
                  <th className="py-2.5 px-3 text-start">عنوان قابلیت</th>
                  <th className="py-2.5 px-3 text-start">وضعیت پشتیبانی</th>
                  <th className="py-2.5 px-3 text-start">کانال اجرا</th>
                  <th className="py-2.5 px-3 text-start">ری‌استارت کانتینر؟</th>
                  <th className="py-2.5 px-3 text-start">توضیحات و یادداشت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {capabilities.map((c) => {
                  const isSupported = c.status === 'supported';
                  const isPartial = c.status === 'partial';

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400 font-medium">
                        {c.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100">
                        {c.label}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="flex items-center gap-1 font-semibold text-[11px]">
                          {isSupported && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                          {isPartial && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          {!isSupported && !isPartial && (
                            <XCircle className="h-3.5 w-3.5 text-rose-500" />
                          )}
                          <span
                            className={
                              isSupported
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isPartial
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {isSupported
                              ? 'پشتیبانی کامل'
                              : isPartial
                                ? 'پشتیبانی محدود'
                                : 'عدم پشتیبانی'}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            c.via === 'cli'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : c.via === 'api'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {c.via === 'cli' ? 'Liara CLI' : c.via === 'api' ? 'REST API' : 'دستی'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {c.restartsApp ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            بله (High Risk)
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">خیر</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
                        {c.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
