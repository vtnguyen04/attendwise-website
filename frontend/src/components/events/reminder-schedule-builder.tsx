// components/reminder-schedule-builder.tsx
'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { PlusCircle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { EventFormValues } from '@/lib/schemas/event-form.schema';

interface ReminderScheduleBuilderProps {
  // The 'name' prop is used by useFieldArray to locate the field in the form state.
  name: 'reminder_schedule';
}

const allChannels = [
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push Notification' },
  // { value: 'sms', label: 'SMS' }, // Uncomment when SMS is available
];

export const ReminderScheduleBuilder = ({ name }: ReminderScheduleBuilderProps) => {
  const { control } = useFormContext<EventFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  return (
    <div className="space-y-4">
      {fields.length > 0 && (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4 relative glass-card">
              <div className="flex justify-between items-start">
                <h4 className="font-semibold mb-4">Reminder #{index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive liquid-glass-button"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name={`${name}.${index}.offset_minutes`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Send Reminder</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                           <Input type="number" {...field} min="1" placeholder="e.g., 60"/>
                        </FormControl>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">minutes before</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`${name}.${index}.channels`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Via Channels</FormLabel>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {allChannels.map((channel) => (
                          <Button
                            key={channel.value}
                            type="button"
                            variant={field.value?.includes(channel.value) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const currentChannels = new Set(field.value || []);
                              if (currentChannels.has(channel.value)) {
                                currentChannels.delete(channel.value);
                              } else {
                                currentChannels.add(channel.value);
                              }
                              field.onChange(Array.from(currentChannels));
                            }}
                            className="liquid-glass-button"
                          >
                            {channel.label}
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full liquid-glass-button"
        onClick={() => append({ offset_minutes: 60, channels: ['email'] })}
      >
        <PlusCircle className="h-4 w-4 mr-2" /> Add Reminder
      </Button>
    </div>
  );
};