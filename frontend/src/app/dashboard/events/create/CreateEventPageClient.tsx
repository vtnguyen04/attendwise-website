'use client';

import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import EventForm from '@/components/events/event-form/event-form';
import type { Community } from '@/lib/types';

interface CreateEventPageClientProps {
  adminCommunities: Community[];
}

export default function CreateEventPageClient({ adminCommunities }: CreateEventPageClientProps) {
  useEffect(() => {
    const element = document.querySelector('[data-scroll-anchor]');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="space-y-6" data-primary-content>
      <GlassCard data-scroll-skip="true">
        <CardHeader>
          <CardTitle className="text-4xl font-bold tracking-tight text-glow">Create a New Event</CardTitle>
          <CardDescription className="max-w-xl text-base text-muted-foreground">
            Set up a new event for your community. Provide the details to get started.
          </CardDescription>
        </CardHeader>
      </GlassCard>

      <GlassCard data-scroll-anchor>
        <CardContent>
          <EventForm
            mode="create"
            communities={adminCommunities}
          />
        </CardContent>
      </GlassCard>
    </div>
  );
}
