
// lib/services/community.server.service.ts
import { serverFetch } from '@/lib/server-fetch';
import type { Community, Post } from '@/lib/types';

/**
 * [SERVER] Fetches a single community by its ID.
 * Uses server-side fetch with caching.
 * @param id - The ID of the community.
 * @returns The community object or null if not found.
 */
export async function getCommunityById(id: string): Promise<Community | null> {
  const data = await serverFetch<{ community: Community }>(`/communities/${id}`, [
    `community:${id}`,
  ]);
  return data?.community || null;
}

/**
 * [SERVER] Fetches all communities the current user is a member of.
 * @returns An array of community objects.
 */
export async function getMyCommunities(): Promise<Community[]> {
  const data = await serverFetch<{ communities: Community[] }>('/my-communities', [
    'my-communities',
  ]);
  return data?.communities || [];
}

/**
 * [SERVER] Fetches all communities where the current user has an admin role.
 * This function derives its data from `getMyCommunities`.
 * @returns An array of community objects where the user is an admin.
 */
export async function getAdminCommunities(): Promise<Community[]> {
  const myCommunities = await getMyCommunities();
  return myCommunities.filter((c) => c.role === 'community_admin');
}

/**
 * [SERVER] Lists posts for a community with pagination.
 */
export async function listCommunityPosts(
  communityId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; has_more: boolean }> {
  const data = await serverFetch<{ posts: Post[]; pagination?: { has_more?: boolean } }>(
    `/communities/${communityId}/posts?page=${page}&limit=${limit}`,
    [`community:${communityId}:posts`]
  );
  return {
    posts: data?.posts ?? [],
    has_more: data?.pagination?.has_more ?? false,
  };
}
