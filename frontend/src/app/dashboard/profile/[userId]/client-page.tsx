'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Post } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import { getNullableStringValue } from '@/lib/utils';
import UserPosts from '@/components/profile/user-posts';

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
  const displayName = profileUser?.name?.trim() || 'User';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const followMutation = useMutation({
    mutationFn: () => apiClient.post(`/api/v1/users/${profileUser.id}/follow`),
    onSuccess: () => {
      setIsFollowing(true);
      toast({ title: 'Success', description: `You are now following ${profileUser.name}.` });
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
      toast({ title: 'Success', description: `You have unfollowed ${profileUser.name}.` });
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col items-center">
        <Avatar className="h-32 w-32 border-4 border-primary/50 shadow-lg">
          <AvatarImage src={getNullableStringValue(profileUser.profile_picture_url)} alt={displayName} />
          <AvatarFallback className="text-5xl">{displayInitial}</AvatarFallback>
        </Avatar>
        <h1 className="text-3xl font-bold mt-4">{displayName}</h1>
        <p className="text-muted-foreground text-center mt-2">{getNullableStringValue(profileUser.bio)}</p>
        <div className="mt-6">
          {currentUser && currentUser.id !== profileUser.id && (
            <Button onClick={handleFollow} disabled={followMutation.isPending || unfollowMutation.isPending}>
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
          )}
        </div>
      </div>
      <UserPosts posts={posts} />
    </div>
  );
}
