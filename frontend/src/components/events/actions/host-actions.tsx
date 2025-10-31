// components/events/actions/host-actions.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, XCircle } from 'lucide-react';
import { isBefore } from 'date-fns';

import { AppEvent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cancelEvent } from '@/lib/services/event.client.service';
import { extractTimeValue } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HostActionsProps {
  event: AppEvent;
}

export function HostActions({ event }: HostActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const eventStartTime = extractTimeValue(event.start_time);
  const canCancel = event.status === 'published' && eventStartTime && isBefore(new Date(), new Date(eventStartTime));

  const cancelMutation = useMutation({
    mutationFn: () => cancelEvent(event.id),
    onSuccess: () => {
      toast({ title: 'Event Cancelled', description: 'The event has been successfully marked as cancelled.' });
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      setIsCancelDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to cancel event', description: error.message, variant: 'destructive' });
    },
  });

  const handleCancelConfirm = () => {
    cancelMutation.mutate();
  };

  return (
    <div className="space-y-3">
      <Button asChild variant="outline" className="w-full">
        <Link href={`/dashboard/events/${event.id}/settings`}>
          <Edit className="w-4 h-4 mr-2" />
          Manage Event
        </Link>
      </Button>

      {canCancel && (
        <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Event
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to cancel this event?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the event as cancelled and may notify registered attendees. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelConfirm}
                disabled={cancelMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Event'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}