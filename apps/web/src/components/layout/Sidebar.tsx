'use client';

import React, { useState, useEffect } from 'react';
import type { AppSummary } from '@copilot/shared';
import { useI18n } from '@/i18n/context';
import { Server, Plus, HardDrive, RefreshCw } from 'lucide-react';

export interface SidebarProps {
  selectedApp?: string;
  onSelectApp?: (app: string) => void;
  onNewDeployment?: () => void;
}

export function Sidebar({ selectedApp, onSelectApp, onNewDeployment }: SidebarProps) {
  const { t } = useI18n();
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = () => {
    setLoading(true);
    fetch('/api/apps')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchApps();
  }, []);

  return (
    <aside className="flex flex-col h-full w-64 bg-gray-50/80 dark:bg-gray-950/50 border-l dark:border-gray-800 p-3">
      {/* New deploy button */}
      <button
        onClick={onNewDeployment}
        className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition mb-4"
      >
        <Plus className="h-4 w-4" />
        <span>{t.newDeployment}</span>
      </button>

      {/* Apps section */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          برنامه‌های شما
        </span>
        <button
          onClick={fetchApps}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          title="بروزرسانی لیست"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {apps.length === 0 && !loading && (
          <div className="text-xs text-gray-400 text-center py-6">هیچ برنامه‌ای یافت نشد.</div>
        )}

        {apps.map((app) => {
          const isSelected = selectedApp === app.name;
          const isRunning = app.status === 'running';
          const isFailed = app.status === 'failed';

          return (
            <button
              key={app.project_id || app.name}
              onClick={() => onSelectApp?.(app.name)}
              className={`flex items-center justify-between w-full p-2.5 rounded-lg text-start transition ${
                isSelected
                  ? 'bg-white dark:bg-gray-800 shadow-xs border border-gray-200 dark:border-gray-700'
                  : 'hover:bg-gray-200/50 dark:hover:bg-gray-800/40 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    isRunning
                      ? 'bg-emerald-500 shadow-emerald-500/50 shadow-xs'
                      : isFailed
                        ? 'bg-rose-500'
                        : 'bg-gray-400'
                  }`}
                />
                <div className="truncate">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block truncate">
                    {app.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono block">{app.platform}</span>
                </div>
              </div>

              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200/70 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono shrink-0">
                {app.plan || 'std'}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
