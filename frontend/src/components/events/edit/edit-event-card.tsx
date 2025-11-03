// app/events/[eventId]/settings/components/edit-event-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailedAppEvent } from '@/lib/types';
import EventForm from '@/components/events/event-form/event-form';
import { Lock, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface EditEventCardProps {
  event: DetailedAppEvent;
  isEditingDisabled: boolean;
}

const LockedState = ({ status }: { status: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center justify-center text-center py-16"
  >
    <div className="w-20 h-20 rounded-full bg-destructive/10 backdrop-glass flex items-center justify-center mb-6 relative">
      <Lock className="h-10 w-10 text-destructive/80" />
      <div className="absolute inset-0 rounded-full bg-destructive/5 animate-pulse" />
    </div>
    <h3 className="text-xl font-bold mb-3">Editing is Disabled</h3>
    <p className="text-muted-foreground max-w-md leading-relaxed">
      This event has been marked as &quot;<span className="font-semibold text-foreground">{status}</span>&quot; and can no longer be edited.
    </p>
  </motion.div>
);

export function EditEventCard({ event, isEditingDisabled }: EditEventCardProps) {
  return (
    <Card className="dashboard-panel border-0 shadow-none overflow-hidden">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
            {isEditingDisabled ? (
              <Lock className="h-5 w-5 text-destructive" />
            ) : (
              <Settings className="h-5 w-5 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl font-bold">
            {isEditingDisabled ? 'Settings Locked' : 'Edit Event Details'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isEditingDisabled ? (
          <LockedState status={event.status} />
        ) : (
          <EventForm key={event.id} mode="edit" initialData={event} />
        )}
      </CardContent>
    </Card>
  );
}