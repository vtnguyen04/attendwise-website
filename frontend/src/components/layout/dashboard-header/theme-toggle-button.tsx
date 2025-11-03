// components/layout/dashboard-header/theme-toggle-button.tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

interface ThemeToggleButtonProps {
  theme: 'dark' | 'light' | string | undefined;
  toggleTheme: () => void;
}

export function ThemeToggleButton({ theme, toggleTheme }: ThemeToggleButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full border border-transparent hover:border-border/70"
      aria-label={t('common.theme.toggle')}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}