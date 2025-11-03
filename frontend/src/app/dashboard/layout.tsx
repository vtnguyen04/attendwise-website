import { SidebarProvider } from '@/components/ui/sidebar';
import DashboardLayoutClient from '@/components/DashboardLayoutClient';
import { Suspense } from 'react';

export default function DashboardLayout({ 
  children, 
}: { 
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardLayoutClient>
          {children}
        </DashboardLayoutClient>
      </Suspense>
    </SidebarProvider>
  );
}
