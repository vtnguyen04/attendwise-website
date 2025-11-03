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
import { getNullableStringValue } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { useTranslation } from '@/hooks/use-translation';
import { Separator } from '@/components/ui/separator';
import ExperienceForm from '@/components/settings/experience-form';
import EducationForm from '@/components/settings/education-form';
import SkillForm from '@/components/settings/skill-form';

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
  const { t } = useTranslation('profile');

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
        const response = await apiClient.post('/media/upload', formData);
        profilePictureUrl = response.data.final_url;
      }

      const payload = {
        name: data.name,
        bio: data.bio ?? '',
        company: data.company ?? '',
        position: data.position ?? '',
        profile_picture_url: profilePictureUrl ?? '',
      };

      const response = await apiClient.patch('/users/me', payload);
      const updatedUser = response.data?.user;

      if (updatedUser) {
        setUser(updatedUser);
      }

      toast({ title: t('update_success_title'), description: t('update_success_description') });
    } catch {
      toast({ title: t('update_failed_title'), description: t('update_failed_error'), variant: 'destructive' });
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

  const inputClasses =
    'h-10 rounded-lg border border-border/50 bg-background/80 text-sm text-foreground shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background/40';
  const textAreaClasses =
    'rounded-lg border border-border/50 bg-background/80 text-sm text-foreground shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background/40';

  return (
    <GlassCard
      ref={cardRef}
      className="interactive-spotlight max-w-3xl mx-auto p-6 sm:p-8 shadow-glass-lg transition-all duration-500 border border-border/60 bg-card/95"
      data-scroll-anchor
      onMouseMove={handleSpotlightMove}
      onMouseLeave={resetSpotlight}
      onFocusCapture={() => cardRef.current?.style.setProperty('--spotlight-opacity', '1')}
      onBlurCapture={resetSpotlight}
    >
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-glow">{t('title')}</h2>
        <p className="text-sm text-muted-foreground/80">{t('description')}</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-5">
            <FormField
              control={form.control}
              name="profilePicture"
              render={() => (
                <FormItem className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card/70 p-3">
                  <FormLabel>{t('picture_label')}</FormLabel>
                  <Avatar className="h-16 w-16 shadow-glass">
                    <AvatarImage src={previewUrl || undefined} />
                    <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="max-w-xs rounded-lg border border-border/50 bg-background/80 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-primary hover:file:bg-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('name_label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('name_placeholder')} {...field} className={inputClasses} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>{t('email_label')}</FormLabel>
                <Input
                  value={user?.email || ''}
                  readOnly
                  disabled
                  className="h-10 rounded-lg border border-border/40 bg-muted/30 text-muted-foreground"
                />
              </FormItem>
            </div>
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bio_label')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('bio_placeholder')}
                      {...field}
                      className={textAreaClasses}
                      rows={3}
                    />
                  </FormControl>
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
                    <FormLabel>{t('company_label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('company_placeholder')} {...field} className={inputClasses} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('position_label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('position_placeholder')} {...field} className={inputClasses} />
                    </FormControl>
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
              className="liquid-glass-button px-6 py-2 text-sm font-medium"
            >
              {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {t('save_button')}
            </Button>
          </div>
        </form>
      </Form>

      <Separator className="my-8" />

      <ExperienceForm />

      <Separator className="my-8" />

      <EducationForm />

      <Separator className="my-8" />

      <SkillForm />
    </GlassCard>
  );
}
