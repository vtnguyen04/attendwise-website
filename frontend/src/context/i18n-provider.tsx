'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Import namespaces for English
import enAuth from '@/lib/locales/en/auth.json';
import enCommon from '@/lib/locales/en/common.json';
import enCommunities from '@/lib/locales/en/communities.json';
import enMyCommunities from '@/lib/locales/en/my_communities.json';
import enDataTable from '@/lib/locales/en/data_table.json';
import enColumns from '@/lib/locales/en/columns.json';
import enEvents from '@/lib/locales/en/events.json';
import enDiscussion from '@/lib/locales/en/discussion.json';
import enSettings from '@/lib/locales/en/settings.json';
import enProfile from '@/lib/locales/en/profile.json';
import enNotifications from '@/lib/locales/en/notifications.json';

// Import namespaces for Vietnamese
import viAuth from '@/lib/locales/vi/auth.json';
import viCommon from '@/lib/locales/vi/common.json';
import viCommunities from '@/lib/locales/vi/communities.json';
import viMyCommunities from '@/lib/locales/vi/my_communities.json';
import viDataTable from '@/lib/locales/vi/data_table.json';
import viColumns from '@/lib/locales/vi/columns.json';
import viEvents from '@/lib/locales/vi/events.json';
import viDiscussion from '@/lib/locales/vi/discussion.json';
import viSettings from '@/lib/locales/vi/settings.json';
import viProfile from '@/lib/locales/vi/profile.json';
import viNotifications from '@/lib/locales/vi/notifications.json';

// Helper function to prepend namespace to keys
const namespacify = (obj: Record<string, string>, namespace: string) => {
  const namespaced: Record<string, string> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      namespaced[`${namespace}.${key}`] = obj[key];
    }
  }
  return namespaced;
};

// Merge namespaces for each language with prepended keys
const en = {
  ...namespacify(enAuth, 'auth'),
  ...namespacify(enCommon, 'common'),
  ...namespacify(enCommunities, 'communities'),
  ...namespacify(enMyCommunities, 'my_communities'),
  ...namespacify(enDataTable, 'data_table'),
  ...namespacify(enColumns, 'columns'),
  ...namespacify(enEvents, 'events'),
  ...namespacify(enDiscussion, 'discussion'),
  ...namespacify(enSettings, 'settings'),
  ...namespacify(enProfile, 'profile'),
  ...namespacify(enNotifications, 'notifications'),
};

const vi = {
    ...namespacify(viAuth, 'auth'),
    ...namespacify(viCommon, 'common'),
    ...namespacify(viCommunities, 'communities'),
    ...namespacify(viMyCommunities, 'my_communities'),
    ...namespacify(viDataTable, 'data_table'),
    ...namespacify(viColumns, 'columns'),
    ...namespacify(viEvents, 'events'),
    ...namespacify(viDiscussion, 'discussion'),
    ...namespacify(viSettings, 'settings'),
    ...namespacify(viProfile, 'profile'),
    ...namespacify(viNotifications, 'notifications'),
};

const locales = { en, vi };

type Locale = 'en' | 'vi';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: Record<string, string>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'vi') {
      setLocale('vi');
    }
  }, []);

  const translations = locales[locale];

  return (
    <I18nContext.Provider value={{ locale, setLocale, translations }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
