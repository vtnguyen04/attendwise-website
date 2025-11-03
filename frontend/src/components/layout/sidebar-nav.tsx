'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  CalendarClock,
  Calendar,
  Users2,
  Map,
  Trophy,
  MessageSquareDot,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Plus,
  Star,
  Settings,
} from 'lucide-react';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from '@/hooks/use-translation';

import { useTotalUnreadMessageCount } from '@/hooks/use-messaging';
import apiClient from '@/lib/api-client';
import type { Community } from '@/lib/types';
import { cn, getSafeImageUrl } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: string;
};

type SidebarNavProps = {
  isPinned?: boolean;
  onPinChange?: (nextPinned: boolean) => void;
};

const mainNavItems = (t: (key: string) => string, unreadMessageCount: number): NavItem[] => [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: t('common.home'),
    exact: true,
  },
  {
    href: '/dashboard/communities',
    icon: Building2,
    label: t('common.sidebar.communities_nav'),
  },
  {
    href: '/dashboard/classroom',
    icon: GraduationCap,
    label: t('common.classroom'),
  },
  {
    href: '/dashboard/events',
    icon: CalendarClock,
    label: t('events.title'),
  },
  {
    href: '/dashboard/calendar',
    icon: Calendar,
    label: t('common.calendar'),
  },
  {
    href: '/dashboard/members',
    icon: Users2,
    label: t('common.members'),
  },
  {
    href: '/dashboard/map',
    icon: Map,
    label: t('common.map'),
  },
  {
    href: '/dashboard/leaderboards',
    icon: Trophy,
    label: t('common.leaderboards'),
  },
  {
    href: '/dashboard/messages',
    icon: MessageSquareDot,
    label: t('common.messages'),
    badge: unreadMessageCount > 0 ? String(unreadMessageCount) : undefined,
  },
  {
    href: '/dashboard/analytics',
    icon: BarChart3,
    label: t('analytics.title'),
  },
  {
    href: '/dashboard/settings',
    icon: Settings,
    label: t('common.settings'),
  },
];

export default function SidebarNav({ isPinned, onPinChange }: SidebarNavProps = {}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { state, toggleSidebar, setOpen } = useSidebar();
  const { data: unreadMessageCount = 0 } = useTotalUnreadMessageCount();

  const isCollapsed = state === 'collapsed';
  const pinned = onPinChange ? Boolean(isPinned) : !isCollapsed;

  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) return pathname === href;
    if (href !== '/dashboard/analytics' && href !== '/dashboard/settings') {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };

  useEffect(() => {
    let ignore = false;
    async function fetchCommunities() {
      setCommunitiesLoading(true);
      try {
        const response = await apiClient.get<{ communities: Community[] }>('/my-communities');
        if (ignore) return;
        const communities = response.data?.communities ?? [];
        setJoinedCommunities(communities.slice(0, 3));
      } catch (error) {
        if (!ignore) {
          console.error('[SidebarNav] failed to load communities', error);
          setJoinedCommunities([]);
        }
      } finally {
        if (!ignore) {
          setCommunitiesLoading(false);
        }
      }
    }
    fetchCommunities();
    return () => {
      ignore = true;
    };
  }, []);

  const toggleLabel = pinned
    ? t('common.sidebar.toggle_collapse')
    : t('common.sidebar.toggle_expand');

  const sectionClasses = 'bg-card/95 border-border/70';

  const handleToggle = () => {
    if (onPinChange) {
      onPinChange(!pinned);
      setOpen(!pinned);
    } else {
      toggleSidebar();
    }
  };

  const navItems = mainNavItems(t, unreadMessageCount);

  return (
    <>
      {/* Toggle Button - Positioned outside sidebar */}
      <Button
        variant="ghost"
        size="icon"
        aria-pressed={pinned}
        aria-label={toggleLabel}
        onClick={handleToggle}
        className={cn(
          "fixed top-[4.5rem] z-50 h-8 w-8 rounded-full border border-border/60 bg-background/95 backdrop-blur text-muted-foreground shadow-lg transition-all duration-300 hover:border-primary/60 hover:text-primary hover:shadow-xl",
          isCollapsed ? "left-[3.75rem]" : "left-[15.25rem]"
        )}
      >
        {pinned ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </Button>



      <SidebarContent className="space-y-4 px-3 py-5 bg-background">
        <SidebarGroup
          className={cn(
            'rounded-xl border px-3 py-3 shadow-sm transition-colors duration-200',
            sectionClasses
          )}
        >
          <div className="flex items-center justify-between group-data-[state=collapsed]:hidden">
            <SidebarGroupLabel className="caps-label text-[10px] font-semibold tracking-[0.28em] text-muted-foreground">
              {t('common.sidebar.browse')}
            </SidebarGroupLabel>
            <Link
              href="/dashboard/communities/create"
              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors duration-200 hover:border-primary/60 hover:text-primary group-data-[state=collapsed]:hidden"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('common.sidebar.create_community_short')}</span>
            </Link>
          </div>
          <SidebarMenu className="mt-2 space-y-1.5">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.label}
                    className={cn(
                      'group relative flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/15 text-primary-foreground'
                        : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
                      'group-data-[state=collapsed]:h-10 group-data-[state=collapsed]:w-10 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:rounded-full'
                    )}
                  >
                    <Link href={item.href} className="flex w-full items-center gap-3">
                      <Icon className="h-[18px] w-[18px]" />
                      <span className="flex-1 truncate group-data-[state=collapsed]:hidden">
                        {item.label}
                      </span>
                      {item.badge && !isCollapsed && (
                        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-muted/30 px-2 text-[11px] font-semibold leading-none">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="space-y-3 px-3 py-4 bg-background">
        {!isCollapsed && (
          <Collapsible open={communitiesOpen} onOpenChange={setCommunitiesOpen}>
            <div
              className={cn(
                'flex items-center justify-between rounded-lg border px-3 py-2 transition-colors duration-200',
                sectionClasses
              )}
            >
              <span className="caps-label text-[11px] text-muted-foreground">
                {t('common.sidebar.joined_heading')}
              </span>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors duration-200 hover:border-primary/50 hover:text-primary">
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      communitiesOpen ? 'rotate-180' : 'rotate-0'
                    )}
                  />
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {communitiesLoading
                  ? Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2"
                      >
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-3 flex-1" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                      </div>
                    ))
                  : joinedCommunities.length > 0
                  ? joinedCommunities.map((community) => (
                      <Link
                        key={community.id}
                        href={`/dashboard/communities/${community.id}`}
                        className="group flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        <Avatar className="h-8 w-8 border border-border/60">
                          <AvatarImage src={getSafeImageUrl(community.cover_image_url)} />
                          <AvatarFallback className="text-xs font-semibold">
                            {community.name?.charAt(0).toUpperCase() ?? 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate text-sm font-medium text-foreground">
                          {community.name}
                        </span>
                        <button
                          type="button"
                          aria-label={t('common.sidebar.favorite_toggle')}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-yellow-500"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      </Link>
                    ))
                  : (
                      <p className="px-3 text-xs text-muted-foreground">
                        {t('common.sidebar.joined_empty')}
                      </p>
                    )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </SidebarFooter>
    </>
  );
}