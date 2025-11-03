// lib/services/community.client.service.ts
'use client';

import apiClient from '@/lib/api-client';
import type { Community, Post, Comment, User } from '@/lib/types';

// =================================================================================
// Community Management
// =================================================================================

/**
 * [CLIENT] Creates a new community.
 */
export const createCommunity = async (data: Partial<Community>): Promise<Community> => {
  const response = await apiClient.post('/communities', data);
  return response.data.community;
};

/**
 * [CLIENT] Updates a community's details.
 */
export const updateCommunity = async (id: string, data: Partial<Community>): Promise<Community> => {
    const response = await apiClient.patch(`/communities/${id}`, data);
    return response.data.community;
}

/**
 * [CLIENT] Fetches community suggestions for the current user.
 */
export const getCommunitySuggestions = async (): Promise<Community[]> => {
  try {
    const response = await apiClient.get('/communities/suggestions');
    return response.data.suggestions || [];
  } catch (error) {
    console.error("Failed to fetch community suggestions:", error);
    return [];
  }
};

/**
 * [CLIENT] Fetches the communities the current user belongs to.
 */
export const getMyCommunitiesClient = async (): Promise<Community[]> => {
  try {
    const response = await apiClient.get('/my-communities');
    return response.data.communities || [];
  } catch (error) {
    console.error('Failed to fetch my communities:', error);
    return [];
  }
};

// =================================================================================
// Member Management
// =================================================================================

/**
 * [CLIENT] Joins a community by its ID.
 */
export const joinCommunity = async (communityId: string): Promise<void> => {
  await apiClient.post(`/communities/${communityId}/members`);
};

/**
 * [CLIENT] Leaves a community by its ID.
 */
export const leaveCommunity = async (communityId: string): Promise<void> => {
  await apiClient.delete(`/communities/${communityId}/members/me`);
};

/**
 * [CLIENT] Updates the role of a member in a community.
 */
export const updateMemberRole = async (communityId: string, userId: string, role: string): Promise<void> => {
    await apiClient.patch(`/communities/${communityId}/members/${userId}`, { role });
}

/**
 * [CLIENT] Removes a member from a community.
 */
export const removeMember = async (communityId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/communities/${communityId}/members/${userId}`);
}

/**
 * [CLIENT] Lists all active members of a community.
 */
export const listCommunityMembers = async (communityId: string): Promise<User[]> => {
    const response = await apiClient.get(`/communities/${communityId}/members`);
    return response.data.members || [];
}

/**
 * [CLIENT] Lists all pending members for a community.
 */
export const listPendingMembers = async (communityId: string): Promise<User[]> => {
    const response = await apiClient.get(`/communities/${communityId}/members/pending`);
    return response.data.members || [];
}

/**
 * [CLIENT] Approves a pending member's join request.
 */
export const approveMember = async (communityId: string, userId: string): Promise<void> => {
    await apiClient.post(`/communities/${communityId}/members/${userId}/approve`);
}

// =================================================================================
// Post Management
// =================================================================================

/**
 * [CLIENT] Creates a new post in a community.
 */
export const createPost = async (communityId: string, data: { content: string; visibility?: string; media_urls?: string[] }): Promise<Post> => {
    const response = await apiClient.post(`/communities/${communityId}/posts`, data);
    return response.data.post;
}

/**
 * [CLIENT] Lists posts for a community with pagination.
 */
export const listCommunityPosts = async (communityId: string, page: number = 1, limit: number = 10): Promise<{ posts: Post[], has_more: boolean }> => {
    const response = await apiClient.get(`/communities/${communityId}/posts`, { params: { page, limit } });
    return {
        posts: response.data.posts || [],
        has_more: response.data.pagination?.has_more || false,
    };
}

/**
 * [CLIENT] Updates a post.
 */
export const updatePost = async (postId: string, data: { content?: string; visibility?: string; media_urls?: string[] }): Promise<Post> => {
    const response = await apiClient.patch(`/posts/${postId}`, data);
    return response.data.post;
}

/**
 * [CLIENT] Deletes a post.
 */
export const deletePost = async (postId: string): Promise<void> => {
    await apiClient.delete(`/posts/${postId}`);
}

/**
 * [CLIENT] Approves a pending post.
 */
export const approvePost = async (postId: string): Promise<void> => {
    await apiClient.post(`/posts/${postId}/approve`);
}

/**
 * [CLIENT] Rejects a pending post.
 */
export const rejectPost = async (postId: string): Promise<void> => {
    await apiClient.post(`/posts/${postId}/reject`);
}

/**
 * [CLIENT] Pins or unpins a post.
 */
export const pinPost = async (postId: string, is_pinned: boolean): Promise<void> => {
    await apiClient.post(`/posts/${postId}/pin`, { is_pinned });
}

/**
 * [CLIENT] Reacts to a post.
 */
export const reactToPost = async (postId: string, reaction_type: string): Promise<void> => {
    await apiClient.post(`/posts/${postId}/reactions`, { reaction_type });
}

/**
 * [CLIENT] Deletes a reaction from a post.
 */
export const deleteReaction = async (postId: string): Promise<void> => {
    await apiClient.delete(`/posts/${postId}/reactions`);
}

// =================================================================================
// Comment Management
// =================================================================================

/**
 * [CLIENT] Creates a new comment on a post.
 */
export const createComment = async (postId: string, data: { content: string; parent_comment_id?: string }): Promise<Comment> => {
    const response = await apiClient.post(`/posts/${postId}/comments`, data);
    return response.data.comment;
}

/**
 * [CLIENT] Lists all comments for a post.
 */
export const listComments = async (postId: string): Promise<Comment[]> => {
    const response = await apiClient.get(`/posts/${postId}/comments`);
    return response.data.comments || [];
}

/**
 * [CLIENT] Updates a comment.
 */
export const updateComment = async (commentId: string, content: string): Promise<Comment> => {
    const response = await apiClient.patch(`/comments/${commentId}`, { content });
    return response.data.comment;
}

/**
 * [CLIENT] Deletes a comment.
 */
export const deleteComment = async (commentId: string): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`);
}
