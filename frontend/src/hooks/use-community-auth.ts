'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import type { Community, PaginatedResponse, User } from '@/lib/types';
import { useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/use-translation';

export type CommunityAction = 'VIEW' | 'MANAGE' | 'JOIN' | 'REQUEST_TO_JOIN' | 'PENDING' | 'LOGIN_TO_JOIN' | 'HIDDEN' | 'LEAVE';

// Helper function to perform optimistic updates on community queries
const updateCommunityInQueries = (queryClient: QueryClient, communityId: string, updateFn: (community: Community) => Community) => {
  const queryKeys = [
    ['communities', 'browse'],
    ['communities', 'search'],
    ['community_suggestions'],
  ];

  queryKeys.forEach(queryKey => {
    queryClient.setQueryData(queryKey, (oldData: PaginatedResponse<Community> | Community[] | undefined) => {
      if (!oldData) return oldData;

      // Handle paginated data (useInfiniteQuery)
      if ('pages' in oldData) {
        return {
          ...oldData,
          pages: (oldData as { pages: { communities: Community[] }[] }).pages.map((page: { communities: Community[] }) => ({
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
  const { t } = useTranslation('community');

  return useMutation({
    mutationFn: (community: Community) => apiClient.post(`/communities/${community.id}/members`),
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
          ? t('toast.join_request_sent')
          : t('toast.join_success');
        toast({ title: t('toast.success'), description: successMessage });
        
        // Manually update the community in the cache
        if (data.data.community) {
            updateCommunityInQueries(queryClient, community.id, (c) => ({
                ...c,
                ...data.data.community,
            }));
        }

        // Mark related queries as stale without forcing an immediate refetch to avoid layout jumps
        queryClient.invalidateQueries({ queryKey: ['community_suggestions'], refetchType: 'inactive' });
    },
    onError: (err, variables, context) => {
      toast({ title: t('toast.error'), description: t('toast.join_fail'), variant: 'destructive' });
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['communities', 'browse'], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['communities', 'search'], refetchType: 'inactive' });
    }
  });
};

// Mutation hook for leaving a community
const useLeaveCommunity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation('community');

  return useMutation({
    mutationFn: (communityId: string) => apiClient.delete(`/communities/${communityId}/members/me`),
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
    onSuccess: () => {
        toast({ title: t('toast.success'), description: t('toast.leave_success') });
        queryClient.invalidateQueries({ queryKey: ['community_suggestions'], refetchType: 'inactive' });
    },
    onError: (err, variables, context) => {
      toast({ title: t('toast.error'), description: t('toast.leave_fail'), variant: 'destructive' });
      // Rollback
      updateCommunityInQueries(queryClient, context!.communityId, (c) => ({
        ...c,
        status: 'active',
        role: 'member', // This might need to be more specific if roles vary
        member_count: c.member_count + 1,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['communities', 'browse'], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['communities', 'search'], refetchType: 'inactive' });
    }
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
  const { t } = useTranslation('community');

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
        action: 'VIEW' as CommunityAction, actionLabel: t('action.loading'),
      };
    }

    const role = community.role;
    const status = community.status;
    const isActiveMember = status === 'active';
    const isMember = isActiveMember && (role === 'member' || role === 'moderator');
    const isAdmin = isActiveMember && role === 'community_admin';
    const isPending = status === 'pending';
    const canViewContent = isMember || isAdmin || community.type === 'public';

    let action: CommunityAction = 'VIEW';
    let actionLabel = t('action.view');

    if (!currentUser) {
      action = 'LOGIN_TO_JOIN';
      actionLabel = t('action.login_to_join');
    } else if (isAdmin) {
      action = 'MANAGE';
      actionLabel = t('action.manage');
    } else if (isMember) {
      action = 'LEAVE';
      actionLabel = t('action.leave');
    } else if (isPending) {
      action = 'PENDING';
      actionLabel = t('action.request_sent');
    } else {
      switch (community.type) {
        case 'public':
          action = 'JOIN';
          actionLabel = t('action.join');
          break;
        case 'private':
          action = 'REQUEST_TO_JOIN';
          actionLabel = t('action.request_to_join');
          break;
        case 'secret':
        default:
          action = 'HIDDEN';
          actionLabel = '';
          break;
      }
    }

    return { isMember, isAdmin, isPending, canViewContent, action, actionLabel, viewerRole: role };
  }, [community, currentUser, t]);

  return {
    ...authState,
    handleAction,
    handleLeave,
    isLoading: joinMutation.isPending || leaveMutation.isPending,
  };
}