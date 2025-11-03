import type { Community } from '@/lib/types';
import { getCommunityById } from '@/lib/services/community.server.service';
import { redirect } from 'next/navigation';
import CommunitySettingsClient from './community-settings-client';

export default async function CommunityAdminSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const community: Community | null = await getCommunityById(id);

  if (!community || community.role !== 'community_admin') {
    redirect(`/dashboard/communities/${id}`);
  }

  return <CommunitySettingsClient community={community} />;
}
