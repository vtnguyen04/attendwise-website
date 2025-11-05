
// lib/services/feed.client.service.ts
'use client';

import apiClient from '@/lib/api-client';
import type { FeedItem, Post } from '@/lib/types';
import { mapFeedItems, FeedScope, FeedApiItem } from './feed.service';

/**
 * [CLIENT] Fetches the personalized feed for the current user.
 * This is intended for client-side rendering of the feed.
 */
export const getFeed = async (scope: FeedScope = 'global', signal?: AbortSignal): Promise<FeedItem[]> => {
  try {
    const response = await apiClient.get<{ feed?: FeedApiItem[] }>('/feed', {
      params: { scope },
      signal,
    });
    return mapFeedItems(response.data?.feed);
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'CanceledError') {
      // Request was intentionally cancelled, no need to log as an error
      console.log('Feed request cancelled');
    } else {
      console.error('Failed to fetch feed on client:', error);
    }
    return [];
  }
};

export const createPost = async (
  title: string,
  content: string,
  mediaFiles: { url: string; name: string; type: string }[],
  communityId?: string
): Promise<Post> => {
  try {
    const url = communityId ? `communities/${communityId}/posts` : '/feed/posts';

    const response = await apiClient.post<{ post: Post }>(url, {
      title,
      content,
      file_attachments: mediaFiles,
    });
    return response.data.post;
  } catch (error) {
    console.error('Failed to create post:', error);
    throw error;
  }
};




