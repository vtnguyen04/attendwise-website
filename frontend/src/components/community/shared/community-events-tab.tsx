// components/community/shared/community-events-tab.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, Calendar, Search } from 'lucide-react';

import { Community, EventItem, User } from '@/lib/types';
import { useCommunityAuth } from '@/hooks/use-community-auth';
import { adaptEventListData, DisplayEvent } from '@/lib/adapters/event-list.adapter';
import apiClient from '@/lib/api-client';

import { Button } from '@/components/ui/button';
import EventListCard from '@/components/events/event-list-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

// FIX: Update props to include initialEvents from the server
interface CommunityEventsTabProps {
  community: Community;
  initialEvents: EventItem[]; // Data pre-fetched by the Server Component
  currentUser: User | null;
}

// A dedicated fetcher that also adapts the data to the DisplayEvent format
async function fetchAndAdaptEvents(communityId: string, status: string): Promise<DisplayEvent[]> {
  const response = await apiClient.get<{ events: EventItem[] }>(`/api/v1/events/by-community/${communityId}`, {
    params: { status },
  });
  // FIX: Adapt the raw API data to the unified DisplayEvent structure
  return adaptEventListData(response.data.events || [], 'event');
}

const EventGridSkeleton = () => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export default function CommunityEventsTab({ community, initialEvents, currentUser }: CommunityEventsTabProps) {
  const { isAdmin } = useCommunityAuth({ community, currentUser });
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  // STRATEGY: Hybrid Data Fetching
  const { data: events, isLoading, error } = useQuery<DisplayEvent[], Error>({
    queryKey: ['community-events', community.id, activeTab],
    queryFn: () => fetchAndAdaptEvents(community.id, activeTab),
    // Use pre-fetched server data for the initial load of the default tab.
    // This eliminates the initial loading skeleton.
    initialData: activeTab === 'upcoming' ? adaptEventListData(initialEvents, 'event') : undefined,
    // Keep data from previous queries visible while refetching for a smoother UX
    placeholderData: (previousData) => previousData,
  });

  const filteredEvents = events?.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContent = () => {
    if (isLoading) return <EventGridSkeleton />;
    if (error) return <div className="text-destructive text-center py-10">Error loading events: {error.message}</div>;
    if (!filteredEvents || filteredEvents.length === 0) {
      return (
        <div className="text-center py-16 px-6 rounded-2xl border-2 border-dashed">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No {activeTab} events found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : `There are no ${activeTab} events in this community yet.`}
          </p>
        </div>
      );
    }
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event, index) => (
          <div
            key={event.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* FIX: EventListCard now receives the correct DisplayEvent type */}
            <EventListCard event={event} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-xs">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input placeholder="Search events..." className="pl-9 liquid-glass-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {isAdmin && (
          <Button asChild className="w-full md:w-auto">
            <Link href={`/dashboard/events/create?communityId=${community.id}`}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 glass-card">
          <TabsTrigger value="upcoming" className="liquid-glass-button">Upcoming</TabsTrigger>
          <TabsTrigger value="ongoing" className="liquid-glass-button">Ongoing</TabsTrigger>
          <TabsTrigger value="past" className="liquid-glass-button">Past</TabsTrigger>
        </TabsList>
        {/* Render the content area once, outside of individual TabsContent */}
        <div className="mt-6">
          {renderContent()}
        </div>
      </Tabs>
    </div>
  );
}