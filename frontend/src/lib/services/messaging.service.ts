import apiClient from '@/lib/api-client';
import type { Conversation, Message } from '@/lib/types';
import type { QueryFunctionContext } from '@tanstack/react-query';

/**
 * Fetches all conversations for the current user.
 * Can be used on server or client.
 */
export async function getConversations(): Promise<Conversation[]> {
  const response = await apiClient.get('/api/v1/conversations');
  return response.data.conversations || [];
}

/**
 * Fetches messages for a specific conversation with pagination.
 * Can be used on server or client.
 */
export async function getMessages({ pageParam = 0, queryKey }: QueryFunctionContext): Promise<Message[]> {
  const [_key, conversationId] = queryKey;
  const limit = 50;
  const response = await apiClient.get(`/api/v1/conversations/${conversationId}/messages?limit=${limit}&offset=${pageParam}`);
  return response.data.messages || [];
}

/**
 * Fetches details for a single conversation.
 * Can be used on server or client.
 */
export async function getConversationDetails(conversationId: string): Promise<Conversation | null> {
  const response = await apiClient.get(`/api/v1/conversations/${conversationId}`);
  return response.data.conversation || null;
}

/**
 * Sends a message to a conversation.
 * Can be used on server or client.
 */
export async function sendMessage({ conversationId, content }: { conversationId: string, content: string }): Promise<Message> {
  const payload = { content, type: 'text' };
  const response = await apiClient.post(`/api/v1/conversations/${conversationId}/messages`, payload);
  return response.data.message;
}

/**
 * Updates a message.
 * Can be used on server or client.
 */
export async function updateMessage({ messageId, content }: { messageId: string, content: string }): Promise<Message> {
  const payload = { content };
  const response = await apiClient.patch(`/api/v1/messages/${messageId}`, payload);
  return response.data.message;
}

/**
 * Deletes a message.
 * Can be used on server or client.
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/api/v1/messages/${messageId}`);
}



/**

 * Fetches the total count of unread messages for the user.

 * Can be used on server or client.

 */

export async function getTotalUnreadMessageCount(): Promise<number> {

  const response = await apiClient.get('/api/v1/conversations/unread-count');

  return response.data.count;

}



export type CreateConversationPayload = {

    type: 'direct' | 'group' | 'community' | 'event';

    participant_ids?: string[];

    community_id?: string;

    event_id?: string;

    name?: string;

    description?: string;

    avatar_url?: string;

};



/**

 * Creates a new conversation.

 * Can be used on server or client.

 */

export async function createConversation(payload: CreateConversationPayload): Promise<Conversation> {

    const response = await apiClient.post('/api/v1/conversations', payload);

    return response.data.conversation;

}
