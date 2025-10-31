// app/events/[eventId]/settings/components/edit-event-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailedAppEvent } from '@/lib/types';
import EventForm from '@/components/events/event-form/event-form'; // Assuming EventForm is in the same directory
import { Lock } from 'lucide-react';

interface EditEventCardProps {
  event: DetailedAppEvent;
  isEditingDisabled: boolean;
}

const LockedState = ({ status }: { status: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-12">
    <div className="p-4 bg-red-500/10 rounded-full mb-4">
      <Lock className="h-8 w-8 text-red-500" />
    </div>
    <h3 className="text-lg font-semibold mb-2">Editing is Disabled</h3>
    <p className="text-muted-foreground max-w-md">
      This event has been marked as &quot;{status}&quot; and can no longer be edited.
    </p>
  </div>
);

export function EditEventCard({ event, isEditingDisabled }: EditEventCardProps) {
  return (
    <Card className="glass-card border-border shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
          <CardTitle className="text-xl font-bold">
            {isEditingDisabled ? 'Settings Locked' : 'Edit Event Details'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isEditingDisabled ? (
          <LockedState status={event.status} />
        ) : (
          // key prop is important to re-initialize the form when the event data changes
          <EventForm key={event.id} mode="edit" initialData={event} />
        )}
      </CardContent>
    </Card>
  );
}