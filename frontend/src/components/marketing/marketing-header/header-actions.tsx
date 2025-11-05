// components/layout/marketing-header/header-actions.tsx
'use client';

import { Sun, Moon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import UserNav from '@/components/layout/user-nav';
import LanguageToggle from '@/components/layout/language-toggle';
import { useTranslation } from '@/hooks/use-translation';

interface HeaderActionsProps {
  theme: 'dark' | 'light' | string | undefined;
  toggleTheme: () => void;
}

export function HeaderActions({ theme, toggleTheme }: HeaderActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="hidden md:flex items-center gap-2">
      <LanguageToggle />
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full text-gray-300 hover:text-white hover:bg-white/10"
        aria-label={t('common.theme.toggle')}
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
      <UserNav theme="marketing" />
    </div>
  );
}
