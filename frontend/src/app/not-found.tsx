
'use client';

import { Button } from '@/components/ui/button';
import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';

export default function NotFound() {
  const { t } = useTranslation('common');

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="dashboard-panel flex flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center text-center">
          <SearchX className="h-16 w-16 text-muted-foreground" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('not_found_title')}
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            {t('not_found_description')}
          </p>
          <Button asChild className="mt-8">
            <Link href="/">{t('go_back_home')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
