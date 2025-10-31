// lib/services/feed.client.service.ts
'use client';

import apiClient from '@/lib/api-client';
import type { FeedItem } from '@/lib/types';
import { mapFeedItems } from './feed.service';

/**
 * [CLIENT] Fetches the personalized feed for the current user.
 * This is intended for client-side rendering of the feed.
 */
export const getFeed = async (): Promise<FeedItem[]> => {
  try {
    const response = await apiClient.get<{ feed?: any[] }>('/api/v1/feed');
    return mapFeedItems(response.data?.feed);
  } catch (error) {
    console.error('Failed to fetch feed on client:', error);
    return [];
  }
};
