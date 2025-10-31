// app/events/[eventId]/loading.tsx
import { FullPageLoader } from '@/components/events/full-page-loader';

export default function Loading() {
  // FullPageLoader will be automatically shown by Next.js
  // while the server component for this route is loading.
  return <FullPageLoader />;
}