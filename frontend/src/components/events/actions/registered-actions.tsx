// components/events/actions/registered-actions.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, QrCode, LogOut, CheckCircle } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { unregisterFromEvent } from '@/lib/services/event.client.service';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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


interface RegisteredActionsProps {
  state: 'REGISTERED_UPCOMING' | 'CAN_CHECK_IN';
  eventId: string;
  registrationId: string;
  onViewTicket: () => void;
  onOpenCheckInDialog: () => void; // New prop
  isCheckInOpen: boolean;
}

export function RegisteredActions({ state, eventId, registrationId, onViewTicket, onOpenCheckInDialog, isCheckInOpen }: RegisteredActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUnregisterDialogOpen, setIsUnregisterDialogOpen] = useState(false);

  const unregistrationMutation = useMutation({
    mutationFn: () => unregisterFromEvent(eventId, registrationId),
    onSuccess: () => {
      toast({ title: 'Unregistered Successfully' });

      // Manually update the registration status in the cache for an instant UI response.
      queryClient.setQueryData(['my-registration', eventId], null);

      // Invalidate the main event query to refetch details like the attendee count.
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      
      setIsUnregisterDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to unregister', description: error.message, variant: 'destructive' });
    },
  });

  // If the state is CAN_CHECK_IN, we render the dedicated CheckInButton.
  if (state === 'CAN_CHECK_IN') {
    return (
      <Button onClick={onOpenCheckInDialog} className="w-full">
        <CheckCircle className="w-4 h-4 mr-2" /> Check In
      </Button>
    );
  }

  // Otherwise, the state is REGISTERED_UPCOMING.
  return (
    <>
      <div className="flex w-full gap-3">
        <Button disabled className="flex-1">
          <CheckCircle className="w-4 h-4 mr-2" /> Registered
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-auto px-3">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewTicket}>
              <QrCode className="mr-2 h-4 w-4" />
              View Ticket
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsUnregisterDialogOpen(true)} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Unregister
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={isUnregisterDialogOpen} onOpenChange={setIsUnregisterDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to unregister?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove you from the attendee list. You may need to register again if you change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unregistrationMutation.mutate()}
              disabled={unregistrationMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {unregistrationMutation.isPending ? 'Processing...' : 'Unregister'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}