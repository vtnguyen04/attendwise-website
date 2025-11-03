'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

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
import enCommunity from '@/lib/locales/en/community.json';
import enDashboard from '@/lib/locales/en/dashboard.json';
import enMarketing from '@/lib/locales/en/marketing.json';
import enUser from '@/lib/locales/en/user.json';
import enAnalytics from '@/lib/locales/en/analytics.json';
import enPostComposer from '@/lib/locales/en/post_composer.json';
import enSearch from '@/lib/locales/en/search.json';
import enMessenger from '@/lib/locales/en/messenger.json';
import enPostDetail from '@/lib/locales/en/post_detail.json';
import enUserProfile from '@/lib/locales/en/user_profile.json';

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
import viCommunity from '@/lib/locales/vi/community.json';
import viDashboard from '@/lib/locales/vi/dashboard.json';
import viMarketing from '@/lib/locales/vi/marketing.json';
import viUser from '@/lib/locales/vi/user.json';
import viAnalytics from '@/lib/locales/vi/analytics.json';
import viPostComposer from '@/lib/locales/vi/post_composer.json';
import viSearch from '@/lib/locales/vi/search.json';
import viMessenger from '@/lib/locales/vi/messenger.json';
import enBreadcrumb from '@/lib/locales/en/breadcrumb.json';
import viBreadcrumb from '@/lib/locales/vi/breadcrumb.json';
import enRightRail from '@/lib/locales/en/right_rail.json';
import viRightRail from '@/lib/locales/vi/right_rail.json';
import viPostDetail from '@/lib/locales/vi/post_detail.json';
import viUserProfile from '@/lib/locales/vi/user_profile.json';

type LocaleModule = Record<string, unknown>;

const flattenNamespace = (module: LocaleModule, namespace: string): Record<string, string> => {
  const base = module && typeof module === 'object' && namespace in module ? module[namespace] : module;
  const result: Record<string, string> = {};

  const walk = (value: unknown, path: string[]) => {
    if (typeof value === 'string') {
      const key = [namespace, ...path].join('.');
      result[key] = value;
      return;
    }

    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([childKey, childValue]) => {
        walk(childValue, [...path, childKey]);
      });
    }
  };

  walk(base, []);
  return result;
};



// Merge namespaces for each language with prepended keys
const en = {
  ...flattenNamespace(enAuth, 'auth'),
  ...flattenNamespace(enCommon, 'common'),
  ...flattenNamespace(enCommunities, 'communities'),
  ...flattenNamespace(enMyCommunities, 'my_communities'),
  ...flattenNamespace(enDataTable, 'data_table'),
  ...flattenNamespace(enColumns, 'columns'),
  ...flattenNamespace(enEvents, 'events'),
  ...flattenNamespace(enDiscussion, 'discussion'),
  ...flattenNamespace(enSettings, 'settings'),
  ...flattenNamespace(enProfile, 'profile'),
  ...flattenNamespace(enNotifications, 'notifications'),
  ...flattenNamespace(enCommunity, 'community'),
  ...flattenNamespace(enDashboard, 'dashboard'),
  ...flattenNamespace(enMarketing, 'marketing'),
  ...flattenNamespace(enUser, 'user'),
  ...flattenNamespace(enAnalytics, 'analytics'),
  ...flattenNamespace(enPostComposer, 'post_composer'),
  ...flattenNamespace(enBreadcrumb, 'breadcrumb'),
  ...flattenNamespace(enRightRail, 'right_rail'),
  ...flattenNamespace(enSearch, 'search'),
  ...flattenNamespace(enMessenger, 'messenger'),
  ...flattenNamespace(enPostDetail, 'post_detail'),
  ...flattenNamespace(enUserProfile, 'user_profile'),
};

const vi = {
    ...flattenNamespace(viAuth, 'auth'),
    ...flattenNamespace(viCommon, 'common'),
    ...flattenNamespace(viCommunities, 'communities'),
    ...flattenNamespace(viMyCommunities, 'my_communities'),
    ...flattenNamespace(viDataTable, 'data_table'),
    ...flattenNamespace(viColumns, 'columns'),
    ...flattenNamespace(viEvents, 'events'),
    ...flattenNamespace(viDiscussion, 'discussion'),
    ...flattenNamespace(viSettings, 'settings'),
    ...flattenNamespace(viProfile, 'profile'),
    ...flattenNamespace(viNotifications, 'notifications'),
    ...flattenNamespace(viCommunity, 'community'),
    ...flattenNamespace(viDashboard, 'dashboard'),
    ...flattenNamespace(viMarketing, 'marketing'),
    ...flattenNamespace(viUser, 'user'),
    ...flattenNamespace(viAnalytics, 'analytics'),
    ...flattenNamespace(viPostComposer, 'post_composer'),
    ...flattenNamespace(viBreadcrumb, 'breadcrumb'),
    ...flattenNamespace(viRightRail, 'right_rail'),
    ...flattenNamespace(viSearch, 'search'),
    ...flattenNamespace(viMessenger, 'messenger'),
    ...flattenNamespace(viPostDetail, 'post_detail'),
    ...flattenNamespace(viUserProfile, 'user_profile'),
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
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') {
      return 'vi'; // Default to 'vi' on server
    }

    const storedLocale = window.localStorage.getItem('attendwise_locale');
    if (storedLocale === 'en' || storedLocale === 'vi') {
      return storedLocale;
    }

    const browserLang = window.navigator.language.split('-')[0];
    return browserLang === 'en' ? 'en' : 'vi';
  });

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('attendwise_locale', nextLocale);
    }
  };

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
