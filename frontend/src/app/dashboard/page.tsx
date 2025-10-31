
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getFeed } from '@/lib/services/feed.service';
import FeedClientPage from './client-page';
import { FeedSkeleton } from '@/components/skeletons/feed-skeleton';

export default async function DashboardFeedPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const initialFeed = await getFeed(1, token, 'global');

  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedClientPage initialFeed={initialFeed} searchParams={searchParams} />
    </Suspense>
  );
}
