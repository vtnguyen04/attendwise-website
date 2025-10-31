import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CommunityToolbar } from '@/components/community/layout/CommunityToolbar';

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return (
    // By removing 'max-w-7xl', this container can now be full-width.
    <div className="relative space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-gradient bg-blob opacity-60 blur-3xl" />
      
      {/* Header Section */}
      <div className="glass-card interactive-spotlight p-6 shadow-glass-lg sm:p-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-glow">Communities</h1>
            <p className="max-w-xl text-base text-muted-foreground">
              Discover, join, and manage your professional communities.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="glass-button px-5 py-2 text-sm font-semibold uppercase tracking-wide"
          >
            <Link href="/dashboard/communities/create">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Community
            </Link>
          </Button>
        </div>
      </div>

      {/* Toolbar - The new Client Component */}
      <CommunityToolbar />

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
