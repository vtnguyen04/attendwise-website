// lib/services/feed.client.service.ts
'use client';

import apiClient from '@/lib/api-client'; // Import apiClient
import type { FeedItem } from '@/lib/types';
import { extractStringValue } from '@/lib/utils';

/**
 * [CLIENT] Fetches the personalized feed for the current user.
 * This is intended for client-side rendering of the feed.
 */
export const getFeed = async (): Promise<FeedItem[]> => {
  try {
    const response = await apiClient.get<{ feed?: any[] }>('/api/v1/feed'); // Use apiClient.get

    if (!response || !response.data || !response.data.feed) {
      return [];
    }

    const feedData = response.data.feed;

    // Map the raw API response to the client-side FeedItem type.
    return feedData.map((item: any) => {
    if (!item.data || !item.author) {
      console.warn("Feed item missing 'data' or 'author' field:", item);
      return null; // Skip this item
    }

    const baseItem: Omit<FeedItem, 'content' | 'name'> = {
      type: item.type,
      id: item.data.id,
      created_at: item.data.createdAt || item.data.created_at,
      author_id: item.author.id,
      author_name: item.author.name,
      author_avatar_url: extractStringValue(item.author.profile_picture_url),
    };

      if (item.type === 'post') {
        return {
          ...baseItem,
          community_id: item.data.community_id,
          content: item.data.content,
          file_attachments: item.data.file_attachments,
          updated_at: item.data.updated_at,
        } as FeedItem;
      } else if (item.type === 'event') {
        return {
          ...baseItem,
          name: item.data.name,
          start_time: item.data.start_time,
          end_time: item.data.end_time,
        } as FeedItem;
      }
      return null;
    }).filter(Boolean) as FeedItem[];
  } catch (error) {
    console.error("Failed to fetch feed on client:", error);
    return [];
  }
};
