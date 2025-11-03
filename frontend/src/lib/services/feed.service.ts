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

export type FeedScope = 'all' | 'community' | 'global';

const buildFeedPath = (scope: FeedScope) => {
  const params = new URLSearchParams();
  params.set('scope', scope);
  return `/feed?${params.toString()}`;
};

/**
 * Fetches the personalized feed for the current user.
 * The backend currently returns a single page of results.
 */
export const getFeed = async (
  page: number = 1,
  token?: string,
  scope: FeedScope = 'global'
): Promise<PaginatedResponse<FeedItem>> => {
  if (page > 1) {
    return { data: [], total: 0, page, limit: 0 };
  }

  const path = buildFeedPath(scope);
  let response: { feed?: FeedApiItem[] } | null = null;

  if (typeof window === 'undefined') {
    const { serverFetch } = await import('@/lib/server-fetch');
    response = await serverFetch<{ feed?: FeedApiItem[] }>(
      path,
      undefined, // No cache tags
      token
    );
  } else {
    response = await clientFetch<{ feed?: FeedApiItem[] }>(path);
  }

  const feedItems = mapFeedItems(response?.feed);

  return {
    data: feedItems,
    total: feedItems.length,
    page: 1,
    limit: feedItems.length,
  };
};
