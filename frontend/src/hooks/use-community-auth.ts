'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import type { Community, PaginatedResponse, User } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type CommunityAction = 'VIEW' | 'MANAGE' | 'JOIN' | 'REQUEST_TO_JOIN' | 'PENDING' | 'LOGIN_TO_JOIN' | 'HIDDEN' | 'LEAVE';

// Helper function to perform optimistic updates on community queries
const updateCommunityInQueries = (queryClient: any, communityId: string, updateFn: (community: Community) => Community) => {
  const queryKeys = [
    ['communities', 'browse'],
    ['communities', 'search'],
    ['community_suggestions'],
  ];

  queryKeys.forEach(queryKey => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;

      // Handle paginated data (useInfiniteQuery)
      if (oldData.pages) {
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            communities: page.communities.map((community: Community) => 
              community.id === communityId ? updateFn(community) : community
            ),
          })),
        };
      }

      // Handle simple array data (useQuery)
      if (Array.isArray(oldData)) {
        return oldData.map((community: Community) => 
          community.id === communityId ? updateFn(community) : community
        );
      }

      return oldData;
    });
  });
};

// Mutation hook for joining a community
const useJoinCommunity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (community: Community) => apiClient.post(`/api/v1/communities/${community.id}/members`),
    onMutate: async (community) => {
      await queryClient.cancelQueries({ queryKey: ['communities'] });
      await queryClient.cancelQueries({ queryKey: ['community_suggestions'] });

      const newStatus = community.type === 'private' ? 'pending' : 'active';
      const newRole = 'member';

      updateCommunityInQueries(queryClient, community.id, (c) => ({
        ...c,
        status: newStatus,
        role: newRole,
        member_count: c.member_count + 1,
      }));

      return { communityId: community.id };
    },
    onSuccess: (data, community) => {
        const successMessage = community.type === 'private'
          ? 'Your request to join has been sent.'
          : 'You have successfully joined the community.';
        toast({ title: 'Success', description: successMessage });
        
        // Manually update the community in the cache
        if (data.data.community) {
            updateCommunityInQueries(queryClient, community.id, (c) => ({
                ...c,
                ...data.data.community,
            }));
        }

        // Invalidate queries on success to refetch data
        queryClient.invalidateQueries({ queryKey: ['communities'] });
        queryClient.invalidateQueries({ queryKey: ['community_suggestions'] });
    },
    onError: (err, variables, context) => {
      toast({ title: 'Error', description: 'Failed to join community.', variant: 'destructive' });
      // Rollback
      if (context) {
        updateCommunityInQueries(queryClient, context.communityId, (c) => ({
            ...c,
            status: null,
            role: null,
            member_count: c.member_count - 1,
        }));
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communities', variables.id] });
    },
  });
};

// Mutation hook for leaving a community
const useLeaveCommunity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (communityId: string) => apiClient.delete(`/api/v1/communities/${communityId}/members/me`),
    onMutate: async (communityId) => {
      await queryClient.cancelQueries({ queryKey: ['communities'] });
      await queryClient.cancelQueries({ queryKey: ['community_suggestions'] });

      updateCommunityInQueries(queryClient, communityId, (c) => ({
        ...c,
        status: null,
        role: null,
        member_count: c.member_count - 1,
      }));

      return { communityId };
    },
    onSuccess: (data, communityId) => {
        toast({ title: 'Success', description: 'You have left the community.' });
        // Invalidate queries on success to refetch data
        queryClient.invalidateQueries({ queryKey: ['communities', 'browse'] });
        queryClient.invalidateQueries({ queryKey: ['communities', 'search'] });
        queryClient.invalidateQueries({ queryKey: ['community_suggestions'] });
        queryClient.invalidateQueries({ queryKey: ['communities', communityId] });
    },
    onError: (err, variables, context) => {
      toast({ title: 'Error', description: 'Failed to leave community.', variant: 'destructive' });
      // Rollback
      updateCommunityInQueries(queryClient, context!.communityId, (c) => ({
        ...c,
        status: 'active',
        role: 'member', // This might need to be more specific if roles vary
        member_count: c.member_count + 1,
      }));
    },
    onSettled: (data, error, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['communities', 'browse'] });
      queryClient.invalidateQueries({ queryKey: ['communities', 'search'] });
      queryClient.invalidateQueries({ queryKey: ['community_suggestions'] });
    },
  });
};


interface UseCommunityAuthProps {
  community: Community | null;
  currentUser: User | null;
}

export function useCommunityAuth({ community, currentUser }: UseCommunityAuthProps) {
  const router = useRouter();
  const joinMutation = useJoinCommunity();
  const leaveMutation = useLeaveCommunity();

  const handleAction = () => {
    if (!community) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    joinMutation.mutate(community);
  };

  const handleLeave = () => {
    if (!community) return;
    leaveMutation.mutate(community.id);
  };

  const authState = useMemo(() => {
    if (!community) {
      return {
        isMember: false, isAdmin: false, isPending: false, canViewContent: false,
        action: 'VIEW' as CommunityAction, actionLabel: 'Loading...',
      };
    }

    console.log('Community object in useCommunityAuth:', JSON.stringify(community, null, 2));

    const role = community.role;
    const status = community.status;
    const isActiveMember = status === 'active';
    const isMember = isActiveMember && (role === 'member' || role === 'moderator');
    const isAdmin = isActiveMember && role === 'community_admin';
    const isPending = status === 'pending';
    const canViewContent = isMember || isAdmin || community.type === 'public';

    let action: CommunityAction = 'VIEW';
    let actionLabel = 'View';

    if (!currentUser) {
      action = 'LOGIN_TO_JOIN';
      actionLabel = 'Login to Join';
    } else if (isAdmin) {
      action = 'MANAGE';
      actionLabel = 'Manage';
    } else if (isMember) {
      action = 'LEAVE';
      actionLabel = 'Leave';
    } else if (isPending) {
      action = 'PENDING';
      actionLabel = 'Request Sent';
    } else {
      switch (community.type) {
        case 'public':
          action = 'JOIN';
          actionLabel = 'Join';
          break;
        case 'private':
          action = 'REQUEST_TO_JOIN';
          actionLabel = 'Request to Join';
          break;
        case 'secret':
        default:
          action = 'HIDDEN';
          actionLabel = '';
          break;
      }
    }

    return { isMember, isAdmin, isPending, canViewContent, action, actionLabel };
  }, [community, currentUser]);

  return {
    ...authState,
    handleAction,
    handleLeave,
    isLoading: joinMutation.isPending || leaveMutation.isPending,
  };
}