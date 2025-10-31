
import { clientFetch } from '@/lib/client-fetch';
import type { FeedItem } from '@/lib/types';
import { extractStringValue } from '@/lib/utils';
import { PaginatedResponse } from '@/lib/types';

/**
 * [SERVER] Fetches the personalized feed for the current user.
 * This is intended for server-side rendering of the initial feed.
 */
export const getFeed = async (page: number = 1): Promise<PaginatedResponse<FeedItem>> => {
  const response = await clientFetch<{ feed: any[], total: number, page: number, limit: number }>(`/api/v1/feed?page=${page}`);

  if (!response || !Array.isArray(response.feed)) {
    return { data: [], total: 0, page: page, limit: 10 };
  }

  // Map the raw API response to the client-side FeedItem type.
  const feedItems = response.feed.map((item: any) => {
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

  return {
    data: feedItems,
    total: response.total,
    page: response.page,
    limit: response.limit,
  };
};
