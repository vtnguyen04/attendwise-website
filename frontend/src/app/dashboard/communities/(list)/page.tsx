
'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useDebounce } from '@/hooks/use-debounce';

import apiClient from '@/lib/api-client';
import type { Community } from '@/lib/types';

import { CommunityList } from '@/components/community/shared/community-list';
import { getCommunitySuggestions, getMyCommunitiesClient } from '@/lib/services/community.client.service';
import { GlassCard } from '@/components/ui/glass-card';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import Search from 'lucide-react/icons/search';
import Compass from 'lucide-react/icons/compass';
import UsersRound from 'lucide-react/icons/users-round';
import Sparkles from 'lucide-react/icons/sparkles';
import CalendarDays from 'lucide-react/icons/calendar-days';
import Users from 'lucide-react/icons/users';


const CommunitiesSkeleton = () => (
  <div className="overflow-hidden">
    <div className="flex gap-6 pb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <GlassCard key={i} className="w-72 h-80 flex-shrink-0 space-y-3 p-4">
          <Skeleton className="mx-auto h-20 w-20 rounded-full bg-muted/40" />
          <Skeleton className="mx-auto h-6 w-3/4 rounded-lg bg-muted/40" />
          <Skeleton className="mx-auto h-4 w-1/2 rounded-lg bg-muted/40" />
          <Skeleton className="h-10 w-full rounded-lg bg-muted/40" />
        </GlassCard>
      ))}
    </div>
  </div>
);

function ExploreTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { ref, inView } = useInView();

  // Query for browsing all communities (paginated by page)
  const browseQuery = useInfiniteQuery({
    queryKey: ['communities', 'browse'],
    queryFn: async ({ pageParam = 1 }) => {
        const response = await apiClient.get('/api/v1/communities', { params: { page: pageParam, limit: 12 } });
        return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.has_more ? lastPage.pagination.page + 1 : undefined,
    enabled: !debouncedSearchTerm, // Only run when there is no search term
  });

  // Query for searching communities (paginated by offset)
  const searchQuery = useInfiniteQuery({
    queryKey: ['communities', 'search', debouncedSearchTerm],
    queryFn: async ({ pageParam = 0 }) => { // pageParam is the offset
        const response = await apiClient.get('/api/v1/search/communities', { params: { q: debouncedSearchTerm, offset: pageParam, limit: 12 } });
        const communities = response.data.results.map((r: { result: Community }) => r.result);
        return { communities, pagination: { offset: pageParam, has_more: communities.length === 12 } };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.pagination.has_more ? lastPage.pagination.offset + 12 : undefined,
    enabled: !!debouncedSearchTerm, // Only run when there IS a search term
  });

  // Decide which data and functions to use based on whether a search is active
  const isSearching = !!debouncedSearchTerm;
  const communities = useMemo(() => {
    const pages = isSearching ? searchQuery.data?.pages : browseQuery.data?.pages;
    const all = pages?.flatMap(page => page.communities).filter(Boolean) ?? [];
    const communityMap = new Map(all.map(item => [item.id, item]));
    return Array.from(communityMap.values());
  }, [isSearching, searchQuery.data, browseQuery.data]);

  const isFetching = isSearching
    ? searchQuery.isFetching
    : browseQuery.isFetching;
  const isFetchingNextPage = isSearching
    ? searchQuery.isFetchingNextPage
    : browseQuery.isFetchingNextPage;
  const hasNextPage = isSearching
    ? searchQuery.hasNextPage
    : browseQuery.hasNextPage;
  const fetchNextPage = isSearching
    ? searchQuery.fetchNextPage
    : browseQuery.fetchNextPage;
  const loadedPageCount = isSearching
    ? searchQuery.data?.pages?.length ?? 0
    : browseQuery.data?.pages?.length ?? 0;

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
        <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Search communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-muted/50 border-border/50"
            />
        </div>
        
        {(isFetching && !isFetchingNextPage) ? (
            <CommunitiesSkeleton />
        ) : communities.length === 0 && searchTerm ? (
            <p className="text-center py-8 text-muted-foreground">No communities found for &quot;{searchTerm}&quot;.</p>
        ) : (
            <div className="w-full h-80">
              <CommunityList communities={communities} autoScroll />
            </div>
        )}

        <div ref={ref} className="h-10" />

        {isFetchingNextPage && <div className="mt-6"><CommunitiesSkeleton /></div>}

        {!hasNextPage && communities.length > 0 && (
            <p className="text-center py-8 text-muted-foreground">You&apos;ve reached the end.</p>
        )}
    </div>
  );
}

function ForYouTab() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const { data: suggestions, isLoading } = useQuery<Community[]>({
        queryKey: ['community_suggestions'],
        queryFn: getCommunitySuggestions,
    });

    const filteredSuggestions = useMemo(() => {
        if (!suggestions) return [];
        if (!debouncedSearchTerm) return suggestions;

        return suggestions.filter(community =>
            community.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [suggestions, debouncedSearchTerm]);

    const normalizedSuggestions = useMemo(() => {
        const unique = filteredSuggestions
            ? Array.from(new Map(filteredSuggestions.map((c) => [c.id, c])).values())
            : [];
        return unique.map((c) => ({
            ...c,
            description: c.description || { String: 'No description available.', Valid: true },
            member_count: c.member_count || 0,
            admin_name: c.admin_name || 'Admin',
        }));
    }, [filteredSuggestions]);

    console.log({ suggestions, isLoading, normalizedSuggestions });

    if (isLoading) {
        return <CommunitiesSkeleton />;
    }

    return (
      <div className="space-y-6">
        <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Search suggested communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-muted/50 border-border/50"
            />
        </div>
        
        {normalizedSuggestions.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground">
                <p className="text-lg">No community suggestions for you at the moment.</p>
            </div>
        ) : (
            <div className="w-full h-80">
              <CommunityList communities={normalizedSuggestions} autoScroll />
            </div>
        )}
      </div>
    );
}

function MyCommunitiesTab({ communities, isLoading }: { communities: Community[]; isLoading: boolean }) {
  if (isLoading) return <CommunitiesSkeleton />;

  if (!communities || communities.length === 0) {
    return (
      <GlassCard className="rounded-3xl border-border/60 bg-card/85 backdrop-blur">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <Sparkles className="h-6 w-6 text-primary" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">No communities yet</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Launch your own space or browse the explore tab to start building connections.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild className="rounded-full px-5">
              <Link href="/dashboard/communities/create">Create community</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-border/60 px-5">
              <Link href="/dashboard">Go to feed</Link>
            </Button>
          </div>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Communities you&apos;re part of. Keep sharing updates and hosting events with your members.
      </p>
      <div className="w-full h-80">
        <CommunityList communities={communities} autoScroll />
      </div>
    </div>
  );
}

function CommunitySidebar({ communities, isLoading }: { communities: Community[]; isLoading: boolean }) {
  return (
    <div className="space-y-6">
      <GlassCard className="rounded-3xl border-border/60 bg-card/85 backdrop-blur">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">Quick actions</h3>
            <p className="text-sm text-muted-foreground">Spin up something new or schedule your next session.</p>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full justify-start gap-2 rounded-xl px-4">
              <Link href="/dashboard/communities/create">
                <UsersRound className="h-4 w-4" />
                Create community
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2 rounded-xl border-border/60 px-4">
              <Link href="/dashboard/events/new">
                <CalendarDays className="h-4 w-4" />
                Create event
              </Link>
            </Button>
          </div>
        </CardContent>
      </GlassCard>

      <GlassCard className="rounded-3xl border-border/60 bg-card/85 backdrop-blur">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">My communities</h3>
            {communities.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {communities.length}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 rounded-xl bg-muted/30" />
              ))}
            </div>
          ) : communities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Join or create a community to see it here.</p>
          ) : (
            <div className="space-y-2">
              {communities.slice(0, 5).map((community) => (
                <Link
                  key={community.id}
                  href={`/dashboard/communities/${community.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-foreground transition-all hover:border-primary/30 hover:text-primary"
                >
                  <span className="truncate font-medium">{community.name}</span>
                  <Users className="h-4 w-4 opacity-70" />
                </Link>
              ))}
              {communities.length > 5 && (
                <Button variant="ghost" asChild className="w-full justify-start px-3 text-sm text-muted-foreground hover:text-primary">
                  <Link href="/dashboard/communities/my">View all</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </GlassCard>
    </div>
  );
}

export default function CommunitiesPage() {
  const { data: myCommunities = [], isLoading: isLoadingMine } = useQuery<Community[]>({
    queryKey: ['communities', 'mine'],
    queryFn: getMyCommunitiesClient,
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8">
        <GlassCard className="rounded-3xl border-border/60 bg-card/90 p-6 shadow-glass backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                <Compass className="h-3.5 w-3.5" /> Community hub
              </span>
              <div>
                <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Communities</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Discover new spaces, nurture the groups you manage, and bring people together with events.
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        <Tabs defaultValue="explore" className="w-full">
          <TabsList className="flex w-full flex-wrap gap-2 rounded-full border border-border/60 bg-card/80 p-1 backdrop-blur">
            <TabsTrigger value="explore" className="flex-1 rounded-full">Explore</TabsTrigger>
            <TabsTrigger value="for-you" className="flex-1 rounded-full">For you</TabsTrigger>
            <TabsTrigger value="mine" className="flex-1 rounded-full">My communities</TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="mt-6">
            <ExploreTab />
          </TabsContent>
          <TabsContent value="for-you" className="mt-6">
            <ForYouTab />
          </TabsContent>
          <TabsContent value="mine" className="mt-6">
            <MyCommunitiesTab communities={myCommunities} isLoading={isLoadingMine} />
          </TabsContent>
        </Tabs>
      </div>

      <CommunitySidebar communities={myCommunities} isLoading={isLoadingMine} />
    </div>
  );
}
