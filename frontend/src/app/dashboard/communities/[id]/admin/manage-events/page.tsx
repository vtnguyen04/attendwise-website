'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { AppEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import PlusCircle from 'lucide-react/icons/plus-circle';
import MoreHorizontal from 'lucide-react/icons/more-horizontal';
import Edit from 'lucide-react/icons/edit';
import Trash2 from 'lucide-react/icons/trash-2';
import CalendarDays from 'lucide-react/icons/calendar-days';
import Ban from 'lucide-react/icons/ban';
import Sparkles from 'lucide-react/icons/sparkles';
import AlertCircle from 'lucide-react/icons/alert-circle';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isValid } from 'date-fns';
import {
  useTranslation
} from '@/hooks/use-translation';
import { Trans } from 'react-i18next';

const safeFormatDate = (date: string | Date) => {
  const d = new Date(date);
  return isValid(d) ? format(d, 'MMM d, yyyy') : "Invalid Date";
};

export default function ManageEventsPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.id as string;
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventToDelete, setEventToDelete] = useState<AppEvent | null>(null);
  const { t } = useTranslation('community');
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    if (!communityId) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/events/by-community/${communityId}`);
      console.log('API Response:', response.data);
      setEvents(response.data.events || []);
    } catch {
      toast({ title: t('error'), description: t('admin.manage_events.toast.fetch_error'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [communityId, toast, t]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreateEvent = () => {
    router.push(`/dashboard/events/create?communityId=${communityId}`);
  };

  const handleHardDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await apiClient.delete(`/events/${eventToDelete.id}/hard`);
      toast({ title: t('toast.success'), description: t('admin.manage_events.toast.delete_success') });
      setEvents(prev => prev.filter(event => event.id !== eventToDelete.id));
    } catch {
      toast({ title: t('error'), description: t('admin.manage_events.toast.delete_error'), variant: 'destructive' });
    } finally {
      setEventToDelete(null);
    }
  };

  const handleSoftDeleteEvent = async (eventId: string) => {
    try {
      await apiClient.delete(`/events/${eventId}`);
      toast({ title: t('toast.success'), description: t('admin.manage_events.toast.cancel_success') });
      fetchEvents();
    } catch {
      toast({ title: t('error'), description: t('admin.manage_events.toast.cancel_error'), variant: 'destructive' });
    }
  };
  
  const EventSkeleton = () => (
    <div className="dashboard-mini-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48 rounded-lg bg-muted/50" />
          <Skeleton className="h-4 w-32 rounded-lg bg-muted/40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl bg-muted/50" />
      </div>
    </div>
  );

  return (
    <>
      <div className="dashboard-panel overflow-hidden">
        <div className="relative px-8 py-8 border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm shadow-lg shadow-primary /10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {t('admin.manage_events.title')}
                </h2>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                {t('admin.manage_events.description')}
              </p>
            </div>
            <Button 
              onClick={handleCreateEvent}
              className="cta-button gap-2 font-semibold shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              <PlusCircle className="h-5 w-5" />
              {t('admin.manage_events.create_button')}
            </Button>
          </div>
        </div>
        
        <div className="p-8">
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => <EventSkeleton key={index} />)}
              </div>
            ) : events.length > 0 ? (
              events.map((event) => (
                <div 
                  key={event.id} 
                  className="feed-card p-5 group cursor-pointer transition-all duration-300"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors duration-300">
                        {event.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="p-1.5 rounded-lg bg-muted/50">
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{safeFormatDate(event.created_at)}</span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="liquid-glass-button h-10 w-10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="w-56 dashboard-panel-muted border-border/50 backdrop-blur-xl"
                      >
                        <DropdownMenuItem 
                          onSelect={() => router.push(`/dashboard/events/${event.id}/edit`)} 
                          className="cursor-pointer rounded-lg py-3 px-3 font-medium transition-all duration-200 focus:bg-primary/10 focus:text-primary"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                              <Edit className="h-4 w-4 text-primary" />
                            </div>
                            {t('admin.manage_events.edit_button')}
                          </div>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator className="bg-border/50" />
                        
                        <DropdownMenuItem 
                          onSelect={() => handleSoftDeleteEvent(event.id)} 
                          className="cursor-pointer rounded-lg py-3 px-3 font-medium transition-all duration-200 focus:bg-amber-500/10 focus:text-amber-600 dark:focus:text-amber-400"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-amber-500/10">
                              <Ban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            {t('admin.manage_events.cancel_button')}
                          </div>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onSelect={() => setEventToDelete(event)} 
                          className="cursor-pointer rounded-lg py-3 px-3 font-medium transition-all duration-200 focus:bg-destructive/10 focus:text-destructive"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-destructive/10">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </div>
                            {t('admin.manage_events.delete_button')}
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-panel-muted text-center py-20 rounded-2xl border-2 border-dashed border-border/50 transition-all duration-300 hover:border-primary/30 hover:bg-muted/20">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm shadow-lg">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{t('admin.manage_events.no_events_title')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {t('admin.manage_events.no_events_description')}
                </p>
                <Button 
                  onClick={handleCreateEvent}
                  className="cta-button gap-2 font-semibold shadow-lg hover:shadow-xl"
                >
                  <PlusCircle className="h-5 w-5" />
                  {t('admin.manage_events.create_first_button')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent className="dashboard-panel max-w-lg border-destructive/20">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10 backdrop-blur-sm">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-2xl">{t('admin.manage_events.delete_dialog_title')}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed">
              <Trans
                i18nKey="admin.manage_events.delete_dialog_description"
                values={{ eventName: eventToDelete?.name }}
                components={{ 1: <span className="font-bold text-foreground" /> }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-6 border-t border-border/30">
            <AlertDialogCancel className="liquid-glass-button font-semibold">
              {t('admin.manage_events.delete_dialog_cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleHardDeleteEvent} 
              className="bg-gradient-to-br from-destructive to-destructive/90 text-destructive-foreground font-semibold shadow-lg shadow-destructive/30 hover:shadow-xl hover:shadow-destructive/40 hover:scale-102 transition-all duration-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('admin.manage_events.delete_dialog_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}