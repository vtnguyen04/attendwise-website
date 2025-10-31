import { clientFetch } from '@/lib/client-fetch';
import type { FeedItem, Post, EventItem } from '@/lib/types';
import { PaginatedResponse } from '@/lib/types';

export type FeedApiItem = {
  type: string;
  post?: Post;
  event?: EventItem;
  created_at: string;
};

export const mapFeedItems = (items?: FeedApiItem[] | null): FeedItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map<FeedItem | null>((item) => {
      if (item.type === 'post' && item.post) {
        return {
          type: 'post',
          created_at: item.created_at,
          post: item.post,
        };
      }

      if (item.type === 'event' && item.event) {
        return {
          type: 'event',
          created_at: item.created_at,
          event: item.event,
        };
      }

      console.warn('[feed] Skipping malformed feed item', item);
      return null;
    })
    .filter((item): item is FeedItem => item !== null);
};

/**
 * Fetches the personalized feed for the current user.
 * The backend currently returns a single page of results.
 */
export const getFeed = async (
  page: number = 1,
  token?: string
): Promise<PaginatedResponse<FeedItem>> => {
  if (page > 1) {
    return { data: [], total: 0, page, limit: 0 };
  }

  let response: { feed?: FeedApiItem[] } | null = null;

  if (typeof window === 'undefined') {
    const { serverFetch } = await import('@/lib/server-fetch');
    response = await serverFetch<{ feed?: FeedApiItem[] }>(
      `/api/v1/feed`,
      ['feed:page:1'],
      token
    );
  } else {
    response = await clientFetch<{ feed?: FeedApiItem[] }>(`/api/v1/feed`);
  }

  const feedItems = mapFeedItems(response?.feed);

  return {
    data: feedItems,
    total: feedItems.length,
    page: 1,
    limit: feedItems.length,
  };
};
