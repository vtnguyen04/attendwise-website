import { Suspense } from 'react';

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
