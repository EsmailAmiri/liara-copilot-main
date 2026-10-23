'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/context';
import { Cloud, Globe, LogOut, Bell, FileText, CheckCircle, MessageSquare } from 'lucide-react';

export function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [configStatus, setConfigStatus] = useState<{
    liaraMode: string;
    llmMode: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/config/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setConfigStatus(data);
      })
      .catch(() => {});
  }, []);

  if (pathname === '/login') {
    return null;
  }

  const isMock = configStatus?.liaraMode === 'mock' || configStatus?.llmMode === 'mock';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    router.push(href, { scroll: false });
  };

  const navItems = [
    { href: '/', label: t.chat, icon: <MessageSquare className="h-4 w-4" /> },
    { href: '/alerts', label: t.alerts, icon: <Bell className="h-4 w-4" /> },
    { href: '/audit', label: t.audit, icon: <FileText className="h-4 w-4" /> },
    { href: '/capabilities', label: t.capabilities, icon: <CheckCircle className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          onClick={(e) => handleNavClick(e, '/')}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100 block">
              {t.appName}
            </span>
          </div>
        </Link>

        {/* MODE Badge */}
        {configStatus && (
          <div className="flex items-center">
            {isMock ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                {t.mockBadge}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t.liveBadge}
              </span>
            )}
          </div>
        )}

        {/* Navigation tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Language switch */}
        <button
          onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title="تغییر زبان / Switch Language"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>{locale === 'fa' ? 'EN' : 'فا'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t.actions.logout}</span>
        </button>
      </div>
    </header>
  );
}
