// event-settings-tab.tsx
'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Settings } from 'lucide-react';
import { DetailedAppEvent } from '@/lib/types';

import { DangerZone } from './danger-zone';
import { EditEventCard } from './edit-event-card';

// Note: I am assuming there will be a utility function to calculate the dynamic status
// and it will be passed down or calculated in the parent component.
// For now, let's assume `event` prop includes a dynamicStatus field.
interface EventSettingsTabProps {
  event: DetailedAppEvent; // The event object
  isEventFinished: boolean; // Pass the pre-calculated isEventFinished
}

export default function EventSettingsTab({ event, isEventFinished }: EventSettingsTabProps) {
  // Centralized logic for disabling actions, now derived from props.
  const isActionDisabled = isEventFinished; // Use the passed prop

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="glass-card border-border shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Event Settings</CardTitle>
          </div>
          <CardDescription className="text-base leading-relaxed">
            Make changes to your event below. Note that some changes are locked after creation.
          </CardDescription>
        </CardHeader>
        <div className="px-6 py-4 bg-amber-500/10 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Contact support if you need to modify restricted fields.
          </p>
        </div>
      </Card>

      {/* Edit Event Form Card */}
      <EditEventCard event={event} isEditingDisabled={isActionDisabled} />

      {/* Danger Zone */}
      <DangerZone eventId={event.id} isActionDisabled={isActionDisabled} />
    </div>
  );
}