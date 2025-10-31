
import { cache } from 'react';
 

const API_URL_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

/**
 * A centralized, server-side-only data fetching utility.
 *
 * This function is wrapped in `React.cache` to automatically deduplicate identical requests
 * made during a single server-side render pass.
 *
 * It automatically retrieves the user's auth token from the session cookie.
 *
 * @param endpoint - The API endpoint to fetch (e.g., '/api/v1/communities').
 * @param tags - Optional array of cache tags for fine-grained revalidation.
 * @param options - Optional native `fetch` options.
 * @returns The JSON response or null if an error occurs.
 */
export const serverFetch = async <T>(
  endpoint: string,
  tags?: string[],
  authToken?: string, // New optional parameter
  options: RequestInit = {}
): Promise<T | null> => {
  const token = authToken; // Use authToken if provided, else use cookie token

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL_BASE}${endpoint}`, {
      ...options,
      headers,
      // Apply cache tags if provided
      next: {
        ...(tags && { tags }),
        ...options.next,
      },
    });

    if (!res.ok) {
      // Don't log 403/404 as server errors, as these are expected outcomes
      if (res.status !== 403 && res.status !== 404) {
        const errorBody = await res.text();
        console.error(
          `[serverFetch] API Error for ${endpoint}: ${res.status} ${res.statusText}`,
          { errorBody }
        );
      }
      return null;
    }

    // Handle cases with no content
    if (res.status === 204) {
      return null;
    }

    return res.json() as Promise<T>;
  } catch (error) {
    console.error(`[serverFetch] Network error for ${endpoint}:`, error);
    return null;
  }
};