'use client';

import { useUser } from '@/context/user-provider';
import { setAuthToken } from '@/lib/api-client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFeed } from '@/lib/services/feed.service';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Post, FeedItem } from '@/lib/types'; // Import FeedItem
import { PaginatedResponse } from '@/lib/types';
import { PostCard } from '@/components/community/feed/PostCard';
import CreatePost from '@/components/community/shared/create-post-card';
import { FeedSkeleton } from '@/components/skeletons/feed-skeleton';

interface FeedClientPageProps {
  initialFeed: PaginatedResponse<FeedItem>; // Changed from Post to FeedItem
  searchParams: { [key: string]: string | string[] | undefined };
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FeedClientPage({ initialFeed, searchParams }: FeedClientPageProps) {
  const { setUser } = useUser();

  useEffect(() => {
    if (searchParams?.user && searchParams?.token) {
      try {
        const user = JSON.parse(searchParams.user as string);
        const token = searchParams.token as string;
        setUser(user);
        setAuthToken(token);
        // Clean up the URL
        window.history.replaceState({}, '', '/dashboard');
      } catch (error) {
        console.error('Failed to parse user data from URL:', error);
      }
    }
  }, [searchParams, setUser]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 1 }) => getFeed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page * lastPage.limit < lastPage.total) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialData: { pages: [initialFeed], pageParams: [1] },
  });

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const feedItems = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Home Feed</h1>
        <CreatePost />
      </div>
      <div className="flex justify-end items-center gap-4 mb-6">
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="popular">Popular</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="posts">Posts</SelectItem>
            <SelectItem value="events">Events</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4 mt-4">
        {feedItems.map((item: FeedItem) => {
          if (item.type === 'post') {
            // TODO: This is a temporary workaround. We need to create a proper mapping from FeedItem to Post
            return <PostCard key={item.id} post={item as any} />;
          }
          // Render event card or something else for event type
          return null;
        })}
        {isFetchingNextPage && <FeedSkeleton />}
        <div ref={ref} />
      </div>
    </div>
  );
}