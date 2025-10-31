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
  onRegister: () => void;
  registerLoading: boolean;
}

export function RegisterButton({ eventId, onRegister, registerLoading }: RegisterButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRegisterConfirm = () => {
    onRegister();
    setIsDialogOpen(false); // Close the dialog on success
  };

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button className="w-full" disabled={registerLoading}>Register Now</Button>
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
            disabled={registerLoading}
          >
            {registerLoading ? 'Confirming...' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}