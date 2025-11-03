'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EventsToolbar } from '@/components/events/events-toolbar';
import { useTranslation } from '@/hooks/use-translation';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface EventsClientPageProps {
  children: ReactNode;
}

export default function EventsClientPage({ children }: EventsClientPageProps) {
  const { t } = useTranslation('events');
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  useEffect(() => {
    const element = document.querySelector('[data-scroll-anchor]');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status]);

  return (
    <div className="relative mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-gradient bg-blob opacity-60 blur-3xl" />

      <div className="glass-card interactive-spotlight p-6 shadow-glass-lg sm:p-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-glow">{t('title')}</h1>
            <p className="max-w-xl text-base text-muted-foreground">{t('description')}</p>
          </div>
          <Button
            asChild
            size="lg"
            className="glass-button px-5 py-2 text-sm font-semibold uppercase tracking-wide"
          >
            <Link href="/dashboard/events/create">
              <PlusCircle className="mr-2 h-5 w-5" />
              {t('create_button')}
            </Link>
          </Button>
        </div>
      </div>

      <EventsToolbar />

      <div data-scroll-anchor className="space-y-8">
        {children}
      </div>
    </div>
  );
}
