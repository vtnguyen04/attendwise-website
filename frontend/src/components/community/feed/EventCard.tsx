'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin } from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { EventItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: EventItem;
  className?: string;
}

const statusStyles: Record<EventItem['status'], string> = {
  upcoming: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  ongoing: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  past: 'border-muted bg-transparent text-muted-foreground',
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const formatTime = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export function EventCard({ event, className }: EventCardProps) {
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const dateLabel = formatDateLabel(startDate);
  const timeRange = `${formatTime(startDate)} – ${formatTime(endDate)}`;
  const isOnline = event.location_type?.toLowerCase() === 'online';

  const initials = event.created_by_name
    ?.split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const statusLabel = {
    upcoming: 'Upcoming',
    ongoing: 'Ongoing',
    past: 'Past',
  }[event.status];
  const buttonLabel =
    event.status === 'past'
      ? 'Ended'
      : event.is_registered
      ? 'Registered'
      : 'Register';

  return (
    <Link
      href={`/dashboard/events/${event.event_id}`}
      className={cn('group block', className)}
    >
      <GlassCard className="overflow-hidden border border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:border-primary/60 hover:shadow-lg">
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted sm:w-48">
            {event.cover_image_url?.Valid && event.cover_image_url.String ? (
              <Image
                src={event.cover_image_url.String}
                alt={event.event_name}
                fill
                sizes="(min-width: 768px) 12rem, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <CalendarDays className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">
                {event.event_name}
              </h3>
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide',
                  statusStyles[event.status]
                )}
              >
                {statusLabel}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>{dateLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{timeRange}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{isOnline ? 'Online' : event.location_address?.String || 'Location TBA'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border/60">
                  {event.created_by_avatar ? (
                    <AvatarImage src={event.created_by_avatar} alt={event.created_by_name} />
                  ) : null}
                  <AvatarFallback>{initials || 'EV'}</AvatarFallback>
                </Avatar>
                <div className="text-sm leading-tight">
                  <p className="font-medium text-foreground">{event.created_by_name}</p>
                  <p className="text-muted-foreground/80">Hosted by</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={
                  event.status === 'past'
                    ? 'outline'
                    : event.is_registered
                    ? 'secondary'
                    : 'default'
                }
                className={cn(
                  event.status === 'past' && 'cursor-default opacity-80',
                  event.is_registered && event.status !== 'past' && 'cursor-default'
                )}
              >
                {buttonLabel}
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
