// components/community/shared/community-list.tsx
'use client';

import { memo, useMemo } from 'react';
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

interface CommunityCardProps {
  community: Community;
}

const CommunityCard = memo(({ community }: CommunityCardProps) => {
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
        "w-72 h-80 flex flex-col justify-between overflow-hidden rounded-2xl relative group flex-shrink-0 mr-6", // Added flex-shrink-0 and mr-6 for spacing
        "border border-white/10 shadow-lg",
        isMember ? 'cursor-pointer' : 'cursor-default'
      )}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Background Image */}
      <Image
        src={coverImageUrl}
        alt={community.name}
        fill
        className="object-cover transition-all duration-500 group-hover:scale-110 filter brightness-75" // Adjusted brightness, removed blur
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col justify-between h-full p-5 text-white">
        {/* Top section for privacy badge */}
        <div className="flex">
          {community.type !== 'public' && (
            <Badge variant="secondary" className="bg-black/30 border-white/20 text-white/90 backdrop-blur-sm">
              <Lock className="h-3 w-3 mr-1.5" />
              {community.type === 'secret' ? 'Secret' : 'Private'}
            </Badge>
          )}
        </div>

        {/* Middle section for community info */}
        <div className={cn("flex flex-col items-center text-center")}>
          <Avatar className="h-20 w-20 border-4 border-white/20 mb-3 transition-transform duration-300 group-hover:scale-110">
            <AvatarImage src={profileImageUrl} />
            <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
              {fallbackInitial}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
            {community.name}
          </h3>
          {/* Member count with static icon */}
          <div className="flex items-center justify-center mt-2">
            <Users className="h-4 w-4 mr-2 text-white/80" />
            <p className="text-sm text-white/80">{community.member_count.toLocaleString()} members</p>
          </div>

          {/* Member Previews */}
          <div className="flex -space-x-2 overflow-hidden mt-3">
            {memberPreviews?.slice(0, 3).map((member) => (
              <Avatar key={member.id} className="h-7 w-7 border-2 border-white/20">
                <AvatarImage src={getSafeImageUrl(member.profile_picture_url)} />
                <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
            {memberPreviews && community.member_count > 3 && (
              <Avatar className="h-7 w-7 border-2 border-white/20 bg-gray-700 text-white text-xs flex items-center justify-center">
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
}: {
  communities: Community[],
}) {
  if (!communities || communities.length === 0) {
    return (
      <div className={"col-span-full text-center py-16 text-muted-foreground"}>
        <p className="text-lg">No communities found.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-x-auto">
      <div className="flex space-x-4">
        {communities.map((community) => (
          <CommunityCard key={community.id} community={community} />
        ))}
      </div>
    </div>
  );
});