// app/dashboard/events/page.tsx
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';


// ✅ Import từ SERVER service (không phải client service)
import { getEventsByStatus, getMyRegisteredEvents } from '@/lib/services/event.server.service';
import { adaptEventListData } from '@/lib/adapters/event-list.adapter';

import EventsClientPage from './EventsClientPage';
import { Skeleton } from '@/components/ui/skeleton';
import { EventGrid } from '@/components/events/event-grid';

// Define a type for the page's search parameters for clarity
interface EventsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
}

// A dedicated skeleton for the data grid part of the page
function EventGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/**
 * Server Component for the main Events page.
 * It reads state from URL search params, fetches and adapts data on the server,
 * and streams the content to the client.
 */
export default async function EventsPage({ searchParams }: EventsPageProps) {
  // FIX: Await searchParams before accessing its properties (Next.js 15+)
  const params = await searchParams;
  
  // 1. Read state from URL on the server. Default to 'upcoming'.
  const status = params.status || 'upcoming';
  const searchTerm = params.q || '';

  return (
    <EventsClientPage>
      <Suspense fallback={<EventGridSkeleton />}>
        <EventDataGrid status={status} searchTerm={searchTerm} />
      </Suspense>
    </EventsClientPage>
  );
}

/**
 * An async Server Component dedicated to fetching and displaying the event grid.
 * By moving the data fetching here, we can use Suspense to stream this part of the UI.
 */
async function EventDataGrid({ status, searchTerm }: { status: string; searchTerm: string }) {
  let rawData;
  let dataType: 'event' | 'registration';

  if (status === 'attending') {
    rawData = await getMyRegisteredEvents();
    dataType = 'registration';
  } else {
    // Call the correctly named function `getEventsByStatus`
    // The status parameter must be one of the allowed types.
    const validStatus = ['upcoming', 'ongoing', 'past'].includes(status) 
      ? status as 'upcoming' | 'ongoing' | 'past' 
      : 'upcoming'; // Fallback to 'upcoming'
      
    rawData = await getEventsByStatus(validStatus);
    dataType = 'event';
  }
  
  // 3. Adapt data to a unified structure
  let displayEvents = adaptEventListData(rawData, dataType);

  // 4. Perform filtering on the server if the API doesn't support it
  // This is a fallback. A proper search API is better for performance and pagination.
  if (searchTerm) {
    displayEvents = displayEvents.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return <EventGrid events={displayEvents} status={status} />;
}
