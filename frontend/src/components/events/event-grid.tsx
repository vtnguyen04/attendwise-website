// components/events/event-grid.tsx
'use client';

import Link from 'next/link';
import { PlusCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EventListCard from './event-list-card'; // Assuming this component exists
import { DisplayEvent } from '@/lib/adapters/event-list.adapter';
import { useTranslation } from '@/hooks/use-translation';

const EmptyState = ({ status }: { status: string }) => {
  const { t } = useTranslation('events');
  const messages = {
    upcoming: { title: t('empty.upcoming.title'), description: t('empty.upcoming.description') },
    ongoing: { title: t('empty.ongoing.title'), description: t('empty.ongoing.description') },
    attending: { title: t('empty.attending.title'), description: t('empty.attending.description') },
    past: { title: t('empty.past.title'), description: t('empty.past.description') },
  };
  const { title, description } = messages[status as keyof typeof messages] || messages.upcoming;

  return (
    <div className="glass-card mx-auto max-w-2xl space-y-6 rounded-3xl p-10 text-center shadow-glass-lg">
      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-glow">{title}</h3>
      <p className="text-muted-foreground/80 mb-6 max-w-md mx-auto">{description}</p>
      <Button asChild className="glass-button px-5 py-2 text-sm font-semibold uppercase tracking-wide">
        <Link href="/dashboard/events/create">
          <PlusCircle className="mr-2 h-5 w-5" />
          {t('empty.create_new_event')}
        </Link>
      </Button>
    </div>
  );
};

interface EventGridProps {
  events: DisplayEvent[];
  status: string;
}

export function EventGrid({ events, status }: EventGridProps) {
  if (events.length === 0) {
    return <EmptyState status={status} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventListCard
          key={event.id}
          event={event}
          className="glass-card interactive-spotlight sheen-on-hover rounded-3xl shadow-glass-lg"
        />
      ))}
    </div>
  );
}
