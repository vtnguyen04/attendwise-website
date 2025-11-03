// frontend/src/hooks/use-messaging.ts
'use client';

import { useMutation, useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as MessagingService from '@/lib/services/messaging.service';
import type { Message, Conversation } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { toNullableString } from '@/lib/utils';

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ conversationId, content, messageType }: { conversationId: string; content: string; messageType?: "text" | "image" | "file" }) => 
      MessagingService.sendMessage(conversationId, content, messageType),

    onSuccess: (newMessage: Message, variables) => {
      // Invalidate both the messages and conversations queries to refetch the latest data.
      // The WebSocket will also trigger this, but this is a good fallback.
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },

    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
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

export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => MessagingService.markConversationAsRead(conversationId),
    onSuccess: (data, conversationId) => {
      console.log("Mark as read successful for conversation:", conversationId);
      // Invalidate queries to refetch conversation list and total unread count
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}