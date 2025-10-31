// frontend/src/hooks/use-user.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import * as UserService from '@/lib/services/user.service';
import type { User } from '@/lib/types';

// Custom hook to fetch a user by ID
export function useUserById(userId: string | undefined) {
  return useQuery<User | null>({
    queryKey: ['user', userId],
    queryFn: () => UserService.getUserById(userId!),
    enabled: !!userId,
  });
}