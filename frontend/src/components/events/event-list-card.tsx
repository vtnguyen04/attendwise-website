// components/events/event-list-card.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { DisplayEvent } from '@/lib/adapters/event-list.adapter';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface EventListCardProps {
  event: DisplayEvent;
  className?: string;
}

// --- Helper Functions for formatting ---
const getDayOfWeek = (dateString: string) => new Date(dateString).toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
const getDayOfMonth = (dateString: string) => new Date(dateString).toLocaleDateString(undefined, { day: '2-digit' });
const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

// --- Sub-components ---
const EventStatusButton = ({ status, isRegistered }: { status: DisplayEvent['status'], isRegistered: boolean }) => {
  const { t } = useTranslation('events');
  if (status === 'past') {
    return <Button variant="outline" size="sm" className="cursor-default bg-transparent border-white/20 text-white/80 hover:bg-white/10">{t('status.ended')}</Button>;
  }
  if (isRegistered) {
    return <Button variant="secondary" size="sm" className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">{t('status.registered')}</Button>;
  }
  return <Button variant="default" size="sm">{t('status.register')}</Button>;
};

const BackgroundCover = ({ imageUrl, alt }: { imageUrl: string, alt: string }) => {
  if (!imageUrl) return null;
  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105 filter blur-sm brightness-50"
    />
  );
};

export default function EventListCard({ event, className }: EventListCardProps) {
  const { t } = useTranslation('events');
  if (!event || !event.startTime || !event.endTime) {
    return null; // Don't render card if event or time is missing
  }

  const { eventId, name, startTime, endTime, status, isRegistered, coverImageUrl } = event;

  const dayOfWeek = getDayOfWeek(startTime);
  const dayOfMonth = getDayOfMonth(startTime);
  const timeRange = `${formatTime(startTime)} - ${formatTime(endTime)}`;

  const targetHref = `/dashboard/events/${eventId}`;

  return (
    <Link href={targetHref} passHref className="group">
      <GlassCard
        effect="magnify"
        className={cn(
          "p-0 flex flex-col items-start overflow-hidden relative min-h-[280px]",
          "border-glass-border bg-transparent",
          className
        )}
      >
        {/* Background Image */}
        <BackgroundCover imageUrl={coverImageUrl} alt={name} />

        {/* Overlay for content readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:from-black/80 group-hover:via-black/50 transition-colors duration-300" />

        {/* Date Badge - Fixed position at top */}
        <div className="absolute top-4 left-4 z-20 flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-sm">
          <span className="text-xs font-bold tracking-wider">{dayOfWeek}</span>
          <span className="text-2xl font-extrabold">{dayOfMonth}</span>
        </div>

        {/* Content Container - Pushes content to bottom */}
        <div className="relative z-10 w-full h-full flex flex-col justify-end p-6 pt-24">
          {/* Main Content Section */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-xl text-white line-clamp-2 leading-tight">
              {name}
            </h3>
            
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{timeRange}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{t('location.online')}</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-2">
              <EventStatusButton status={status} isRegistered={isRegistered} />
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}