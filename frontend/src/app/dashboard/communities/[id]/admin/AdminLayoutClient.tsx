'use client';

import { useEffect } from 'react';
import { AdminNavClient } from '@/components/community/layout/AdminNavClient';
import { useTranslation } from '@/hooks/use-translation';

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const { t } = useTranslation('community');
  useEffect(() => {
    const element = document.querySelector('[data-scroll-anchor]');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('admin.title')}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">{t('admin.description')}</p>
      </div>

      {/* Horizontal Navigation - Top */}
      <AdminNavClient />

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-lg" data-scroll-anchor>
        {children}
      </div>
    </div>
  );
}
