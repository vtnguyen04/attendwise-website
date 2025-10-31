'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import { useTranslation } from '@/hooks/use-translation';

interface CommunitySettingsTabProps {
  communityId: string;
}

export function CommunitySettingsTab({ communityId }: CommunitySettingsTabProps) {
  const { t } = useTranslation('communities');
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    newPostNotifications: true,
    newEventNotifications: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  // In a real application, you would fetch these settings from the backend
  // For now, we'll use a mock fetch
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSettings({
        newPostNotifications: true,
        newEventNotifications: true,
      });
      setIsLoading(false);
    }, 500);
  }, [communityId]);

  const handleToggle = (settingKey: keyof typeof settings) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [settingKey]: !prevSettings[settingKey],
    }));
    toast({
      title: t('settings.update_success_title'),
      description: t('settings.update_success_description'),
    });
    // In a real app, you'd send this update to the backend
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Loading Settings...</CardTitle></CardHeader>
        <CardContent><p>Please wait while settings are loaded.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>{t('settings.notification_settings_title')}</CardTitle>
        <CardDescription>{t('settings.notification_settings_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="new-post-notifications">
            {t('settings.new_post_notifications_label')}
          </Label>
          <Switch
            id="new-post-notifications"
            checked={settings.newPostNotifications}
            onCheckedChange={() => handleToggle('newPostNotifications')}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="new-event-notifications">
            {t('settings.new_event_notifications_label')}
          </Label>
          <Switch
            id="new-event-notifications"
            checked={settings.newEventNotifications}
            onCheckedChange={() => handleToggle('newEventNotifications')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
