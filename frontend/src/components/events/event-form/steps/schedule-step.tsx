// app/events/components/event-form/steps/schedule-step.tsx
'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { RecurrenceBuilder } from '@/components/events/recurrence-builder'; // Adjusted path
import ControlledSelect from '@/components/events/controlled-select'; // Adjusted path
import { EventFormValues } from '@/lib/schemas/event-form.schema';

export const ScheduleStep = () => {
  const { control } = useFormContext<EventFormValues>();

  // useWatch is now scoped to this component, preventing re-renders of the main form.
  const locationType = useWatch({ control, name: 'location_type' });
  const isRecurring = useWatch({ control, name: 'is_recurring' });
  const startTime = useWatch({ control, name: 'start_time' });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Step 2: Schedule & Location</CardTitle>
        <CardDescription>Define when and where your event will take place.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="start_time"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-foreground">Start Time</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button className={`liquid-glass-button w-full justify-start text-left font-normal ${!field.value && 'text-muted-foreground'}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP HH:mm') : <span>Pick a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass-card">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    {/* A simple time picker for convenience */}
                    <div className="p-3 border-t border-border">
                        <Input type="time" defaultValue={field.value ? format(field.value, "HH:mm") : ''} onChange={e => {
                            const newDate = field.value ? new Date(field.value) : new Date();
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            newDate.setHours(hours, minutes, 0, 0);
                            field.onChange(newDate);
                        }} className="liquid-glass-input"/>
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="end_time"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel className="text-foreground">End Time</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button className={`liquid-glass-button w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'PPP HH:mm') : <span>Pick a date</span>}
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 glass-card">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            <div className="p-3 border-t border-border">
                                <Input type="time" defaultValue={field.value ? format(field.value, "HH:mm") : ''} onChange={e => {
                                    const newDate = field.value ? new Date(field.value) : new Date();
                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                    newDate.setHours(hours, minutes, 0, 0);
                                    field.onChange(newDate);
                                }} className="liquid-glass-input"/>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={control}
          name="location_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Location Type</FormLabel>
              <ControlledSelect
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  { value: 'physical', label: 'Physical' },
                  { value: 'online', label: 'Online' },
                  { value: 'hybrid', label: 'Hybrid' },
                ]}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {locationType !== 'online' && (
          <FormField name="location_address" control={control} render={({ field }) => <FormItem><FormLabel className="text-foreground">Location Address</FormLabel><FormControl><Input {...field} placeholder="e.g., 123 Main St, Anytown" className="liquid-glass-input" /></FormControl><FormMessage /></FormItem>} />
        )}
        {locationType !== 'physical' && (
          <FormField name="online_meeting_url" control={control} render={({ field }) => <FormItem><FormLabel className="text-foreground">Online Meeting URL</FormLabel><FormControl><Input {...field} placeholder="e.g., https://zoom.us/j/..." className="liquid-glass-input" /></FormControl><FormMessage /></FormItem>} />
        )}

        <FormField
          control={control}
          name="is_recurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 glass-card">
              <div className="space-y-0.5">
                <FormLabel className="text-base text-foreground">Recurring Event</FormLabel>
                <FormDescription className="text-muted-foreground">Does this event repeat on a schedule?</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {isRecurring && startTime && (
          <FormField
            control={control}
            name="recurrence_rule"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Recurrence Details</FormLabel>
                <FormControl>
                  <RecurrenceBuilder
                    value={field.value || ''}
                    onChange={field.onChange}
                    startDate={startTime}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
};