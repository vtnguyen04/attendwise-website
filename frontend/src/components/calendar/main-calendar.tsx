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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import '@/styles/react-big-calendar.css';


import { useTranslation } from '@/hooks/use-translation';

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
  const { t } = useTranslation('events');

  const handleViewChange = (newView: string) => {
    if (newView) onView(newView as View);
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 p-4 dashboard-toolbar">
      <div className="flex items-center gap-2">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => onNavigate('PREV')} 
          aria-label={t('calendar.previous_period')}
          className="liquid-glass-button h-9 w-9 transition-all duration-300 hover:scale-105"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => onNavigate('TODAY')}
          className="liquid-glass-button px-4 font-semibold transition-all duration-300 hover:scale-105"
        >
          {t('calendar.today')}
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => onNavigate('NEXT')} 
          aria-label={t('calendar.next_period')}
          className="liquid-glass-button h-9 w-9 transition-all duration-300 hover:scale-105"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <h2 className="text-xl font-bold text-center bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
        {label}
      </h2>
      
      <ToggleGroup 
        type="single" 
        value={view} 
        onValueChange={handleViewChange}
        aria-label={t('calendar.view_toggle_label')}
        className="flex gap-1 p-1.5 rounded-xl backdrop-blur-md bg-muted/30 border border-border/50"
      >
        {(views as string[]).map(viewName => (
          <ToggleGroupItem 
            key={viewName} 
            value={viewName} 
            className={cn(
              "capitalize px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300",
              view === viewName 
                ? 'bg-gradient-to-br from-primary/90 to-accent/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:scale-102'
            )}
          >
            {t(`calendar.${viewName.toLowerCase()}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

// --- 3. DYNAMIC IMPORT OF THE CALENDAR ---
const BigCalendar = dynamic(() => import('react-big-calendar').then(mod => mod.Calendar as React.ComponentType<CalendarProps<CalendarEvent>>), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full rounded-xl bg-muted/30" />
      <Skeleton className="h-[600px] w-full rounded-2xl bg-muted/30" />
    </div>
  ),
});

// --- 4. MAIN CALENDAR COMPONENT ---
interface MainCalendarProps {
  registrations: RegistrationWithEventDetails[];
}

export default function MainCalendar({ registrations }: MainCalendarProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('events');
  
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate]);
  const onView = useCallback((newView: View) => setView(newView), [setView]);

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
        ? (isDark ? 'hsl(220 15% 25% / 0.5)' : 'hsl(220 10% 94% / 0.6)') 
        : (isDark ? 'hsl(217 91% 60% / 0.65)' : 'hsl(217 91% 60% / 0.8)'),
      borderRadius: '8px',
      color: isPast 
        ? (isDark ? 'hsl(220 10% 60%)' : 'hsl(220 10% 45%)') 
        : (isDark ? 'hsl(220 10% 98%)' : 'hsl(0 0% 100%)'),
      border: '1px solid',
      borderColor: isPast
        ? (isDark ? 'hsl(220 15% 25% / 0.7)' : 'hsl(220 10% 94% / 0.8)')
        : (isDark ? 'hsl(217 91% 60% / 0.8)' : 'hsl(217 91% 60% / 0.95)'),
      backdropFilter: 'blur(8px) saturate(150%)',
      padding: '3px 6px',
      fontWeight: '600',
      fontSize: '0.825rem',
      boxShadow: isPast
        ? 'none'
        : (isDark ? '0 4px 12px hsla(217, 91%, 60%, 0.25)' : '0 4px 12px hsla(217, 91%, 60%, 0.3)'),
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    };
    return { style };
  }, [theme]);

  return (
    <>
      <div className="dashboard-panel p-6 sm:p-8">
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t('calendar.my_registered_events')}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            {t('calendar.registered_events_description')}
          </p>
        </div>
        
        <div className="h-[700px] text-sm rbc-glass rounded-2xl overflow-hidden border border-border/50 backdrop-blur-sm">
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
      </div>

      {selectedEvent && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="dashboard-panel max-w-md">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {selectedEvent.title}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('calendar.event_details')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-5 py-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/50 transition-all duration-300 hover:bg-muted/40 hover:border-primary/30">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                  <CalendarIcon className='h-5 w-5 text-primary' />
                </div>
                <span className='text-sm font-semibold'>
                  {format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/50 transition-all duration-300 hover:bg-muted/40 hover:border-primary/30">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                  <Clock className='h-5 w-5 text-primary' />
                </div>
                <span className='text-sm font-semibold'>
                  {format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
                </span>
              </div>
            </div>
            
            <DialogFooter className="pt-4 border-t border-border/30">
              <Button 
                onClick={() => router.push(`/dashboard/events/${selectedEvent.resource.eventId}`)} 
                className="cta-button w-full font-semibold transition-all duration-300 hover:scale-102"
              >
                {t('calendar.view_full_details')}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
