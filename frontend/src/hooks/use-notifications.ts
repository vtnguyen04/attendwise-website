// frontend/src/hooks/use-notifications.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as NotificationService from '@/lib/services/notification.service';
import type { Notification, NotificationPreferences } from '@/lib/types';

// Custom hook to fetch notifications
export function useNotifications(limit: number = 10, offset: number = 0) {
  return useQuery<Notification[]>({ 
    queryKey: ['notifications', limit, offset],
    queryFn: async () => {
      const response = await NotificationService.getNotifications(limit, offset);
      return response.notifications;
    },
  });
}

// Custom hook to mark a single notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (notificationId: string) => NotificationService.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to mark notification as read: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Custom hook to mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => NotificationService.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to mark all notifications as read: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Custom hook to fetch notification preferences
export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ['notificationPreferences'],
    queryFn: NotificationService.getNotificationPreferences,
  });
}

// Custom hook to update notification preferences
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (preferences: Partial<NotificationPreferences>) =>
      NotificationService.updateNotificationPreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast({ title: 'Success', description: 'Notification preferences updated.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update preferences: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
