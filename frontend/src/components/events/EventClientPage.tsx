// app/events/[eventId]/components/event-client-page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { isAfter } from 'date-fns';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';

import { AppEvent, EventAttendee, User } from '@/lib/types';
import { extractTimeValue, getSafeImageUrl, parseUtcTime } from '@/lib/utils';
import { getEventById, getMyRegistrationForEvent, getTicket } from '@/lib/services/event.client.service'; // Import from client service
import { useToast } from '@/hooks/use-toast';

// Import child components
import { EventBanner } from './event-banner';
import { EventHeader } from './event-header';
import { EventSidebar } from './event-sidebar';
import { EventMainContent } from './event-main-content';


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
  initialSessionId: string;
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
  initialSessionId,
}: EventClientPageProps) {
  const { data: event } = useQuery({
    queryKey: ['event', initialEvent.id],
    queryFn: () => getEventById(initialEvent.id),
    initialData: initialEvent,
  });

  const { data: myRegistration } = useQuery({
    queryKey: ['my-registration', initialEvent.id],
    queryFn: () => getMyRegistrationForEvent(initialEvent.id),
    initialData: initialRegistration,
  });

  const { toast } = useToast();
  const searchParams = useSearchParams();

  // URL search params are the single source of truth for dynamic state.
  const activeTab = searchParams.get('tab') || 'overview';
  const selectedSessionId = searchParams.get('session') || initialSessionId;

  // Local UI state that doesn't need to be in the URL
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  // --- DERIVED STATE ---
  const { dynamicStatus, isEventFinished, selectedSession, relevantStartTime } = useMemo(() => {
    const hydratedEvent = event ?? initialEvent;
    const sessions = event?.sessions ?? initialEvent.sessions;
    const now = parseUtcTime(new Date().toISOString());
    const session = sessions?.find(s => s.id === selectedSessionId);
    const relevantStart = parseUtcTime(session?.start_time || extractTimeValue(hydratedEvent.start_time));
    const endTime = parseUtcTime(session?.end_time || extractTimeValue(hydratedEvent.end_time));

    let status: 'upcoming' | 'ongoing' | 'past';
    if (endTime && now && isAfter(now, endTime)) {
      status = 'past';
    } else if (relevantStart && now && isAfter(now, relevantStart)) {
      status = 'ongoing';
    } else {
      status = 'upcoming';
    }

    const finished = hydratedEvent.status === 'cancelled' || status === 'past';

    return { dynamicStatus: status, isEventFinished: finished, selectedSession: session, relevantStartTime: relevantStart };
  }, [event, initialEvent, selectedSessionId]);

  // --- DATA FETCHING FOR INTERACTIVITY ---
  const ticketQuery = useQuery({
    queryKey: ['ticket', initialEvent.id, selectedSessionId],
    queryFn: () => getTicket({ eventId: initialEvent.id, sessionId: selectedSessionId }),
    enabled: false,
    staleTime: 5 * 60 * 1000, // Cache the ticket for 5 minutes
  });

  // --- HANDLERS ---
  const handleViewTicket = () => {
    if (!selectedSessionId) {
      toast({ title: "Please select a session first.", variant: "destructive" });
      return;
    }
    setIsQrDialogOpen(true);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard!" });
  };

  const creatorAvatarUrl = getSafeImageUrl(initialEvent.created_by_avatar);

  return (
    <>
      <div className="min-h-screen pb-12" data-primary-content>
        <div data-scroll-skip="true">
          <EventBanner event={initialEvent} dynamicStatus={dynamicStatus} />
        </div>

        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"
          data-scroll-anchor
        >
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="lg:col-span-2 space-y-6 relative z-20" variants={itemVariants}>
              <EventHeader
                eventName={initialEvent.name}
                creatorName={initialEvent.created_by_name}
                creatorAvatar={creatorAvatarUrl}
                onShare={handleShare}
              />
              <EventMainContent
                event={event}
                isHost={initialIsHost}
                isRegistered={!!myRegistration}
                isEventFinished={isEventFinished}
                activeTab={activeTab}
                selectedSessionId={selectedSessionId}
                dynamicStatus={dynamicStatus}
                relevantStartTime={relevantStartTime}
              />
            </motion.div>

            <motion.div className="lg:col-span-1" variants={itemVariants}>
              <EventSidebar
                event={event}
                user={initialUser}
                myRegistration={myRegistration}
                isHost={initialIsHost}
                isEventFinished={isEventFinished}
                selectedSession={selectedSession}
                onViewTicket={handleViewTicket}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isQrDialogOpen && (
          <QRCodeDialog
            open={isQrDialogOpen}
            onOpenChange={setIsQrDialogOpen}
            ticketQuery={ticketQuery}
          />
        )}
      </AnimatePresence>
    </>
  );
}
