'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { Cloud, Lock, ArrowLeft, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { t, dir } = useI18n();
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      if (res.ok) {
        router.push('/');
      } else {
        const data = await res.json();
        setError(data.error || t.login.wrongPasscode);
      }
    } catch {
      setError('ارتباط با سرور برقرار نشد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 h-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md mb-3">
            <Cloud className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t.login.title}</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={t.login.passcodePlaceholder}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400">
                <Lock className="h-4 w-4" />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-600 dark:text-rose-400 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !passcode}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <span>{loading ? t.login.loggingIn : t.login.submit}</span>
            {dir === 'rtl' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
