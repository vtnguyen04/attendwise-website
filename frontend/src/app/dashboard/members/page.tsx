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
import MemberList from "@/components/member-list";

export default function CommunityMembersPage() {
  const { user } = useUser();
  const { toast } = useToast();
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
    console.log("DEBUG: Current User ID:", user.id);
    console.log("DEBUG: Selected Community ID:", selectedCommunityId);
    console.log("DEBUG: Admin Communities (filtered for selected):");
    adminCommunities.filter(comm => comm.id === selectedCommunityId).forEach(comm => console.log(comm));
    console.log("DEBUG: Current User Role for Selected Community:", community?.role);
    return community?.role;
  }, [user, selectedCommunityId, adminCommunities]);

  const fetchAdminCommunities = useCallback(async () => {
    try {
      const response = await apiClient.get("/api/v1/my-communities");
      const communities = response.data.communities.filter(
        (comm: Community) => comm.role === "community_admin"
      );
      setAdminCommunities(communities);
      if (communities.length > 0) {
        setSelectedCommunityId(communities[0].id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch communities.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchCommunityMembers = useCallback(async (communityId: string) => {
    try {
      const response = await apiClient.get(
        `/api/v1/communities/${communityId}/members`
      );
      const membersWithRoles = (response.data.members || []).map((member: User) => ({
        ...member,
        role: member.role || 'member' // Default to 'member' if not provided by API
      }));
      setActiveMembers(membersWithRoles);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch active members.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchPendingMembers = useCallback(async (communityId: string) => {
    try {
      const response = await apiClient.get(
        `/api/v1/communities/${communityId}/members/pending`
      );
      const membersWithRoles = (response.data.members || []).map((member: User) => ({
        ...member,
        role: member.role || 'pending' // Default to 'pending' for pending members
      }));
      setPendingMembers(membersWithRoles);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch pending members.",
        variant: "destructive",
      });
    }
  }, [toast]);

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
        `/api/v1/communities/${selectedCommunityId}/members/${memberId}`,
        { role: newRole }
      );
      toast({ title: "Success", description: "Member role updated." });
      fetchCommunityMembers(selectedCommunityId); // Refresh list
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember(prev => prev ? { ...prev, role: newRole } : null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update member role.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCommunityId, selectedMember, toast, fetchCommunityMembers]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    if (!selectedCommunityId) return;
    setIsUpdating(true);
    try {
      await apiClient.delete(
        `/api/v1/communities/${selectedCommunityId}/members/${memberId}`
      );
      toast({ title: "Success", description: "Member removed." });
      fetchCommunityMembers(selectedCommunityId); // Refresh list
      fetchPendingMembers(selectedCommunityId); // Also check pending if they were there
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember(null); // Close sidebar if removed member was selected
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCommunityId, selectedMember, toast, fetchCommunityMembers, fetchPendingMembers]);

  const handleApproveMember = useCallback(async (memberId: string) => {
    if (!selectedCommunityId) return;
    setIsUpdating(true);
    try {
      await apiClient.post(
        `/api/v1/communities/${selectedCommunityId}/members/${memberId}/approve`
      );
      toast({ title: "Success", description: "Member approved." });
      fetchPendingMembers(selectedCommunityId); // Refresh pending list
      fetchCommunityMembers(selectedCommunityId); // Refresh active list
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember(null); // Close sidebar if approved member was selected (they move to active)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve member.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCommunityId, selectedMember, toast, fetchPendingMembers, fetchCommunityMembers]);

  const handleBanMember = useCallback(async (memberId: string) => {
    if (!selectedCommunityId) return; // Ban is a community-specific action in this context
    setIsUpdating(true);
    try {
      // For simplicity, a basic ban without reason/duration for now
      await apiClient.post(`/api/v1/users/${memberId}/ban`, {}); 
      toast({ title: "Success", description: "Member banned." });
      // Refresh all lists to reflect ban status
      fetchCommunityMembers(selectedCommunityId);
      fetchPendingMembers(selectedCommunityId);
      if (selectedMember && selectedMember.id === memberId) {
        // Update selected member's ban status in sidebar
        setSelectedMember(prev => prev ? { ...prev, is_banned: true, ban_reason: { String: "Banned by admin", Valid: true } } : null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ban member.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedCommunityId, selectedMember, toast, fetchCommunityMembers, fetchPendingMembers]);

  const handleSelectMember = useCallback((member: User) => {
    setSelectedMember(member);
  }, []);

  const handleCloseMemberDetails = useCallback(() => {
    setSelectedMember(null);
  }, []);

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 container mx-auto py-8 pr-4">
        <h1 className="text-3xl font-bold text-glow mb-6">
          Community Member Management
        </h1>

        {isLoading ? (
          <GlassCard className="p-6 text-center">
            <Icons.spinner className="mr-2 h-6 w-6 animate-spin inline-block" />{" "}
            Loading communities...
          </GlassCard>
        ) : adminCommunities.length === 0 ? (
          <GlassCard className="p-6 text-center">
            You don't administer any communities.
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
                  title="Active Members"
                  members={activeMembers}
                  isUpdating={isUpdating}
                  onRoleChange={handleRoleChange}
                  onRemoveMember={handleRemoveMember}
                  onSelectMember={handleSelectMember}
                  currentUserId={user?.id}
                />

                <MemberList
                  title="Pending Join Requests"
                  members={pendingMembers}
                  isUpdating={isUpdating}
                  onRemoveMember={handleRemoveMember}
                  onApproveMember={handleApproveMember}
                  onSelectMember={handleSelectMember}
                  currentUserId={user?.id}
                  isPending={true}
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
