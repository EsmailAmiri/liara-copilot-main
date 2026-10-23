'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { TimelinePanel } from '../timeline/TimelinePanel';
import { NewDeploymentModal } from '../modals/NewDeploymentModal';
import { useChat } from '@/context/ChatContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { timelineSteps, selectedApp, setSelectedApp, sendMessage } = useChat();
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  useEffect(() => {
    if (pathname === '/login') return;

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (!data.authenticated) {
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [pathname, router]);

  if (pathname === '/login') {
    return <main className="flex-1 h-full flex flex-col">{children}</main>;
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Navbar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Persistent across all routes */}
        <Sidebar
          selectedApp={selectedApp}
          onSelectApp={(app) => {
            setSelectedApp(app);
            sendMessage(`وضعیت برنامه ${app} را بررسی کن.`);
            if (pathname !== '/') {
              router.push('/', { scroll: false });
            }
          }}
          onNewDeployment={() => {
            setIsDeployModalOpen(true);
          }}
        />

        {/* Center Dynamic Content Area - Swapped smoothly by SPA client navigation */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-gray-50/50 dark:bg-gray-900/30">
          {children}
        </main>

        {/* Right Timeline Panel - Persistent across all views */}
        <div className="hidden lg:block w-80 h-full border-r dark:border-gray-800">
          <TimelinePanel steps={timelineSteps} />
        </div>
      </div>

      {/* New Deployment Modal Dialog */}
      <NewDeploymentModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onSubmit={(prompt) => {
          sendMessage(prompt);
          if (pathname !== '/') {
            router.push('/', { scroll: false });
          }
        }}
      />
    </div>
  );
}
