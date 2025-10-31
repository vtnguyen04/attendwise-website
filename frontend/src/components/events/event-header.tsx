// components/events/event-header.tsx
'use client';

import Image from 'next/image';
import { Share2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { AppEvent } from '@/lib/types';

interface EventHeaderProps {
  event: AppEvent;
  onShare: () => void;
}

export function EventHeader({
  event,
  onShare,
}: EventHeaderProps) {
  const eventName = event.name;
  const creatorName = event.created_by_name;
  const creatorAvatar = event.created_by_avatar?.String;

  return (
    // Assuming 'animate-fade-in-up' is a valid animation class in your project
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tighter">
          {eventName}
        </h1>
        {/* REFACTOR: Use the shadcn/ui Button component for consistency and accessibility */}
        <Button
          onClick={onShare}
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          aria-label="Share event"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Organizer Info */}
      {creatorName && (
        <div className="flex items-center gap-3">
          {/* REFACTOR: Use the shadcn/ui Avatar component suite */}
          <Avatar className="w-12 h-12 ring-2 ring-border">
            {/* REFACTOR: Use next/image for avatar optimization */}
            <AvatarImage asChild src={creatorAvatar}>
              {creatorAvatar && (
                 <Image src={creatorAvatar} alt={creatorName} width={48} height={48} />
              )}
            </AvatarImage>
            <AvatarFallback>
              {creatorName ? (
                creatorName.charAt(0).toUpperCase()
              ) : (
                <User className="w-6 h-6 text-primary" />
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">Organized by</p>
            <p className="font-semibold">{creatorName}</p>
          </div>
        </div>
      )}
    </div>
  );
}