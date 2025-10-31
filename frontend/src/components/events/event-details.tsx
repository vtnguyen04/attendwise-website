// 'use client';

// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { notFound, useSearchParams, useRouter } from 'next/navigation';
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import BarChart3 from 'lucide-react/icons/bar-chart-3';
// import Settings from 'lucide-react/icons/settings';
// import Users from 'lucide-react/icons/users';
// import MessageSquare from 'lucide-react/icons/message-square';
// import Loader2 from 'lucide-react/icons/loader-2';
// import Calendar from 'lucide-react/icons/calendar';

// import Globe from 'lucide-react/icons/globe';
// import Video from 'lucide-react/icons/video';
// import Building2 from 'lucide-react/icons/building-2';

// import DollarSign from 'lucide-react/icons/dollar-sign';
// import UserCheck from 'lucide-react/icons/user-check';
// import CheckCircle2 from 'lucide-react/icons/check-circle-2';
// import ExternalLink from 'lucide-react/icons/external-link';
// import Lock from 'lucide-react/icons/lock';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { VirtualizedSessionSelector } from './virtualized-session-selector';
// import type { AppEvent, Session, EventAttendee, NullableString, DetailedAppEvent } from '@/lib/types';
// import EventSidebarActions from './event-sidebar-actions';

// import { EventBanner } from './event-banner';
// import { EventHeader } from './event-header';
// import { Countdown } from './countdown';
// import { FullPageLoader } from './full-page-loader';
// import { isBefore, isAfter, format } from 'date-fns';
// import { extractTimeValue, parseUtcTime } from '@/lib/utils';
// import { getEventById, getEventAttendees, getMyRegistrationForEvent, getTicket } from '@/lib/services/event.service';
// import { useUser } from '@/context/user-provider';
// import { useToast } from '@/hooks/use-toast';
// import Link from 'next/link';
// import { cn } from '@/lib/utils';
// import dynamic from 'next/dynamic';


// const MotionDiv = dynamic(() => import('framer-motion').then((mod) => mod.motion.div), { ssr: false });

// const QRCodeDialog = dynamic(() => import('./qr-code-dialog'), { 
//   ssr: false,
//     loading: () => (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
//         <div className="relative glass-card max-w-md w-full p-8 rounded-2xl text-center">
//           <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
//           <p className="mt-4 text-muted-foreground">Loading Ticket...</p>
//         </div>
//       </div>
//     )
//   }
// );

// const OverviewTab = dynamic(() => import('./tabs/overview-tab'), {
//   loading: () => <div className="glass-card p-6 rounded-2xl"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
// });
// const EventDiscussionTab = dynamic(() => import('./tabs/event-discussion-tab'), {
//   loading: () => <div className="glass-card p-6 rounded-2xl"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
// });
// const AttendeeDataTable = dynamic(() => import('./attendee-table/attendee-data-table'), {
//   loading: () => <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" /><p className="text-sm text-muted-foreground">Loading attendees...</p></div>
// });
// const EventSettingsTab = dynamic(() => import('./edit/event-settings-tab'), {
//   loading: () => <div className="glass-card p-6 rounded-2xl"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
// });

// const AnalyticsDashboard = dynamic(() => import('./analytics-dashboard'), {
//   loading: () => <div className="glass-card p-6 rounded-2xl"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
// });

// // Animation Variants
// const containerVariants = {
//   hidden: { opacity: 0 },
//   visible: {
//     opacity: 1,
//     transition: { staggerChildren: 0.1, delayChildren: 0.2 }
//   }
// };

// const itemVariants = {
//   hidden: { y: 20, opacity: 0 },
//   visible: { 
//     y: 0, 
//     opacity: 1,
//     transition: { type: 'spring', stiffness: 100 }
//   }
// };

// // --- MAIN COMPONENT ---
// export default function EventDetails({ eventId }: { eventId: string }) {
//   const searchParams = useSearchParams();
//   const queryClient = useQueryClient();
//   const { user } = useUser();
//   const { toast } = useToast();

//   const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
//   const [hasEventStartedLocally, setHasEventStartedLocally] = useState(false);

//   const { data: rawEvent, isLoading: isEventLoading, isError } = useQuery<AppEvent | null>({
//     queryKey: ['event', eventId],
//     queryFn: () => getEventById(eventId),
//     enabled: !!eventId,
//   });

//   const isHost = user?.id === rawEvent?.created_by;

//   const { data: myRegistration, isLoading: isRegistrationLoading } = useQuery<EventAttendee | null>({
//     queryKey: ['my-registration', eventId],
//     queryFn: () => getMyRegistrationForEvent(eventId),
//     enabled: !!eventId && !!user && !isHost,
//   });

//   // Create a single, reliable event object by enriching it with the registration status.
//   const event = useMemo<DetailedAppEvent | null>(() => {
//     if (!rawEvent) return null;
//     const isRegistered = myRegistration?.status === 'registered' || myRegistration?.status === 'attended' || myRegistration?.status === 'pending';
    
//     // Map the AppEvent status to the more dynamic status used in the UI
//     let dynamicStatus: DetailedAppEvent['status'] = rawEvent.status as DetailedAppEvent['status'];
//     const now = new Date();
//     const eventStartTime = rawEvent.start_time?.Valid ? new Date(rawEvent.start_time.Time) : null;
//     const eventEndTime = rawEvent.end_time?.Valid ? new Date(rawEvent.end_time.Time) : null;

//     if (eventStartTime && isBefore(now, eventStartTime)) {
//       dynamicStatus = 'upcoming';
//     } else if (eventStartTime && eventEndTime && isAfter(now, eventStartTime) && isBefore(now, eventEndTime)) {
//       dynamicStatus = 'ongoing';
//     } else if (eventEndTime && isAfter(now, eventEndTime)) {
//       dynamicStatus = 'past';
//     }

//     return {
//       ...rawEvent,
//       is_registered: isRegistered,
//       status: dynamicStatus,
//     };
//   }, [rawEvent, myRegistration]);

//   // The single source of truth for registration status.
//   const isRegistered = event?.is_registered ?? false;

//   const [activeTab, setActiveTab] = useState('overview');
//   const [selectedSessionId, setSelectedSessionId] = useState<string>('');

//   const { data: attendees, isLoading: areAttendeesLoading } = useQuery<EventAttendee[]>({
//     queryKey: ['event-attendees', eventId, selectedSessionId],
//     queryFn: () => getEventAttendees(eventId, selectedSessionId),
//     enabled: isHost && activeTab === 'attendees' && !!selectedSessionId,
//   });
//   const urlSessionId = searchParams.get('session');

//   useEffect(() => {
//     const getInitialSessionId = (sessions: Session[] | undefined, currentUrlSessionId: string | null): string => {
//       if (!sessions || sessions.length === 0) return '';
      
//       if (currentUrlSessionId && sessions.some(s => s.id === currentUrlSessionId)) {
//         return currentUrlSessionId;
//       }
      
//       const now = new Date();
//       const upcomingSessions = sessions
//         .map(s => ({ ...s, startTimeObj: parseUtcTime(s.start_time) }))
//         .filter(s => s.startTimeObj && isAfter(s.startTimeObj, now))
//         .sort((a, b) => a.startTimeObj!.getTime() - b.startTimeObj!.getTime());

//       if (upcomingSessions.length > 0) {
//         return upcomingSessions[0].id;
//       }
      
//       return sessions[0]?.id || '';
//     };

//     if (event?.sessions) {
//       const initialId = getInitialSessionId(event.sessions, urlSessionId);
//       if (initialId && initialId !== selectedSessionId) {
//         setSelectedSessionId(initialId);
//       }
//     }
//   }, [event?.sessions, urlSessionId]);

//   const { selectedSession, startTime, endTime, isUpcoming, isSessionFinished, isEventFinished } = useMemo(() => {
//     if (!event) {
//       return {
//         selectedSession: null,
//         startTime: null,
//         endTime: null,
//         isUpcoming: false,
//         isSessionFinished: false,
//         isEventFinished: false,
//       };
//     }
//     const session = event?.sessions?.find(s => s.id === selectedSessionId);
//     const sTime = session ? parseUtcTime(session.start_time) : parseUtcTime(extractTimeValue(event.start_time));
//     const eTime = session ? parseUtcTime(session.end_time) : parseUtcTime(extractTimeValue(event.end_time));
//     const upcoming = sTime ? isBefore(new Date(), sTime) : false;
//     const sessionFinished = eTime ? isAfter(new Date(), eTime) : false;

//     const allSessionsFinished = event.sessions && event.sessions.every(s => isAfter(new Date(), new Date(s.end_time)));

//     return {
//       selectedSession: session,
//       startTime: sTime,
//       endTime: eTime,
//       isUpcoming: upcoming,
//       isSessionFinished: sessionFinished,
//       isEventFinished: event.status === 'past' || event.status === 'cancelled' || allSessionsFinished,
//     };
//   }, [event, selectedSessionId]);

//   const { data: ticketData, refetch: fetchTicket } = useQuery({
//     queryKey: ['ticket', event?.id, selectedSession?.id],
//     queryFn: () => getTicket({ eventId: event!.id, sessionId: selectedSession!.id }),
//     enabled: false,
//     staleTime: 5 * 60 * 1000,
//   });

//   const handleEventStart = useCallback(() => {
//     queryClient.invalidateQueries({ queryKey: ['event', eventId] });
//     setHasEventStartedLocally(true); // Set local state to prevent re-rendering Countdown
//   }, [queryClient, eventId]);

//   const handleViewTicket = useCallback(async () => {
//     if (!selectedSession) { 
//       toast({ title: "Error", description: "No session selected.", variant: "destructive" }); 
//       return; 
//     }
//     try {
//       const { data, isSuccess } = await fetchTicket();
//       if (data && isSuccess) setIsQrDialogOpen(true);
//       else throw new Error("Failed to fetch ticket data.");
//     } catch (error) { 
//       toast({ title: "Error", description: "Could not retrieve your ticket.", variant: "destructive" }); 
//     }
//   }, [selectedSession, fetchTicket, toast]);

//   const router = useRouter();
//   const handleSessionChange = useCallback((value: string) => {
//     setSelectedSessionId(value);
//     const newSearchParams = new URLSearchParams(searchParams.toString());
//     if (value) {
//       newSearchParams.set('session', value);
//     } else {
//       newSearchParams.delete('session');
//     }
//     router.push(`?${newSearchParams.toString()}`, { scroll: false });
//   }, [searchParams, router]);

//   const handleTabChange = useCallback((value: string) => {
//     setActiveTab(value);
//   }, []);
  
//   const handleShare = useCallback(() => {
//     if (navigator.share) {
//       navigator.share({
//         title: event?.name || '',
//         text: event?.description?.String || '',
//         url: window.location.href,
//       }).catch(() => {});
//     } else {
//       navigator.clipboard.writeText(window.location.href);
//       toast({ title: "Link copied!", description: "Event link has been copied to clipboard." });
//     }
//   }, [event?.name, event?.description?.String, toast]);
  
//   if (isEventLoading || (!!user && !isHost && isRegistrationLoading)) return <FullPageLoader />;
//   if (isError || !event) notFound();

//   const hasAttended = myRegistration?.status === 'attended';
  
//   const coverImage = event.cover_image_url?.Valid && event.cover_image_url?.String;
//   const locationAddress = event.location_address?.Valid ? event.location_address.String : null;
//   const onlineMeetingUrl = event.online_meeting_url?.Valid ? event.online_meeting_url.String : null;
//   const maxAttendees = event.max_attendees > 0 ? event.max_attendees : null;
//   const eventFee = event.fee?.Valid ? event.fee.Float64 : 0;
//   const creatorAvatar = null; // Not available from AppEvent
//   const creatorName = undefined; // Not available from AppEvent

//   const tabItems = [
//     { value: 'overview', label: 'Overview', icon: BarChart3, visible: true, href: null },
//     { value: 'discussion', label: 'Discussion', icon: MessageSquare, visible: !isEventFinished && (isHost || hasAttended), href: null },
//     { value: 'attendees', label: 'Attendees', icon: Users, visible: isHost, href: null },
//     { value: 'analytics', label: 'Analytics', icon: BarChart3, visible: isHost, href: null },
//     { value: 'settings', label: 'Settings', icon: Settings, visible: !isEventFinished && isHost, href: null },
//   ].filter(tab => tab.visible);

//   return (
//     <>


//       <div className="min-h-screen pb-12">
//         <EventBanner 
//           coverImage={coverImage}
//           eventName={event.name}
//           status={event.status}
//         />

//         <div className="max-w-7xl mx-auto">
//           <MotionDiv 
//             className="grid grid-cols-1 lg:grid-cols-3 gap-8"
//             variants={containerVariants}
//             initial="hidden"
//             animate="visible"
//           >
//             {/* Main Content */}
//             <MotionDiv className="lg:col-span-2 space-y-6" variants={itemVariants}>
//               <EventHeader 
//                 eventName={event.name}
//                 creatorAvatar={creatorAvatar}
//                 creatorName={event.created_by_name}
//                 onShare={handleShare}
//               />

//               {/* Countdown Banner - Do not show for finished events */}
//               {isRegistered && !isHost && isUpcoming && startTime && !isEventFinished && !hasEventStartedLocally && (
//                 <div className="glass-card p-6 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 animate-fade-in">
//                   <div className="text-center mb-4">
//                     <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-3 border border-primary/20">
//                       <CheckCircle2 className="w-4 h-4 text-primary" />
//                       <span className="text-sm font-semibold text-primary">You're Registered!</span>
//                     </div>
//                     <h3 className="text-lg font-semibold">Event Starts In</h3>
//                   </div>
//                   <Countdown 
//                     targetDate={startTime.toISOString()} 
//                     onEventStart={handleEventStart} 
//                   />
//                 </div>
//               )}

//               {/* Session Selector */}
//               {event.is_recurring && (event.sessions?.length ?? 0) > 0 && (
//                 <div className="animate-fade-in">
//                   <label className="block text-sm font-semibold mb-3">Select Session</label>
//                   <VirtualizedSessionSelector 
//                     sessions={event.sessions || []}
//                     selectedSessionId={selectedSessionId}
//                     onSessionChange={handleSessionChange}
//                     eventStatus={event.status}
//                   />
//                 </div>
//               )}

//               {/* Tabs Navigation */}
//               <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
//                 <TabsList className="w-full glass-card p-1.5 gap-1 rounded-xl">
//                   {tabItems.map(tab => {
//                     const Icon = tab.icon;
//                     const isActive = activeTab === tab.value;
//                     const className = cn(
//                       'flex-1 transition-all duration-200 rounded-lg py-2.5 px-3',
//                       isActive 
//                         ? 'bg-primary text-primary-foreground shadow-sm' 
//                         : 'hover:bg-muted/50 text-muted-foreground'
//                     );
//                     const content = (
//                       <div className="flex items-center justify-center gap-2">
//                         <Icon className="w-4 h-4 flex-shrink-0" />
//                         <span className="font-medium text-sm hidden sm:inline">{tab.label}</span>
//                       </div>
//                     );
                    
//                     if (tab.href) {
//                       return <Link key={tab.value} href={tab.href} className={className}>{content}</Link>
//                     }
//                     return <TabsTrigger key={tab.value} value={tab.value} className={className}>{content}</TabsTrigger>
//                   })}
//                 </TabsList>
                
//                 <div className="mt-6">
//                   <TabsContent value="overview">
//                     <div className="glass-card p-6 rounded-2xl">
//                       <OverviewTab event={event} />
//                     </div>
//                   </TabsContent>
                  
//                   {!isEventFinished && (isHost || hasAttended) && (
//                     <TabsContent value="discussion">
//                       <div className="glass-card p-6 rounded-2xl">
//                         <EventDiscussionTab eventId={event.id} communityId={event.community_id} />
//                       </div>
//                     </TabsContent>
//                   )}
                  
//                   {isHost && (
//                     <TabsContent value="attendees">
//                       <div className="glass-card p-6 rounded-2xl">
//                         <h2 className="text-2xl font-semibold mb-6">Event Attendees</h2>
//                         {areAttendeesLoading ? (
//                           <div className="text-center py-12">
//                             <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
//                             <p className="text-sm text-muted-foreground">Loading attendees...</p>
//                           </div>
//                         ) : (
//                           <AttendeeDataTable attendees={attendees || []} eventId={event.id} sessionId={selectedSession?.id ?? ''} />
//                         )}
//                       </div>
//                     </TabsContent>
//                   )}
                  
//                   {!isEventFinished && isHost && (
//                     <TabsContent value="settings">
//                       <div className="glass-card p-6 rounded-2xl">
//                         <h2 className="text-2xl font-semibold mb-6">Event Settings</h2>
//                         <EventSettingsTab event={event} />
//                       </div>
//                     </TabsContent>
//                   )}
//                   {isHost && (
//                     <TabsContent value="analytics">
//                       <div className="glass-card p-6 rounded-2xl">
//                         <h2 className="text-2xl font-semibold mb-6">Session Analytics</h2>
//                         <AnalyticsDashboard event={event} selectedSessionId={selectedSessionId} />
//                       </div>
//                     </TabsContent>
//                   )}
//                 </div>
//               </Tabs>
//             </MotionDiv>

//             {/* Sidebar */}
//             <MotionDiv className="lg:col-span-1" variants={itemVariants}>
//               <div className="sticky top-6 space-y-4">
//                 {/* Event Info Card */}
//                 <div className="glass-card p-6 rounded-2xl space-y-4">
//                   <h3 className="font-semibold text-lg mb-4">Event Details</h3>
                  
//                   {/* Date & Time */}
//                   {startTime && (
//                     <div className="flex items-start gap-3">
//                       <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
//                         <Calendar className="w-5 h-5 text-primary" />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
//                         <p className="font-semibold">
//                           {format(new Date(startTime), 'EEEE, MMMM d, yyyy')}
//                         </p>
//                         <p className="text-sm text-muted-foreground">
//                           {format(new Date(startTime), 'h:mm a')}
//                           {endTime && ` - ${format(new Date(endTime), 'h:mm a')}`}
//                         </p>
//                       </div>
//                     </div>
//                   )}
                  
//                   {/* Location */}
//                   <div className="flex items-start gap-3">
//                     <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
//                       {event.location_type === 'online' ? (
//                         <Video className="w-5 h-5 text-accent" />
//                       ) : event.location_type === 'hybrid' ? (
//                         <Globe className="w-5 h-5 text-accent" />
//                       ) : (
//                         <Building2 className="w-5 h-5 text-accent" />
//                       )}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-xs text-muted-foreground mb-1">Location</p>
//                       <p className="font-semibold capitalize">{event.location_type}</p>
//                       {locationAddress && (
//                         <p className="text-sm text-muted-foreground truncate">{locationAddress}</p>
//                       )}
//                       {onlineMeetingUrl && (
//                         <a 
//                           href={onlineMeetingUrl} 
//                           target="_blank" 
//                           rel="noopener noreferrer"
//                           className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
//                         >
//                           Join Online <ExternalLink className="w-3 h-3" />
//                         </a>
//                       )}
//                     </div>
//                   </div>

//                   {/* Attendees */}
//                   <div className="flex items-start gap-3">
//                     <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
//                       <UserCheck className="w-5 h-5 text-green-500" />
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-xs text-muted-foreground mb-1">Attendees</p>
//                       <p className="font-semibold">
//                         {event.current_attendees}
//                         {maxAttendees ? ` / ${maxAttendees}` : ''}
//                       </p>
//                     </div>
//                   </div>

//                   {/* Price */}
//                   {event.is_paid && (
//                     <div className="flex items-start gap-3">
//                       <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
//                         <DollarSign className="w-5 h-5 text-yellow-500" />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-xs text-muted-foreground mb-1">Price</p>
//                         <p className="font-semibold">
//                           {event.currency} {eventFee.toFixed(2)}
//                         </p>
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 {/* Action Buttons / Finished Message */}
//                 {user && (
//                   isEventFinished ? (
//                     <div className="glass-card p-6 rounded-2xl text-center">
//                         <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
//                         <h3 className="font-semibold text-xl">Event Concluded</h3>
//                         <p className="text-sm text-muted-foreground">
//                             This event was {event.status} and is no longer active.
//                         </p>
//                     </div>
//                   ) : (
//                     <div className="glass-card p-6 rounded-2xl">
//                         <EventSidebarActions 
//                             event={event}
//                             isHost={isHost}
//                             isRegistered={isRegistered}
//                             selectedSession={selectedSession}
//                             myRegistration={myRegistration}
//                             user={user}
//                             onViewTicket={handleViewTicket}
//                         />
//                     </div>
//                   )
//                 )}
//               </div>
//             </MotionDiv>
//           </MotionDiv>
//         </div>
//       </div>
      
//       {/* QR Dialog */}
//       {ticketData && (
//         <QRCodeDialog 
//           open={isQrDialogOpen}
//           onOpenChange={setIsQrDialogOpen}
//           qrPayload={ticketData.qr_payload}
//           fallbackCode={ticketData.fallback_code}
//         />
//       )}
//     </>
//   );
// }
