// frontend/src/hooks/use-messaging.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as MessagingService from '@/lib/services/messaging.service';
import type { Message, Conversation, User, NullableString } from '@/lib/types'; // Import User and NullableString type

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ conversationId, content, messageType, author: _author }: { conversationId: string; content: string; messageType?: "text" | "image" | "file"; author?: User }) => 
      MessagingService.sendMessage(conversationId, content, messageType),

    onMutate: async (newMessageData) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['messages', newMessageData.conversationId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['messages', newMessageData.conversationId]);

      // Optimistically update to the new value
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: newMessageData.conversationId,
        sender_id: newMessageData.author?.id || '',
        content: newMessageData.content,
        message_type: newMessageData.messageType || 'text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'pending',
        author: newMessageData.author,
        // Added missing required properties with default values
        media_url: null,
        file_metadata: null,
        reply_to_message_id: { String: '', Valid: false } as NullableString, // Default for NullableString
        mentioned_user_ids: [],
        is_edited: false,
        edited_at: null,
        is_deleted: false,
        deleted_at: null,
        sent_at: new Date().toISOString(), // Assuming sent_at is similar to created_at for pending
      };

      queryClient.setQueryData(['messages', newMessageData.conversationId], (old: { pages: Message[][], pageParams: any[] } | undefined) => {
        const newPages = old?.pages ? [...old.pages] : [];
        if (newPages.length > 0) {
          newPages[0] = [tempMessage, ...newPages[0]];
        } else {
          newPages.push([tempMessage]);
        }
        return { ...old, pages: newPages };
      });

      return { previousMessages };
    },
    onSuccess: (newMessage: Message, variables) => {
      // Invalidate both the messages and conversations queries to refetch the latest data.
      // The WebSocket will also trigger this, but this is a good fallback.
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },

    onError: (error: Error, newMessageData, context) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      // Rollback to the previous messages on error
      queryClient.setQueryData(['messages', newMessageData.conversationId], context?.previousMessages);
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
      // Update the specific conversation in the cache to set unread_count to 0
      queryClient.setQueryData(['conversations'], (oldConversations: Conversation[] | undefined) => {
        if (!oldConversations) return [];
        return oldConversations.map(convo =>
          convo.id === conversationId ? { ...convo, unread_count: 0 } : convo
        );
      });
      queryClient.invalidateQueries({ queryKey: ['totalUnreadMessageCount'] });
    },
  });
}