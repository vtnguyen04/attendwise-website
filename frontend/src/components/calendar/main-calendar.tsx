'use client';

import { useMemo, useState, useCallback, FC } from 'react';
import { useRouter } from 'next/navigation';
import { format, parse, startOfWeek, getDay, isBefore } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { dateFnsLocalizer, Views, CalendarProps, ToolbarProps, View } from 'react-big-calendar';
import dynamic from 'next/dynamic';

import type { RegistrationWithEventDetails } from '@/lib/types';
import { extractTimeValue } from '@/lib/utils';

// Shadcn UI Components
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ArrowRight } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import '@/styles/react-big-calendar.css';
import { GlassCard } from '@/components/ui/glass-card';

// --- 1. SETUP & TYPE DEFINITIONS ---
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: { eventId: string; };
}

// --- 2. CUSTOM TOOLBAR COMPONENT ---
const CustomToolbar: FC<ToolbarProps<CalendarEvent>> = ({ label, view, views, onNavigate, onView }) => {
  const handleViewChange = (newView: string) => {
    if (newView) onView(newView as any);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 p-3 glass-container rounded-2xl">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={() => onNavigate('PREV')} aria-label="Previous period">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={() => onNavigate('TODAY')}>Today</Button>
        <Button size="icon" variant="ghost" onClick={() => onNavigate('NEXT')} aria-label="Next period">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <h2 className="text-lg font-bold text-center text-foreground">
        {label}
      </h2>
      <ToggleGroup 
        type="single" 
        value={view} 
        onValueChange={handleViewChange}
        aria-label="Calendar view"
        className="glass-container p-1 rounded-lg"
      >
        {(views as string[]).map(viewName => (
          <ToggleGroupItem 
            key={viewName} 
            value={viewName} 
            className={cn(
              `capitalize px-3 text-xs sm:text-sm transition-colors duration-200 liquid-glass-button`,
              view === viewName 
                ? 'bg-primary/80 text-primary-foreground shadow-md' 
                : 'bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {viewName}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

// --- 3. DYNAMIC IMPORT OF THE CALENDAR ---
const BigCalendar = dynamic(() => import('react-big-calendar').then(mod => mod.Calendar as React.ComponentType<CalendarProps<CalendarEvent>>), {
  ssr: false,
  loading: () => <Skeleton className="h-[700px] w-full rounded-md bg-muted/50" />,
});

// --- 4. MAIN CALENDAR COMPONENT ---
interface MainCalendarProps {
  registrations: RegistrationWithEventDetails[];
}

export default function MainCalendar({ registrations }: MainCalendarProps) {
  const router = useRouter();
  const theme = useTheme();
  
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate]);
  const onView = useCallback((newView: any) => setView(newView), [setView]);

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!registrations) return [];
    return registrations.reduce((acc, reg) => {
      if (reg.event && reg.event.start_time && reg.event.end_time) {
        const startTime = extractTimeValue(reg.event.start_time);
        const endTime = extractTimeValue(reg.event.end_time);
        if (startTime && endTime) {
          acc.push({ 
            title: reg.event.name,
            start: new Date(startTime),
            end: new Date(endTime),
            resource: { eventId: reg.event_id },
          });
        }
      }
      return acc;
    }, [] as CalendarEvent[]);
  }, [registrations]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  }, []);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const isPast = isBefore(event.end, new Date());
    const isDark = theme === 'dark';
    const style = {
      backgroundColor: isPast 
        ? (isDark ? 'hsl(220 15% 25% / 0.6)' : 'hsl(220 10% 94% / 0.7)') 
        : (isDark ? 'hsl(217 91% 60% / 0.5)' : 'hsl(217 91% 60% / 0.7)'),
      borderRadius: '6px',
      color: isPast 
        ? (isDark ? 'hsl(220 10% 60%)' : 'hsl(220 10% 45%)') 
        : (isDark ? 'hsl(220 10% 98%)' : 'hsl(0 0% 100%)'),
      border: '1px solid',
      borderColor: isPast
        ? (isDark ? 'hsl(220 15% 25% / 0.8)' : 'hsl(220 10% 94% / 0.9)')
        : (isDark ? 'hsl(217 91% 60% / 0.7)' : 'hsl(217 91% 60% / 0.9)'),
      backdropFilter: 'blur(4px)',
      padding: '2px 5px',
    };
    return { style };
  }, [theme]);

  return (
    <>
      <GlassCard className="p-4 sm:p-6 rounded-2xl">
        <div className="mb-4">
          <h2 className="text-xl font-bold">My Registered Events</h2>
          <p className="text-muted-foreground text-sm">A calendar view of events you're attending. Click an event for details.</p>
        </div>
        <div className="h-[700px] text-sm rbc-glass">
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            date={date}
            view={view}
            onNavigate={onNavigate}
            onView={onView}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            components={{
              toolbar: CustomToolbar,
            }}
          />
        </div>
      </GlassCard>

      {selectedEvent && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-background rounded-2xl shadow-lg z-50">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
              <DialogDescription>Event Details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="flex items-center gap-3">
                    <CalendarIcon className='h-5 w-5 text-muted-foreground' />
                    <span className='text-sm font-medium'>{format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Clock className='h-5 w-5 text-muted-foreground' />
                    <span className='text-sm font-medium'>
                        {format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
                    </span>
                </div>
            </div>
            <DialogFooter className="pt-4 border-t border-border/50">
              <Button onClick={() => router.push(`/dashboard/events/${selectedEvent.resource.eventId}`)} className="liquid-glass-button">
                View Full Details <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}