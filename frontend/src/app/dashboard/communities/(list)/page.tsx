
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useDebounce } from '@/hooks/use-debounce';

import apiClient from '@/lib/api-client';
import type { Community } from '@/lib/types';

import { CommunityList } from '@/components/community/shared/community-list';
import { getCommunitySuggestions } from '@/lib/services/community.client.service';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Search from 'lucide-react/icons/search';
import Compass from 'lucide-react/icons/compass';


const CommunitiesSkeleton = () => (
  <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4">
    <div className="flex gap-6 pb-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="w-72 h-80 flex-shrink-0 space-y-3 glass-interactive rounded-2xl p-4">
          <Skeleton className="h-20 w-20 rounded-full mx-auto bg-muted/50" />
          <Skeleton className="h-6 w-3/4 rounded-lg mx-auto bg-muted/50" />
          <Skeleton className="h-4 w-1/2 rounded-lg mx-auto bg-muted/50" />
          <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
        </div>
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
        const communities = response.data.results.map((r: any) => r.result);
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
            <p className="text-center py-8 text-muted-foreground">No communities found for "{searchTerm}".</p>
        ) : (
            <div className="w-full h-80">
              <CommunityList communities={communities} />
            </div>
        )}

        <div ref={ref} className="h-10" />

        {isFetchingNextPage && <div className="mt-6"><CommunitiesSkeleton /></div>}

        {!hasNextPage && communities.length > 0 && (
            <p className="text-center py-8 text-muted-foreground">You've reached the end.</p>
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
              <CommunityList communities={normalizedSuggestions} />
            </div>
        )}
      </div>
    );
}

export default function CommunitiesPage() {
  return (
    <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold flex items-center gap-3 text-foreground">
            <Compass className="h-10 w-10 text-primary"/>
            Explore Communities
          </h1>
          <p className="text-lg text-muted-foreground">
            Find and join communities that match your interests.
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] glass-container p-1 h-auto">
            <TabsTrigger value="all">Explore</TabsTrigger>
            <TabsTrigger value="suggested">For You</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
            <ExploreTab />
        </TabsContent>
        <TabsContent value="suggested" className="mt-6">
            <ForYouTab />
        </TabsContent>
        </Tabs>
    </div>
  );
}
