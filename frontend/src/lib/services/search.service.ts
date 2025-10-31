
// lib/services/search.service.ts
'use client';

import apiClient from '@/lib/api-client';
import type { UnifiedSearchResult } from '@/lib/types';

interface SearchQueryParams {
  q: string;
  type?: 'user' | 'community' | 'event' | 'post';
  limit?: number;
  offset?: number;
}

/**
 * [CLIENT] Performs a unified search across users, communities, events, and posts.
 */
export const unifiedSearch = async (params: SearchQueryParams): Promise<UnifiedSearchResult[]> => {
  const response = await apiClient.get<{ results: UnifiedSearchResult[] }>('/api/v1/search', { params });
  return response.data.results || [];
};

/**
 * [CLIENT] Searches for users.
 */
export const searchUsers = async (q: string, limit?: number, offset?: number): Promise<UnifiedSearchResult[]> => {
  const response = await apiClient.get<{ results: UnifiedSearchResult[] }>('/api/v1/search/users', { params: { q, limit, offset } });
  return response.data.results || [];
};

/**
 * [CLIENT] Searches for communities.
 */
export const searchCommunities = async (q: string, limit?: number, offset?: number): Promise<UnifiedSearchResult[]> => {
  const response = await apiClient.get<{ results: UnifiedSearchResult[] }>('/api/v1/search/communities', { params: { q, limit, offset } });
  return response.data.results || [];
};

/**
 * [CLIENT] Searches for events.
 */
export const searchEvents = async (q: string, limit?: number, offset?: number): Promise<UnifiedSearchResult[]> => {
  const response = await apiClient.get<{ results: UnifiedSearchResult[] }>('/api/v1/search/events', { params: { q, limit, offset } });
  return response.data.results || [];
};
