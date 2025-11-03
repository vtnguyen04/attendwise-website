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
import { CheckInButton } from './check-in-button'; // Import the new component
import { useTranslation } from '@/hooks/use-translation';

interface RegisteredActionsProps {
  state: 'REGISTERED_UPCOMING' | 'CAN_CHECK_IN';
  eventId: string;
  registrationId: string;
  onViewTicket: () => void;
}

export function RegisteredActions({ state, eventId, registrationId, onViewTicket }: RegisteredActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUnregisterDialogOpen, setIsUnregisterDialogOpen] = useState(false);
  const { t } = useTranslation('events');

  const unregistrationMutation = useMutation({
    mutationFn: () => unregisterFromEvent(eventId, registrationId),
    onSuccess: () => {
      toast({ title: t('registered_actions.unregister_success_title') });

      // Manually update the registration status in the cache for an instant UI response.
      queryClient.setQueryData(['my-registration', eventId], null);

      // Invalidate the main event query to refetch details like the attendee count.
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      
      setIsUnregisterDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: t('registered_actions.unregister_fail_title'), description: error.message, variant: 'destructive' });
    },
  });

  // If the state is CAN_CHECK_IN, we render the dedicated CheckInButton.
  if (state === 'CAN_CHECK_IN') {
    return (
      <div className="flex w-full gap-3">
        <CheckInButton eventId={eventId} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-auto px-3">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewTicket}>
              <QrCode className="mr-2 h-4 w-4" />
              {t('registered_actions.view_ticket')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsUnregisterDialogOpen(true)} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('registered_actions.unregister_button')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Otherwise, the state is REGISTERED_UPCOMING.
  return (
    <>
      <div className="flex w-full gap-3">
        <Button disabled className="flex-1">
          <CheckCircle className="w-4 h-4 mr-2" /> {t('registered_actions.registered_status')}
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
              {t('registered_actions.view_ticket')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsUnregisterDialogOpen(true)} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('registered_actions.unregister_button')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={isUnregisterDialogOpen} onOpenChange={setIsUnregisterDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('registered_actions.unregister_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('registered_actions.unregister_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('registered_actions.cancel_button')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unregistrationMutation.mutate()}
              disabled={unregistrationMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {unregistrationMutation.isPending ? t('registered_actions.processing_button') : t('registered_actions.unregister_button')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}