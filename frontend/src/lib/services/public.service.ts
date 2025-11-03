import { publicApiClient } from '@/lib/api-client';
import { Community, EventItem } from '../types';

export const getPublicEvents = async (limit: number = 3): Promise<EventItem[]> => {
  try {
    const response = await publicApiClient.get('/events', { params: { limit } });
    return response.data.events || [];
  } catch (error) {
    console.error("Failed to fetch public events:", error);
    return [];
  }
};

export const getPublicCommunities = async (limit: number = 2): Promise<Community[]> => {
    try {
      const response = await publicApiClient.get('/search/communities', { params: { limit, q: '' } });
      interface SearchResult {
        result: Community;
      }
      return response.data.results.map((r: SearchResult) => r.result) || [];
    } catch {
      console.log("Note: Could not fetch featured communities. This is expected for logged-out users.");
      return [];
    }
  };