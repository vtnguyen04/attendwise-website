import { CommunityMembersTab } from '@/components/community/members/community-members-tab';
export default async function CommunityMembersPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  return <CommunityMembersTab communityId={id} />;
}
