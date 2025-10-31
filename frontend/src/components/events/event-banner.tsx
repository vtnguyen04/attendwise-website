import Image from 'next/image';
import {
  Calendar,
  CheckCircle,
  Play,
  XCircle,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppEvent } from '@/lib/types';

type StatusInfo = { icon: LucideIcon; text: string; className: string };

const getStatusInfo = (
  status: AppEvent['status'] | 'upcoming' | 'ongoing' | 'past'
): StatusInfo => {
  switch (status) {
    // Admin statuses
    case 'cancelled':
      return {
        icon: XCircle,
        text: 'Cancelled',
        className: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
      };

    case 'ongoing':
      return {
        icon: Play,
        text: 'Ongoing',
        className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
      };
    case 'past':
      return {
        icon: CheckCircle,
        text: 'Completed',
        className: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30',
      };
    case 'upcoming':
    default:
      return {
        icon: Calendar,
        text: 'Upcoming',
        className: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
      };
  }
};

interface EventBannerProps {
  event: AppEvent;
  dynamicStatus: 'upcoming' | 'ongoing' | 'past';
}

export function EventBanner({ event, dynamicStatus }: EventBannerProps) {
  console.log('EventBanner - dynamicStatus:', dynamicStatus);
  const { name, cover_image_url, status: adminStatus } = event;

  // REASONING: The display status prioritizes critical admin states.
  // 1. If the event is cancelled, it MUST show as "Cancelled".
  // 2. Otherwise, show the user-friendly dynamic status (Upcoming, Ongoing, Past).
  const displayStatus = adminStatus === 'cancelled' ? 'cancelled' : dynamicStatus;
  const statusInfo = getStatusInfo(displayStatus);
  const StatusIcon = statusInfo.icon;
  const coverImageUrl = cover_image_url?.Valid ? cover_image_url.String : null;

  return (
    <div className="relative h-64 md:h-80 lg:h-96 -mt-6 -mx-4 md:-mx-6 lg:-mx-8 mb-8 overflow-hidden rounded-b-3xl">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-10" />

      {/* Optimization: Use next/image for performance. `priority` preloads this LCP element. */}
      {coverImageUrl ? (
        <Image
          src={coverImageUrl}
          alt={name}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20">
          <Calendar className="h-24 w-24 text-primary/40" />
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute right-6 top-6 z-20">
        <div
          className={cn(
            'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-sm',
            statusInfo.className
          )}
        >
          <StatusIcon className="h-4 w-4" />
          <span>{statusInfo.text}</span>
        </div>
      </div>
    </div>
  );
}