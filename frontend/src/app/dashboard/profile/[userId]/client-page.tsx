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

interface ProfileClientPageProps {
  profileUser: User;
  currentUser: User | null;
  posts: Post[];
  isFollowing: boolean;
}

export default function ProfileClientPage({ profileUser, currentUser, posts, isFollowing: initialIsFollowing }: ProfileClientPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const displayName = profileUser?.name?.trim() || 'Member';
  const displayInitial = displayName.charAt(0).toUpperCase();
  const isOwnProfile = currentUser?.id === profileUser?.id;
  const bio = getNullableStringValue(profileUser?.bio) || 'No bio provided yet.';
  const location = getNullableStringValue(profileUser?.location);
  const company = getNullableStringValue(profileUser?.company);
  const position = getNullableStringValue(profileUser?.position);
  const joinedAt = new Date(profileUser?.created_at ?? '').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  });
  const roleLabel = useMemo(() => {
    if (position) return position;
    const roleMap: Record<string, string> = {
      community_admin: 'Community Admin',
      moderator: 'Moderator',
      member: 'Member',
      pending: 'Pending Member',
    };
    if (profileUser?.role) {
      return roleMap[profileUser.role] ?? profileUser.role.replace(/_/g, ' ');
    }
    return null;
  }, [position, profileUser?.role]);

  const followMutation = useMutation({
    mutationFn: () => apiClient.post(`/api/v1/users/${profileUser.id}/follow`),
    onSuccess: () => {
      setIsFollowing(true);
      toast({ title: 'Success', description: `You are now following ${displayName}.` });
      queryClient.invalidateQueries({ queryKey: ['user', profileUser.id] });
      queryClient.invalidateQueries({ queryKey: ['relationship', profileUser.id] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Could not follow user.', variant: 'destructive' });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/users/${profileUser.id}/follow`),
    onSuccess: () => {
      setIsFollowing(false);
      toast({ title: 'Success', description: `You have unfollowed ${displayName}.` });
      queryClient.invalidateQueries({ queryKey: ['user', profileUser.id] });
      queryClient.invalidateQueries({ queryKey: ['relationship', profileUser.id] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Could not unfollow user.', variant: 'destructive' });
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
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-4 sm:p-6 lg:p-8 text-card-foreground">
      <Card className="overflow-hidden rounded-[28px] border border-border/60 bg-glass-gradient-dark shadow-glass backdrop-blur">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Avatar className="h-24 w-24 border-4 border-primary/50 shadow-[0_18px_45px_-24px_rgba(99,102,241,0.45)] sm:h-28 sm:w-28">
              <AvatarImage src={getNullableStringValue(profileUser.profile_picture_url)} alt={displayName} />
              <AvatarFallback className="text-4xl sm:text-5xl">{displayInitial}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{displayName}</h1>
                {roleLabel && (
                  <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/15 text-xs uppercase tracking-[0.18em] text-primary/90">
                    {roleLabel}
                  </Badge>
                )}
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">{bio}</p>
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2">
            <ProfileInfo icon={Mail} label="Email" value={profileUser.email} />
            <ProfileInfo icon={Briefcase} label="Role" value={roleLabel || 'Not specified'} />
            <ProfileInfo icon={Building} label="Company" value={company || 'Independent'} />
            <ProfileInfo icon={MapPin} label="Location" value={location || '—'} />
            <ProfileInfo icon={Calendar} label="Joined" value={joinedAt || '—'} />
            <ProfileInfo icon={Flame} label="Posts" value={String(posts.length)} />
          </div>

          <div className="flex items-center gap-3">
            {isOwnProfile ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" asChild className="rounded-full border border-white/10 px-6 shadow-magnify">
                  <Link href="/dashboard/settings">Edit profile</Link>
                </Button>
                <Button variant="outline" asChild className="rounded-full border border-white/15 px-5 text-sm text-muted-foreground hover:text-foreground">
                  <Link href="/dashboard/settings/security">Security</Link>
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleFollow}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                className="rounded-full px-6"
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Activity</h2>
          <p className="text-sm text-muted-foreground">Latest posts shared publicly by {isOwnProfile ? 'you' : displayName}.</p>
        </div>
        <Separator className="bg-border/60" />
        <UserPosts posts={posts} isOwnProfile={isOwnProfile} />
      </section>
    </div>
  );
}

function ProfileInfo({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/12 bg-[hsla(var(--card),0.9)] p-4 text-sm shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-1 truncate font-medium text-foreground/95">{value}</p>
      </div>
    </div>
  );
}
