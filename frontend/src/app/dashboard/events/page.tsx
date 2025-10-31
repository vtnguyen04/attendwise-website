// app/dashboard/events/page.tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EventsToolbar } from '@/components/events/events-toolbar';
import { EventGrid } from '@/components/events/event-grid';
import { Skeleton } from '@/components/ui/skeleton';

// ✅ Import từ SERVER service (không phải client service)
import { getEventsByStatus, getMyRegisteredEvents } from '@/lib/services/event.server.service';
import { adaptEventListData } from '@/lib/adapters/event-list.adapter';

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
    <div className="relative mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-gradient bg-blob opacity-60 blur-3xl" />
      {/* Header Section */}
      <div className="glass-card interactive-spotlight p-6 shadow-glass-lg sm:p-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-glow">Events</h1>
            <p className="max-w-xl text-base text-muted-foreground">
              Discover, create, and manage your events with a fluid glass dashboard experience.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="glass-button px-5 py-2 text-sm font-semibold uppercase tracking-wide"
          >
            <Link href="/dashboard/events/create">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Event
            </Link>
          </Button>
        </div>
      </div>

      {/* Toolbar - This is a Client Component for interactivity */}
      <EventsToolbar />

      {/* 
        Data Grid - Wrapped in Suspense.
        The <EventDataGrid> component below is async, so Next.js can stream its content.
        The user sees the toolbar instantly, then the grid streams in after data is fetched.
      */}
      <Suspense fallback={<EventGridSkeleton />}>
        <EventDataGrid status={status} searchTerm={searchTerm} />
      </Suspense>
    </div>
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
