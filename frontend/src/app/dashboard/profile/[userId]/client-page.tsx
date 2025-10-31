'use client';

import { useState, type ElementType } from 'react';
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
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <Card className="overflow-hidden border-border/70 bg-background/90 shadow-md backdrop-blur">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Avatar className="h-24 w-24 border-4 border-primary/60 shadow-[0_18px_45px_-24px_rgba(99,102,241,0.45)] sm:h-28 sm:w-28">
              <AvatarImage src={getNullableStringValue(profileUser.profile_picture_url)} alt={displayName} />
              <AvatarFallback className="text-4xl sm:text-5xl">{displayInitial}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{displayName}</h1>
                <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/10 text-xs uppercase tracking-[0.2em] text-primary">
                  Member
                </Badge>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">{bio}</p>
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2">
            <ProfileInfo icon={Mail} label="Email" value={profileUser.email} />
            <ProfileInfo icon={Briefcase} label="Role" value={position || 'Not specified'} />
            <ProfileInfo icon={Building} label="Company" value={company || 'Independent'} />
            <ProfileInfo icon={MapPin} label="Location" value={location || '—'} />
            <ProfileInfo icon={Calendar} label="Joined" value={joinedAt || '—'} />
            <ProfileInfo icon={Flame} label="Posts" value={String(posts.length)} />
          </div>

          <div className="flex items-center gap-3">
            {isOwnProfile ? (
              <Button variant="secondary" className="rounded-full px-6 shadow-sm">
                Edit Profile
              </Button>
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
    <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/80 p-4 text-sm shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-1 truncate font-medium text-foreground/90">{value}</p>
      </div>
    </div>
  );
}
