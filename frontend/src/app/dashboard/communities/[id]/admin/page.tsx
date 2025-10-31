import type { Community } from '@/lib/types';
import { getCommunityById } from '@/lib/services/community.server.service';
import { redirect } from 'next/navigation';
import CommunitySettingsClient from './community-settings-client';

export default async function CommunityAdminSettingsPage({ 
    params 
}: { 
    params: { id: string } 
}) {
    // Await the `params` object before accessing its properties
    const awaitedParams = await params;
    const { id } = awaitedParams;

    const community: Community | null = await getCommunityById(id);

    if (!community || community.role !== 'community_admin') {
        redirect(`/dashboard/communities/${id}`);
    }

    return <CommunitySettingsClient community={community} />;
}
