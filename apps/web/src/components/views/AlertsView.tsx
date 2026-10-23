'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { useChat } from '@/context/ChatContext';
import { getCsrfToken } from '@/lib/sse';
import type { Alert } from '@copilot/shared';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export function AlertsView() {
  const { t, dir } = useI18n();
  const { sendMessage } = useChat();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    setLoading(true);
    fetch('/api/alerts')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Alert[]) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const activeAlerts = alerts.filter((a) => a.status !== 'resolved');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');

  const handleInvestigate = (alert: Alert) => {
    sendMessage(`بررسی هشدار فعال در برنامه ${alert.appName}: ${alert.title}`);
    router.push('/', { scroll: false });
  };

  const handleResolve = async (id: string) => {
    // 1. Immediately update UI state so it moves to resolved tab
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'resolved' as const } : a)));

    // 2. Persist resolution to server
    try {
      await fetch(`/api/alerts/${id}/resolve`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
    } catch (err) {
      console.error('Failed to resolve alert on server:', err);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const handleClearResolved = async () => {
    // Clear only resolved alerts
    setAlerts((prev) => prev.filter((a) => a.status !== 'resolved'));
    try {
      await fetch('/api/alerts/clear-resolved', {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
    } catch (err) {
      console.error('Failed to clear resolved alerts:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t.alerts}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                مانیتورینگ خودکار پس‌زمینه و هشدارهای نقض آستانه مصرف منابع و سلامت
              </p>
            </div>
          </div>

          {/* Clear button - ONLY visible on resolved tab */}
          {activeTab === 'resolved' && resolvedAlerts.length > 0 && (
            <button
              onClick={handleClearResolved}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer shadow-2xs"
              title="پاک کردن تمامی هشدارهای حل‌شده"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>پاکسازی هشدارهای حل‌شده</span>
            </button>
          )}
        </div>

        {/* Tabs: Active vs Resolved */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 mb-5">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'active'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>هشدارهای فعال</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeAlerts.length > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {activeAlerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'resolved'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>هشدارهای حل‌شده</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {resolvedAlerts.length}
            </span>
          </button>
        </div>

        {/* Tab Contents */}
        {loading ? (
          <div className="text-xs text-gray-400 text-center py-12">در حال بارگذاری هشدارها...</div>
        ) : activeTab === 'active' ? (
          /* Active Alerts Tab */
          activeAlerts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center shadow-xs">
              <ShieldAlert className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                هیچ هشدار فعالی وجود ندارد
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                کلیه برنامه‌ها در وضعیت پایدار هستند و متریک‌ها در محدوده نرمال قرار دارند.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((al) => {
                const isCrit = al.severity === 'critical';
                return (
                  <div
                    key={al.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-white dark:bg-gray-900 shadow-xs ${
                      isCrit
                        ? 'border-rose-200 dark:border-rose-900/60'
                        : 'border-amber-200 dark:border-amber-900/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isCrit ? (
                          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs md:text-sm text-gray-900 dark:text-gray-100">
                            {al.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {al.appName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCrit
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {al.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                          {al.message}
                        </p>
                        <span className="mt-2 text-[10px] text-gray-400 block font-mono">
                          {new Date(al.timestamp).toLocaleString('fa-IR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolve(al.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                        title="انتقال به بخش حل‌شده‌ها"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>حل شد</span>
                      </button>
                      <button
                        onClick={() => handleInvestigate(al)}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer shadow-2xs"
                      >
                        <span>{t.actions.investigate}</span>
                        {dir === 'rtl' ? (
                          <ArrowLeft className="h-3 w-3" />
                        ) : (
                          <ArrowRight className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : /* Resolved Alerts Tab */
        resolvedAlerts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center text-xs text-gray-500 shadow-xs">
            <CheckCircle2 className="h-8 w-8 text-gray-400 mx-auto mb-2 opacity-60" />
            <span>هیچ هشداری در تاریخچه حل‌شده‌ها وجود ندارد.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {resolvedAlerts.map((al) => (
              <div
                key={al.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 opacity-80 hover:opacity-100 transition shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-gray-800 dark:text-gray-200 line-through">
                        {al.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500">
                        {al.appName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        حل‌شده
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      {al.message}
                    </p>
                    <span className="mt-1 text-[10px] text-gray-400 block font-mono">
                      {new Date(al.timestamp).toLocaleString('fa-IR')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSingle(al.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0 self-end sm:self-center"
                  title="حذف این مورد از تاریخچه"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
