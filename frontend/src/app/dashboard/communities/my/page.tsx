import { getMyCommunities } from '@/lib/services/community.server.service';
import { MyCommunitiesDataTable } from '@/components/community/shared/my-communities-data-table';
import type { Community } from '@/lib/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

// This is a server component
export default async function MyCommunitiesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  const myCommunitiesData = await getMyCommunities();

  const myCommunities: Community[] = myCommunitiesData.map(c => ({ 
    ...c, 
    role: c.role || 'member' 
  }));

  return (
    <div data-primary-content>
      <Suspense fallback={<div>Loading...</div>}>
        <div data-scroll-anchor>
          <MyCommunitiesDataTable data={myCommunities} />
        </div>
      </Suspense>
    </div>
  );
}
