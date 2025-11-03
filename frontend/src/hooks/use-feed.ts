'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFeed as fetchFeedService } from '@/lib/services/feed.client.service';
import { FeedItem } from '@/lib/types'; // Import FeedItem from central types

interface UseFeedResult {
  feed: FeedItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useFeed(): UseFeedResult {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeedData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedFeed = await fetchFeedService();
      return fetchedFeed;
    } catch (err: unknown) {
      let errorMessage = 'Failed to fetch feed';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(new Error(errorMessage));
      return []; // Return empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedData().then(data => setFeed(data));
  }, [fetchFeedData]);

  return { feed, isLoading, error, refetch: fetchFeedData };
}

