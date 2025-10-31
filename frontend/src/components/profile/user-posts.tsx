'use client';

import { Post } from '@/lib/types';
import { PostCard } from '@/components/community/feed/PostCard';

interface UserPostsProps {
  posts: Post[];
}

export default function UserPosts({ posts }: UserPostsProps) {
  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-2xl font-bold">Posts</h2>
      {posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <p className="text-muted-foreground">This user has not made any posts yet.</p>
      )}
    </div>
  );
}
