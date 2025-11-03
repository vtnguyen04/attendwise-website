// event-settings-tab.tsx
'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Settings } from 'lucide-react';
import { DetailedAppEvent } from '@/lib/types';
import { motion } from 'framer-motion';

import { DangerZone } from './danger-zone';
import { EditEventCard } from './edit-event-card';

interface EventSettingsTabProps {
  event: DetailedAppEvent;
  isEventFinished: boolean;
}

export default function EventSettingsTab({ event, isEventFinished }: EventSettingsTabProps) {
  const isActionDisabled = isEventFinished;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="dashboard-panel border-0 shadow-none overflow-hidden">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">Event Settings</CardTitle>
            </div>
            <CardDescription className="text-sm leading-relaxed">
              Make changes to your event below. Note that some changes are locked after creation.
            </CardDescription>
          </CardHeader>

          {/* Warning Banner */}
          <div className="mx-6 mb-6 liquid-glass-card p-4 border-l-4 border-amber-500">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  Restricted Fields
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Contact support if you need to modify restricted fields after event creation.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Edit Event Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <EditEventCard event={event} isEditingDisabled={isActionDisabled} />
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <DangerZone eventId={event.id} isActionDisabled={isActionDisabled} />
      </motion.div>
    </div>
  );
}