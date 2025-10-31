
'use client';

import QueryProvider from './query-provider';
import { UserProvider } from './user-provider';
import { WebSocketProvider } from './websocket-provider';
import { I18nProvider } from './i18n-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <UserProvider>
        <WebSocketProvider>
          <SidebarProvider>
            <I18nProvider>{children}</I18nProvider>
          </SidebarProvider>
        </WebSocketProvider>
      </UserProvider>
    </QueryProvider>
  );
}
