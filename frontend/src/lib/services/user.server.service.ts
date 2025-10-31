import { serverFetch } from '@/lib/server-fetch';
import type { User, Post, UserRelationship } from '@/lib/types';

export const getUserById = async (userId: string, token?: string): Promise<User | null> => {
  return serverFetch<User>(
    `/api/v1/users/${userId}`,
    ['user', userId],
    token
  );
};

export const getPostsByUserId = async (userId: string, token?: string): Promise<Post[] | null> => {
  return serverFetch<Post[]>(
    `/api/v1/users/${userId}/posts`,
    ['posts', userId],
    token
  );
};

export const getUserRelationship = async (userId: string, token?: string): Promise<UserRelationship | null> => {
  return serverFetch<UserRelationship>(
    `/api/v1/users/${userId}/relationship`,
    ['relationship', userId],
    token
  );
};
