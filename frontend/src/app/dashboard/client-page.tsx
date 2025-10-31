'use client';

import { useUser } from '@/context/user-provider';
import { setAuthToken } from '@/lib/api-client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFeed } from '@/lib/services/feed.service';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { FeedItem, PaginatedResponse } from '@/lib/types';
import { PostCard } from '@/components/community/feed/PostCard';
import CreatePost from '@/components/community/shared/create-post-card';
import { FeedSkeleton } from '@/components/skeletons/feed-skeleton';
import { Button } from '@/components/ui/button';
import Sparkles from 'lucide-react/icons/sparkles';
import PenSquare from 'lucide-react/icons/pen-square';
import { useRef } from 'react';

interface FeedClientPageProps {
  initialFeed: PaginatedResponse<FeedItem>; // Changed from Post to FeedItem
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function FeedClientPage({ initialFeed, searchParams }: FeedClientPageProps) {
  const { setUser } = useUser();
  const composerRef = useRef<HTMLDivElement | null>(null);

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
    queryKey: ['feed', 'global'],
    queryFn: ({ pageParam = 1 }) => getFeed(pageParam, undefined, 'global'),
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <section className="rounded-3xl border border-border/60 bg-background/85 px-6 py-7 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Global Updates
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">Home Feed</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Broadcast announcements and moments to everyone across the platform.
            </p>
          </div>
          <Button
            variant="secondary"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm"
            onClick={() => {
              composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              composerRef.current?.querySelector<HTMLButtonElement>('button[data-composer-trigger]')
                ?.click();
            }}
          >
            <PenSquare className="h-4 w-4" />
            Start a post
          </Button>
        </div>
      </section>

      <section
        id="global-feed-composer"
        ref={composerRef}
        className="overflow-hidden rounded-3xl border border-border/60 bg-background/85 shadow-sm backdrop-blur"
      >
        <CreatePost />
      </section>

      <div className="mt-2 space-y-4">
        {feedItems.map((item: FeedItem) => {
          if (item.type === 'post' && item.post) {
            return <PostCard key={item.post.id} post={item.post} />;
          }
          // TODO: render event cards when design is ready
          return null;
        })}
        {isFetchingNextPage && <FeedSkeleton />}
        <div ref={ref} />
      </div>
    </div>
  );
}
