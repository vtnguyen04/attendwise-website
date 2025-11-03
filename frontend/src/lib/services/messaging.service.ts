import apiClient from '@/lib/api-client';
import type { Conversation, Message } from '@/lib/types';
import type { QueryFunctionContext } from '@tanstack/react-query';

/**
 * Fetches all conversations for the current user.
 * Can be used on server or client.
 */
export async function getConversations(): Promise<Conversation[]> {
  const response = await apiClient.get('/conversations');
  return response.data.conversations || [];
}

/**
 * Fetches messages for a specific conversation with pagination.
 * Can be used on server or client.
 */
export async function getMessages({ pageParam = 0, queryKey }: QueryFunctionContext): Promise<Message[]> {
  const [, conversationId] = queryKey;
  const limit = 50;
  console.log('Fetching messages with limit:', limit, 'offset:', pageParam);
  const response = await apiClient.get(`/conversations/${conversationId}/messages?limit=${limit}&offset=${pageParam}`);
  return response.data.messages || [];
}

/**
 * Fetches details for a single conversation.
 * Can be used on server or client.
 */
export async function getConversationDetails(conversationId: string): Promise<Conversation | null> {
  const response = await apiClient.get(`/conversations/${conversationId}`);
  return response.data.conversation || null;
}

/**
 * Sends a message to a conversation.
 * Can be used on server or client.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  messageType: "text" | "image" | "file" = "text"
): Promise<Message> {
  const response = await apiClient.post(
    `/conversations/${conversationId}/messages`,
    {
      content,
      message_type: messageType,
    }
  );
  return response.data;
}

/**
 * Updates a message.
 * Can be used on server or client.
 */
export async function updateMessage({ messageId, content }: { messageId: string, content: string }): Promise<Message> {
  const payload = { content };
  const response = await apiClient.patch(`/messages/${messageId}`, payload);
  return response.data.message;
}

/**
 * Deletes a message.
 * Can be used on server or client.
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/messages/${messageId}`);
}



/**

 * Fetches the total count of unread messages for the user.

 * Can be used on server or client.

 */

export async function getTotalUnreadMessageCount(): Promise<number> {

  const response = await apiClient.get('/conversations/unread-count');

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

    const response = await apiClient.post('/conversations', payload);

    return response.data.conversation;

}
