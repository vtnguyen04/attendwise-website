// frontend/src/hooks/use-messaging.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as MessagingService from '@/lib/services/messaging.service';
import type { Message } from '@/lib/types';

// Custom hook to send a message
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: MessagingService.sendMessage,
    onSuccess: (newMessage: Message) => {
      // Invalidate queries for the specific conversation to show the new message
      queryClient.invalidateQueries({ queryKey: ['messages', newMessage.conversation_id] });
      // Optionally, update conversations list to reflect last message/timestamp
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to send message: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Custom hook to update a message
export function useUpdateMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: MessagingService.updateMessage,
    onSuccess: (updatedMessage: Message) => {
      queryClient.invalidateQueries({ queryKey: ['messages', updatedMessage.conversation_id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update message: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Custom hook to delete a message
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: MessagingService.deleteMessage,
    onSuccess: () => {
      // Invalidate all message queries, or be more specific if conversationId is available
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete message: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Custom hook to get total unread message count
export function useTotalUnreadMessageCount() {
  return useQuery<number>({
    queryKey: ['totalUnreadMessageCount'],
    queryFn: MessagingService.getTotalUnreadMessageCount,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}