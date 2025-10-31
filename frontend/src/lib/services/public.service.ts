import apiClient, { publicApiClient } from '@/lib/api-client';
import { Community, EventItem } from '../types';

export const getPublicEvents = async (limit: number = 3): Promise<EventItem[]> => {
  try {
    const response = await publicApiClient.get('/api/v1/events', { params: { limit } });
    return response.data.events || [];
  } catch (error) {
    console.error("Failed to fetch public events:", error);
    return [];
  }
};

export const getPublicCommunities = async (limit: number = 2): Promise<Community[]> => {
    try {
      const response = await publicApiClient.get('/api/v1/search/communities', { params: { limit, q: '' } });
      return response.data.results.map((r: any) => r.result) || [];
    } catch (error) {
      console.log("Note: Could not fetch featured communities. This is expected for logged-out users.");
      return [];
    }
  };