
// src/hooks/use-notification.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/services/notification.service';
import { toast } from '@/hooks/use-toast';

export function useNotifications(limit: number = 10, offset: number = 0) {
  return useQuery({
    queryKey: ['notifications', { limit, offset }],
    queryFn: () => getNotifications(limit, offset),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.error || 'Failed to mark notification as read.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      toast({ title: 'All notifications marked as read' });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.error || 'Failed to mark all notifications as read.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });
}
