
'use client';

import QueryProvider from './query-provider';
import { UserProvider } from './user-provider';
import { WebSocketProvider } from './websocket-provider';
import { I18nProvider } from './i18n-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

export function AppProviders({ children, initialLocale }: { children: React.ReactNode; initialLocale: string }) {
  return (
    <QueryProvider>
      <UserProvider>
        <WebSocketProvider>
          <SidebarProvider>
            <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
          </SidebarProvider>
        </WebSocketProvider>
      </UserProvider>
    </QueryProvider>
  );
}
