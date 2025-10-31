// components/community/shared/community-list.tsx
'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Users, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import type { Community, User } from '@/lib/types';
import { cn, getSafeImageUrl } from '@/lib/utils';
import apiClient from '@/lib/api-client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CommunityActionButton } from './community-action-button';

// --- NEW REDESIGNED COMMUNITY CARD ---

const CommunityCard = memo(({ community }: { community: Community }) => {
  const coverImageUrl = useMemo(() => 
    getSafeImageUrl(community.cover_image_url) || `http://localhost:9000/attendwise/405a368a0202885cd11310.jpg`,
    [community.cover_image_url, community.id]
  );

  const profileImageUrl = useMemo(() => 
    getSafeImageUrl(community.admin_avatar_url),
    [community.admin_avatar_url]
  );

  const fallbackInitial = useMemo(() => 
    community.name?.charAt(0).toUpperCase() || 'C',
    [community.name]
  );

  const isMember = community.role === 'community_admin' || community.role === 'moderator' || community.role === 'member';
  const cardHref = isMember ? `/dashboard/communities/${community.id}` : '#';

  const { data: memberPreviews } = useQuery<User[]>({ // Fetch member previews
    queryKey: ['communityMemberPreviews', community.id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/communities/${community.id}/member-previews`);
      return response.data.member_previews;
    },
    enabled: !!community.id, // Only run the query if community.id is available
  });

  return (
    <Link href={cardHref} passHref>
    <motion.div 
      className={cn(
        "w-72 h-80 flex flex-col justify-between overflow-hidden rounded-3xl relative group flex-shrink-0",
        "border border-border/60 bg-card/85 shadow-glass backdrop-blur",
        isMember ? 'cursor-pointer transition-transform duration-300' : 'cursor-default'
      )}
      whileHover={{ y: -10, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      {/* Background Image */}
      <Image
        src={coverImageUrl}
        alt={community.name}
        fill
        className="object-cover transition-all duration-500 group-hover:scale-110 filter brightness-75" // Adjusted brightness, removed blur
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent" />

      {/* Content Wrapper */}
      <div className="relative z-10 flex h-full flex-col justify-between p-5 text-card-foreground">
        {/* Top section for privacy badge */}
        <div className="flex">
          {community.type !== 'public' && (
            <Badge variant="secondary" className="border-white/20 bg-white/10 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
              <Lock className="mr-1.5 h-3 w-3" />
              {community.type === 'secret' ? 'Secret' : 'Private'}
            </Badge>
          )}
        </div>

        {/* Middle section for community info */}
        <div className={cn("flex flex-col items-center text-center")}>
          <Avatar className="mb-3 h-20 w-20 border-4 border-white/20 transition-transform duration-300 group-hover:scale-110">
            <AvatarImage src={profileImageUrl} />
            <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
              {fallbackInitial}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-center text-xl font-semibold text-card-foreground transition-colors group-hover:text-primary">
            {community.name}
          </h3>
          <div className="mt-2 flex items-center justify-center text-sm text-muted-foreground">
            <Users className="mr-2 h-4 w-4" />
            {community.member_count.toLocaleString()} members
          </div>

          {/* Member Previews */}
          <div className="flex -space-x-2 overflow-hidden mt-3">
            {memberPreviews?.slice(0, 3).map((member) => (
              <Avatar key={member.id} className="h-7 w-7 border-2 border-white/30">
                <AvatarImage src={getSafeImageUrl(member.profile_picture_url)} />
                <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
            {memberPreviews && community.member_count > 3 && (
              <Avatar className="flex h-7 w-7 items-center justify-center border-2 border-white/30 bg-black/40 text-xs text-white">
                <AvatarFallback>+{community.member_count - 3}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>

        {/* Bottom section for action button */}
        <div className="flex justify-center pt-3">
          <CommunityActionButton community={community} />
        </div>
      </div>
    </motion.div>
    </Link>
  );
});
CommunityCard.displayName = 'CommunityCard';


// --- UPDATED COMMUNITY LIST FOR HORIZONTAL SCROLL ---

export const CommunityList = memo(function CommunityList({
  communities,
  autoScroll = false,
}: {
  communities: Community[];
  autoScroll?: boolean;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (!autoScroll) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId: number;
    let lastTimestamp = performance.now();
    const speed = 0.08; // pixels per ms

    const step = (timestamp: number) => {
      if (isPausedRef.current) {
        lastTimestamp = timestamp;
        rafId = requestAnimationFrame(step);
        return;
      }

      const delta = timestamp - lastTimestamp;
      container.scrollLeft += delta * speed;

      if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 1) {
        container.scrollLeft = 0;
      }

      lastTimestamp = timestamp;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafId);
  }, [autoScroll, communities.length]);

  if (!communities || communities.length === 0) {
    return (
      <div className={"col-span-full text-center py-16 text-muted-foreground"}>
        <p className="text-lg">No communities found.</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="relative w-full h-full overflow-x-auto"
      onMouseEnter={() => (isPausedRef.current = true)}
      onMouseLeave={() => (isPausedRef.current = false)}
    >
      <div className="flex space-x-4 pb-2">
        {communities.map((community) => (
          <CommunityCard key={community.id} community={community} />
        ))}
      </div>
    </div>
  );
});
