import { notFound, redirect } from 'next/navigation';
import { getEventById } from '@/lib/services/event.server.service';
import { getCurrentUser } from '@/lib/session'; // Server-side user fetcher
import { getMyRegistrationForEvent } from '@/lib/services/event.server.service';
import { getInitialSessionId } from '@/lib/helpers/session-helper';
import { isBefore } from 'date-fns';
import { extractTimeValue } from '@/lib/utils';
import { cookies } from 'next/headers';

// Import the new main client component
import EventClientPage from '@/components/events/EventClientPage';

type EventDetailPageProps = {
  params: { eventId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// This is now a true React Server Component (RSC)
export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { eventId } = params;
  // console.log(`EventDetailPage: eventId from params: ${eventId}`); // Debug log

  const cookieStore = await cookies(); // Await cookies()
  const token = cookieStore.get('accessToken')?.value; // Extract token
  // console.log(`EventDetailPage: accessToken from cookies: ${token ? 'Present' : 'Missing'}`); // Debug log

  // 1. --- DATA FETCHING ON THE SERVER ---
  // Fetch event details, current user, and their registration status in parallel.
  const [event, currentUser, myRegistration] = await Promise.all([
    getEventById(eventId, token),
    getCurrentUser(),
    getMyRegistrationForEvent(eventId, token)
  ]);

  console.log(`Debug: currentUser?.id: ${currentUser?.id}`);
  console.log(`Debug: event.created_by: ${event?.created_by}`);

  // 2. --- VALIDATION AND REDIRECTION LOGIC ---
  // If the event does not exist, show a 404 page.
  if (!event) {
    // console.log(`Event with ID ${eventId} not found. Triggering notFound().`); // Debug log
    notFound();
  }

  const isRegistered = !!myRegistration; // This line was missing or misplaced
  const eventStartTime = extractTimeValue(event.start_time);
  const isEventUpcoming = eventStartTime ? isBefore(new Date(), new Date(eventStartTime)) : false;

  // CRITICAL REQUIREMENT: Implement persistent state redirection
  // If the user is registered and the event has not started yet, redirect them to the wait room.
  // if (isRegistered && isEventUpcoming) {
  //   redirect(`/events/${eventId}/wait-room`);
  // }

  // If the event is part of a private community and the user is not a member,
  // you would add access control logic here. (Requires Community service/API call)
  // For now, we assume public access or membership is handled.
  
  // 3. --- PREPARE PROPS FOR CLIENT COMPONENT ---
  const isHost = currentUser?.id === event.created_by; // This line was missing or misplaced

  const initialSessionId = getInitialSessionId(
    event.sessions,
    typeof searchParams.session === 'string' ? searchParams.session : null
  );

  return (
    // 4. --- RENDER THE CLIENT COMPONENT ---
    // Pass all server-fetched data as initial props to the client component.
    // The client component will handle interactivity, but starts with fully rendered HTML.
    <EventClientPage
      initialEvent={event}
      initialUser={currentUser}
      initialRegistration={myRegistration}
      initialIsHost={isHost}
      initialIsRegistered={isRegistered}
      initialSessionId={initialSessionId}
    />
  );
}
