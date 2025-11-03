
const API_URL_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * A centralized, server-side-only data fetching utility.
 *
 * It automatically retrieves the user's auth token from the session cookie.
 *
 * @param endpoint - The API endpoint to fetch (e.g., '/communities').
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
  let token = authToken;

  if (!token && typeof window === 'undefined') {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      token = cookieStore.get('accessToken')?.value;
    } catch {
      // Ignore if cookies() is unavailable (e.g., during client-side execution)
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const requestInit: RequestInit = {
      ...options,
      headers,
    };

    if (!requestInit.cache && token) {
      requestInit.cache = 'no-store';
    }

    const usingNoStore = requestInit.cache === 'no-store';
    const nextOptions = usingNoStore
      ? options.next
      : {
          ...(tags && { tags }),
          ...options.next,
        };

    if (nextOptions && Object.keys(nextOptions).length > 0) {
      requestInit.next = nextOptions;
    }

    const res = await fetch(`${API_URL_BASE}${endpoint}`, requestInit);

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
