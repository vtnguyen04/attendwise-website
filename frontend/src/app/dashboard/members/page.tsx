"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@/context/user-provider";
import apiClient from "@/lib/api-client";
import { Community, User } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/ui/icons";
import MemberDetailSidebar from "@/components/community/members/member-detail-sidebar";
import CommunitySelector from "@/components/community/shared/community-selector";
import MemberList from '@/components/community/members/member-list';
import { useTranslation } from "@/hooks/use-translation";

export default function CommunityMembersPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation('community');
  const { t: tCommon } = useTranslation('common');
  const [adminCommunities, setAdminCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null
  );
  const [activeMembers, setActiveMembers] = useState<User[]>([]);
  const [pendingMembers, setPendingMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  const currentUserRoleForSelectedCommunity = useMemo(() => {
    if (!user || !selectedCommunityId) return undefined;
    const community = adminCommunities.find(comm => comm.id === selectedCommunityId);
    return community?.role;
  }, [user, selectedCommunityId, adminCommunities]);

  const fetchAdminCommunities = useCallback(async () => {
    try {
      const response = await apiClient.get("/my-communities");
      const communities = response.data.communities.filter(
        (comm: Community) => comm.role === "community_admin"
      );
      setAdminCommunities(communities);
      if (communities.length > 0) {
        setSelectedCommunityId(communities[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch admin communities:", error);
      toast({
        title: tCommon('toast.error'),
        description: t('members_manage.toast.fetch_communities_error'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t, tCommon]);

  const fetchCommunityMembers = useCallback(async (communityId: string) => {
    try {
      const response = await apiClient.get(
        `/communities/${communityId}/members`
      );
      const membersWithRoles = (response.data.members || []).map((member: User) => ({
        ...member,
        role: member.role || 'member' // Default to 'member' if not provided by API
      }));
      setActiveMembers(membersWithRoles);
    } catch (error) {
      console.error("Failed to fetch community members:", error);
      toast({
        title: tCommon('toast.error'),
        description: t('members_manage.toast.fetch_members_error'),
        variant: "destructive",
      });
    }
  }, [toast, t, tCommon]);

  const fetchPendingMembers = useCallback(async (communityId: string) => {
    try {
      const response = await apiClient.get(
        `/communities/${communityId}/members/pending`
      );
      const membersWithRoles = (response.data.members || []).map((member: User) => ({
        ...member,
        role: member.role || 'pending' // Default to 'pending' for pending members
      }));
      setPendingMembers(membersWithRoles);
    } catch (error) {
      console.error("Failed to fetch pending members:", error);
      toast({
        title: tCommon('toast.error'),
        description: t('members_manage.toast.fetch_pending_error'),
        variant: "destructive",
      });
    }
  }, [toast, t, tCommon]);

  useEffect(() => {
    if (user) {
      fetchAdminCommunities();
    }
  }, [user, fetchAdminCommunities]);

  useEffect(() => {
    if (selectedCommunityId) {
      fetchCommunityMembers(selectedCommunityId);
      fetchPendingMembers(selectedCommunityId);
    } else {
      setActiveMembers([]);
      setPendingMembers([]);
    }
  }, [selectedCommunityId, fetchCommunityMembers, fetchPendingMembers]);

  const handleRoleChange = useCallback(async (
    memberId: string,
    newRole: "member" | "moderator"
  ) => {
    if (!selectedCommunityId) return;
    setIsUpdating(true);
    try {
      await apiClient.patch(
        `/communities/${selectedCommunityId}/members/${memberId}`,
        { role: newRole }
      );
      toast({ title: tCommon('toast.success'), description: t('members_manage.toast.update_role_success') });
      fetchCommunityMembers(selectedCommunityId); // Refresh list
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember(prev => prev ? { ...prev, role: newRole } : null);
      }
    } catch (error) {
      console.error("Failed to update member role:", error);
      toast({
        title: tCommon('toast.error'),
        description: t('members_manage.toast.update_role_error'),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCommunityId, selectedMember, toast, fetchCommunityMembers, t, tCommon]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    if (!selectedCommunityId) return;
    setIsUpdating(true);
    try {
      await apiClient.delete(
        `/communities/${selectedCommunityId}/members/${memberId}`
      );
      toast({ title: tCommon('toast.success'), description: t('members_manage.toast.remove_success') });
      fetchCommunityMembers(selectedCommunityId); // Refresh list
      fetchPendingMembers(selectedCommunityId); // Also check pending if they were there
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember(null); // Close sidebar if removed member was selected
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast({
        title: tCommon('toast.error'),
        description: t('members_manage.toast.remove_error'),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCommunityId, selectedMember, toast, fetchCommunityMembers, fetchPendingMembers, t, tCommon]);

  const handleApproveMember = useCallback(async (memberId: string) => {
    if (!selectedCommunityId) return;
    setIsUpdating(true);
    try {
      await apiClient.post(
        `/communities/${selectedCommunityId}/members/${memberId}/approve`
      );
      toast({ title: tCommon('toast.success'), description: t('members_manage.toast.approve_success') });
      fetchPendingMembers(selectedCommunityId); // Refresh pending list
      fetchCommunityMembers(selectedCommunityId); // Refresh active list
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember(null); // Close sidebar if approved member was selected (they move to active)
      }
    } catch (error) {
      console.error("Failed to approve member:", error);
      toast({
        title: tCommon('toast.error'),
        description: t('members_manage.toast.approve_error'),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCommunityId, selectedMember, toast, fetchPendingMembers, fetchCommunityMembers, t, tCommon]);

  const handleBanMember = useCallback(async (memberId: string) => {
    if (!selectedCommunityId) return; // Ban is a community-specific action in this context
    setIsUpdating(true);
    try {
      // For simplicity, a basic ban without reason/duration for now
      await apiClient.post(`/users/${memberId}/ban`, {});
      toast({ title: tCommon('toast.success'), description: t('members_manage.toast.ban_success') });
      // Refresh all lists to reflect ban status
      fetchCommunityMembers(selectedCommunityId);
      fetchPendingMembers(selectedCommunityId);
      if (selectedMember && selectedMember.id === memberId) {
        // Update selected member's ban status in sidebar
        setSelectedMember(prev => prev ? { ...prev, is_banned: true, ban_reason: { String: t('members_manage.default_ban_reason'), Valid: true } } : null);
      }
    } catch (error) {
      console.error("Failed to ban member:", error);
      toast({
        title: tCommon('toast.error'),
        description: t('members_manage.toast.ban_error'),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCommunityId, selectedMember, toast, fetchCommunityMembers, fetchPendingMembers, t, tCommon]);

  const handleSelectMember = useCallback((member: User) => {
    setSelectedMember(member);
  }, []);

  const handleCloseMemberDetails = useCallback(() => {
    setSelectedMember(null);
  }, []);

  return (
    <div className="flex min-h-screen" data-primary-content>
      <div className="flex-1 container mx-auto py-8 pr-4" data-scroll-anchor>
        <h1 className="text-3xl font-bold text-glow mb-6">
          {t('members_manage.page_title')}
        </h1>

        {isLoading ? (
          <GlassCard className="p-6 text-center">
            <Icons.spinner className="mr-2 h-6 w-6 animate-spin inline-block" />{' '}
            {t('members_manage.loading')}
          </GlassCard>
        ) : adminCommunities.length === 0 ? (
          <GlassCard className="p-6 text-center">
            {t('members_manage.no_admin')}
          </GlassCard>
        ) : (
          <div className="space-y-8">
            <CommunitySelector
              adminCommunities={adminCommunities}
              selectedCommunityId={selectedCommunityId}
              setSelectedCommunityId={setSelectedCommunityId}
              isUpdating={isUpdating}
            />

            {selectedCommunityId && (
              <>
                <MemberList
                  title={t('members_manage.active_title')}
                  members={activeMembers}
                  isUpdating={isUpdating}
                  onRoleChange={handleRoleChange}
                  onRemoveMember={handleRemoveMember}
                  onSelectMember={handleSelectMember}
                  currentUserId={user?.id}
                  viewerRole={currentUserRoleForSelectedCommunity}
                />

                <MemberList
                  title={t('members_manage.pending_title')}
                  members={pendingMembers}
                  isUpdating={isUpdating}
                  onRemoveMember={handleRemoveMember}
                  onApproveMember={handleApproveMember}
                  onSelectMember={handleSelectMember}
                  currentUserId={user?.id}
                  isPending={true}
                  viewerRole={currentUserRoleForSelectedCommunity}
                />
              </>
            )}
          </div>
        )}
      </div>
      {selectedMember && (
        <MemberDetailSidebar
          member={selectedMember}
          onClose={handleCloseMemberDetails}
          onRoleChange={handleRoleChange}
          onRemoveMember={handleRemoveMember}
          onBanMember={handleBanMember}
          isUpdating={isUpdating}
          currentUserId={user?.id}
          selectedCommunityId={selectedCommunityId}
          currentUserRole={currentUserRoleForSelectedCommunity}
        />
      )}
    </div>
  );
}