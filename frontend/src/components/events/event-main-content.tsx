// app/events/[eventId/components/event-main-content.tsx
'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppEvent } from '@/lib/types';
import { extractTimeValue } from '@/lib/utils';
import dynamic from 'next/dynamic';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
const Countdown = dynamic(() => import('./countdown').then(mod => mod.Countdown), { ssr: false });
import { VirtualizedSessionSelector } from './virtualized-session-selector';
import { BarChart3, MessageSquare, Users, Settings, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getEventAttendees } from '@/lib/services/event.client.service';
// --- Dynamic Imports for Tab Content ---
const LoadingSkeleton = () => (
  <div className="glass-card p-6 rounded-2xl min-h-[300px] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const OverviewTab = dynamic(() => import('./tabs/overview-tab'), { loading: LoadingSkeleton });
const EventDiscussionTab = dynamic(() => import('./tabs/event-discussion-tab'), { loading: LoadingSkeleton });
const AttendeeDataTable = dynamic(() => import('./attendee-table/attendee-data-table'), { loading: LoadingSkeleton });
const EventSettingsTab = dynamic(() => import('./edit/event-settings-tab'), { loading: LoadingSkeleton });
const AnalyticsDashboard = dynamic(() => import('./analytics/analytics-dashboard'), { loading: LoadingSkeleton });

interface EventMainContentProps {
  event: AppEvent;
  isHost: boolean;
  isRegistered: boolean;
  isEventFinished: boolean;
  activeTab: string;
  selectedSessionId: string;
  dynamicStatus: 'upcoming' | 'ongoing' | 'past';
  relevantStartTime: Date | undefined;
}

export function EventMainContent({
  event,
  isHost,
  isRegistered,
  isEventFinished,
  activeTab,
  selectedSessionId,
  dynamicStatus,
  relevantStartTime,
}: EventMainContentProps) {
  console.log('isHost in EventMainContent:', isHost);
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Handlers for URL State ---
  const handleUrlStateChange = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleEventStart = useCallback(() => {
    // Refresh server components to get the new dynamic status
    router.refresh();
  }, [router]);

  const { data: attendees, isLoading: areAttendeesLoading } = useQuery({
    queryKey: ['event-attendees', event.id, selectedSessionId],
    queryFn: () => getEventAttendees(event.id, selectedSessionId),
    enabled: isHost && activeTab === 'attendees' && !!selectedSessionId,
  });

  // --- Tab Configuration ---
  const tabItems = [
    { value: 'overview', label: 'Overview', icon: BarChart3, visible: true },
    { value: 'discussion', label: 'Discussion', icon: MessageSquare, visible: isRegistered || isHost },
    { value: 'attendees', label: 'Attendees', icon: Users, visible: isHost },
    { value: 'analytics', label: 'Analytics', icon: BarChart3, visible: isHost },
    { value: 'settings', label: 'Settings', icon: Settings, visible: isHost && !isEventFinished },
  ].filter(tab => tab.visible);
  console.log('EventMainContent - tabItems:', tabItems);
  console.log('EventMainContent - tabItems.length:', tabItems.length);

  return (
    <div className="space-y-6 mt-6">
      {/* Countdown Banner */}
      {isRegistered && !isHost && dynamicStatus === 'upcoming' && (
        <motion.div
          className="glass-card p-6 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold">Event Starts In</h3>
          </div>
          <Countdown
            targetDate={relevantStartTime!.toISOString()}
            onEventStart={handleEventStart}
          />
        </motion.div>
      )}

      {/* Session Selector */}
      {event.is_recurring && (event.sessions?.length ?? 0) > 1 && (
        <div>
          <label className="block text-sm font-semibold mb-3">Select Session</label>
          <VirtualizedSessionSelector
            sessions={event.sessions || []}
            selectedSessionId={selectedSessionId}
            onSessionChange={(value) => handleUrlStateChange('session', value)}
          />
        </div>
      )}

      {/* Tabs Navigation & Content */}
      <Tabs value={activeTab} onValueChange={(value) => handleUrlStateChange('tab', value)} className="w-full">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 glass-card p-1.5 gap-1 rounded-xl h-auto">
          {tabItems.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg py-2.5 px-3">
                <div className="flex items-center justify-center gap-2">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <OverviewTab event={event} />
          </TabsContent>

          {(isRegistered || isHost) && (
            <TabsContent value="discussion">
              <EventDiscussionTab eventId={event.id} communityId={event.community_id} />
            </TabsContent>
          )}

          {isHost && (
            <>
              <TabsContent value="attendees">
                {/* AttendeeDataTable needs its own query logic, so we pass props */}
               <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-semibold mb-6">Event Attendees</h2>
                {areAttendeesLoading ? (
                  <LoadingSkeleton />
                ) : (
                  // FIX: Pass the fetched attendees data as a prop
                  <AttendeeDataTable
                    attendees={attendees || []}
                    eventId={event.id}
                    sessionId={selectedSessionId}
                    canManage={isHost}
                  />
                )}
              </div>
              </TabsContent>
              <TabsContent value="analytics">
                 <AnalyticsDashboard event={event} />
              </TabsContent>
              {!isEventFinished && (
                <TabsContent value="settings">
                  <EventSettingsTab event={event} isEventFinished={isEventFinished} />
                </TabsContent>
              )}
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}