'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { AppEvent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlusCircle from 'lucide-react/icons/plus-circle';
import MoreHorizontal from 'lucide-react/icons/more-horizontal';
import Edit from 'lucide-react/icons/edit';
import Trash2 from 'lucide-react/icons/trash-2';
import CalendarDays from 'lucide-react/icons/calendar-days';
import Ban from 'lucide-react/icons/ban';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    if (!communityId) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/api/v1/events/by-community/${communityId}`);
      console.log('API Response:', response.data);
      setEvents(response.data.events || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch events.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [communityId, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreateEvent = () => {
    router.push(`/dashboard/events/create?communityId=${communityId}`);
  };

  const handleHardDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await apiClient.delete(`/api/v1/events/${eventToDelete.id}/hard`);
      toast({ title: 'Success', description: 'Event deleted successfully.' });
      setEvents(prev => prev.filter(event => event.id !== eventToDelete.id));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete event.', variant: 'destructive' });
    } finally {
      setEventToDelete(null);
    }
  };

  const handleSoftDeleteEvent = async (eventId: string) => {
    try {
      await apiClient.delete(`/api/v1/events/${eventId}`);
      toast({ title: 'Success', description: 'Event cancelled successfully.' });
      fetchEvents(); // Refetch events to update the list
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to cancel event.', variant: 'destructive' });
    }
  };
  
  const EventSkeleton = () => (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="h-4 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-10 rounded-lg" />
    </div>
  );

  return (
    <>
      <Card className="border-gray-200 dark:border-gray-800 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full"></div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Manage Events</CardTitle>
              </div>
              <CardDescription className="text-gray-600 dark:text-gray-400">Create, edit, or remove events for this community.</CardDescription>
            </div>
            <Button 
              onClick={handleCreateEvent}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Create Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => <EventSkeleton key={index} />)}
              </div>
            ) : events.length > 0 ? (
              events.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {event.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <CalendarDays className="h-4 w-4 flex-shrink-0" />
                      <span>{safeFormatDate(event.created_at)}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onSelect={() => router.push(`/dashboard/events/${event.id}/edit`)} className="rounded-lg cursor-pointer text-gray-700 dark:text-gray-300 focus:bg-blue-100 dark:focus:bg-blue-900/30 focus:text-blue-600 dark:focus:text-blue-400">
                        <Edit className="h-4 w-4 mr-2" /> Edit Event
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleSoftDeleteEvent(event.id)} className="rounded-lg cursor-pointer text-amber-600 dark:text-amber-400 focus:bg-amber-100 dark:focus:bg-amber-900/20 focus:text-amber-700 dark:focus:text-amber-300">
                        <Ban className="h-4 w-4 mr-2" /> Cancel Event
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setEventToDelete(event)} className="rounded-lg cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-100 dark:focus:bg-red-900/20 focus:text-red-700 dark:focus:text-red-300">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors duration-200">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <CalendarDays className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Events Found</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Create your first event for this community to get started.</p>
                <Button 
                  onClick={handleCreateEvent}
                  className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Event
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the event <span className="font-bold">{eventToDelete?.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHardDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}