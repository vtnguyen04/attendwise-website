'use client';

import { Post } from '@/lib/types';
import { PostCard } from '@/components/community/feed/PostCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PenSquare from 'lucide-react/icons/pen-square';

interface UserPostsProps {
  posts: Post[];
  isOwnProfile?: boolean;
}

export default function UserPosts({ posts, isOwnProfile = false }: UserPostsProps) {
  if (posts.length === 0) {
    return (
      <Card className="border-border/60 bg-background/85 shadow-sm backdrop-blur">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <PenSquare className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {isOwnProfile ? 'Share your first update' : 'No public posts yet'}
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {isOwnProfile
                ? 'Start a post from the home feed to broadcast updates to your communities.'
                : 'When this member posts publicly, their updates will appear here.'}
            </p>
          </div>
          {isOwnProfile && (
            <Button asChild className="rounded-full px-5">
              <a href="/dashboard#global-feed-composer">Create a post</a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-foreground">Posts</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </span>
      </div>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
