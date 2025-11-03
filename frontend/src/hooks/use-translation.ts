'use client';

import { useCallback } from 'react';
import { useI18n } from '@/context/i18n-provider';

export function useTranslation(namespace?: string) {
  const { translations } = useI18n();

  const t = useCallback((key: string, options?: { [key: string]: string | number }): string => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    let translation = translations[fullKey] || fullKey;

    if (options) {
      Object.keys(options).forEach(optionKey => {
        translation = translation.replace(`{${optionKey}}`, String(options[optionKey]));
      });
    }

    return translation;
  }, [translations, namespace]); // Dependencies for useCallback

  return { t };
}