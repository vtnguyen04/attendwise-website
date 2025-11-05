// context/user-provider.tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import apiClient, { setAuthToken, clearAuthToken } from '@/lib/api-client';
import type { User } from '@/lib/types';
import Cookies from 'js-cookie';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function UserAuthFromUrl() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useContext(UserContext)!;

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const userFromUrl = searchParams.get('user');

    if (tokenFromUrl && userFromUrl) {
      try {
        const parsedUser = JSON.parse(userFromUrl);
        setUser(parsedUser);
        setAuthToken(tokenFromUrl);
        router.replace('/dashboard', { scroll: false });
      } catch (error) {
        console.error('Failed to process auth data from URL:', error);
      }
    }
  }, [searchParams, router, setUser]);

  return null;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    const processAuth = async () => {
      console.log("[UserProvider] processAuth started.");
      const tokenFromCookie = Cookies.get('accessToken');
      console.log("[UserProvider] Token from cookie:", tokenFromCookie);
      if (tokenFromCookie) {
        try {
          const response = await apiClient.get<{ user: User }>('/users/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('[UserProvider] Failed to validate token from cookie:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    processAuth();
  }, [logout]);

  const value = useMemo(() => ({
    user,
    setUser,
    isLoading,
    logout,
  }), [user, isLoading, logout]);

  return (
    <UserContext.Provider value={value}>
      <Suspense fallback={null}>
        <UserAuthFromUrl />
      </Suspense>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}