// components/layout/dashboard-header/header-actions.tsx
'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/layout/language-toggle';
import { useTranslation } from '@/hooks/use-translation';
import { ThemeToggleButton } from './theme-toggle-button';

// Lazy load components that depend on client-side data
const UserNav = dynamic(() => import('@/components/layout/user-nav'), { ssr: false });
const NotificationBell = dynamic(
  () => import('@/components/notifications/notification-bell').then((mod) => mod.NotificationBell),
  { ssr: false }
);

const actionFallback = (
  <div className="h-9 w-9 animate-pulse rounded-full border border-border/60 bg-background/60" />
);

interface HeaderActionsProps {
  theme: 'dark' | 'light' | string | undefined;
  toggleTheme: () => void;
}

export function HeaderActions({ theme, toggleTheme }: HeaderActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" className="hidden items-center gap-1.5 md:flex">
        <Link href="/dashboard/communities/create">
          <Plus className="h-4 w-4" />
          {t('common.header.create')}
        </Link>
      </Button>
      
      <div className="hidden md:block">
        <LanguageToggle />
      </div>
      
      <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />

      <Suspense fallback={actionFallback}>
        <NotificationBell />
      </Suspense>
      
      <Suspense fallback={actionFallback}>
        <UserNav theme="dashboard" />
      </Suspense>
    </div>
  );
}