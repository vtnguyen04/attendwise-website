// context/user-provider.tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient, { clearAuthToken } from '@/lib/api-client';
import type { User } from '@/lib/types';
import Cookies from 'js-cookie';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Still true to show loading on initial load

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    // Redirect happens in apiClient interceptor, but we can do it here too for explicitness
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    const validateTokenAndFetchUser = async () => {
      // Use Cookies for token consistency with server-side logic in session.ts
      const token = Cookies.get('accessToken');

      if (token) {
        try {
          // No need to call setAuthToken here, the apiClient interceptor handles it.
          const response = await apiClient.get<{ user: User }>('/api/v1/users/me');
          setUser(response.data.user); // Directly set the user from API, no parsing needed.
        } catch (error) {
          // This will be caught by the apiClient interceptor which handles logout
          console.error('[UserProvider] Failed to validate token:', error);
          // logout() will be called by the interceptor on a 401 error.
        }
      }
      setIsLoading(false);
    };

    validateTokenAndFetchUser();
  }, []);

  const value = useMemo(() => ({
    user,
    setUser, // Expose the raw setUser for login/update profile pages
    isLoading,
    logout,
  }), [user, isLoading, logout]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}