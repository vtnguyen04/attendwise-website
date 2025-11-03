'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';
import apiClient from '@/lib/api-client';
import MemberList from './member-list';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getNullableStringValue } from '@/lib/utils';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';

interface CommunityMembersTabProps {
  communityId: string;
}

const getInitials = (name: User['name']) => {
  if (name) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('');
  }
  return 'U';
};

import { useCommunityAuth } from '@/hooks/use-community-auth';

import { useUser } from '@/context/user-provider';
import { Community } from '@/lib/types';

export function CommunityMembersTab({ communityId }: CommunityMembersTabProps) {
  const [members, setMembers] = useState<User[]>([]);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const { t } = useTranslation('community');
  const { user: currentUser } = useUser();
  const { viewerRole } = useCommunityAuth({ community, currentUser });

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/communities/${communityId}/members`);
      setMembers(response.data.members || []);
    } catch (error: unknown) {
      console.error("Failed to fetch members", error);
      setError((error as { response?: { data?: { error?: string } } })?.response?.data?.error || t('members.load_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [communityId, setMembers, setIsLoading, setError, t]);

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const response = await apiClient.get(`/communities/${communityId}`);
        setCommunity(response.data.community);
      } catch (error) {
        console.error("Failed to fetch community", error);
      }
    };

    fetchCommunity();
    fetchMembers();
  }, [communityId, fetchMembers]);

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
    return <div className="text-center py-10">{t('members.loading')}</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{t('error')}: {error}</div>;
  }

  return (
    <>
      <MemberList
        title={t('members.title', { count: members.length })}
        members={members}
        isUpdating={false} // TODO: Implement isUpdating state
        onRoleChange={handleRoleChange}
        onRemoveMember={handleRemoveMember}
        onSelectMember={handleSelectMember}
        viewerRole={viewerRole}
      />
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedMember.name || t('members.unnamed_user')}</DialogTitle>
              <DialogDescription>
                {getNullableStringValue(selectedMember.position)}
                {getNullableStringValue(selectedMember.company) && ` ${t('members.at')} ${getNullableStringValue(selectedMember.company)}`}
              </DialogDescription>
            </DialogHeader>
            <Card className="border-none shadow-none">
              <CardContent className="text-center space-y-4">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={getNullableStringValue(selectedMember.profile_picture_url)} alt={`${(selectedMember.name || 'User')}'s profile picture`} />
                  <AvatarFallback className="text-4xl">{getInitials(selectedMember.name)}</AvatarFallback>
                </Avatar>
                <div className="flex justify-center gap-2 pt-2">
                  {selectedMember.is_verified && <Badge variant="success">{t('members.verified')}</Badge>}
                  {selectedMember.is_banned && <Badge variant="destructive">{t('members.banned')}</Badge>}
                  {selectedMember.role && <Badge variant="secondary">{selectedMember.role}</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>{selectedMember.email}</p>
                  {getNullableStringValue(selectedMember.location) && <p>{getNullableStringValue(selectedMember.location)}</p>}
                </div>
                {getNullableStringValue(selectedMember.bio) && <p className="text-center">{getNullableStringValue(selectedMember.bio)}</p>}
              </CardContent>
              <CardFooter className="flex-col items-center text-xs text-muted-foreground">
                <p>{selectedMember.created_at ? t('members.joined', { date: format(new Date(selectedMember.created_at), 'PPP') }) : t('members.joined_date_unknown')}</p>
                {selectedMember.last_login_at?.Valid && <p>{t('members.last_seen', { date: format(new Date(selectedMember.last_login_at.Time), 'PPP p') })}</p>}
              </CardFooter>
            </Card>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}