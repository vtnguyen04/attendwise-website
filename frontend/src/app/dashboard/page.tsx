import { Suspense } from 'react';
import FeedClientPage from './client-page';
import { FeedSkeleton } from '@/components/skeletons/feed-skeleton';

// This component is now a pure Server Component shell.
// It passes searchParams to the client component, where all logic is handled.
export default async function DashboardFeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedClientPage />
    </Suspense>
  );
}
