'use client';

import { useUser } from '@/context/user-provider';
import { getFeed } from '@/lib/services/feed.service';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { FeedItem, Comment, Post } from '@/lib/types';
import { PostCard } from '@/components/community/feed/PostCard';
import { EventCard } from '@/components/community/feed/EventCard';
import CreatePost from '@/components/community/shared/create-post-card';
import { FeedSkeleton } from '@/components/skeletons/feed-skeleton';
import { useEffect, useRef, useState, useMemo } from 'react';



export default function FeedClientPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const composerRef = useRef<HTMLDivElement | null>(null);


  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isFeedLoading,
  } = useInfiniteQuery({
    queryKey: ['feed', 'global', user?.id ?? null],
    queryFn: ({ pageParam = 1 }) => getFeed(pageParam, undefined, 'global'),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page * lastPage.limit < lastPage.total) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: !isUserLoading && !!user?.id,
  });

  const { ref, inView } = useInView();

  // Derive feedItems from data using useMemo
  const memoizedFeedItems = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  // Use a separate state for real-time updates
  const [realtimeFeedUpdates, setRealtimeFeedUpdates] = useState<Record<string, Partial<Post>>>({});

  // Combine memoizedFeedItems with realtimeFeedUpdates
  const combinedFeedItems = useMemo(() => {
    return memoizedFeedItems.map(item => {
      if (item.type === 'post' && realtimeFeedUpdates[item.post.id]) {
        return {
          ...item,
          post: { ...item.post, ...realtimeFeedUpdates[item.post.id] },
        };
      }
      return item;
    });
  }, [memoizedFeedItems, realtimeFeedUpdates]);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  useEffect(() => {
    const handleRealtimeComment = (event: Event) => {
      const customEvent = event as CustomEvent<Comment>;
      const incoming = customEvent.detail as Comment;
      if (!incoming || !incoming.post_id) return;

      setRealtimeFeedUpdates(prevUpdates => {
        const existingPostPartial = prevUpdates[incoming.post_id];

        return {
          ...prevUpdates,
          [incoming.post_id]: {
            ...existingPostPartial,
            comment_count: (existingPostPartial?.comment_count || 0) + 1,
          },
        };
      });
    };

    window.addEventListener('realtime-comment', handleRealtimeComment as EventListener);

    return () => {
      window.removeEventListener('realtime-comment', handleRealtimeComment as EventListener);
    };
  }, []);

  if (isUserLoading || isFeedLoading) {
    return <FeedSkeleton />;
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <section className="dashboard-panel dashboard-panel-accent px-5 py-5 max-w-3xl mx-auto w-full">
      </section>

      <section
        id="global-feed-composer"
        ref={composerRef}
        className="dashboard-panel overflow-hidden p-0 max-w-3xl mx-auto w-full"
      >
        <CreatePost />
      </section>

      <div className="mt-1 space-y-4 max-w-3xl mx-auto w-full" data-scroll-anchor>
        {combinedFeedItems.map((item: FeedItem) => {
          if (item.type === 'post' && item.post) {
            return <PostCard key={item.post.id} post={item.post} className="w-full" />;
          }
          if (item.type === 'event' && item.event) {
            return <EventCard key={item.event.event_id} event={item.event} className="w-full" />;
          }
          return null;
        })}
        {isFetchingNextPage && <FeedSkeleton />}
        <div ref={ref} />
      </div>
    </div>
  );
}
