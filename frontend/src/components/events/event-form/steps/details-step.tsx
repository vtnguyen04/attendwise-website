// app/events/components/event-form/steps/details-step.tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/ui/image-uploader';
import ControlledSelect from '@/components/events/controlled-select'; // Adjusted path
import { EventFormValues } from '@/lib/schemas/event-form.schema';
import { Community } from '@/lib/types';

interface DetailsStepProps {
  communities?: Community[];
  community?: Community;
}

export const EventDetailsStep = ({ communities, community }: DetailsStepProps) => {
  const { control } = useFormContext<EventFormValues>();

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Step 1: Event Details</CardTitle>
        <FormDescription>Provide the basic information for your event.</FormDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {communities && !community && (
          <FormField
            control={control}
            name="community_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Community</FormLabel>
                <FormControl>
                  <ControlledSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={communities.map((c, index) => ({ value: c.id, label: c.name || `Unnamed Community ${index + 1}` }))}
                    placeholder="Select a community"
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground">This event will be hosted by the selected community.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField name="name" control={control} render={({ field }) => <FormItem><FormLabel className="text-foreground">Event Title</FormLabel><FormControl><Input {...field} className="liquid-glass-input" /></FormControl><FormMessage /></FormItem>} />
        <FormField name="description" control={control} render={({ field }) => <FormItem><FormLabel className="text-foreground">Description</FormLabel><FormControl><Textarea {...field} rows={5} className="liquid-glass-input" /></FormControl><FormMessage /></FormItem>} />
        <FormField name="cover_image_url" control={control} render={({ field }) => <FormItem><FormLabel className="text-foreground">Cover Image</FormLabel><FormControl><ImageUploader onUploadSuccess={field.onChange} value={field.value} /></FormControl><FormMessage /></FormItem>} />
      </CardContent>
    </Card>
  );
};