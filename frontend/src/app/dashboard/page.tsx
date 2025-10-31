
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { getFeed } from '@/lib/services/feed.service';
import FeedClientPage from './client-page';
import { FeedSkeleton } from '@/components/skeletons/feed-skeleton';

export default async function DashboardFeedPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const initialFeed = await getFeed();

  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedClientPage initialFeed={initialFeed} searchParams={searchParams} />
    </Suspense>
  );
}
