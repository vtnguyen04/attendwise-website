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

interface SessionSelectorProps {
  sessions: EventSession[];
  selectedSessionId: string;
  onSessionChange: (sessionId: string) => void;
  disabled?: boolean;
}

export function SessionSelector({
  sessions,
  selectedSessionId,
  onSessionChange,
  disabled,
}: SessionSelectorProps) {
  if (!sessions || sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">This event has no sessions.</p>;
  }

  return (
    <div>
      <label htmlFor="session-select" className="text-sm font-medium">
        Select Session
      </label>
      <Select
        value={selectedSessionId}
        onValueChange={onSessionChange}
        disabled={disabled}
      >
        <SelectTrigger id="session-select" className="w-full md:w-[280px] mt-1">
          <SelectValue placeholder="Select a session to view analytics" />
        </SelectTrigger>
        <SelectContent>
          {sessions.map((session, index) => (
            <SelectItem key={session.id} value={session.id}>
              Session {index + 1}: {new Date(session.start_time).toLocaleString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}