'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';
import apiClient from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/ui/glass-card';
const notificationsFormSchema = z.object({
  email_enabled: z.boolean().default(false),
  push_enabled: z.boolean().default(false),
  in_app_enabled: z.boolean().default(true),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

function NotificationsSkeleton() {
    return (
        <Card data-scroll-skip="true">
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                </div>
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                </div>
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                </div>
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-32" />
            </CardFooter>
        </Card>
    );
}

export default function NotificationsSettingsPage() {
  const { t } = useTranslation('notifications');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
        email_enabled: false,
        push_enabled: true,
        in_app_enabled: true,
    }
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await apiClient.get('api/v1/notifications/preferences');
        if (response.data.preferences) {
          form.reset(response.data.preferences);
        }
      } catch {
        toast({ title: t('fetch_error_title'), description: t('fetch_error_description'), variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- Empty dependency array ensures this runs only once on mount

  async function onSubmit(data: NotificationsFormValues) {
    setIsSaving(true);
    try {
      await apiClient.put('/notifications/preferences', data);
      toast({ title: t('save_success_title'), description: t('save_success_description') });
      form.reset(data, { keepValues: true });
    } catch {
      toast({ title: t('save_error_title'), description: t('save_error_description'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <NotificationsSkeleton />;
  }

    return (
    <GlassCard data-scroll-anchor>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
                            name="email_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 liquid-glass-input">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('email.label')}</FormLabel>
                    <FormDescription>{t('email.description')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
                            name="push_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 liquid-glass-input">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('push.label')}</FormLabel>
                    <FormDescription>{t('push.description')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
                            name="in_app_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 liquid-glass-input">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('in_app.label')}</FormLabel>
                    <FormDescription>{t('in_app.description')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
                        <Button type="submit" disabled={isSaving || !form.formState.isDirty} className="liquid-glass-button">
              {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {t('save_button')}
            </Button>
          </CardFooter>
        </form>
      </Form>
        </GlassCard>
  );
}
