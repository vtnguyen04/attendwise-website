// src/hooks/use-theme.ts
'use client';

import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const html = document.documentElement;
    const isLight = html.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
    
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const isLight = html.classList.contains('light');
      setTheme(isLight ? 'light' : 'dark');
    });

    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  return theme;
}