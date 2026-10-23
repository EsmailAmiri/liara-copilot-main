import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/i18n/context';
import { ChatProvider } from '@/context/ChatContext';
import { AppShell } from '@/components/layout/AppShell';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazirmatn',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Liara Copilot — دستیار فنی هوشمند برای مدیریت سایت‌های روی لیارا',
  description: 'AI technical teammate for operating apps on Liara Cloud',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`h-full antialiased ${vazirmatn.variable}`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans overflow-hidden">
        <I18nProvider>
          <ChatProvider>
            <AppShell>{children}</AppShell>
          </ChatProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
