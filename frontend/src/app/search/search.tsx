"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { UnifiedSearchResult, User, Community, AppEvent, Post } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNullableStringValue } from "@/lib/utils";
import Link from "next/link";

// Helper component to render different search result types
const SearchResultItem = React.memo(({ result }: { result: UnifiedSearchResult }) => {
  const renderContent = () => {
    switch (result.type) {
      case "user":
        const userResult = result.result as User;
        return (
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10 shadow-glass">
              <AvatarImage src={getNullableStringValue(userResult.profile_picture_url) || undefined} />
              <AvatarFallback>{userResult.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{userResult.name}</p>
              <p className="text-sm text-muted-foreground">{userResult.email}</p>
            </div>
          </div>
        );
      case "community":
        const communityResult = result.result as Community;
        return (
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10 shadow-glass rounded-lg">
              <AvatarImage src={getNullableStringValue(communityResult.cover_image_url) || undefined} />
              <AvatarFallback>{communityResult.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{communityResult.name}</p>
              <p className="text-sm text-muted-foreground">{getNullableStringValue(communityResult.description)}</p>
            </div>
          </div>
        );
      case "event":
        const eventResult = result.result as AppEvent;
        return (
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10 shadow-glass rounded-lg">
              <AvatarImage src={getNullableStringValue(eventResult.cover_image_url) || undefined} />
              <AvatarFallback>{eventResult.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{eventResult.name}</p>
              <p className="text-sm text-muted-foreground">{eventResult.start_time?.Time ? new Date(eventResult.start_time.Time).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        );
      case "post":
        const postResult = result.result as Post;
        return (
          <div className="flex items-center space-x-4">
            <Icons.default className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{postResult.content.substring(0, 50)}...</p>
              <p className="text-sm text-muted-foreground">By {postResult.author.name}</p>
            </div>
          </div>
        );
      default:
        return <p className="text-muted-foreground">Unknown result type</p>;
    }
  };

  const getLink = () => {
    switch (result.type) {
      case "user":
        return `/profile/${(result.result as User).id}`;
      case "community":
        return `/community/${(result.result as Community).slug}`;
      case "event":
        return `/event/${(result.result as AppEvent).slug}`;
      case "post":
        return `/post/${(result.result as Post).id}`;
      default:
        return "#";
    }
  };

  return (
    <Link href={getLink()} className="block">
      <GlassCard className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors">
        {renderContent()}
        <span className="text-sm text-muted-foreground">Rank: {result.rank.toFixed(2)}</span>
      </GlassCard>
    </Link>
  );
});

SearchResultItem.displayName = "SearchResultItem";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10; // Number of results per page

  const performSearch = useCallback(async (query: string, page: number) => {
    if (!query) {
      setResults([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const response = await apiClient.get("/api/v1/search", {
        params: { q: query, limit, offset },
      });
      setResults(response.data.results);
      setHasMore(response.data.results.length === limit);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform search.",
        variant: "destructive",
      });
      setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [limit, toast]);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchTerm(query);
      performSearch(query, currentPage);
    }
  }, [searchParams, performSearch, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    router.push(`/search?q=${searchTerm}`);
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
    router.push(`/search?q=${searchTerm}&page=${currentPage + 1}`);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => prev - 1);
    router.push(`/search?q=${searchTerm}&page=${currentPage - 1}`);
  };

  return (
    <>
      <GlassCard className="p-6 mb-8">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <Input
            type="text"
            placeholder="Search users, communities, events, posts..."
            className="liquid-glass-input flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit" disabled={loading} className="liquid-glass-button">
            {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Search
          </Button>
        </form>
      </GlassCard>

      {loading && results.length === 0 ? (
        <GlassCard className="p-6 text-center">
          <Icons.spinner className="mr-2 h-6 w-6 animate-spin inline-block" />{" "}
          Searching...
        </GlassCard>
      ) : results.length === 0 && searchTerm ? (
        <GlassCard className="p-6 text-center">
          No results found for "{searchTerm}".
        </GlassCard>
      ) : results.length === 0 && !searchTerm ? (
        <GlassCard className="p-6 text-center">
          Start typing to search.
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <SearchResultItem key={result.type + result.result.id} result={result} />
          ))}
          <div className="flex justify-between mt-4">
            <Button onClick={handlePrevPage} disabled={currentPage === 1 || loading} className="liquid-glass-button">
              Previous
            </Button>
            <Button onClick={handleNextPage} disabled={!hasMore || loading} className="liquid-glass-button">
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Search() {
    return <SearchContent />;
}