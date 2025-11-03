// app/events/[eventId]/settings/components/danger-zone.tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Ban, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useToast } from '@/hooks/use-toast';
import { cancelEvent, deleteEvent } from '@/lib/services/event.client.service';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
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

interface DangerZoneProps {
  eventId: string;
  isActionDisabled: boolean;
}

const DangerAction = ({
  title,
  description,
  buttonText,
  buttonIcon: Icon,
  buttonVariant,
  dialogTitle,
  dialogDescription,
  onConfirm,
  isDisabled,
  isMutating,
}: {
  title: string;
  description: string;
  buttonText: string;
  buttonIcon: React.ElementType;
  buttonVariant: 'destructive' | 'outline';
  dialogTitle: string;
  dialogDescription: string;
  onConfirm: () => void;
  isDisabled: boolean;
  isMutating: boolean;
}) => (
  <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
    <div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <AlertDialog>
      <AlertDialogTrigger asChild>
                        <Button
          variant={buttonVariant}
          disabled={isDisabled || isMutating}
          className={cn(
            "liquid-glass-button",
            buttonVariant === 'destructive' && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            buttonVariant === 'outline' && "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <Icon className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="dialog-glass">
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Yes, I&apos;m sure
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);

export function DangerZone({ eventId, isActionDisabled }: DangerZoneProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: () => cancelEvent(eventId),
    onSuccess: () => {
      toast({ title: 'Event Cancelled', description: 'The event has been successfully cancelled.' });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      // No need to redirect, the page can show the "cancelled" state.
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(eventId),
    onSuccess: () => {
      toast({ title: 'Event Deleted', description: 'The event has been permanently deleted.' });
      // This invalidates all queries starting with 'events'
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.removeQueries({ queryKey: ['event', eventId] });
      router.push('/dashboard/events');
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <GlassCard className="border-destructive/50 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="bg-destructive/5 border-b border-destructive/50">
        <CardTitle className="text-xl font-bold text-destructive flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <DangerAction
          title="Cancel Event"
          description="Mark the event as cancelled. This action cannot be undone."
          buttonText="Cancel Event"
          buttonIcon={Ban}
          buttonVariant="outline"
          dialogTitle="Are you absolutely sure?"
          dialogDescription="This will cancel the event and notify all registered attendees. You cannot reverse this action."
          onConfirm={() => cancelMutation.mutate()}
          isDisabled={isActionDisabled}
          isMutating={cancelMutation.isPending}
        />
        <DangerAction
          title="Delete Event"
          description="Permanently delete this event and all its data."
          buttonText="Delete Event"
          buttonIcon={Trash2}
          buttonVariant="destructive"
          dialogTitle="Are you absolutely sure?"
          dialogDescription="This action is permanent and cannot be undone. This will delete the event, all sessions, and all registration data."
          onConfirm={() => deleteMutation.mutate()}
          isDisabled={isActionDisabled}
          isMutating={deleteMutation.isPending}
        />
      </CardContent>
    </GlassCard>
  );
}