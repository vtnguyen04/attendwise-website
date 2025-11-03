'use client';

import { useTheme } from 'next-themes';
import { useTheme as useCustomTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import SearchInput from '@/components/layout/search-input';

import { HeaderLogo } from './dashboard-header/header-logo';
import { HeaderActions } from './dashboard-header/header-actions';

const SCROLL_THRESHOLD = 10;

export default function DashboardHeader({ scrollY }: { scrollY: number }) {
  const { setTheme } = useTheme();
  const currentTheme = useCustomTheme();
  const hasScrolled = scrollY > SCROLL_THRESHOLD;

  const toggleTheme = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      className={cn(
              'sticky top-0 z-50 flex h-16 items-center border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur transition-shadow duration-300 sm:px-6 lg:px-8',
              hasScrolled ? 'shadow-md shadow-black/5' : ''      )}
    >
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left Section */}
        <HeaderLogo />

        {/* Center Section */}
        <div className="flex-1 max-w-lg">
          <SearchInput />
        </div>

        {/* Right Section */}
        <HeaderActions theme={currentTheme} toggleTheme={toggleTheme} />
      </div>
    </header>
  );
}