'use client';

import { useState, useEffect, useCallback } from 'react';

// A hook to use a value from localStorage that updates across tabs
export function useLocalStorage(key: string) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key);
  });

  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === key) {
      setValue(event.newValue);
    }
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(window.localStorage.getItem(key));

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, handleStorageChange]);

  return value;
}
