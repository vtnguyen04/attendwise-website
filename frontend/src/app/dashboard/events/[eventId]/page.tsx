import { notFound } from 'next/navigation';
import { getEventById } from '@/lib/services/event.server.service';
import { getCurrentUser } from '@/lib/session'; 
import { getMyRegistrationForEvent } from '@/lib/services/event.server.service';
import { getInitialSessionId } from '@/lib/helpers/session-helper';
import { cookies } from 'next/headers';

import EventClientPage from '@/components/events/EventClientPage';

type EventDetailPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;

  const cookieStore = await cookies(); // Await cookies()
  const token = cookieStore.get('accessToken')?.value; // Extract token
  
  const [event, currentUser, myRegistration] = await Promise.all([
    getEventById(eventId, token),
    getCurrentUser(),
    getMyRegistrationForEvent(eventId, token)
  ]);

  console.log(`Debug: currentUser?.id: ${currentUser?.id}`);
  console.log(`Debug: event.created_by: ${event?.created_by}`);

  if (!event) {
    notFound();
  }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isRegistered = !!myRegistration; 
 
  const isHost = currentUser?.id === event.created_by; 

  const initialSessionId = getInitialSessionId(
    event.sessions,
    typeof resolvedSearchParams.session === 'string' ? resolvedSearchParams.session : null
  );

  return (
    
    <EventClientPage
      initialEvent={event}
      initialUser={currentUser}
      initialRegistration={myRegistration}
      initialIsHost={isHost}
      initialSessionId={initialSessionId}
    />
  );
}
