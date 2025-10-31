'use client';

import { useState } from 'react';
import { CommunityProfileCard } from './CommunityProfileCard';
import { Community } from '@/lib/types';
import { Menu } from 'lucide-react';

interface HoverableProfileCardProps {
  community: Community;
}

export function HoverableProfileCard({ community }: HoverableProfileCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-2 bg-glass rounded-md cursor-pointer">
        <Menu className="h-6 w-6 text-white" />
      </div>
      {isHovered && (
        <div className="absolute top-0 right-0 mt-12">
          <div className="w-96">
            <CommunityProfileCard community={community} />
          </div>
        </div>
      )}
    </div>
  );
}