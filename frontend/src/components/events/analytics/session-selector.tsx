// app/events/[eventId]/analytics/components/session-selector.tsx
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EventSession } from '@/lib/types';
import { Calendar, Clock } from 'lucide-react';
import { formatInTimezone } from '@/lib/utils';

interface SessionSelectorProps {
  sessions: EventSession[];
  selectedSessionId: string;
  onSessionChange: (sessionId: string) => void;
  disabled?: boolean;
  timezone?: string;
}

export function SessionSelector({
  sessions,
  selectedSessionId,
  onSessionChange,
  disabled,
  timezone = 'UTC',
}: SessionSelectorProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
          <Calendar className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">This event has no sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label htmlFor="session-select" className="flex items-center gap-2 text-sm font-semibold">
        <Calendar className="h-4 w-4 text-primary" />
        Select Session
      </label>
      <Select
        value={selectedSessionId}
        onValueChange={onSessionChange}
        disabled={disabled}
      >
        <SelectTrigger 
          id="session-select" 
          className="glass-card w-full md:w-[320px] h-12 border-glass-border hover:border-glass-border-hover transition-colors"
        >
          <SelectValue placeholder="Select a session to view analytics" />
        </SelectTrigger>
        <SelectContent className="glass-card border-glass-border">
          {sessions.map((session, index) => {
            const startTime = new Date(session.start_time);
            const now = new Date();
            const isUpcoming = startTime > now;
            const isPast = startTime < now;
            const tz = session.timezone || timezone;
             
            return (
              <SelectItem 
                key={session.id} 
                value={session.id}
                className="focus:bg-primary/10 cursor-pointer"
              >
                <div className="flex items-center gap-3 py-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {formatInTimezone(startTime, tz, 'MMM dd, yyyy')}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatInTimezone(startTime, tz, 'h:mm a')}</span>
                      {isUpcoming && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Upcoming
                        </span>
                      )}
                      {isPast && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          Past
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
