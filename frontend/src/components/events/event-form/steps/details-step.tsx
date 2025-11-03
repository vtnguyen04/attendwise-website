// app/events/components/event-form/steps/details-step.tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/ui/image-uploader';
import ControlledSelect from '@/components/events/controlled-select';
import { EventFormValues } from '@/lib/schemas/event-form.schema';
import { Community } from '@/lib/types';
import { Calendar, Type, FileText, Image } from 'lucide-react';

interface DetailsStepProps {
  communities?: Community[];
  community?: Community;
}

export const EventDetailsStep = ({ communities, community }: DetailsStepProps) => {
  const { control } = useFormContext<EventFormValues>();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 backdrop-glass flex items-center justify-center">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Event Details</h2>
          <p className="text-sm text-muted-foreground">Provide the basic information for your event</p>
        </div>
      </div>

      {/* Community Selection */}
      {communities && !community && (
        <FormField
          control={control}
          name="community_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-sm font-semibold">
                <div className="w-8 h-8 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                Community
              </FormLabel>
              <FormControl>
                <div className="glass-card p-4">
                  <ControlledSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={communities.map((c, index) => ({ 
                      value: c.id, 
                      label: c.name || `Unnamed Community ${index + 1}` 
                    }))}
                    placeholder="Select a community"
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground ml-10">
                This event will be hosted by the selected community
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Event Title */}
      <FormField 
        name="name" 
        control={control} 
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-8 h-8 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
                <Type className="h-4 w-4 text-primary" />
              </div>
              Event Title
            </FormLabel>
            <FormControl>
              <Input 
                {...field} 
                placeholder="Enter your event title..."
                className="glass-card h-12 px-4 border-glass-border focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} 
      />

      {/* Description */}
      <FormField 
        name="description" 
        control={control} 
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-8 h-8 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Description
            </FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                rows={6}
                placeholder="Describe your event in detail..."
                className="glass-card px-4 py-3 border-glass-border focus:ring-2 focus:ring-primary/30 transition-all resize-none"
              />
            </FormControl>
            <FormDescription className="text-xs text-muted-foreground ml-10">
              Share what attendees can expect from this event
            </FormDescription>
            <FormMessage />
          </FormItem>
        )} 
      />

      {/* Cover Image */}
      <FormField
        name="cover_image_url"
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-8 h-8 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
                <Image className="h-4 w-4 text-primary" />
              </div>
              Cover Image
            </FormLabel>
            <FormControl>
              <div className="glass-card p-6">
                <ImageUploader
                  onUploadSuccess={field.onChange}
                  value={field.value}
                  // 👇 ADD THIS LINE
                  alt="Preview of the event cover image"
                />
              </div>
            </FormControl>
            <FormDescription className="text-xs text-muted-foreground ml-10">
              Upload a cover image that represents your event
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};