'use client';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import DashboardHeader from '@/components/dashboard-header';
import SidebarNav from '@/components/layout/sidebar-nav';
import { Sidebar, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { ParticleBackground } from '@/components/layout/ParticleBackgroundClient';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Flame, Clock, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getMyEventsByStatus } from '@/lib/services/event.client.service';
import { getFeed } from '@/lib/services/feed.client.service';
import type { EventItem, FeedItem } from '@/lib/types';
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

const quickShortcuts = [
  { label: 'Create post', href: '/dashboard/communities/create' },
  { label: 'Schedule event', href: '/dashboard/events/new' },
  { label: 'Manage members', href: '/dashboard/communities' },
];

function FeedToolbar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/85 px-4 py-2 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground sm:text-sm">
        <span className="rounded-full border border-border bg-background/80 px-3 py-1.5 text-foreground">
          Posts
        </span>
        <button className="rounded-full border border-transparent bg-background/60 px-3 py-1.5 transition-colors hover:border-border hover:text-foreground">
          Events
        </button>
        <button className="rounded-full border border-transparent bg-background/60 px-3 py-1.5 transition-colors hover:border-border hover:text-foreground">
          Communities
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 whitespace-nowrap text-xs font-medium sm:text-sm">
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
  );
}

const isPostItem = (item: FeedItem): item is Extract<FeedItem, { type: 'post' }> =>
  item.type === 'post' && Boolean(item.post);

function RightRail() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [recentPosts, setRecentPosts] = useState<Array<Extract<FeedItem, { type: 'post' }>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatRelativeTime = (value?: string) => {
    if (!value) return 'Date to be announced';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Date to be announced';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadInsights() {
      setIsLoading(true);
      try {
        const [events, feedItems] = await Promise.all([
          getMyEventsByStatus('upcoming'),
          getFeed(),
        ]);

        if (!isMounted) return;

        setUpcomingEvents(events.slice(0, 3));
        const posts = feedItems.filter(isPostItem).slice(0, 3);
        setRecentPosts(posts);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInsights();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderSkeleton = () => (
    <div className="mt-3 space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-12 animate-pulse rounded-lg border border-border/40 bg-background/40"
        />
      ))}
    </div>
  );

  if (isCollapsed) {
    return (
      <div className="sticky top-24 hidden lg:flex">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        >
          <ChevronRight className="h-3 w-3" />
          <span>Show insights</span>
        </button>
      </div>
    );
  }

  return (
    <aside className="hidden w-full max-w-[260px] shrink-0 lg:flex">
      <div className="sticky top-24 flex w-full flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Insights</span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded-full border border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <section className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming events
          </h2>
          {isLoading ? (
            renderSkeleton()
          ) : upcomingEvents.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No upcoming events yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
              {upcomingEvents.map((event) => (
                <li
                  key={event.event_id}
                  className="rounded-lg border border-border/50 bg-background/70 px-3 py-2"
                >
                  <p className="font-medium text-foreground text-sm">{event.event_name}</p>
                  <p className="mt-1 text-[11px]">{formatRelativeTime(event.start_time)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent posts
          </h2>
          {isLoading ? (
            renderSkeleton()
          ) : recentPosts.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No posts in your feed yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
              {recentPosts.map((item) => (
                <li
                  key={item.post.id}
                  className="rounded-lg border border-border/50 bg-background/70 px-3 py-2"
                >
                  <p className="font-medium text-foreground line-clamp-2 text-sm">
                    {item.post.content?.trim() || 'View post'}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">
                      {item.post.author?.name || 'Unknown author'}
                    </span>
                    <span className="shrink-0">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Shortcuts
          </h2>
          <nav className="mt-2 grid gap-2 text-sm">
            {quickShortcuts.map((shortcut) => (
              <a
                key={shortcut.label}
                href={shortcut.href}
                className="rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                {shortcut.label}
              </a>
            ))}
          </nav>
        </section>
      </div>
    </aside>
  );
}


function Layout({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setOpen, isMobile } = useSidebar();
  const pathname = usePathname();
  const isFeedPage = pathname === '/dashboard';

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
          {isFeedPage ? (
            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:px-8">
              <section className="w-full flex-1 space-y-6">
                <FeedToolbar />
                <div className="space-y-4">{children}</div>
              </section>
              <RightRail />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
              {children}
            </div>
          )}
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
