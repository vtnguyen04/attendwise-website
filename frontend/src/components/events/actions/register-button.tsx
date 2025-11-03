// components/events/actions/register-button.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { registerForEvent } from '@/lib/services/event.client.service';
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

interface RegisterButtonProps {
  eventId: string;
}

export function RegisterButton({ eventId }: RegisterButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const registrationMutation = useMutation({
    mutationFn: () => registerForEvent(eventId),
    onSuccess: () => {
      toast({
        title: 'Registration Successful!',
        description: "You've successfully registered for the event.",
      });
      // Invalidate queries to refetch the user's registration status and event details (e.g., attendee count)
      queryClient.invalidateQueries({ queryKey: ['my-registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      setIsDialogOpen(false); // Close the dialog on success
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const handleRegisterConfirm = () => {
    registrationMutation.mutate();
  };

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button className="w-full">Register Now</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Registration</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to register for this event. Do you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRegisterConfirm}
            disabled={registrationMutation.isPending}
          >
            {registrationMutation.isPending ? 'Confirming...' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}