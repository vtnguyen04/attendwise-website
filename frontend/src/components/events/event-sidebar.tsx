// app/events/[eventId]/components/event-sidebar.tsx
'use client';

import Link from 'next/link';
import {
  Lock,
  Calendar,
  Video,
  Building2,
  UserCheck,
  DollarSign,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { AppEvent, User, EventAttendee, EventSession } from '@/lib/types';
import { extractTimeValue, extractStringValue, extractIntValue, formatInTimezone } from '@/lib/utils';
import EventSidebarActions from './event-sidebar-actions'; // The one we refactored
import { useTranslation } from '@/hooks/use-translation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

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
  isEventFinished: boolean;
  selectedSession: EventSession | undefined;
  onViewTicket: () => void;
}

export function EventSidebar({
  event,
  user,
  myRegistration,
  isEventFinished,
  selectedSession,
  onViewTicket,
}: EventSidebarProps) {
  console.log('EventSidebar - isEventFinished:', isEventFinished);
  const { t } = useTranslation('events');
  const [actionsCollapsed, setActionsCollapsed] = useState(false);
  // Determine which time to display: session-specific or event-wide
  const normalizeTime = (time?: string) => {
    if (!time) return undefined;
    const date = new Date(time);
    return Number.isNaN(date.getTime()) ? undefined : time;
  };

  const sessionStartTime = normalizeTime(selectedSession?.start_time);
  const sessionEndTime = normalizeTime(selectedSession?.end_time);

  const displayStartTime = sessionStartTime || extractTimeValue(event.start_time);
  const displayEndTime = sessionEndTime || extractTimeValue(event.end_time);

  // Extract values using utility functions for type safety
  const locationAddress = extractStringValue(event.location_address);
  const onlineMeetingUrl = extractStringValue(event.online_meeting_url);
  const maxAttendees = extractIntValue(event.max_attendees);
  const eventFee = event.fee.Valid ? event.fee.Float64 : 0;

  return (
    <div className="sticky top-24 space-y-4">
      {/* Event Info Card */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="font-semibold text-lg border-b pb-3 mb-4">{t('sidebar.event_details')}</h3>

        {/* Date & Time */}
        {displayStartTime && (
          <InfoRow icon={Calendar} label={t('sidebar.date_time')}>
            <p className="font-semibold">{formatInTimezone(displayStartTime, event.timezone, 'EEEE, MMMM d, yyyy')}</p>
            <p className="text-sm text-muted-foreground">
              {formatInTimezone(displayStartTime, event.timezone, 'h:mm a')}
              {displayEndTime && ` - ${formatInTimezone(displayEndTime, event.timezone, 'h:mm a')}`}
            </p>
          </InfoRow>
        )}

        {/* Location */}
        <InfoRow
          icon={
            event.location_type === 'online' ? Video : event.location_type === 'hybrid' ? Globe : Building2
          }
          label={t('sidebar.location')}
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
              {t('sidebar.join_online')} <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </InfoRow>

        {/* Attendees */}
        <InfoRow icon={UserCheck} label={t('sidebar.attendees')}>
          <p className="font-semibold">
            {event.current_attendees}
            {maxAttendees ? ` / ${maxAttendees}` : t('sidebar.registered_suffix')}
          </p>
        </InfoRow>

        {/* Price */}
        {event.is_paid && (
          <InfoRow icon={DollarSign} label={t('sidebar.price')}>
            <p className="font-semibold">
              {event.currency} {eventFee.toFixed(2)}
            </p>
          </InfoRow>
        )}
      </div>

      {/* Action Card */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{t('sidebar.actions_title')}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionsCollapsed(prev => !prev)}
            className="text-xs font-semibold inline-flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-primary/10"
          >
            {actionsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {actionsCollapsed ? t('sidebar.actions_show') : t('sidebar.actions_hide')}
          </Button>
        </div>
        {isEventFinished ? (
          <div className="text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-xl">{t('sidebar.event_concluded')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('sidebar.event_concluded_description')}
            </p>
          </div>
        ) : actionsCollapsed ? (
          <p className="text-sm text-muted-foreground italic">
            {t('sidebar.actions_collapsed_hint')}
          </p>
        ) : (
          <EventSidebarActions
            event={event}
            user={user}
            myRegistration={myRegistration}
            onViewTicket={onViewTicket}
            selectedSession={selectedSession} // Pass selectedSession here
          />
        )}
      </div>
    </div>
  );
}
