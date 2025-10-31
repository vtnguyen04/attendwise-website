'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Community } from '@/lib/types';
import {User as user} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { InviteMemberModal } from '@/components/community/shared/invite-member-modal';
import MoreHorizontal from 'lucide-react/icons/more-horizontal';
import UserX from 'lucide-react/icons/user-x';
import ShieldCheck from 'lucide-react/icons/shield-check';
import { User } from 'lucide-react';
import UserPlus from 'lucide-react/icons/user-plus';

import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useParams } from 'next/navigation';
import { getNullableStringValue } from '@/lib/utils';

export interface Member extends user {
  role: 'community_admin' | 'moderator' | 'member';
}

export default function ManageMembersPage() {
  const params = useParams();
  const communityId = params.id as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [communityOwnerId, setCommunityOwnerId] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<Member | null>(null);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchMembersAndCommunity = useCallback(async () => {
    setIsLoading(true);
    try {
      const [membersRes, communityRes] = await Promise.all([
        apiClient.get(`/api/v1/communities/${communityId}/members`),
        apiClient.get(`/api/v1/communities/${communityId}`),
      ]);
      setMembers(membersRes.data.members || []);
      const community: Community = communityRes.data.community;
      setCommunityOwnerId(community.owner_id);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch members.',
        variant: 'destructive',
      });

    } finally {
      setIsLoading(false);
    }
  }, [communityId, toast]);

  useEffect(() => {
    fetchMembersAndCommunity();
  }, [fetchMembersAndCommunity]);

  const handleRoleChange = async (userId: string, role: 'moderator' | 'member') => {
    try {
      await apiClient.patch(`/api/v1/communities/${communityId}/members/${userId}`, { role });
      toast({ title: 'Success', description: "Member's role has been updated." });
      fetchMembersAndCommunity(); // Refetch to update the UI
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update role.', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async () => {
    if (!userToRemove) return;
    try {
      await apiClient.delete(`/api/v1/communities/${communityId}/members/${userToRemove.id}`);
      toast({ title: 'Success', description: `${userToRemove.name} has been removed.` });
      setMembers(prev => prev.filter(member => member.id !== userToRemove.id));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove member.', variant: 'destructive' });
    } finally {
      setUserToRemove(null);
    }
  };

  const MemberSkeleton = () => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  );

  return (
    <>
      <InviteMemberModal 
        communityId={communityId}
        open={isInviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Manage Members</CardTitle>
            <CardDescription>Assign roles to members or remove them from the community.</CardDescription>
          </div>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoading ? (
              <div className="space-y-4">
                <MemberSkeleton />
                <MemberSkeleton />
                <MemberSkeleton />
              </div>
            ) : members.map(member => {
              const memberName = member.name || 'Unnamed Member';
              const memberAvatar = getNullableStringValue(member.profile_picture_url);

              return (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                          src={memberAvatar} 
                          alt={memberName}
                      />
                      <AvatarFallback>
                          {memberName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                  </Avatar>
                  <div>
                      <p className="font-semibold">
                          {memberName}
                      </p>
                      <p className="text-sm capitalize text-muted-foreground">
                          {(member.role || '').replace('community_', '')}
                      </p>
                  </div>
                </div>
                  {member.id !== communityOwnerId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            <span>Change Role</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'moderator')}>
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Moderator
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'member')}>
                                <User className="mr-2 h-4 w-4" />
                                Member
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setUserToRemove(member)}>
                          <UserX className="mr-2 h-4 w-4" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-bold">{userToRemove?.name || 'the selected user'}</span> from the community. They will need to request to join again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
