// app/events/components/event-form/event-form.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { AppEvent, Community } from '@/lib/types';
import { eventFormSchema, EventFormValues } from '@/lib/schemas/event-form.schema';
import { mapApiEventToFormValues, mapFormValuesToApiPayload } from '@/lib/adapters/event-form.adapter';
import { createEvent, updateEvent } from '@/lib/services/event.client.service';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

// Import step components
import { EventDetailsStep } from './steps/details-step';
import { ScheduleStep } from './steps/schedule-step';
import { RegistrationStep } from './steps/registration-step';
import { RemindersStep } from './steps/reminders-step'; // Import the new step
console.log("RemindersStep component:", RemindersStep);

interface EventFormProps {
  mode: 'create' | 'edit';
  initialData?: AppEvent;
  communities?: Community[]; // Only needed for 'create' mode
  community?: Community;
}

const steps = [
  { id: 'details', fields: ['community_id', 'name', 'description', 'cover_image_url'] },
  { id: 'schedule', fields: ['start_time', 'end_time', 'timezone', 'location_type', 'location_address', 'online_meeting_url', 'is_recurring', 'recurrence_rule'] },
  { id: 'registration', fields: ['registration_required', 'registration_opens_at', 'registration_closes_at', 'max_attendees', 'waitlist_enabled', 'max_waitlist', 'whitelist_only', 'require_approval', 'face_verification_required', 'liveness_check_required', 'is_paid', 'fee', 'currency', 'status'] },
  { id: 'reminders', fields: ['reminder_schedule'] }
];
import dynamic from 'next/dynamic';
const MotionDiv = dynamic(() => import('framer-motion').then((mod) => mod.motion.div), { ssr: false });
const AnimatePresence = dynamic(() => import('framer-motion').then((mod) => mod.AnimatePresence), { ssr: false });

export default function EventForm({ mode, initialData, communities, community }: EventFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);

  // Initialize form with default values derived from the adapter.
  // This runs only once, avoiding useEffect complexity.
  const defaultValues = useMemo(
    () => {
      const defaults = {
        name: '',
        description: '',
        cover_image_url: '',
        location_address: '',
        online_meeting_url: '',
        recurrence_rule: '',
        community_id: '',
        start_time: new Date(),
        end_time: new Date(new Date().getTime() + 60 * 60 * 1000),
      };

      if (mode === 'edit' && initialData) {
        return { ...defaults, ...mapApiEventToFormValues(initialData) };
      }
      if (community) {
        return { ...defaults, community_id: community.id };
      }
      return defaults;
    },
    [initialData, mode, community]
  );

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: 'onTouched', // Validate on blur for better user experience
  });

  const { mutate: handleMutate, isPending } = useMutation({
    mutationFn: async (values: EventFormValues) => {
      const payload = mapFormValuesToApiPayload(values);
      if (mode === 'edit' && initialData) {
        return updateEvent({ eventId: initialData.id, eventData: payload.event });
      }
      return createEvent(payload as any); // Type assertion needed here
    },
    onSuccess: (data) => {
      toast({ title: `Event ${mode === 'edit' ? 'updated' : 'created'} successfully!` });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (mode === 'edit') {
        queryClient.invalidateQueries({ queryKey: ['event', data.id] });
      }
      router.push(`/dashboard/events/${data.id}`);
    },
    onError: (error) => {
      toast({ title: `Failed to ${mode} event`, description: error.message, variant: 'destructive' });
    },
  });

  const nextStep = async () => {
    const fields = steps[currentStep].fields;
    const isValid = await form.trigger(fields as (keyof EventFormValues)[]);
    if (!isValid) {
      console.log("Validation failed", form.formState.errors);
      toast({ title: "Please complete all required fields before proceeding.", variant: "destructive" });
    }
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const onSubmit = (values: EventFormValues) => {
    handleMutate(values);
  };

  console.log("currentStep", currentStep, "steps.length", steps.length);
  return (
    <FormProvider {...form}>
      <Form {...form}> {/* This Form is from shadcn, not a typo */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {/* Render the current step component */}
              {currentStep === 0 && <EventDetailsStep communities={communities} community={community} />}
              {currentStep === 1 && <ScheduleStep />}
              {currentStep === 2 && <RegistrationStep />}
              {currentStep === 3 && <RemindersStep />} 
            </MotionDiv>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <div>
              {currentStep > 0 && (
                <Button type="button" onClick={prevStep} className="liquid-glass-button">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
              )}
            </div>
            <div>
              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={nextStep} className="liquid-glass-button">
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isPending} onClick={form.handleSubmit(onSubmit)} className="liquid-glass-button">
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}