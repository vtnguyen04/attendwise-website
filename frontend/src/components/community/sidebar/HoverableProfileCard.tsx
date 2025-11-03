'use client';

import { CommunityProfileCard } from './CommunityProfileCard';
import { Community } from '@/lib/types';
import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface HoverableProfileCardProps {
  community: Community;
}

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function HoverableProfileCard({ community }: HoverableProfileCardProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <CommunityProfileCard community={community} />
      </PopoverContent>
    </Popover>
  );
}