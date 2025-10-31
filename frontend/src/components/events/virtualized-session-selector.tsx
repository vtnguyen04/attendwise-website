// components/events/virtualized-session-selector.tsx
'use client';

import * as React from 'react';
import { isAfter, isBefore } from 'date-fns';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn, parseUtcTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EventSession } from '@/lib/types'; // FIX: Use the correct EventSession type

interface SessionSelectorProps {
  sessions: EventSession[];
  selectedSessionId: string;
  onSessionChange: (sessionId: string) => void;
}

// Helper to format date string for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// NOTE: Renamed component to remove "Virtualized" as it's not implemented.
// If virtualization is needed for many sessions, `@tanstack/react-virtual` can be added.
export function VirtualizedSessionSelector({ sessions, selectedSessionId, onSessionChange }: SessionSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Find the currently selected session object
  const selectedSession = React.useMemo(() =>
    sessions.find(s => s.id === selectedSessionId)
  , [sessions, selectedSessionId]);

  // Determine the default filter based on whether the selected session is in the past
  const now = new Date(); // Local time for display purposes if needed
  const nowForComparison = parseUtcTime(now.toISOString())!; // Current time as a UTC Date object for consistent comparison

  const isSelectedInPast = selectedSession ? isBefore(parseUtcTime(selectedSession.start_time)!, nowForComparison) : false;
  const [filter, setFilter] = React.useState<'upcoming' | 'past'>(isSelectedInPast ? 'past' : 'upcoming');

  // Memoize the filtered list of sessions based on the current filter
  const filteredSessions = React.useMemo(() => {
    const list = filter === 'upcoming'
      ? sessions.filter(s => !isBefore(parseUtcTime(s.start_time)!, nowForComparison))
      : sessions.filter(s => isBefore(parseUtcTime(s.start_time)!, nowForComparison));
    
    // Sort the list for consistent display
    return list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [sessions, filter]);
  
  const handleSelect = (sessionId: string) => {
    onSessionChange(sessionId);
    setOpen(false);
  };
  
  // When the filter changes, if the selected session is not in the new list,
  // automatically select the first item of the new list.
  React.useEffect(() => {
    if (selectedSessionId && !filteredSessions.some(s => s.id === selectedSessionId)) {
      if (filteredSessions.length > 0) {
        onSessionChange(filteredSessions[0].id);
      }
    }
  }, [filter, filteredSessions, selectedSessionId, onSessionChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 glass-card hover:border-primary transition-all duration-200 rounded-lg"
        >
          <span className="truncate">
            {selectedSession ? formatDate(selectedSession.start_time) : "Select a session..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0" align="start">
        <Command>
          <div className="p-2 flex justify-around border-b">
            <Button
              variant={filter === 'upcoming' ? 'secondary' : 'ghost'}
              className="flex-1"
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === 'past' ? 'secondary' : 'ghost'}
              className="flex-1"
              onClick={() => setFilter('past')}
            >
              Past
            </Button>
          </div>
          <CommandInput placeholder="Search sessions..." />
          <CommandList>
            <CommandEmpty>No session found.</CommandEmpty>
            <CommandGroup>
              {filteredSessions.map((session) => (
                <CommandItem
                  key={session.id}
                  value={session.id} // value is used for search
                  onSelect={() => handleSelect(session.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedSessionId === session.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {formatDate(session.start_time)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}