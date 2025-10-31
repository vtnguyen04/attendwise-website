import { cookies } from 'next/headers';
import apiClient from '@/lib/api-client';
import type { User } from '@/lib/types';


/**
 * Fetches the current user's data from the API on the server side.
 * It retrieves the auth token from cookies and makes an authenticated request.
 * @returns {Promise<User | null>} The user object or null if not authenticated or on error.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await apiClient.get('/api/v1/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // The API returns { user: User }, so we extract it.
    const user: User = response.data.user;
    return user;
  } catch (error) {
    // This can happen if the token is expired or invalid.
    // console.error('Failed to fetch current user:', error);
    return null;
  }
}
