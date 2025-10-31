'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';
import { useUser } from '@/context/user-provider';
import apiClient from '@/lib/api-client';
import { useState, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toNullableString, getNullableStringValue } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';

// Merged schema for all editable profile fields
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  bio: z.string().max(160).optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  profilePicture: z.any().optional(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileSettingsPage() {
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: '', bio: '', company: '', position: '' },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        bio: getNullableStringValue(user.bio) || '',
        company: getNullableStringValue(user.company) || '',
        position: getNullableStringValue(user.position) || '',
      });
      setPreviewUrl(getNullableStringValue(user.profile_picture_url) || null);
    }
  }, [user, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      form.setValue('profilePicture', file, { shouldDirty: true });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return;
    setIsSubmitting(true);

    try {
      let profilePictureUrl = getNullableStringValue(user.profile_picture_url);
      if (data.profilePicture && data.profilePicture instanceof File) {
        const formData = new FormData();
        formData.append('file', data.profilePicture);
        const response = await apiClient.post('/api/v1/media/upload', formData);
        profilePictureUrl = response.data.final_url;
      }

      const updatedUserData = {
        ...user,
        ...data,
        profile_picture_url: toNullableString(profilePictureUrl),
        bio: toNullableString(data.bio),
        company: toNullableString(data.company),
        position: toNullableString(data.position),
      };

      await apiClient.patch('/api/v1/users/me', {
        name: data.name,
        bio: toNullableString(data.bio),
        company: toNullableString(data.company),
        position: toNullableString(data.position),
        profile_picture_url: toNullableString(profilePictureUrl),
      });

      setUser(updatedUserData);
      toast({ title: 'Profile updated', description: 'Your profile has been successfully updated.' });
      form.reset(data); // Reset form to new values to clear dirty state
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSpotlightMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--spotlight-x', `${x}%`);
    cardRef.current.style.setProperty('--spotlight-y', `${y}%`);
    cardRef.current.style.setProperty('--spotlight-opacity', '0.8');
  };

  const resetSpotlight = () => {
    if (!cardRef.current) return;
    cardRef.current.style.removeProperty('--spotlight-x');
    cardRef.current.style.removeProperty('--spotlight-y');
    cardRef.current.style.removeProperty('--spotlight-opacity');
  };

  return (
    <GlassCard
      ref={cardRef}
      className="interactive-spotlight p-8 shadow-glass-lg transition-all duration-500"
      onMouseMove={handleSpotlightMove}
      onMouseLeave={resetSpotlight}
      onFocusCapture={() => cardRef.current?.style.setProperty('--spotlight-opacity', '1')}
      onBlurCapture={resetSpotlight}
    >
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-glow">Profile</h2>
        <p className="text-sm text-muted-foreground/80">This is how others will see you on the site.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="profilePicture"
              render={() => (
                <FormItem className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-black/10 p-4">
                  <FormLabel>Profile Picture</FormLabel>
                  <Avatar className="h-16 w-16 shadow-glass">
                    <AvatarImage src={previewUrl || undefined} />
                    <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                                    <FormControl>
                    <Input type="file" accept="image/*" onChange={handleFileChange} className="max-w-xs liquid-glass-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                                    <FormControl><Input placeholder="Your name" {...field} className="liquid-glass-input" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Email</FormLabel>
              <Input value={user?.email || ''} readOnly disabled className="border-white/5 bg-white/5 opacity-80" />
            </FormItem>
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                                    <FormControl><Textarea placeholder="Tell us about yourself" {...field} className="liquid-glass-input" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                                        <FormControl><Input placeholder="Your company" {...field} className="liquid-glass-input" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                                        <FormControl><Input placeholder="Your position" {...field} className="liquid-glass-input" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="mt-8 flex items-center justify-end border-t border-white/10 pt-4">
                        <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isDirty}
              className="liquid-glass-button px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white"
            >
              {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile
            </Button>
          </div>
        </form>
      </Form>
    </GlassCard>
  );
}