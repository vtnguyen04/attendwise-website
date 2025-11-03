import { serverFetch } from '@/lib/server-fetch';
import type { User, Post, UserRelationship, UserExperience, UserEducation, UserSkill } from '@/lib/types';

export const getUserById = async (userId: string, token?: string): Promise<User | null> => {
  const response = await serverFetch<{ user: User }>(
    `/users/${userId}`,
    ['user', userId],
    token
  );
  return response?.user ?? null;
};

export const getPostsByUserId = async (userId: string, token?: string): Promise<Post[]> => {
  const response = await serverFetch<{ posts: Post[] }>(
    `/feed/posts?author_id=${userId}`,
    ['global-posts', userId],
    token
  );
  return response?.posts ?? [];
};

export const getUserRelationship = async (userId: string, token?: string): Promise<UserRelationship | null> => {
  const response = await serverFetch<{ relationship: UserRelationship }>(
    `/users/${userId}/relationship`,
    ['relationship', userId],
    token
  );
  return response?.relationship ?? null;
};

export const getUserExperience = async (userId: string, token?: string): Promise<UserExperience[]> => {
  const response = await serverFetch<{ experience: UserExperience[] }>(
    `/users/${userId}/experience`,
    ['experience', userId],
    token
  );
  return response?.experience ?? [];
};

export const getUserEducation = async (userId: string, token?: string): Promise<UserEducation[]> => {
  const response = await serverFetch<{ education: UserEducation[] }>(
    `/users/${userId}/education`,
    ['education', userId],
    token
  );
  return response?.education ?? [];
};

export const getUserSkills = async (userId: string, token?: string): Promise<UserSkill[]> => {
  const response = await serverFetch<{ skills: UserSkill[] }>(
    `/users/${userId}/skills`,
    ['skills', userId],
    token
  );
  return response?.skills ?? [];
};
