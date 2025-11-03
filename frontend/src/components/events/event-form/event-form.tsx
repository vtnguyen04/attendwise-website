// app/events/components/event-form/event-form.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Calendar, Settings, Users, Bell } from 'lucide-react';

import { AppEvent, Community, CreateEventPayload } from '@/lib/types';
import { eventFormSchema, EventFormValues } from '@/lib/schemas/event-form.schema';
import { mapApiEventToFormValues, mapFormValuesToApiPayload } from '@/lib/adapters/event-form.adapter';
import { createEvent, updateEvent } from '@/lib/services/event.client.service';

import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { Form } from '@/components/ui/form';

// Import step components
import { EventDetailsStep } from './steps/details-step';
import { ScheduleStep } from './steps/schedule-step';
import { RegistrationStep } from './steps/registration-step';
import { RemindersStep } from './steps/reminders-step';
console.log("RemindersStep component:", RemindersStep);

interface EventFormProps {
  mode: 'create' | 'edit';
  initialData?: AppEvent;
  communities?: Community[];
  community?: Community;
}

const steps = [
  { id: 'details', label: 'form.steps.details', icon: Calendar, fields: ['community_id', 'name', 'description', 'cover_image_url'] },
  { id: 'schedule', label: 'form.steps.schedule', icon: Settings, fields: ['start_time', 'end_time', 'timezone', 'location_type', 'location_address', 'online_meeting_url', 'is_recurring', 'recurrence_rule'] },
  { id: 'registration', label: 'form.steps.registration', icon: Users, fields: ['registration_required', 'registration_opens_at', 'registration_closes_at', 'max_attendees', 'waitlist_enabled', 'max_waitlist', 'whitelist_only', 'require_approval', 'face_verification_required', 'liveness_check_required', 'is_paid', 'fee', 'currency', 'status'] },
  { id: 'reminders', label: 'form.steps.reminders', icon: Bell, fields: ['reminder_schedule'] }
];

import dynamic from 'next/dynamic';
const MotionDiv = dynamic(() => import('framer-motion').then((mod) => mod.motion.div), { ssr: false });
const AnimatePresence = dynamic(() => import('framer-motion').then((mod) => mod.AnimatePresence), { ssr: false });

export default function EventForm({ mode, initialData, communities, community }: EventFormProps) {
  const { t } = useTranslation('events');
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);

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
    mode: 'onTouched',
  });

  const { mutate: handleMutate, isPending } = useMutation({
    mutationFn: async (values: EventFormValues) => {
      const payload = mapFormValuesToApiPayload(values);
      if (mode === 'edit' && initialData) {
        return updateEvent({ eventId: initialData.id, eventData: payload.event });
      }
      return createEvent(payload as CreateEventPayload);
    },
    onSuccess: (data) => {
      toast({ title: t(mode === 'edit' ? 'form.toast.update_success' : 'form.toast.create_success') });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (mode === 'edit') {
        queryClient.invalidateQueries({ queryKey: ['event', data.id] });
      }
      router.push(`/dashboard/events/${data.id}`);
    },
    onError: (error) => {
      toast({ title: t(mode === 'edit' ? 'form.toast.update_fail' : 'form.toast.create_fail'), description: error.message, variant: 'destructive' });
    },
  });

  const nextStep = async () => {
    const fields = steps[currentStep].fields;
    const isValid = await form.trigger(fields as (keyof EventFormValues)[]);
    if (!isValid) {
      console.log("Validation failed", form.formState.errors);
      toast({ title: t('form.toast.validation_error'), variant: "destructive" });
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
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {/* Step Indicator */}
          <div className="dashboard-toolbar">
            <div className="flex items-center justify-between w-full">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentStep;
                const isActive = index === currentStep;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-primary text-primary-foreground shadow-magnify' 
                          : isActive 
                          ? 'bg-primary/20 text-primary ring-2 ring-primary/30' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="hidden sm:block">
                        <p className={`text-sm font-semibold transition-colors ${
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {t(step.label)}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 transition-all duration-300 ${
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="dashboard-panel p-8">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={currentStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 0 && <EventDetailsStep communities={communities} community={community} />}
                {currentStep === 1 && <ScheduleStep />}
                {currentStep === 2 && <RegistrationStep />}
                {currentStep === 3 && <RemindersStep />}
              </MotionDiv>
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            <div>
              {currentStep > 0 && (
                <button type="button" onClick={prevStep} className="liquid-glass-button">
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t('form.buttons.previous')}</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold">{t('form.step_indicator', { currentStep: currentStep + 1, totalSteps: steps.length })}</span>
            </div>

            <div>
              {currentStep < steps.length - 1 ? (
                <button type="button" onClick={nextStep} className="liquid-glass-button">
                  <span>{t('form.buttons.next')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={isPending} 
                  onClick={form.handleSubmit(onSubmit)} 
                  className="cta-button px-6 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t(mode === 'edit' ? 'form.buttons.updating' : 'form.buttons.creating')}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{t(mode === 'edit' ? 'form.buttons.update' : 'form.buttons.create')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}