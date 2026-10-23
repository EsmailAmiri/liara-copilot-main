'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fa, type Translations } from './fa';
import { en } from './en';

interface I18nContextType {
  locale: 'fa' | 'en';
  t: Translations;
  setLocale: (l: 'fa' | 'en') => void;
  dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType>({
  locale: 'fa',
  t: fa,
  setLocale: () => {},
  dir: 'rtl',
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<'fa' | 'en'>('fa');

  useEffect(() => {
    const saved = localStorage.getItem('copilot_lang') as 'fa' | 'en' | null;
    if (saved && (saved === 'fa' || saved === 'en')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: 'fa' | 'en') => {
    setLocaleState(l);
    localStorage.setItem('copilot_lang', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
  };

  const t = locale === 'fa' ? fa : en;
  const dir = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, dir }}>
      <div dir={dir} className={dir === 'rtl' ? 'font-vazir' : ''}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
