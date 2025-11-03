'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import MemberList from '@/components/community/members/member-list';

async function getPendingMembers(communityId: string): Promise<User[]> {
  const response = await apiClient.get(`/communities/${communityId}/members/pending`);
  return response.data.members;
}

async function approveMember({ communityId, userId }: { communityId: string, userId: string }) {
  await apiClient.post(`/communities/${communityId}/members/${userId}/approve`);
}

// We can add a reject API later if needed, for now we just focus on approve
// async function rejectMember({ communityId, userId }: { communityId: string, userId: string }) {
//   await apiClient.post(`/communities/${communityId}/members/${userId}/reject`);
// }

export function PendingMembersTab({ communityId }: { communityId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pendingMembers, isLoading } = useQuery<User[]>({
    queryKey: ['pending-members', communityId],
    queryFn: () => getPendingMembers(communityId),
  });

  const approveMutation = useMutation({
    mutationFn: approveMember,
    onSuccess: () => {
      toast({ title: 'Success', description: 'Member has been approved.' });
      queryClient.invalidateQueries({ queryKey: ['pending-members', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] }); // To update member count
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to approve member.' });
    },
  });

  const handleApproveMember = (memberId: string) => {
    approveMutation.mutate({ communityId, userId: memberId });
  };

  const handleRemoveMember = (memberId: string) => {
    // TODO: Implement reject member functionality
    console.log("Reject member with id:", memberId);
  };

  const handleSelectMember = (member: User) => {
    // TODO: Implement member selection functionality
    console.log("Selected member:", member);
  };

  if (isLoading) {
    return <div>Loading pending members...</div>;
  }

  return (
    <MemberList
      title="Pending Join Requests"
      members={pendingMembers || []}
      isUpdating={approveMutation.isPending}
      onApproveMember={handleApproveMember}
      onRemoveMember={handleRemoveMember}
      onSelectMember={handleSelectMember}
      isPending={true}
    />
  );
}
