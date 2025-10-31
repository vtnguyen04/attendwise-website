// app/events/[eventId]/components/event-client-page.tsx
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { isAfter, isBefore } from 'date-fns';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';

import { AppEvent, EventAttendee, User, EventSession } from '@/lib/types';
import { extractTimeValue, getSafeImageUrl, parseUtcTime } from '@/lib/utils';
import { getEventById, getMyRegistrationForEvent, getTicket, registerForEvent, unregisterFromEvent } from '@/lib/services/event.client.service'; // Import from client service
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';

// Import child components
import { EventBanner } from './event-banner';
import { EventHeader } from './event-header';
import { EventSidebar } from './event-sidebar';
import EventTabs from './tabs/events-tabs';
import CheckInDialog from '@/components/check-in/check-in-dialog'; // Import CheckInDialog

// Dynamic import for the QR code dialog to reduce initial bundle size
// We pass the entire query object to it, so it can manage its own state
const QRCodeDialog = dynamic(() =>
  import('./qr-code-dialog').then(mod => mod.QRCodeDialog)
);

interface EventClientPageProps {
  initialEvent: AppEvent;
  initialUser: User | null;
  initialRegistration: EventAttendee | null;
  initialIsHost: boolean;
  initialIsRegistered: boolean;
  initialSessionId?: string | null;
}

// Animation variants for Framer Motion to create a staggered fade-in effect
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

export default function EventClientPage({
  initialEvent,
  initialUser,
  initialRegistration,
  initialIsHost,
  initialIsRegistered,
  initialSessionId,
}: EventClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [event, setEvent] = useState<AppEvent>(initialEvent);
  const [user, setUser] = useState(initialUser);
  const [myRegistration, setMyRegistration] = useState<EventAttendee | null>(initialRegistration);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [isRegistered, setIsRegistered] = useState(initialIsRegistered);
  const [selectedSession, setSelectedSession] = useState<EventSession | undefined>(
    event.sessions?.find(s => s.id === initialSessionId) || event.sessions?.[0]
  );
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);

  const ticketQuery = useQuery({
    queryKey: ['ticket', event.id, myRegistration?.id],
    queryFn: () => getTicket({ eventId: event.id, sessionId: selectedSession!.id }),
    enabled: isQrCodeDialogOpen && !!myRegistration?.id && !!selectedSession?.id, // Only fetch when the dialog is open
    staleTime: Infinity, // Ticket data is stable
  });

  const handleViewTicket = () => {
    setIsQrCodeDialogOpen(true);
  };


  // Mutations
  const registerMutation = useMutation<void, Error, string>({
    mutationFn: registerForEvent,
    onSuccess: () => {
      toast({ title: 'Success', description: 'You have successfully registered for the event.' });
      setIsRegistered(true);
      queryClient.invalidateQueries({ queryKey: ['my-registration', initialEvent.id] });
      queryClient.invalidateQueries({ queryKey: ['event', initialEvent.id] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: `Failed to register: ${error.response?.data?.error || error.message}`, variant: 'destructive' });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: ({ eventId, registrationId }: { eventId: string, registrationId: string }) => unregisterFromEvent(eventId, registrationId),
    onSuccess: () => {
      toast({ title: 'Success', description: 'You have successfully unregistered from the event.' });
      setIsRegistered(false);
      setMyRegistration(null);
      queryClient.invalidateQueries({ queryKey: ['my-registration', initialEvent.id] });
      queryClient.invalidateQueries({ queryKey: ['event', initialEvent.id] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: `Failed to unregister: ${error.response?.data?.error || error.message}`, variant: 'destructive' });
    },
  });

  const handleRegister = () => {
    registerMutation.mutate(event.id);
  };

  const handleUnregister = () => {
    if (myRegistration?.id) {
      unregisterMutation.mutate({ eventId: event.id, registrationId: myRegistration.id });
    }
  };

  const handleCheckInSuccess = useCallback((updatedAttendee: EventAttendee) => {
    setMyRegistration(updatedAttendee);
    setIsCheckInDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['my-registration', initialEvent.id] });
    queryClient.invalidateQueries({ queryKey: ['event', initialEvent.id] });
  }, [initialEvent.id, queryClient]);

  const handleOpenCheckInDialog = useCallback(() => {
    setIsCheckInDialogOpen(true);
  }, []);

  const eventStartTime = parseUtcTime(extractTimeValue(event.start_time));
  const eventEndTime = parseUtcTime(extractTimeValue(event.end_time));
  const now = new Date();

  const isEventUpcoming = eventStartTime ? isBefore(now, eventStartTime) : false;
  const isEventOngoing = eventStartTime && eventEndTime ? isAfter(now, eventStartTime) && isBefore(now, eventEndTime) : false;
  const isEventPast = eventEndTime ? isAfter(now, eventEndTime) : false;

  const isCheckInOpen = useMemo(() => {
    if (!selectedSession || !selectedSession.checkin_opens_at || !selectedSession.checkin_closes_at) {
      return false;
    }
    const checkinOpen = parseUtcTime(extractTimeValue(selectedSession.checkin_opens_at));
    const checkinClose = parseUtcTime(extractTimeValue(selectedSession.checkin_closes_at));
    return checkinOpen && checkinClose && isAfter(now, checkinOpen) && isBefore(now, checkinClose);
  }, [selectedSession, now]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-2/3 space-y-6">
        <EventHeader
          event={event}
          onShare={() => { /* Implement share logic */ }}
        />
      </div>
      <div className="lg:w-1/3">
        <EventSidebar
          event={event}
          user={user}
          isHost={isHost}
          isRegistered={isRegistered}
          myRegistration={myRegistration}
          onRegister={handleRegister}
          onUnregister={handleUnregister}
          registerLoading={registerMutation.isPending || unregisterMutation.isPending}
          selectedSession={selectedSession}
          setSelectedSession={setSelectedSession}
          isCheckInOpen={isCheckInOpen}
          onOpenCheckInDialog={handleOpenCheckInDialog}
          isEventFinished={isEventPast}
          onViewTicket={handleViewTicket}
        />
      </div>

      {myRegistration && (
        <CheckInDialog
          attendee={myRegistration}
          eventId={event.id}
          sessionId={selectedSession?.id || ''}
          open={isCheckInDialogOpen}
          onOpenChange={setIsCheckInDialogOpen}
          onCheckInSuccess={handleCheckInSuccess}
        />
      )}

      <QRCodeDialog
        open={isQrCodeDialogOpen}
        onOpenChange={setIsQrCodeDialogOpen}
        ticketQuery={ticketQuery}
      />
    </div>
  );
}
