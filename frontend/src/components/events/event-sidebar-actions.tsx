// components/event-sidebar-actions.tsx
'use client';

import { useMemo } from 'react';
import { AppEvent, EventAttendee, User, EventSession } from '@/lib/types'; // Corrected Session type
import { determineActionState } from '@/lib/helpers/event-actions-helper';

// Import action components (to be created)
import { LoginToRegisterButton } from './actions/login-to-register-button';
import { RegisterButton } from './actions/register-button';
import { HostActions } from './actions/host-actions';
import { RegisteredActions } from './actions/registered-actions';
import { StatusDisplay } from './actions/status-display';
import { CapacityIndicator } from './actions/capacity-indicator';
import {extractIntValue} from '@/lib/utils';

interface EventSidebarActionsProps {
  event: AppEvent;
  user: User | null;
  myRegistration: EventAttendee | null;
  onViewTicket: () => void;
  selectedSession: EventSession | undefined;
  onOpenCheckInDialog: () => void; // New prop
  onRegister: () => void;
  onUnregister: () => void;
  registerLoading: boolean;
  isCheckInOpen: boolean;
}

export default function EventSidebarActions({
  event,
  user,
  myRegistration,
  onViewTicket,
  selectedSession,
  onOpenCheckInDialog,
  onRegister,
  onUnregister,
  registerLoading,
  isCheckInOpen,
}: EventSidebarActionsProps) {
  // Logic is now clean and centralized.
  const isHost = user?.id === event.created_by;
  const actionState = useMemo(() => determineActionState(event, user, isHost, myRegistration, selectedSession), [event, user, isHost, myRegistration, selectedSession]);
  const renderActionComponent = () => {
    switch (actionState.state) {
      case 'LOGIN_TO_REGISTER':
        return <LoginToRegisterButton />;
      case 'CAN_REGISTER':
        return <RegisterButton eventId={event.id} onRegister={onRegister} registerLoading={registerLoading} />;
      case 'EVENT_ENDED':
      case 'REGISTRATION_CLOSED':
      case 'EVENT_FULL':
      case 'PENDING_APPROVAL':
      case 'ATTENDED':
        return <StatusDisplay state={actionState.state} message={ (actionState as any).message } />;
      case 'FACE_ID_REQUIRED':
        return <StatusDisplay state="FACE_ID_REQUIRED" />;
      case 'REGISTERED_UPCOMING':
      case 'CAN_CHECK_IN':
        return (
          <RegisteredActions
            state={actionState.state}
            eventId={event.id}
            registrationId={myRegistration!.id}
            onViewTicket={onViewTicket}
            onOpenCheckInDialog={onOpenCheckInDialog} // Pass the new prop
            isCheckInOpen={isCheckInOpen}
          />
        );
      case 'HOST_MANAGE':
        return <HostActions event={event} />;
      default:
        return null;
    }
  };
    const maxAttendees = extractIntValue(event.max_attendees);
  return (
    <div className="space-y-4">
      {event.max_attendees?.Valid && (
        <CapacityIndicator
            
          current={event.current_attendees}
          max={maxAttendees}
        />
      )}
      <div className="pt-4 border-t">
        {renderActionComponent()}
      </div>
    </div>
  );
}