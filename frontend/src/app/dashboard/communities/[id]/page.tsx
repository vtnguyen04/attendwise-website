import type { Post } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { listCommunityPosts, getCommunityById } from '@/lib/services/community.server.service';
import CommunityFeedClientPage from './client-page';

export default async function CommunityFeedPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  const [postsData, community] = await Promise.all([
    listCommunityPosts(id, 1, 10),
    getCommunityById(id),
  ]);

  async function handlePostCreated() {
    'use server';
    revalidatePath(`/dashboard/communities/${id}`);
  }

  const posts: Post[] = postsData?.posts || [];

  return <CommunityFeedClientPage posts={posts} community={community} id={id} handlePostCreated={handlePostCreated} />;
}
