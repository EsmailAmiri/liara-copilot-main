'use client';

import React, { useState, useRef } from 'react';
import { useI18n } from '@/i18n/context';
import {
  X,
  Rocket,
  Cpu,
  Layers,
  Sparkles,
  Upload,
  Folder,
  GitBranch,
  Box,
  FileArchive,
  Check,
} from 'lucide-react';

export interface NewDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

type SourceType = 'local' | 'upload' | 'git' | 'docker';

export function NewDeploymentModal({ isOpen, onClose, onSubmit }: NewDeploymentModalProps) {
  const { t } = useI18n();
  const [sourceType, setSourceType] = useState<SourceType>('local');
  const [appName, setAppName] = useState('');
  const [platform, setPlatform] = useState('auto');
  const [plan, setPlan] = useState('auto');

  // Specific source inputs
  const [localPath, setLocalPath] = useState('.');
  const [gitUrl, setGitUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [dockerImage, setDockerImage] = useState('');
  const [dockerPort, setDockerPort] = useState('3000');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Auto-suggest app name from zip filename if empty
      if (!appName) {
        const suggestedName = file.name
          .replace(/\.(zip|tar\.gz|tar|tgz)$/i, '')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-');
        setAppName(suggestedName);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = appName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    let sourceDesc = '';
    if (sourceType === 'upload' && uploadedFile) {
      sourceDesc = `با استفاده از فایل سورس آپلود شده "${uploadedFile.name}" (${(uploadedFile.size / 1024).toFixed(1)} KB)`;
    } else if (sourceType === 'git' && gitUrl.trim()) {
      sourceDesc = `از مخزن گیت ${gitUrl.trim()} (شاخه ${gitBranch || 'main'})`;
    } else if (sourceType === 'docker' && dockerImage.trim()) {
      sourceDesc = `با استفاده از ایمیج داکر "${dockerImage.trim()}" روی پورت ${dockerPort || 3000}`;
    } else {
      sourceDesc = `از مسیر پوشه محلی "${localPath || '.'}"`;
    }

    let prompt = '';
    if (cleanName && platform !== 'auto' && plan !== 'auto') {
      prompt = `می‌خواهم برنامه جدیدی به نام "${cleanName}" روی پلتفرم "${platform}" با پلن "${plan}" ${sourceDesc} ایجاد و استقرار دهم.`;
    } else if (cleanName && platform !== 'auto') {
      prompt = `می‌خواهم برنامه جدیدی به نام "${cleanName}" روی پلتفرم "${platform}" ${sourceDesc} ایجاد کنم. لطفاً پلن بهینه را پیشنهاد داده و فرآیند دیپلوی را اجرا کن.`;
    } else if (cleanName) {
      prompt = `می‌خواهم برنامه جدیدی به نام "${cleanName}" ${sourceDesc} ایجاد کنم. لطفاً ساختار پروژه را بررسی و تحلیل کن و استقرار را انجام بده.`;
    } else {
      prompt = `می‌خواهم این پروژه را ${sourceDesc} به عنوان یک برنامه جدید تحلیل، ایجاد و روی لیارا دیپلوی کنم.`;
    }

    onSubmit(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                استقرار برنامه جدید در لیارا
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                منبع سورس کد، پلتفرم و مشخصات برنامه خود را تعیین کنید
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Source Type Selector */}
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              منبع سورس پروژه (Project Source)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('local')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  sourceType === 'local'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Folder className="h-4 w-4 mb-1 text-blue-500" />
                <span className="text-[11px]">پوشه جاری/محلی</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('upload')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  sourceType === 'upload'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Upload className="h-4 w-4 mb-1 text-emerald-500" />
                <span className="text-[11px]">آپلود Zip پروژه</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('git')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  sourceType === 'git'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                }`}
              >
                <GitBranch className="h-4 w-4 mb-1 text-purple-500" />
                <span className="text-[11px]">مخزن Git</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('docker')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  sourceType === 'docker'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Box className="h-4 w-4 mb-1 text-cyan-500" />
                <span className="text-[11px]">ایمیج داکر</span>
              </button>
            </div>
          </div>

          {/* Conditional Source Detail Inputs */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-950/60 p-3 border border-gray-200 dark:border-gray-800">
            {sourceType === 'local' && (
              <div>
                <label className="text-gray-600 dark:text-gray-400 block mb-1">
                  مسیر پوشه پروژه در سیستم:
                </label>
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="."
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  مقدار پیش‌فرض <code className="font-mono">.</code> به معنی پوشه جاری فضای کاری
                  است.
                </span>
              </div>
            )}

            {sourceType === 'upload' && (
              <div>
                <label className="text-gray-600 dark:text-gray-400 block mb-1">
                  فایل فشرده سورس کد (.zip یا .tar.gz):
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".zip,.tar.gz,.tgz,.tar"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-blue-500 transition bg-white dark:bg-gray-900"
                >
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <FileArchive className="h-5 w-5" />
                      <span className="font-mono font-bold">{uploadedFile.name}</span>
                      <span className="text-gray-500 text-[10px]">
                        ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-6 w-6 text-gray-400 mx-auto" />
                      <span className="text-xs text-gray-600 dark:text-gray-300 block font-medium">
                        کلیک برای انتخاب فایل Zip پروژه
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        حداکثر حجم فایل فشرده: ۱۰۰ مگابایت
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {sourceType === 'git' && (
              <div className="space-y-2">
                <div>
                  <label className="text-gray-600 dark:text-gray-400 block mb-1">
                    آدرس مخزن Git:
                  </label>
                  <input
                    type="url"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="https://github.com/my-org/my-app.git"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-gray-600 dark:text-gray-400 block mb-1">
                    شاخه (Branch):
                  </label>
                  <input
                    type="text"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    placeholder="main"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {sourceType === 'docker' && (
              <div className="space-y-2">
                <div>
                  <label className="text-gray-600 dark:text-gray-400 block mb-1">
                    نام ایمیج داکر (Registry Image):
                  </label>
                  <input
                    type="text"
                    value={dockerImage}
                    onChange={(e) => setDockerImage(e.target.value)}
                    placeholder="مثلاً: node:22-alpine یا myrepo/app:latest"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-gray-600 dark:text-gray-400 block mb-1">
                    پورت سرویس در کانتینر:
                  </label>
                  <input
                    type="number"
                    value={dockerPort}
                    onChange={(e) => setDockerPort(e.target.value)}
                    placeholder="3000"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* App Name */}
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
              نام برنامه در لیارا (شناسه انگلیسی)
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="مثلاً: my-ecommerce-shop (اختیاری)"
              pattern="[a-zA-Z0-9-]*"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3.5 py-2.5 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 font-mono"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              فقط حروف کوچک انگلیسی، اعداد و خط فاصله. در صورت خالی بودن، بر اساس منبع به صورت
              هوشمند انتخاب می‌شود.
            </span>
          </div>

          {/* Platform */}
          {sourceType !== 'docker' && (
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
                <span>پلتفرم اجرایی</span>
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
              >
                <option value="auto">✨ تشخیص خودکار هوشمند بر اساس فایل‌های پروژه</option>
                <option value="node">Node.js (Next.js, Express, Fastify, NestJS)</option>
                <option value="python">Python (Django, Flask, FastAPI)</option>
                <option value="php">PHP / Laravel</option>
                <option value="docker">Docker (داکرفایل اختصاصی)</option>
                <option value="static">وب استاتیک (React SPA, Vue, HTML, Flutter Web)</option>
              </select>
            </div>
          )}

          {/* Plan */}
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1.5 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-purple-500" />
              <span>پلن و منابع سخت‌افزاری</span>
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
            >
              <option value="auto">✨ پیشنهاد بهینه توسط کوپایلوت بر اساس نوع فریم‌ورک</option>
              <option value="standard-512m">
                standard-512m (۰.۵ هسته، ۵۱۲MB رم — مناسب استاتیک و تستی)
              </option>
              <option value="standard-1g">
                standard-1g (۱ هسته، ۱GB رم — استاندارد برنامه‌های نود و وب)
              </option>
              <option value="standard-2g">
                standard-2g (۲ هسته، ۲GB رم — ترافیک متوسط و رندر سرور)
              </option>
              <option value="standard-4g">
                standard-4g (۴ هسته، ۴GB رم — سایت‌های پربازدید و دیتابیس)
              </option>
            </select>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>آغاز فرآیند استقرار</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
