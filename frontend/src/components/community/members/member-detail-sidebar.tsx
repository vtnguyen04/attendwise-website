import React, { useState } from 'react';
import { User } from '@/lib/types';
import { GlassCard } from '@/components/ui/glass-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getNullableStringValue } from '@/lib/utils';
import { Icons } from '@/components/ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import UserPostsModal from "@/components/profile/user-posts-modal"; // Import the new modal component

interface MemberDetailSidebarProps {
  member: User;
  onClose: () => void;
  onRoleChange: (memberId: string, newRole: 'member' | 'moderator') => void;
  onRemoveMember: (memberId: string) => void;
  onBanMember: (memberId: string) => void;
  isUpdating: boolean;
  currentUserId?: string;
  currentUserRole?: 'community_admin' | 'moderator' | 'member' | 'pending'; // Add currentUserRole
  selectedCommunityId: string; // New prop
}

export default function MemberDetailSidebar({
  member,
  onClose,
  onRoleChange,
  onRemoveMember,
  onBanMember,
  isUpdating,
  currentUserId,
  currentUserRole,
  selectedCommunityId,
}: MemberDetailSidebarProps) {
  const isSelf = member.id === currentUserId;
  const isBanned = member.is_banned;
  const [isPostsModalOpen, setIsPostsModalOpen] = useState(false);

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background/80 backdrop-blur-lg border-l border-border z-50 p-6 shadow-lg overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-glow">Member Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <Icons.close className="h-5 w-5" />
        </Button>
      </div>

      <GlassCard className="p-4 mb-6 text-center">
        <Avatar className="h-24 w-24 mx-auto mb-4 shadow-glass">
          <AvatarImage
            src={getNullableStringValue(member.profile_picture_url) || undefined}
          />
          <AvatarFallback>{member.name?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <h3 className="text-lg font-medium">{member.name}</h3>
        <p className="text-sm text-muted-foreground">{member.email}</p>
        {member.role && ( // Display role if available
          <p className="text-xs text-primary mt-1 capitalize">{member.role.replace('_', ' ')}</p>
        )}
      </GlassCard>

      <div className="space-y-4 text-sm text-muted-foreground">
        {member.company && (
          <p><strong>Company:</strong> {getNullableStringValue(member.company)}</p>
        )}
        {member.position && (
          <p><strong>Position:</strong> {getNullableStringValue(member.position)}</p>
        )}
        {member.bio && (
          <p><strong>Bio:</strong> {getNullableStringValue(member.bio)}</p>
        )}
        {member.location && (
          <p><strong>Location:</strong> {getNullableStringValue(member.location)}</p>
        )}
        <p><strong>Joined:</strong> {new Date(member.created_at).toLocaleDateString()}</p>
        {isBanned && (
          <p className="text-destructive"><strong>Banned:</strong> {getNullableStringValue(member.ban_reason) || 'Yes'}</p>
        )}
        {member.banned_until && member.banned_until.Valid && (
          <p className="text-destructive"><strong>Banned Until:</strong> {new Date(member.banned_until.Time).toLocaleDateString()}</p>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-4 space-y-2">
        <h4 className="text-md font-semibold">Actions</h4>
        {!isSelf && ( // Cannot perform actions on self
          <>
            <Select
              onValueChange={(value: 'member' | 'moderator') => onRoleChange(member.id, value)}
              value={member.role || 'member'}
              disabled={isUpdating}
            >
              <SelectTrigger className="liquid-glass-input w-full">
                <SelectValue placeholder="Change Role" />
              </SelectTrigger>
              <SelectContent className="liquid-glass-nav">
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>

            {!isBanned && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="liquid-glass-button w-full"
                    disabled={isUpdating}
                  >
                    {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    Ban Member
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="dialog-glass">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will ban {member.name} from the community. They will no longer be able to participate.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="liquid-glass-button">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onBanMember(member.id)}
                      className="liquid-glass-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm Ban
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="liquid-glass-button w-full"
                  disabled={isUpdating}
                >
                  {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Remove Member
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="dialog-glass">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently remove {member.name} from the community.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="liquid-glass-button">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onRemoveMember(member.id)}
                    className="liquid-glass-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isUpdating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={() => setIsPostsModalOpen(true)}
              className="liquid-glass-button w-full mt-2"
              disabled={isUpdating}
            >
              View Posts
            </Button>
          </>
        )}
      </div>

      {isPostsModalOpen && (
        <UserPostsModal
          isOpen={isPostsModalOpen}
          onClose={() => setIsPostsModalOpen(false)}
          member={member}
          selectedCommunityId={selectedCommunityId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
