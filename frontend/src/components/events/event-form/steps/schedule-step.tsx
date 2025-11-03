// app/events/components/event-form/steps/schedule-step.tsx
'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, Video, Clock, Repeat } from 'lucide-react';

import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RecurrenceBuilder } from '@/components/events/recurrence-builder';
import ControlledSelect from '@/components/events/controlled-select';
import { EventFormValues } from '@/lib/schemas/event-form.schema';

export const ScheduleStep = () => {
  const { control } = useFormContext<EventFormValues>();

  const locationType = useWatch({ control, name: 'location_type' });
  const isRecurring = useWatch({ control, name: 'is_recurring' });
  const startTime = useWatch({ control, name: 'start_time' });

  return (
    <div className="space-y-6">
      {/* Date & Time Section */}
      <div className="liquid-glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Date & Time</h3>
            <p className="text-sm text-muted-foreground">When will your event take place?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="start_time"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Time</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <button className={`liquid-glass-button w-full justify-start text-left ${!field.value && 'text-muted-foreground'}`}>
                        <CalendarIcon className="h-4 w-4" />
                        <span>{field.value ? format(field.value, 'PPP HH:mm') : 'Pick a date'}</span>
                      </button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass-card">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    <div className="p-3 border-t border-glass-border">
                      <Input 
                        type="time" 
                        defaultValue={field.value ? format(field.value, "HH:mm") : ''} 
                        onChange={e => {
                          const newDate = field.value ? new Date(field.value) : new Date();
                          const [hours, minutes] = e.target.value.split(':').map(Number);
                          newDate.setHours(hours, minutes, 0, 0);
                          field.onChange(newDate);
                        }} 
                        className="w-full px-3 py-2 bg-background/50 border border-glass-border rounded-lg"
                      />
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
                <FormLabel>End Time</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <button className={`liquid-glass-button w-full justify-start text-left ${!field.value && "text-muted-foreground"}`}>
                        <CalendarIcon className="h-4 w-4" />
                        <span>{field.value ? format(field.value, 'PPP HH:mm') : 'Pick a date'}</span>
                      </button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass-card">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    <div className="p-3 border-t border-glass-border">
                      <Input 
                        type="time" 
                        defaultValue={field.value ? format(field.value, "HH:mm") : ''} 
                        onChange={e => {
                          const newDate = field.value ? new Date(field.value) : new Date();
                          const [hours, minutes] = e.target.value.split(':').map(Number);
                          newDate.setHours(hours, minutes, 0, 0);
                          field.onChange(newDate);
                        }} 
                        className="w-full px-3 py-2 bg-background/50 border border-glass-border rounded-lg"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Location Section */}
      <div className="liquid-glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Location</h3>
            <p className="text-sm text-muted-foreground">Where will attendees join?</p>
          </div>
        </div>

        <div className="space-y-6">
          <FormField
            control={control}
            name="location_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Type</FormLabel>
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
            <FormField 
              name="location_address" 
              control={control} 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        {...field} 
                        placeholder="e.g., 123 Main St, Anytown" 
                        className="pl-10 bg-background/50 border-glass-border backdrop-glass"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
          )}
          
          {locationType !== 'physical' && (
            <FormField 
              name="online_meeting_url" 
              control={control} 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Online Meeting URL</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        {...field} 
                        placeholder="e.g., https://zoom.us/j/..." 
                        className="pl-10 bg-background/50 border-glass-border backdrop-glass"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
          )}
        </div>
      </div>

      {/* Recurrence Section */}
      <div className="liquid-glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
            <Repeat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Recurrence</h3>
            <p className="text-sm text-muted-foreground">Set up repeating events</p>
          </div>
        </div>

        <div className="space-y-6">
          <FormField
            control={control}
            name="is_recurring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-glass-border p-4 bg-background/30 backdrop-glass">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Recurring Event</FormLabel>
                  <FormDescription>Does this event repeat on a schedule?</FormDescription>
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
                  <FormLabel>Recurrence Details</FormLabel>
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
        </div>
      </div>
    </div>
  );
};