import { serverFetch } from '@/lib/server-fetch';
import type { User, Post, UserRelationship } from '@/lib/types';

export const getUserById = async (userId: string, token?: string): Promise<User | null> => {
  const response = await serverFetch<{ user: User }>(
    `/api/v1/users/${userId}`,
    ['user', userId],
    token
  );
  return response?.user ?? null;
};

export const getPostsByUserId = async (userId: string, token?: string): Promise<Post[]> => {
  const response = await serverFetch<{ posts: Post[] }>(
    `/api/v1/users/${userId}/posts`,
    ['posts', userId],
    token
  );
  return response?.posts ?? [];
};

export const getUserRelationship = async (userId: string, token?: string): Promise<UserRelationship | null> => {
  const response = await serverFetch<{ relationship: UserRelationship }>(
    `/api/v1/users/${userId}/relationship`,
    ['relationship', userId],
    token
  );
  return response?.relationship ?? null;
};
