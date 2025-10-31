// app/events/[eventId]/components/event-sidebar.tsx
'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  Lock,
  Calendar,
  Video,
  Building2,
  UserCheck,
  DollarSign,
  Globe,
  ExternalLink,
} from 'lucide-react';

import { AppEvent, User, EventAttendee, EventSession } from '@/lib/types';
import { extractTimeValue, extractStringValue, extractIntValue, getAbsoluteUrl } from '@/lib/utils';
import EventSidebarActions from './event-sidebar-actions'; // The one we refactored

// Reusable component for each row in the details card
const InfoRow = ({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {children}
    </div>
  </div>
);

interface EventSidebarProps {
  event: AppEvent;
  user: User | null;
  myRegistration: EventAttendee | null;
  isHost: boolean;
  isRegistered: boolean;
  isEventFinished: boolean;
  selectedSession: EventSession | undefined;
  setSelectedSession: React.Dispatch<React.SetStateAction<EventSession | undefined>>;
  onViewTicket: () => void;
  onOpenCheckInDialog: () => void;
  onRegister: () => void;
  onUnregister: () => void;
  registerLoading: boolean;
  isCheckInOpen: boolean;
}

export function EventSidebar({
  event,
  user,
  myRegistration,
  isHost,
  isRegistered,
  isEventFinished,
  selectedSession,
  setSelectedSession,
  onViewTicket,
  onOpenCheckInDialog,
  onRegister,
  onUnregister,
  registerLoading,
  isCheckInOpen,
}: EventSidebarProps) {
  console.log('EventSidebar - isEventFinished:', isEventFinished);
  // Determine which time to display: session-specific or event-wide
  const displayStartTime = selectedSession?.start_time || extractTimeValue(event.start_time);
  const displayEndTime = selectedSession?.end_time || extractTimeValue(event.end_time);

  // Extract values using utility functions for type safety
  const locationAddress = extractStringValue(event.location_address);
  const onlineMeetingUrl = extractStringValue(event.online_meeting_url);
  const maxAttendees = extractIntValue(event.max_attendees);
  const eventFee = event.fee.Valid ? event.fee.Float64 : 0;

  return (
    <div className="sticky top-24 space-y-4">
      {/* Event Info Card */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="font-semibold text-lg border-b pb-3 mb-4">Event Details</h3>

        {/* Date & Time */}
        {displayStartTime && (
          <InfoRow icon={Calendar} label="Date & Time">
            <p className="font-semibold">{format(new Date(displayStartTime), 'EEEE, MMMM d, yyyy')}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(displayStartTime), 'h:mm a')}
              {displayEndTime && ` - ${format(new Date(displayEndTime), 'h:mm a')}`}
            </p>
          </InfoRow>
        )}

        {/* Location */}
        <InfoRow
          icon={
            event.location_type === 'online' ? Video : event.location_type === 'hybrid' ? Globe : Building2
          }
          label="Location"
        >
          <p className="font-semibold capitalize">{event.location_type}</p>
          {event.location_type !== 'online' && locationAddress && (
            <p className="text-sm text-muted-foreground truncate">{locationAddress}</p>
          )}
          {event.location_type !== 'physical' && onlineMeetingUrl && (
            <Link
              href={onlineMeetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
            >
              Join Online <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </InfoRow>

        {/* Attendees */}
        <InfoRow icon={UserCheck} label="Attendees">
          <p className="font-semibold">
            {event.current_attendees}
            {maxAttendees ? ` / ${maxAttendees}` : ' registered'}
          </p>
        </InfoRow>

        {/* Price */}
        {event.is_paid && (
          <InfoRow icon={DollarSign} label="Price">
            <p className="font-semibold">
              {event.currency} {eventFee.toFixed(2)}
            </p>
          </InfoRow>
        )}
      </div>

      {/* Action Card */}
      <div className="glass-card p-6 rounded-2xl">
        {isEventFinished ? (
          <div className="text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-xl">Event Concluded</h3>
            <p className="text-sm text-muted-foreground">
              This event is no longer active.
            </p>
          </div>
        ) : (
          <EventSidebarActions
            event={event}
            user={user}
            myRegistration={myRegistration}
            onViewTicket={onViewTicket}
            selectedSession={selectedSession}
            onOpenCheckInDialog={onOpenCheckInDialog}
            onRegister={onRegister}
            onUnregister={onUnregister}
            registerLoading={registerLoading}
            isCheckInOpen={isCheckInOpen}
          />
        )}
      </div>
    </div>
  );
}