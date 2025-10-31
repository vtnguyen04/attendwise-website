'use client';

import { Suspense } from 'react';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import LanguageToggle from '@/components/layout/language-toggle';
import SearchInput from '@/components/layout/search-input';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { useTheme as useCustomTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const UserNav = dynamic(() => import('@/components/layout/user-nav'), {
  ssr: false,
});

const NotificationBell = dynamic(
  () =>
    import('@/components/notifications/notification-bell').then(
      (mod) => mod.NotificationBell
    ),
  { ssr: false }
);

const actionFallback = (
  <div className="h-9 w-9 animate-pulse rounded-full border border-border/70 bg-background/60" />
);

export default function DashboardHeader({ scrollY }: { scrollY: number }) {
  const { setTheme } = useTheme();
  const currentTheme = useCustomTheme();
  const hasScrolled = scrollY > 12;

  const toggleTheme = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-4 py-3 transition-colors duration-300 lg:px-6',
        hasScrolled
          ? 'border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur'
          : 'border-b border-transparent'
      )}
    >
      <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap md:gap-3">
        <div className="flex items-center gap-2 md:min-w-[160px]">
          <MobileSidebar />
          <span className="text-sm font-semibold text-muted-foreground md:hidden">
            Dashboard
          </span>
        </div>

        <div className="order-3 w-full md:order-none md:mx-auto md:flex-1 md:min-w-[300px] md:max-w-2xl">
          <SearchInput />
        </div>

        <div className="order-2 ml-auto flex items-center gap-2 md:order-none md:ml-0">
          <div className="hidden md:block">
            <LanguageToggle />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
            aria-label="Toggle theme"
          >
            {currentTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Suspense fallback={actionFallback}>
            <NotificationBell />
          </Suspense>
          <Suspense fallback={actionFallback}>
            <UserNav theme="dashboard" />
          </Suspense>
        </div>
      </div>

      <div className="hidden md:block">
        <Breadcrumbs />
      </div>
    </div>
  );
}
