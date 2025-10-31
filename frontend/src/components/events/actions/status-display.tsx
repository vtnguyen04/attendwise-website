// components/events/actions/status-display.tsx
'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle, Ban, AlertTriangle } from 'lucide-react';
import { ActionState } from '@/lib/helpers/event-actions-helper';

// A map to associate each state with its specific text and icon.
const stateConfig: Record<string, { text: string; icon: React.ElementType; className?: string }> = {
  EVENT_ENDED: { text: 'Event Ended', icon: XCircle },
  REGISTRATION_CLOSED: { text: 'Registration Closed', icon: Clock },
  EVENT_FULL: { text: 'Event Full', icon: Ban },
  PENDING_APPROVAL: { text: 'Pending Approval', icon: Clock },
  ATTENDED: { text: 'Checked In', icon: CheckCircle, className: 'bg-green-600 hover:bg-green-600' },
};

interface StatusDisplayProps {
  state: ActionState['state'];
  message?: string; // For dynamic messages like 'Event Cancelled'
}

export function StatusDisplay({ state, message }: StatusDisplayProps) {
  // Special case for FACE_ID_REQUIRED which has a more complex UI
  if (state === 'FACE_ID_REQUIRED') {
    return (
      <div className="w-full space-y-3">
        <Button disabled className="w-full">
          Register Now
        </Button>
        <div className="p-3 text-center rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground text-left">
            This event requires FaceID. Please enroll in your profile settings before registering.
          </p>
        </div>
      </div>
    );
  }

  // Get the configuration for the current state, or use the message as a fallback.
  const display = stateConfig[state] || { text: message || 'Event Unavailable', icon: AlertTriangle };
  const Icon = display.icon;

  return (
    <Button disabled className={`w-full ${display.className || ''}`}>
      <Icon className="mr-2 h-4 w-4" />
      {display.text}
    </Button>
  );
}