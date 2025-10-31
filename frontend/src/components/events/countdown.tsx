'use client';

import { cn } from '@/lib/utils';
import { Duration } from 'date-fns';
import { useCountdown } from '@/hooks/use-countdown';
import { useCallback } from 'react';

// A small, reusable component for each time unit.
const TimeBlock = ({ value, label }: { value: number | undefined; label: string }) => {
  const formattedValue = String(value || 0).padStart(2, '0');

  return (
    <div className="relative group">
      <div
        className={cn(
          'glass-card p-4 rounded-xl text-center transition-all duration-300',
          'hover:scale-105 cursor-default border border-border/50'
        )}
      >
        <div className="text-3xl md:text-4xl font-bold mb-1 tabular-nums">
          {formattedValue}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
      </div>
    </div>
  );
};

// The "Event Starting" banner when the countdown finishes.
const EventStartingBanner = () => (
  <div className="text-center py-6 animate-fade-in">
    <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border-2 border-green-500/30">
      <div className="relative">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute" />
        <div className="w-3 h-3 bg-green-500 rounded-full" />
      </div>
      <span className="text-lg font-semibold text-green-600 dark:text-green-400">
        Event is starting now!
      </span>
    </div>
  </div>
);

interface CountdownProps {
  targetDate: string;
  onEventStart: () => void;
}

export function Countdown({ targetDate, onEventStart }: CountdownProps) {
  // Logic is now encapsulated in the custom hook.
  // We use useCallback to ensure the onEventStart function reference is stable.
  const handleEventStart = useCallback(() => {
    onEventStart();
  }, [onEventStart]);

  const timeLeft: Duration | null = useCountdown(targetDate, handleEventStart);

  // If the hook returns null, it means the time is up.
  if (!timeLeft) {
    return <EventStartingBanner />;
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      <TimeBlock value={timeLeft.days} label="Days" />
      <TimeBlock value={timeLeft.hours} label="Hours" />
      <TimeBlock value={timeLeft.minutes} label="Minutes" />
      <TimeBlock value={timeLeft.seconds} label="Seconds" />
    </div>
  );
}