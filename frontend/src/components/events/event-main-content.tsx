// app/events/[eventId]/components/event-main-content.tsx
'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppEvent } from '@/lib/types';
import dynamic from 'next/dynamic';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
const Countdown = dynamic(() => import('./countdown').then(mod => mod.Countdown), { ssr: false });
import { VirtualizedSessionSelector } from './virtualized-session-selector';
import { BarChart3, MessageSquare, Users, Settings, Loader2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getEventAttendees } from '@/lib/services/event.client.service';

// --- Dynamic Imports for Tab Content ---
const LoadingSkeleton = () => (
  <div className="dashboard-panel p-8 rounded-2xl min-h-[300px] flex items-center justify-center">
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
  const [eventHasStarted, setEventHasStarted] = useState(false);

  useEffect(() => {
    if (eventHasStarted) {
      router.refresh();
    }
  }, [eventHasStarted, router]);

  // --- Handlers for URL State ---
  const handleUrlStateChange = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleEventStart = useCallback(() => {
    setEventHasStarted(true);
  }, []);

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

  return (
    <div className="space-y-8 mt-8">
      {/* Countdown Banner - Enhanced Design */}
      {isRegistered && !isHost && dynamicStatus === 'upcoming' && (
        <motion.div
          className="dashboard-panel-accent p-8 rounded-3xl relative overflow-hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Event Starts In
              </h3>
            </div>
            <Countdown
              targetDate={relevantStartTime!.toISOString()}
              onEventStart={handleEventStart}
            />
          </div>
        </motion.div>
      )}

      {/* Session Selector - Enhanced */}
      {event.is_recurring && (event.sessions?.length ?? 0) > 1 && (
        <motion.div
          className="dashboard-panel p-6 rounded-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label className="block text-sm font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Select Session
          </label>
          <VirtualizedSessionSelector
            sessions={event.sessions || []}
            selectedSessionId={selectedSessionId}
            onSessionChange={(value) => handleUrlStateChange('session', value)}
            timezone={event.timezone}
          />
        </motion.div>
      )}

      {/* Tabs Navigation & Content - Redesigned */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Tabs value={activeTab} onValueChange={(value) => handleUrlStateChange('tab', value)} className="w-full">
          {/* Modern Tab Navigation */}
          <div className="dashboard-toolbar mb-8">
            <TabsList className="w-full grid gap-2 bg-transparent p-0 h-auto" style={{ 
              gridTemplateColumns: `repeat(${tabItems.length}, minmax(0, 1fr))` 
            }}>
              {tabItems.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                
                return (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value} 
                    className="toolbar-pill data-[state=active]:scale-105 transition-all duration-300"
                    data-active={isActive}
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-semibold text-sm hidden sm:inline">{tab.label}</span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Tab Content with Animations */}
          <div className="min-h-[400px]">
            <TabsContent value="overview" className="mt-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <OverviewTab event={event} />
              </motion.div>
            </TabsContent>

            {(isRegistered || isHost) && (
              <TabsContent value="discussion" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <EventDiscussionTab eventId={event.id} communityId={event.community_id} />
                </motion.div>
              </TabsContent>
            )}

            {isHost && (
              <>
                <TabsContent value="attendees" className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="dashboard-panel p-8 rounded-2xl"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold">Event Attendees</h2>
                    </div>
                    {areAttendeesLoading ? (
                      <LoadingSkeleton />
                    ) : (
                      <AttendeeDataTable
                        attendees={attendees || []}
                        eventId={event.id}
                        sessionId={selectedSessionId}
                        canManage={isHost}
                      />
                    )}
                  </motion.div>
                </TabsContent>

                <TabsContent value="analytics" className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnalyticsDashboard event={event} />
                  </motion.div>
                </TabsContent>

                {!isEventFinished && (
                  <TabsContent value="settings" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <EventSettingsTab event={event} isEventFinished={isEventFinished} />
                    </motion.div>
                  </TabsContent>
                )}
              </>
            )}
          </div>
        </Tabs>
      </motion.div>
    </div>
  );
}
