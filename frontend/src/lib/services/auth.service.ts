
// lib/services/auth.service.ts
'use client';

import { publicApiClient } from '@/lib/api-client';
import type { User } from '@/lib/types';

// =================================================================================
// Authentication Types
// =================================================================================

export type RegisterPayload = Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login_at' | 'is_banned' | 'is_verified' | 'face_id_enrolled' | 'face_id_consent_given' | 'face_id_consent_time' | 'face_samples_count' | 'is_active' | 'ban_reason' | 'banned_until' | 'profile_visibility'> & { password: string };

export type LoginPayload = {
    email: string;
    password: string;
};

export type LoginResponse = {
    access_token: string;
    refresh_token: string;
    user: User;
};

// =================================================================================
// Authentication Functions
// =================================================================================

/**
 * [CLIENT] Registers a new user.
 * @param payload - The user registration data.
 * @returns The newly created user object.
 */
export const register = async (payload: RegisterPayload): Promise<User> => {
    const response = await publicApiClient.post('/api/v1/auth/register', payload);
    return response.data.user;
};

/**
 * [CLIENT] Logs in a user.
 * @param payload - The user login credentials.
 * @returns The login response containing tokens and user data.
 */
export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
    const response = await publicApiClient.post('/api/v1/auth/login', payload);
    return response.data;
};
