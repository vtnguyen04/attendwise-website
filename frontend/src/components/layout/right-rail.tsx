'use client';

import { useState, useEffect } from 'react';
import {
  ChevronRight,
  PenSquare,
  CalendarDays,
  Users,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Zap,
  Star,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getMyEventsByStatus } from '@/lib/services/event.client.service';
import { getFeed } from '@/lib/services/feed.client.service';
import type { EventItem, FeedItem } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const isPostItem = (item: FeedItem): item is Extract<FeedItem, { type: 'post' }> =>
  item.type === 'post' && Boolean(item.post);

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="dashboard-panel overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between group hover:bg-muted/30 transition-all duration-200"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-200 shadow-sm">
            {icon}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="caps-label text-xs text-foreground font-bold">
              {title}
            </h2>
            {badge !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                {badge}
              </span>
            )}
          </div>
        </div>
        <div className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-5 pb-5">{children}</div>
      </div>
    </section>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="feed-card p-4 skeleton-shimmer"
          style={{ animationDelay: `${i * 150}ms` }}
        >
          <div className="h-4 bg-muted/50 rounded-lg w-3/4 mb-3" />
          <div className="h-3 bg-muted/30 rounded-lg w-1/2" />
        </div>
      ))}
    </div>
  );
}

interface RightRailProps {
  className?: string;
}

export function RightRail({ className }: RightRailProps = {}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [recentPosts, setRecentPosts] = useState<Array<Extract<FeedItem, { type: 'post' }>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation('right_rail');

  const formatRelativeTime = (value?: string) => {
    if (!value) return t('date_to_be_announced');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return t('date_to_be_announced');
    }
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const quickShortcuts = [
    {
      label: t('shortcuts.start_post'),
      href: '#global-feed-composer',
      icon: PenSquare,
      variant: 'primary' as const,
      description: t('shortcuts.start_post_desc'),
    },
    {
      label: t('shortcuts.browse_events'),
      href: '/dashboard/events',
      icon: CalendarDays,
      variant: 'secondary' as const,
      description: t('shortcuts.browse_events_desc'),
    },
    {
      label: t('shortcuts.explore_communities'),
      href: '/dashboard/communities',
      icon: Users,
      variant: 'secondary' as const,
      description: t('shortcuts.explore_communities_desc'),
    },
  ];

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;
    let isMounted = true;

    async function loadInsights() {
      setIsLoading(true);
      try {
        const [events, feedItems] = await Promise.all([
          getMyEventsByStatus('upcoming'),
          getFeed('global', signal),
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
      abortController.abort();
    };
  }, []);

  const collapsedClasses = cn('hidden lg:block w-auto flex-shrink-0', className);
  const expandedClasses = cn(
    'hidden lg:block w-full max-w-[300px] xl:max-w-[340px] flex-shrink-0',
    className
  );

  // Collapsed state - Vertical tab
  if (isCollapsed) {
    return (
      <aside className={collapsedClasses}>
        <div className="sticky top-[4.5rem]">
          <button
            onClick={() => setIsCollapsed(false)}
            className="dashboard-panel group relative overflow-hidden p-2 rounded-lg transition-all duration-200 hover:bg-muted/30"
            aria-label={t('insights.show')}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <span className="writing-mode-vertical text-[10px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                {t('insights.title')}
              </span>
            </div>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={expandedClasses}>
      <div className="sticky top-[4.5rem] h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="dashboard-panel-accent px-5 py-4 mb-4 flex-shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/30 to-primary/20 shadow-sm">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="caps-label text-xs font-bold text-foreground">
                  {t('insights.title')}
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t('insights.personalized_feed')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-all duration-200"
              aria-label={t('insights.collapse_sidebar')}
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-0">
          {/* Quick Actions */}
          <section className="dashboard-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="caps-label text-xs font-bold text-foreground">
                  {t('shortcuts.title')}
                </h3>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {quickShortcuts.map((shortcut, index) => (
                <Link
                  key={shortcut.label}
                  href={shortcut.href}
                  className={cn(
                    'block group transition-all duration-300',
                    index === 0 && 'cta-button px-4 py-3 rounded-xl'
                  )}
                >
                  {index === 0 ? (
                    // Primary CTA
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/20">
                        <shortcut.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{shortcut.label}</p>
                        <p className="text-xs opacity-90 truncate">{shortcut.description}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 opacity-70" />
                    </div>
                  ) : (
                    // Secondary actions
                    <div className="feed-card px-4 py-3 flex items-center gap-3 cursor-pointer">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <shortcut.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {shortcut.label}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {shortcut.description}
                        </p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {/* Upcoming Events */}
          <CollapsibleSection
            title={t('insights.upcoming_events')}
            icon={<CalendarDays className="h-4 w-4 text-primary" />}
            defaultOpen={true}
            badge={upcomingEvents.length || undefined}
          >
            {isLoading ? (
              <EventsSkeleton />
            ) : upcomingEvents.length === 0 ? (
              <div className="feed-card px-4 py-8 text-center">
                <div className="p-3 rounded-xl bg-muted/30 w-fit mx-auto mb-3">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {t('insights.no_upcoming_events_title')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('insights.no_upcoming_events')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.event_id}
                    href={`/dashboard/events/${event.event_id}`}
                    className="feed-card block p-4 group cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0">
                        <CalendarDays className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
                          {event.event_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate font-medium">
                            {formatRelativeTime(event.start_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Trending Posts */}
          <CollapsibleSection
            title={t('insights.recent_posts')}
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            defaultOpen={true}
            badge={recentPosts.length || undefined}
          >
            {isLoading ? (
              <EventsSkeleton />
            ) : recentPosts.length === 0 ? (
              <div className="feed-card px-4 py-8 text-center">
                <div className="p-3 rounded-xl bg-muted/30 w-fit mx-auto mb-3">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {t('insights.no_posts_title')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('insights.no_posts_yet')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentPosts.map((item, index) => (
                  <Link
                    key={item.post.id}
                    href={`/dashboard/posts/${item.post.id}`}
                    className="feed-card block p-4 group cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="ranking-badge">
                          #{index + 1}
                        </div>
                        <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Star className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
                          {item.post.content?.trim() || t('post.view')}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground truncate">
                            {item.post.author?.name || t('post.unknown_author')}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CollapsibleSection>
        </div>
      </div>

      <style jsx>{`
        /* Custom scrollbar - thinner than global for sidebar */
        :global(.custom-scrollbar) {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted) / 0.35) transparent;
        }

        :global(.custom-scrollbar::-webkit-scrollbar) {
          width: 6px;
        }

        :global(.custom-scrollbar::-webkit-scrollbar-track) {
          background: transparent;
        }

        :global(.custom-scrollbar::-webkit-scrollbar-thumb) {
          background: hsl(var(--muted) / 0.35);
          border-radius: 3px;
          transition: background 220ms var(--ease-smooth);
        }

        :global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) {
          background: hsl(var(--muted) / 0.55);
        }

        /* Vertical writing mode for collapsed state */
        :global(.writing-mode-vertical) {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }

        /* Ranking badge style */
        :global(.ranking-badge) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 6px;
          background: linear-gradient(135deg, 
            hsl(var(--primary) / 0.15), 
            hsl(var(--primary) / 0.08)
          );
          border: 1px solid hsl(var(--primary) / 0.20);
          font-size: 10px;
          font-weight: 700;
          color: hsl(var(--primary));
          letter-spacing: 0.02em;
        }

        /* Skeleton shimmer animation */
        @keyframes skeleton-shimmer {
          0% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.6;
          }
        }

        :global(.skeleton-shimmer) {
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </aside>
  );
}