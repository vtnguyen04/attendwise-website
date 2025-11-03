'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Community } from '@/lib/types';
import {User as user} from '@/lib/types';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { InviteMemberModal } from '@/components/community/shared/invite-member-modal';
import MoreHorizontal from 'lucide-react/icons/more-horizontal';
import UserX from 'lucide-react/icons/user-x';
import ShieldCheck from 'lucide-react/icons/shield-check';
import { User } from 'lucide-react';
import UserPlus from 'lucide-react/icons/user-plus';
import Users from 'lucide-react/icons/users';
import Crown from 'lucide-react/icons/crown';
import AlertCircle from 'lucide-react/icons/alert-circle';

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
  DropdownMenuSeparator,
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
import { useTranslation } from '@/hooks/use-translation';
import { Trans } from 'react-i18next';

export interface Member extends user {
  role: 'community_admin' | 'moderator' | 'member';
}

const getRoleBadge = (role: string, t: (key: string) => string) => {
  const roleText = (role || '').replace('community_', '');
  const roleColors = {
    admin: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400',
    moderator: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-600 dark:text-blue-400',
    member: 'from-muted/50 to-muted/30 border-border/50 text-muted-foreground',
  };
  
  const colorClass = role.includes('admin') ? roleColors.admin : role === 'moderator' ? roleColors.moderator : roleColors.member;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gradient-to-r ${colorClass} border backdrop-blur-sm`}>
      {role.includes('admin') && <Crown className="h-3 w-3" />}
      {role === 'moderator' && <ShieldCheck className="h-3 w-3" />}
      {roleText === 'admin' ? t('admin.manage_members.owner_badge') : roleText === 'moderator' ? t('admin.manage_members.role_moderator') : t('admin.manage_members.role_member')}
    </div>
  );
};

export default function ManageMembersPage() {
  const params = useParams();
  const communityId = params.id as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [communityOwnerId, setCommunityOwnerId] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<Member | null>(null);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('community');

  const fetchMembersAndCommunity = useCallback(async () => {
    setIsLoading(true);
    try {
      const [membersRes, communityRes] = await Promise.all([
        apiClient.get(`/communities/${communityId}/members`),
        apiClient.get(`/communities/${communityId}`),
      ]);
      setMembers(membersRes.data.members || []);
      const community: Community = communityRes.data.community;
      setCommunityOwnerId(community.owner_id);
    } catch {
      toast({
        title: t('error'),
        description: t('admin.manage_members.toast.fetch_error'),
        variant: 'destructive',
      });

    } finally {
      setIsLoading(false);
    }
  }, [communityId, toast, t]);

  useEffect(() => {
    fetchMembersAndCommunity();
  }, [fetchMembersAndCommunity]);

  const handleRoleChange = async (userId: string, role: 'moderator' | 'member') => {
    try {
      await apiClient.patch(`/communities/${communityId}/members/${userId}`, { role });
      toast({ title: t('toast.success'), description: t('admin.manage_members.toast.role_update_success') });
      fetchMembersAndCommunity();
    } catch {
    }
  };

  const handleRemoveMember = async () => {
    if (!userToRemove) return;
    try {
      await apiClient.delete(`/communities/${communityId}/members/${userToRemove.id}`);
      toast({ title: t('toast.success'), description: t('admin.manage_members.toast.remove_success', { userName: userToRemove.name }) });
      setMembers(prev => prev.filter(member => member.id !== userToRemove.id));
    } catch {
      toast({ title: t('error'), description: t('admin.manage_members.toast.remove_error'), variant: 'destructive' });
    } finally {
      setUserToRemove(null);
    }
  };

  const MemberSkeleton = () => (
    <div className="dashboard-mini-card p-5">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full bg-gradient-to-br from-muted/60 to-muted/30" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32 rounded-lg bg-muted/50" />
                    <Skeleton className="h-4 w-20 rounded-full bg-muted/40" />
                </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-xl bg-muted/50" />
        </div>
    </div>
  );

  return (
    <>
      <InviteMemberModal 
        communityId={communityId}
        open={isInviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />
      
      <div className="dashboard-panel overflow-hidden">
        <div className="relative px-8 py-8 border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm shadow-lg shadow-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {t('admin.manage_members.title')}
                </h2>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                {t('admin.manage_members.description')}
              </p>
            </div>
            <Button 
              onClick={() => setInviteModalOpen(true)}
              className="cta-button gap-2 font-semibold shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              <UserPlus className="h-5 w-5" />
              {t('admin.manage_members.invite_button')}
            </Button>
          </div>
        </div>
        
        <div className="p-8">
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <MemberSkeleton key={i} />)}
              </div>
            ) : members.length === 0 ? (
              <div className="dashboard-panel-muted text-center py-20 rounded-2xl border-2 border-dashed border-border/50">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm shadow-lg">
                    <Users className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{t('admin.manage_members.no_members_title')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {t('admin.manage_members.no_members_description')}
                </p>
                <Button 
                  onClick={() => setInviteModalOpen(true)}
                  className="cta-button gap-2 font-semibold shadow-lg hover:shadow-xl"
                >
                  <UserPlus className="h-5 w-5" />
                  {t('admin.manage_members.invite_first_button')}
                </Button>
              </div>
            ) : (
              members.map(member => {
                const memberName = member.name || 'Unnamed Member';
                const memberAvatar = getNullableStringValue(member.profile_picture_url);
                const isOwner = member.id === communityOwnerId;

                return (
                  <div 
                    key={member.id} 
                    className="feed-card p-5 group transition-all duration-300"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="relative">
                          <Avatar className="h-14 w-14 border-2 border-border/50 shadow-lg transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-xl group-hover:scale-105">
                            <AvatarImage 
                              src={memberAvatar} 
                              alt={memberName}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold">
                              {memberName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isOwner && (
                            <div className="absolute -top-1 -right-1 p-1 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/50">
                              <Crown className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors duration-300">
                              {memberName}
                            </p>
                            {isOwner && (
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                {t('admin.manage_members.owner_badge')}
                              </span>
                            )}
                          </div>
                          {getRoleBadge(member.role, t)}
                        </div>
                      </div>
                      
                      {!isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="liquid-glass-button h-10 w-10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end"
                            className="w-56 dashboard-panel-muted border-border/50 backdrop-blur-xl"
                          >
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="cursor-pointer rounded-lg py-3 px-3 font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 rounded-lg bg-primary/10">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                  </div>
                                  {t('admin.manage_members.change_role_button')}
                                </div>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent className="dashboard-panel-muted border-border/50 backdrop-blur-xl">
                                  <DropdownMenuItem 
                                    onClick={() => handleRoleChange(member.id, 'moderator')}
                                    className="cursor-pointer rounded-lg py-3 px-3 font-medium focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                                        <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      {t('admin.manage_members.role_moderator')}
                                    </div>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleRoleChange(member.id, 'member')}
                                    className="cursor-pointer rounded-lg py-3 px-3 font-medium focus:bg-primary/10 focus:text-primary"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-1.5 rounded-lg bg-primary/10">
                                        <User className="h-4 w-4 text-primary" />
                                      </div>
                                      {t('admin.manage_members.role_member')}
                                    </div>
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            
                            <DropdownMenuSeparator className="bg-border/50" />
                            
                            <DropdownMenuItem 
                              onClick={() => setUserToRemove(member)}
                              className="cursor-pointer rounded-lg py-3 px-3 font-medium focus:bg-destructive/10 focus:text-destructive"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-destructive/10">
                                  <UserX className="h-4 w-4 text-destructive" />
                                </div>
                                {t('admin.manage_members.remove_member_button')}
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent className="dashboard-panel max-w-lg border-destructive/20">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10 backdrop-blur-sm">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-2xl">{t('admin.manage_members.remove_dialog_title')}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed">
              <Trans
                i18nKey="admin.manage_members.remove_dialog_description"
                values={{ userName: userToRemove?.name || t('members.unnamed_user') }}
                components={{ 1: <span className="font-bold text-foreground" /> }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-6 border-t border-border/30">
            <AlertDialogCancel className="liquid-glass-button font-semibold">
              {t('admin.manage_members.remove_dialog_cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMember} 
              className="bg-gradient-to-br from-destructive to-destructive/90 text-destructive-foreground font-semibold shadow-lg shadow-destructive/30 hover:shadow-xl hover:shadow-destructive/40 hover:scale-102 transition-all duration-300"
            >
              <UserX className="h-4 w-4 mr-2" />
              {t('admin.manage_members.remove_dialog_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}