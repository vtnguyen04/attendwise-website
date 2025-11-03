
import apiClient from '@/lib/api-client';
import type { User } from '@/lib/types';

// =================================================================================
// User Profile & Actions
// =================================================================================

/**
 * Fetches a user's public profile by their ID.
 * Can be used on server or client.
 * @param userId The ID of the user to fetch.
 * @returns The user object or null if not found.
 */
export async function getUserById(userId: string): Promise<User | null> {
  if (!userId) return null;
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data.user;
  } catch {
    // console.error(`Failed to fetch user ${userId}:`, error);
    return null;
  }
}

/**
 * Updates partial profile information for the authenticated user.
 * @param data The partial user data to update.
 * @returns The updated user object.
 */
export async function updateUserProfile(data: Partial<User>): Promise<User> {
  const response = await apiClient.patch(`/users/me`, data);
  return response.data.user;
}

/**
 * Allows the authenticated user to change their password.
 */
export async function changePassword(payload: { old_password: string; new_password: string }): Promise<void> {
  await apiClient.post('/users/change-password', payload);
}

/**
 * Creates a follow relationship from the authenticated user to another user.
 */
export async function followUser(userId: string): Promise<void> {
  await apiClient.post(`/users/${userId}/follow`);
}

/**
 * Removes a follow relationship.
 */
export async function unfollowUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}/follow`);
}

/**
 * Retrieves a list of suggested users to follow.
 */
export async function getUserSuggestions(): Promise<User[]> {
  const response = await apiClient.get<{ suggestions: User[] }>('/users/suggestions');
  return response.data.suggestions || [];
}

// =================================================================================
// Admin Actions
// =================================================================================

interface BanUserPayload {
  ban_reason?: string;
  banned_until?: string; // ISO 8601 timestamp
}

/**
 * Bans a specific user. Requires administrative privileges.
 */
export async function banUser(userId: string, payload: BanUserPayload): Promise<void> {
  await apiClient.post(`/users/${userId}/ban`, payload);
}

// =================================================================================
// Liveness Enrollment Flow
// =================================================================================

interface LivenessChallengeResponse {
  session_id: string;
  challenges: string[];
}

interface SubmitLivenessFramePayload {
  session_id: string;
  video_data: string; // Base64 encoded image frame
  consent_given: boolean;
}

interface SubmitLivenessFrameResponse {
  error?: string; // For CHALLENGE_PASSED_CONTINUE or CHALLENGE_FAILED_RETRY
  status?: string; // For final success
  message?: string;
  face_id_enrolled?: boolean;
}

/**
 * Starts a liveness session and returns a session ID and a list of challenges.
 */
export async function getLivenessChallenges(): Promise<LivenessChallengeResponse> {
  const response = await apiClient.get<LivenessChallengeResponse>('/users/enroll-challenge');
  return response.data;
}

/**
 * Submits a single frame for a liveness challenge.
 */
export async function submitLivenessFrame(payload: SubmitLivenessFramePayload): Promise<SubmitLivenessFrameResponse> {
  const response = await apiClient.post<SubmitLivenessFrameResponse>('/users/me/enroll-face', payload);
  return response.data;
}
