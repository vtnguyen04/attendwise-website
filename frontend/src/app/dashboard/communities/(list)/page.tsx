'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

import apiClient from '@/lib/api-client';
import type { Community } from '@/lib/types';

import { CommunityList } from '@/components/community/shared/community-list';
import { getCommunitySuggestions } from '@/lib/services/community.client.service';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getSafeImageUrl } from '@/lib/utils';
import Search from 'lucide-react/icons/search';
import Compass from 'lucide-react/icons/compass';
import UsersRound from 'lucide-react/icons/users-round';
import Sparkles from 'lucide-react/icons/sparkles';
import CalendarDays from 'lucide-react/icons/calendar-days';
import Users from 'lucide-react/icons/users';
import TrendingUp from 'lucide-react/icons/trending-up';
import ToggleLeft from 'lucide-react/icons/toggle-left';
import ToggleRight from 'lucide-react/icons/toggle-right';
import { useTranslation } from '@/hooks/use-translation';

const CommunitiesSkeleton = () => (
  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="dashboard-mini-card h-80 space-y-4 p-6">
        <Skeleton className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-muted/60 to-muted/30" />
        <Skeleton className="mx-auto h-6 w-3/4 rounded-lg bg-muted/50" />
        <Skeleton className="mx-auto h-4 w-1/2 rounded-lg bg-muted/40" />
        <Skeleton className="h-11 w-full rounded-xl bg-muted/50" />
      </div>
    ))}
  </div>
);

function ExploreTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearchTerm = searchTerm.trim();
  const { t } = useTranslation('community');
  const { ref, inView } = useInView();

  const browseQuery = useInfiniteQuery({
    queryKey: ['communities', 'browse'],
    queryFn: async ({ pageParam = 1 }) => {
        const response = await apiClient.get('/communities', { params: { page: pageParam, limit: 12 } });
        const communities = response.data.communities || [];
        const hasMore = communities.length === 12;
        return { communities: communities, pagination: { page: pageParam, has_more: hasMore } };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.has_more ? lastPage.pagination.page + 1 : undefined,
    enabled: normalizedSearchTerm.length === 0,
  });

  const searchQuery = useInfiniteQuery({
    queryKey: ['communities', 'search', normalizedSearchTerm],
    queryFn: async ({ pageParam = 0 }) => {
        const response = await apiClient.get('/search', { params: { q: normalizedSearchTerm, type:"community", offset: pageParam, limit: 12 } });
        const communities = response.data.results.map((r: { result: Community }) => r.result);
        return { communities, pagination: { offset: pageParam, has_more: communities.length === 12 } };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.pagination.has_more ? lastPage.pagination.offset + 12 : undefined,
    enabled: normalizedSearchTerm.length > 0,
  });

  const isSearching = normalizedSearchTerm.length > 0;
  const communities = useMemo(() => {
    const pages = isSearching ? searchQuery.data?.pages : browseQuery.data?.pages;
    const all = pages?.flatMap(page => page.communities).filter(Boolean) ?? [];
    const communityMap = new Map(all.map(item => [item.id, item]));
    return Array.from(communityMap.values());
  }, [isSearching, searchQuery.data, browseQuery.data]);

  const isFetching = isSearching ? searchQuery.isFetching : browseQuery.isFetching;
  const isFetchingNextPage = isSearching ? searchQuery.isFetchingNextPage : browseQuery.isFetchingNextPage;
  const hasNextPage = isSearching ? searchQuery.hasNextPage : browseQuery.hasNextPage;
  const fetchNextPage = isSearching ? searchQuery.fetchNextPage : browseQuery.fetchNextPage;
  const loadedPageCount = isSearching ? searchQuery.data?.pages?.length ?? 0 : browseQuery.data?.pages?.length ?? 0;

  const wasInViewRef = useRef(false);
  useEffect(() => {
    const wasInView = wasInViewRef.current;
    if (inView && !wasInView && hasNextPage && !isFetchingNextPage && loadedPageCount > 0) {
      fetchNextPage();
    }
    wasInViewRef.current = inView;
  }, [inView, hasNextPage, isFetchingNextPage, loadedPageCount, fetchNextPage]);

  return (
    <div className="space-y-6">
        <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary" />
            <Input 
                placeholder={t('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-2xl bg-muted/30 border-border/50 backdrop-blur-md transition-all duration-300 focus:border-primary/50 focus:bg-muted/40 focus:shadow-lg focus:shadow-primary/10"
            />
        </div>
        
        {(isFetching && !isFetchingNextPage) ? (
            <CommunitiesSkeleton />
        ) : communities.length === 0 && searchTerm ? (
            <div className="dashboard-panel-muted text-center py-16 rounded-2xl">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">{t('search.no_results', { searchTerm })}</p>
                <p className="text-sm text-muted-foreground/70 mt-2">{t('search.try_keywords')}</p>
            </div>
        ) : (
            <div className="w-full h-80">
              <CommunityList communities={communities} autoScroll />
            </div>
        )}

        <div ref={ref} className="h-10" />

        {isFetchingNextPage && <div className="mt-6"><CommunitiesSkeleton /></div>}

        {!hasNextPage && communities.length > 0 && (
            <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 backdrop-blur-sm border border-border/50">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">{t('search.reached_end')}</span>
                </div>
            </div>
        )}
    </div>
  );
}

function ForYouTab() {
    const [searchTerm, setSearchTerm] = useState('');
    const normalizedSearchTerm = searchTerm.trim();
    const { t } = useTranslation('community');

    const { data: suggestions, isLoading } = useQuery<Community[]>({
        queryKey: ['community_suggestions'],
        queryFn: getCommunitySuggestions,
    });

    const filteredSuggestions = useMemo(() => {
        if (!suggestions) return [];
        if (!normalizedSearchTerm) return suggestions;

        return suggestions.filter(community =>
            community.name.toLowerCase().includes(normalizedSearchTerm.toLowerCase())
        );
    }, [suggestions, normalizedSearchTerm]);

    const normalizedSuggestions = useMemo(() => {
        const unique = filteredSuggestions
            ? Array.from(new Map(filteredSuggestions.map((c) => [c.id, c])).values())
            : [];
        return unique.map((c) => ({
            ...c,
            description: c.description || { String: t('no_description'), Valid: true },
            member_count: c.member_count || 0,
            admin_name: c.admin_name || t('admin.default_name'),
        }));
    }, [filteredSuggestions, t]);

    if (isLoading) {
        return <CommunitiesSkeleton />;
    }

    return (
      <div className="space-y-6">
        <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary" />
            <Input 
                placeholder={t('suggested.search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-2xl bg-muted/30 border-border/50 backdrop-blur-md transition-all duration-300 focus:border-primary/50 focus:bg-muted/40 focus:shadow-lg focus:shadow-primary/10"
            />
        </div>
        
        {normalizedSuggestions.length === 0 ? (
            <div className="dashboard-panel-muted text-center py-16 rounded-2xl">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">{t('suggested.no_suggestions')}</p>
                <p className="text-sm text-muted-foreground/70 mt-2">{t('suggested.check_back')}</p>
            </div>
        ) : (
            <div className="w-full h-80">
              <CommunityList communities={normalizedSuggestions} autoScroll />
            </div>
        )}
      </div>
    );
}

function CommunitySidebar({ onCollapse }: { onCollapse: () => void }) {
  const { data: suggestions } = useQuery<Community[]>({
    queryKey: ['community_suggestions', 'sidebar'],
    queryFn: getCommunitySuggestions,
  });

  const { data: myCommunities } = useQuery<Community[]>({
    queryKey: ['my-communities'],
    queryFn: async () => {
      const response = await apiClient.get('/my-communities');
      return response.data.communities ?? [];
    },
    staleTime: 60_000,
  });

  const joinedCommunities = useMemo(
    () => (myCommunities ?? []).filter((community) => community.status === 'active'),
    [myCommunities]
  );

  const snapshotCounts = useMemo(
    () => ({
      joined: joinedCommunities.length,
      members: joinedCommunities.reduce((sum, community) => sum + (community.member_count || 0), 0),
    }),
    [joinedCommunities]
  );

  const topSuggestions = useMemo(() => suggestions?.slice(0, 3) ?? [], [suggestions]);
  const { t } = useTranslation('community');

  return (
    <div className="w-full space-y-6 lg:space-y-8 lg:sticky lg:top-24 lg:max-w-[360px]">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="liquid-glass-button"
          onClick={onCollapse}
          aria-label={t('sidebar.collapse')}
        >
          <ToggleLeft className="h-5 w-5" />
        </Button>
      </div>
      <div className="dashboard-panel-accent rounded-2xl p-6 shadow-glass">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h3 className="caps-label text-sm text-foreground/90">{t('quick_actions.title')}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('quick_actions.description')}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              asChild
              className="w-full justify-start gap-3 h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/dashboard/communities/create">
                <div className="p-1.5 rounded-lg bg-white/20">
                  <UsersRound className="h-4 w-4" />
                </div>
                {t('create.button')}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-3 h-12 font-semibold border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
            >
              <Link href="/dashboard/events/new">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                {t('event.create.button')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="dashboard-panel rounded-2xl p-6">
        <h3 className="caps-label text-sm text-muted-foreground">
          {t('snapshot.title')}
        </h3>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
            <p className="caps-label text-xs text-muted-foreground/70">{t('snapshot.joined')}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshotCounts.joined.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
            <p className="caps-label text-xs text-muted-foreground/70">{t('snapshot.members_reached')}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshotCounts.members.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {topSuggestions.length > 0 && (
        <div className="dashboard-panel rounded-2xl p-6">
          <h3 className="caps-label text-sm text-muted-foreground">
            {t('suggested_for_you.title')}
          </h3>
          <div className="mt-4 space-y-3">
            {topSuggestions.map((community) => (
              <Link
                key={community.id}
                href={`/dashboard/communities/${community.id}`}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getSafeImageUrl(community.cover_image_url)} />
                  <AvatarFallback>{(community.name?.charAt(0).toUpperCase() ?? 'C')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{community.name}</p>
                  <p className="text-xs text-muted-foreground">{community.member_count.toLocaleString()} {t('members_count')}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunitiesPage() {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('communitySidebarCollapsed');
      return stored === 'true';
    }
    return false;
  });


  // useEffect(() => {
  //   const stored = window.localStorage.getItem('communitySidebarCollapsed');
  //   setIsSidebarCollapsed(stored === 'true');
  // }, []);
  const { t } = useTranslation('community');
  const [activeTab, setActiveTab] = useState('explore');

  useEffect(() => {
    const element = document.querySelector(`[data-scroll-target="${activeTab}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeTab]);

  const handleSidebarCollapsedChange = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('communitySidebarCollapsed', String(collapsed));
    }
  }, []);

  const gridClasses = cn(
    'grid w-full grid-cols-1 gap-8 lg:gap-10 items-start',
    isSidebarCollapsed
      ? 'lg:grid-cols-1'
      : 'lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)] xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,0.9fr)]'
  );

  const handleTabChange = useCallback((value: string) => {
    if (value === 'mine') {
      router.push('/dashboard/communities/my');
      return;
    }
    setActiveTab(value);
  }, [router]);

  return (
    <div className={gridClasses}>
      <div className="relative flex min-w-0 flex-col space-y-8">
        {isSidebarCollapsed && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="liquid-glass-button inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
              onClick={() => handleSidebarCollapsedChange(false)}
            >
              <ToggleRight className="h-5 w-5" />
              {t('show_insights')}
            </Button>
          </div>
        )}
        <div className="dashboard-panel p-8 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-1.5 text-xs caps-label text-primary backdrop-blur-sm shadow-lg shadow-primary/10">
                <Compass className="h-3.5 w-3.5" /> {t('hub.badge')}
              </span>
              <div>
                <h1 className="text-4xl font-bold leading-[1.7] bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent sm:text-5xl pb-2">
  {t('title')}
</h1>
                <p className="mt-3 max-w-2xl text-base text-muted-foreground leading-relaxed">
                  {t('description')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="explore" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="dashboard-toolbar gap-2 p-2" data-scroll-anchor>
            <TabsTrigger 
              value="explore" 
              className="toolbar-pill flex-1 h-11 data-[state=active]:shadow-lg"
            >
              <Compass className="h-4 w-4 mr-2" />
              {t('explore_tab')}
            </TabsTrigger>
            <TabsTrigger 
              value="for-you" 
              className="toolbar-pill flex-1 h-11 data-[state=active]:shadow-lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t('for_you_tab')}
            </TabsTrigger>
            <TabsTrigger 
              value="mine" 
              className="toolbar-pill flex-1 h-11 data-[state=active]:shadow-lg"
            >
              <Users className="h-4 w-4 mr-2" />
              {t('my_communities_tab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="mt-8" data-scroll-target="explore">
            <ExploreTab />
          </TabsContent>
          <TabsContent value="for-you" className="mt-8" data-scroll-target="for-you">
            <ForYouTab />
          </TabsContent>
        </Tabs>
      </div>

      {!isSidebarCollapsed && (
        <CommunitySidebar onCollapse={() => handleSidebarCollapsedChange(true)} />
      )}
    </div>
  );
}
