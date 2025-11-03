'use client';

import { useMemo, useState, type ElementType } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Post } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import { getNullableStringValue } from '@/lib/utils';
import UserPosts from '@/components/profile/user-posts';
import Link from 'next/link';
import Mail from 'lucide-react/icons/mail';
import Building from 'lucide-react/icons/building';
import Briefcase from 'lucide-react/icons/briefcase';
import MapPin from 'lucide-react/icons/map-pin';
import Calendar from 'lucide-react/icons/calendar';
import Flame from 'lucide-react/icons/flame';
import UserPlus from 'lucide-react/icons/user-plus';
import UserMinus from 'lucide-react/icons/user-minus';
import Settings from 'lucide-react/icons/settings';
import Shield from 'lucide-react/icons/shield';

import UserExperience from '@/components/profile/user-experience';
import UserEducation from '@/components/profile/user-education';
import UserSkills from '@/components/profile/user-skills';
import type { UserExperience as UserExperienceType, UserEducation as UserEducationType, UserSkill as UserSkillType } from '@/lib/types';

import { useTranslation } from '@/hooks/use-translation';

interface ProfileClientPageProps {
  profileUser: User;
  currentUser: User | null;
  posts: Post[];
  isFollowing: boolean;
  experience: UserExperienceType[];
  education: UserEducationType[];
  skills: UserSkillType[];
}

export default function ProfileClientPage({
  profileUser,
  currentUser,
  posts,
  isFollowing: initialIsFollowing,
  experience,
  education,
  skills
}: ProfileClientPageProps) {
  const { t } = useTranslation('user_profile');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const displayName = profileUser?.name?.trim() || t('member');
  const displayInitial = displayName.charAt(0).toUpperCase();
  const isOwnProfile = currentUser?.id === profileUser?.id;
  const bio = getNullableStringValue(profileUser?.bio) || t('no_bio');
  const location = getNullableStringValue(profileUser?.location);
  const company = getNullableStringValue(profileUser?.company);
  const position = getNullableStringValue(profileUser?.position);
  const joinedAt = new Date(profileUser?.created_at ?? '').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  });
  
  const roleLabel = useMemo(() => {
    const position = getNullableStringValue(profileUser?.position);
    if (position) return position;
    const roleMap: Record<string, string> = {
      community_admin: t('community_admin'),
      moderator: t('moderator'),
      member: t('member'),
      pending: t('pending_member'),
    };
    if (profileUser?.role) {
      return roleMap[profileUser.role] ?? profileUser.role.replace(/_/g, ' ');
    }
    return null;
  }, [profileUser, t]);

  const followMutation = useMutation({
    mutationFn: () => apiClient.post(`/users/${profileUser.id}/follow`),
    onSuccess: () => {
      setIsFollowing(true);
      toast({ title: t('toast_success'), description: t('follow_success', { displayName }) });
      queryClient.invalidateQueries({ queryKey: ['user', profileUser.id] });
      queryClient.invalidateQueries({ queryKey: ['relationship', profileUser.id] });
    },
    onError: () => {
      toast({ title: t('toast_error'), description: t('follow_error'), variant: 'destructive' });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiClient.delete(`/users/${profileUser.id}/follow`),
    onSuccess: () => {
      setIsFollowing(false);
      toast({ title: t('toast_success'), description: t('unfollow_success', { displayName }) });
      queryClient.invalidateQueries({ queryKey: ['user', profileUser.id] });
      queryClient.invalidateQueries({ queryKey: ['relationship', profileUser.id] });
    },
    onError: () => {
      toast({ title: t('toast_error'), description: t('unfollow_error'), variant: 'destructive' });
    },
  });

  const handleFollow = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Header Section */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-background sm:h-64">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      <div className="container relative mx-auto -mt-24 px-4 pb-12 sm:-mt-32 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Sidebar - Profile Card */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-24">
              <Card className="overflow-hidden border-border/40 bg-card/95 shadow-2xl backdrop-blur-xl transition-all hover:shadow-3xl">
                <CardContent className="p-0">
                  {/* Profile Header */}
                  <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-8 pb-6">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <Avatar className="h-24 w-24 border-3 border-background shadow-xl ring-2 ring-primary/10">
                          <AvatarImage src={getNullableStringValue(profileUser.profile_picture_url)} alt={displayName} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-3xl font-bold text-primary-foreground">
                            {displayInitial}
                          </AvatarFallback>
                        </Avatar>
                        {roleLabel && (
                          <Badge 
                            variant="outline" 
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-primary/40 bg-background/95 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary shadow-md backdrop-blur"
                          >
                            {roleLabel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="space-y-6 p-6">
                    <div className="text-center">
                      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
                      <p className="text-sm leading-relaxed text-muted-foreground">{bio}</p>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard icon={Flame} label={t('posts')} value={String(posts.length)} />
                      <StatCard icon={Calendar} label={t('joined')} value={joinedAt} />
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {isOwnProfile ? (
                        <>
                          <Button 
                            variant="default" 
                            asChild 
                            className="w-full rounded-xl shadow-lg transition-all hover:shadow-xl"
                          >
                            <Link href="/dashboard/settings" className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              {t('edit_profile')}
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            asChild 
                            className="w-full rounded-xl"
                          >
                            <Link href="/dashboard/settings/security" className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              {t('security')}
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={handleFollow}
                          disabled={followMutation.isPending || unfollowMutation.isPending}
                          className="w-full rounded-xl shadow-lg transition-all hover:shadow-xl"
                          variant={isFollowing ? "outline" : "default"}
                        >
                          {isFollowing ? (
                            <>
                              <UserMinus className="mr-2 h-4 w-4" />
                              {t('unfollow')}
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              {t('follow')}
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Contact Information */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Contact Information
                      </h3>
                      <ProfileInfoCompact icon={Mail} value={profileUser.email} />
                      {company && <ProfileInfoCompact icon={Building} value={company} />}
                      {location && <ProfileInfoCompact icon={MapPin} value={location} />}
                      {position && <ProfileInfoCompact icon={Briefcase} value={position} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="space-y-6">
              {/* Experience Section */}
              {experience && experience.length > 0 && (
                <Section title={t('experience')} icon={Briefcase}>
                  <UserExperience experience={experience} isOwnProfile={isOwnProfile} />
                </Section>
              )}

              {/* Education Section */}
              {education && education.length > 0 && (
                <Section title={t('education')} icon={Building}>
                  <UserEducation education={education} isOwnProfile={isOwnProfile} />
                </Section>
              )}

              {/* Skills Section */}
              {skills && skills.length > 0 && (
                <Section title={t('skills')} icon={Flame}>
                  <UserSkills skills={skills} isOwnProfile={isOwnProfile} />
                </Section>
              )}

              {/* Activity Section */}
              <Section 
                title={t('activity')} 
                icon={Flame}
                description={t('activity_description', { displayName: isOwnProfile ? t('you') : displayName })}
              >
                <UserPosts posts={posts} isOwnProfile={isOwnProfile} />
              </Section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ 
  title, 
  icon: Icon, 
  description, 
  children 
}: { 
  title: string; 
  icon: ElementType; 
  description?: string; 
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/40 bg-card/95 shadow-lg backdrop-blur-xl">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <Separator className="mb-6 bg-border/50" />
        {children}
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: ElementType; 
  label: string; 
  value: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-muted/50 to-muted/30 p-4 transition-all hover:border-primary/40 hover:shadow-lg">
      <div className="absolute right-2 top-2 opacity-10 transition-opacity group-hover:opacity-20">
        <Icon className="h-8 w-8" />
      </div>
      <div className="relative">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ProfileInfoCompact({ 
  icon: Icon, 
  value 
}: { 
  icon: ElementType; 
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/30 p-3 text-sm transition-colors hover:bg-muted/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground/90">{value}</span>
    </div>
  );
}