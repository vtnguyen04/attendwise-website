'use client';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import SidebarNav from '@/components/layout/sidebar-nav';
import { Sidebar, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { ParticleBackground } from '@/components/layout/ParticleBackgroundClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, Flame, Clock, ArrowUpRight } from 'lucide-react';
function SidebarLoadingSkeleton() {
  return (
    <div className="w-12 p-2 space-y-2 rounded-xl border border-white/10 bg-background/60 backdrop-blur">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-8 w-8 animate-pulse rounded-lg bg-muted/40"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}
function HeaderLoadingSkeleton() {
  return (
    <div className="flex h-16 items-center gap-4 border-b border-white/10 bg-background/75 px-6 backdrop-blur">
      <div className="h-9 w-44 animate-pulse rounded-lg bg-primary/10" />
      <div className="ml-auto flex gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted/40" />
        <div
          className="h-10 w-10 animate-pulse rounded-full bg-muted/40"
          style={{ animationDelay: '120ms' }}
        />
      </div>
    </div>
  );
}

const recentHighlights = [
  {
    title: 'Upcoming sessions',
    description: 'Two events start this week. Review attendees and reminders.',
  },
  {
    title: 'Communities to check',
    description: 'Design Guild posted new materials 3h ago.',
  },
  {
    title: 'Pending approvals',
    description: '3 members awaiting confirmation.',
  },
];

const quickShortcuts = [
  { label: 'Create post', href: '/dashboard/communities/create' },
  { label: 'Schedule event', href: '/dashboard/events/new' },
  { label: 'Manage members', href: '/dashboard/communities' },
];

function FeedToolbar() {
  return (
    <div className="sticky top-[136px] z-30 flex flex-col gap-3 rounded-3xl border border-border/60 bg-card/85 px-4 py-3 shadow-sm backdrop-blur sm:top-[112px] md:top-[92px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dashboard"
            className="h-10 rounded-full border border-border bg-background/70 pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
          <Button variant="default" size="sm" className="rounded-full px-4">
            <Flame className="mr-2 h-4 w-4" /> Best
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-4">
            <Clock className="mr-2 h-4 w-4" /> New
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-4">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Top
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-foreground">
          Posts
        </span>
        <span className="rounded-full border border-transparent bg-background/60 px-3 py-1">
          Events
        </span>
        <span className="rounded-full border border-transparent bg-background/60 px-3 py-1">
          Communities
        </span>
      </div>
    </div>
  );
}

function RightRail() {
  return (
    <aside className="hidden w-full max-w-xs shrink-0 flex-col gap-4 lg:flex">
      <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur">
        <h2 className="text-sm font-semibold text-foreground">Highlights</h2>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          {recentHighlights.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
            >
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur">
        <h2 className="text-sm font-semibold text-foreground">Shortcuts</h2>
        <nav className="mt-4 grid gap-2">
          {quickShortcuts.map((shortcut) => (
            <a
              key={shortcut.label}
              href={shortcut.href}
              className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {shortcut.label}
            </a>
          ))}
        </nav>
      </section>
    </aside>
  );
}


function Layout({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setOpen, isMobile } = useSidebar();

  useEffect(() => {
    if (!isMobile) {
      setOpen(false);
    }
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
      setScrollY(mainEl.scrollTop);
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile, setOpen]);

  const handleSidebarEnter = useCallback(() => {
    if (isMobile) return;
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setOpen(true);
  }, [isMobile, setOpen]);

  const handleSidebarLeave = useCallback(() => {
    if (isMobile) return;
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    hoverTimeout.current = setTimeout(() => setOpen(false), 120);
  }, [isMobile, setOpen]);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      <ParticleBackground />

      <div
        className="z-50 hidden md:flex"
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
      >
        <Sidebar
          collapsible="icon"
          className={cn(
            'hidden md:flex md:flex-col border-r border-white/10 bg-background/70 backdrop-blur transition-all duration-300',
            isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
          )}
        >
          <Suspense fallback={<SidebarLoadingSkeleton />}>
            <SidebarNav />
          </Suspense>
        </Sidebar>
      </div>

      <SidebarInset className="flex flex-1 flex-col bg-background/30">
        <header
          className={cn(
            `sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur transition-all duration-500`,
            isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          )}
        >
          <Suspense fallback={<HeaderLoadingSkeleton />}>
            <DashboardHeader scrollY={scrollY} />
          </Suspense>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:px-8">
            <section className="w-full flex-1 space-y-6">
              <FeedToolbar />
              <div className="space-y-4">
                {children}
              </div>
            </section>
            <RightRail />
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout>
      {children}
    </Layout>
  );
}
