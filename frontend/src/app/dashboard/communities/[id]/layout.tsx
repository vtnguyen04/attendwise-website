
import { CommunityCoverImage } from '@/components/community/shared/community-cover-image';
import { CommunityHeader } from '@/components/community/shared/community-header';
import { HoverableProfileCard } from '@/components/community/sidebar/HoverableProfileCard';
import { getCommunityById } from '@/lib/services/community.server.service';
import { getCurrentUser } from '@/lib/session';
import { notFound } from 'next/navigation';

export default async function CommunityDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [community, currentUser] = await Promise.all([
    getCommunityById(id),
    getCurrentUser(),
  ]);

  if (!community) {
    notFound();
  }

  return (
    <div>
      <div className="relative">
        <CommunityCoverImage community={community} />
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <CommunityHeader community={community} currentUser={currentUser} />
        </div>
      </div>
      <div className="relative">
        <div className="absolute top-4 right-4 z-20">
          <HoverableProfileCard community={community} />
        </div>
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
