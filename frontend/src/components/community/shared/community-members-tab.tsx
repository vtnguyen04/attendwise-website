'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import apiClient from '@/lib/api-client';
import MemberList from './member-list';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getNullableStringValue } from '@/lib/utils';
import { format } from 'date-fns';

interface CommunityMembersTabProps {
  communityId: string;
}

const getInitials = (name: User['name']) => {
  if (name) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('');
  }
  return 'U';
};

export function CommunityMembersTab({ communityId }: CommunityMembersTabProps) {
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/v1/communities/${communityId}/members`);
      setMembers(response.data.members || []);
    } catch (error: any) {
      console.error("Failed to fetch members", error);
      setError(error.response?.data?.error || "Failed to load members.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [communityId]);

  const handleRoleChange = (memberId: string, newRole: "member" | "moderator") => {
    // TODO: Implement role change functionality
    console.log(`Change role of member ${memberId} to ${newRole}`);
  };

  const handleRemoveMember = (memberId: string) => {
    // TODO: Implement remove member functionality
    console.log(`Remove member ${memberId}`);
  };

  const handleSelectMember = (member: User) => {
    setSelectedMember(member);
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading members...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <>
      <MemberList
        title={`Community Members (${members.length})`}
        members={members}
        isUpdating={false} // TODO: Implement isUpdating state
        onRoleChange={handleRoleChange}
        onRemoveMember={handleRemoveMember}
        onSelectMember={handleSelectMember}
      />
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="dialog-glass">
            <DialogHeader>
              <DialogTitle>{selectedMember.name || 'Unnamed User'}</DialogTitle>
              <DialogDescription>
                {getNullableStringValue(selectedMember.position)}
                {getNullableStringValue(selectedMember.company) && ` at ${getNullableStringValue(selectedMember.company)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center text-center gap-2 p-4">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={getNullableStringValue(selectedMember.profile_picture_url)} alt={`${(selectedMember.name || 'User')}'s profile picture`} />
                <AvatarFallback className="text-4xl">{getInitials(selectedMember.name)}</AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                {selectedMember.is_verified && <Badge variant="success">Verified</Badge>}
                {selectedMember.is_banned && <Badge variant="destructive">Banned</Badge>}
                {selectedMember.role && <Badge variant="secondary">{selectedMember.role}</Badge>}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                <p>{selectedMember.email}</p>
                {getNullableStringValue(selectedMember.location) && <p>{getNullableStringValue(selectedMember.location)}</p>}
              </div>
              {getNullableStringValue(selectedMember.bio) && <p className="mt-4 text-center">{getNullableStringValue(selectedMember.bio)}</p>}
              <div className="text-xs text-muted-foreground mt-4">
                <p>Joined: {format(new Date(selectedMember.created_at), 'PPP')}</p>
                {selectedMember.last_login_at?.Valid && <p>Last seen: {format(new Date(selectedMember.last_login_at.Time), 'PPP p')}</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}