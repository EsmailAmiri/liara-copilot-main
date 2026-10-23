'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import type { AuditLogEntry } from '@copilot/shared';
import { FileText, Download, CheckCircle, XCircle, Clock } from 'lucide-react';

export function AuditView() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit?limit=100')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `copilot-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{t.audit}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                تاریخچه کامل و شفاف کلیه عملیات، تأییدیه‌ها، ریسک‌ها و فراخوانی ابزارها
              </p>
            </div>
          </div>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>خروجی JSON</span>
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-gray-400 text-center py-12">در حال بارگذاری وقایع...</div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center text-xs text-gray-500">
            هنوز رخدادی در لاگ وقایع ثبت نشده است.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto shadow-xs">
            <table className="w-full text-start text-xs">
              <thead className="bg-gray-50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800 text-gray-500">
                <tr>
                  <th className="py-2.5 px-3 text-start">زمان</th>
                  <th className="py-2.5 px-3 text-start">عامل</th>
                  <th className="py-2.5 px-3 text-start">عملیات</th>
                  <th className="py-2.5 px-3 text-start">ابزار</th>
                  <th className="py-2.5 px-3 text-start">ریسک</th>
                  <th className="py-2.5 px-3 text-start">نتیجه</th>
                  <th className="py-2.5 px-3 text-start">شناسه رهگیری (Trace)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-mono">
                {logs.map((log) => {
                  const isSuccess = log.outcome === 'success';
                  const isPending = log.outcome === 'pending';
                  const isFailure = log.outcome === 'failure' || log.outcome === 'rejected';

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('fa-IR')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px]">
                          {log.actor}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">
                        {log.tool || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {log.risk ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.risk === 'high'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            }`}
                          >
                            {log.risk}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="flex items-center gap-1 text-[11px]">
                          {isSuccess && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                          {isPending && <Clock className="h-3.5 w-3.5 text-amber-500" />}
                          {isFailure && <XCircle className="h-3.5 w-3.5 text-rose-500" />}
                          <span
                            className={
                              isSuccess
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isPending
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {log.outcome}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-400 text-[11px] truncate max-w-[120px]">
                        {log.traceId || '-'}
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
