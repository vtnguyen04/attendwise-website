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

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedFeed = await fetchFeedService();
      setFeed(fetchedFeed); // Directly set the fetchedFeed as it's already mapped
    } catch (err: any) {
      setError(err.response?.data || new Error('Failed to fetch feed'));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { feed, isLoading, error, refetch: fetchFeed };
}

