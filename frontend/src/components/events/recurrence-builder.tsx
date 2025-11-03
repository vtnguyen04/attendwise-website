'use client';

import { cn } from '@/lib/utils';
import { useState, useMemo, memo, useEffect, useRef } from 'react';
import { RRule, Weekday, Frequency, Options } from 'rrule';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import CalendarIcon from 'lucide-react/icons/calendar';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

const dayStrToNum: Record<string, number> = {
  MO: 0,
  TU: 1,
  WE: 2,
  TH: 3,
  FR: 4,
  SA: 5,
  SU: 6,
};

interface RecurrenceBuilderProps {
  value: string; // RRULE string
  onChange: (value: string) => void;
  startDate: Date;
}

type EndCondition = 'never' | 'count' | 'until';

export const RecurrenceBuilder = memo(function RecurrenceBuilder({ value, onChange, startDate }: RecurrenceBuilderProps) {
  // --- Weekday Index Conversion --- 
  // rrule.js: MO=0, TU=1, ..., SU=6
  // JS Date.getDay(): SU=0, MO=1, ..., SA=6
  const jsDayToRrule = (day: number) => (day + 6) % 7;
  const rruleDayToJs = (day: number) => (day + 1) % 7;

  const lastEmittedRule = useRef<string | null>(null);

  const [freq, setFreq] = useState<number>(() => {
    if (value) {
      try {
        const parsed = RRule.fromString(value);
        return typeof parsed.origOptions.freq === 'number' ? parsed.origOptions.freq : Frequency.WEEKLY;
      } catch (e) {
        console.warn('Failed to parse initial rrule string for freq', e);
      }
    }
    return Frequency.WEEKLY;
  });

  const [interval, setInterval] = useState<number>(() => {
    if (value) {
      try {
        const parsed = RRule.fromString(value);
        return parsed.origOptions.interval ?? 1;
      } catch (e) {
        console.warn('Failed to parse initial rrule string for interval', e);
      }
    }
    return 1;
  });

  const [byday, setByday] = useState<number[]>(() => {
    if (value) {
      try {
        const parsed = RRule.fromString(value);
        if (parsed.origOptions.byweekday) {
          const weekdays = Array.isArray(parsed.origOptions.byweekday)
            ? parsed.origOptions.byweekday
            : [parsed.origOptions.byweekday];
          return weekdays.map((weekday) => {
            if (typeof weekday === 'number') {
              return weekday;
            }
            if (typeof weekday === 'string') {
              return dayStrToNum[weekday];
            }
            return weekday.weekday;
          });
        }
      } catch (e) {
        console.warn('Failed to parse initial rrule string for byday', e);
      }
    }
    return [jsDayToRrule(startDate.getDay())];
  });

  const [endCondition, setEndCondition] = useState<EndCondition>(() => {
    if (value) {
      try {
        const parsed = RRule.fromString(value);
        if (typeof parsed.origOptions.count === 'number' && parsed.origOptions.count > 0) {
          return 'count';
        } else if (parsed.origOptions.until instanceof Date) {
          return 'until';
        }
      } catch (e) {
        console.warn('Failed to parse initial rrule string for endCondition', e);
      }
    }
    return 'count';
  });

  const [count, setCount] = useState<number | ''>(() => {
    if (value) {
      try {
        const parsed = RRule.fromString(value);
        if (typeof parsed.origOptions.count === 'number' && parsed.origOptions.count > 0) {
          return parsed.origOptions.count;
        }
      } catch (e) {
        console.warn('Failed to parse initial rrule string for count', e);
      }
    }
    return 10;
  });

  const [until, setUntil] = useState<Date | undefined>(() => {
    if (value) {
      try {
        const parsed = RRule.fromString(value);
        if (parsed.origOptions.until instanceof Date) {
          return parsed.origOptions.until;
        }
      } catch (e) {
        console.warn('Failed to parse initial rrule string for until', e);
      }
    }
    return undefined;
  });

  // Rebuild RRULE string whenever builder state changes
  useEffect(() => {
    try {
      const options: Partial<Options> = {
        freq,
        interval: Math.max(1, interval || 1),
        dtstart: startDate,
      };

      if (freq === Frequency.WEEKLY) {
        const effectiveDays = (byday && byday.length > 0 ? byday : [jsDayToRrule(startDate.getDay())])
          .map((day) => new Weekday(day));
        options.byweekday = effectiveDays;
      }

      if (endCondition === 'count' && typeof count === 'number' && count > 0) {
        options.count = count;
        options.until = undefined;
      } else if (endCondition === 'until' && until) {
        options.until = until;
        options.count = undefined;
      } else {
        options.count = undefined;
        options.until = undefined;
      }

      const rule = new RRule(options);
      const nextValue = rule.toString();
      lastEmittedRule.current = nextValue;
      if (nextValue !== value) {
        onChange(nextValue);
      }
    } catch (error) {
      console.warn('[RecurrenceBuilder] Failed to generate rrule', error);
    }
  }, [freq, interval, byday, endCondition, count, until, startDate, onChange, value]);

  const weekDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const generatedOccurrences = useMemo(() => {
    try {
      const options: Partial<Options> = {
        freq,
        interval: Math.max(1, interval || 1),
        dtstart: startDate,
      };

      if (freq === Frequency.WEEKLY) {
        const effectiveDays = (byday && byday.length > 0 ? byday : [jsDayToRrule(startDate.getDay())])
          .map((day) => new Weekday(day));
        options.byweekday = effectiveDays;
      }

      if (endCondition === 'count' && typeof count === 'number' && count > 0) {
        return Number(count);
      } else if (endCondition === 'until' && until) {
        const rule = new RRule(options);
        const endDate = new Date(until);
        const start = new Date(startDate);
        const yearDiff = endDate.getFullYear() - start.getFullYear();
        if (yearDiff > 5) {
          return 9999;
        }
        return rule.between(start, endDate, true).length;
      }
      return null;
    } catch {
      return null;
    }
  }, [freq, interval, byday, endCondition, count, until, startDate]);

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-4">
        <Label htmlFor="freq">Repeats</Label>
        <Select value={String(freq)} onValueChange={(v) => setFreq(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(Frequency.DAILY)}>Daily</SelectItem>
            <SelectItem value={String(Frequency.WEEKLY)}>Weekly</SelectItem>
            <SelectItem value={String(Frequency.MONTHLY)}>Monthly</SelectItem>
          </SelectContent>
        </Select>
        <Label htmlFor="interval">every</Label>
        <Input
          id="interval"
          type="number"
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value) || 1)}
          className="w-20"
        />
        <span>{freq === Frequency.WEEKLY ? 'week(s)' : 'day(s)'}</span>
      </div>

      {freq === Frequency.WEEKLY && (
        <div>
          <Label>on</Label>
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={byday.map(rruleDayToJs).map(String)} // Convert rrule state to JS day for UI
            onValueChange={(days) => {
              const rruleDays = days.map(Number).map(jsDayToRrule).sort();
              setByday(rruleDays);
            }}
            className="flex-wrap justify-start mt-2"
          >
            {weekDays.map((day, i) => (
              <ToggleGroupItem key={day} value={String(i)} aria-label={`Toggle ${day}`}>
                {day}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      <div>
        <Label>Ends</Label>
        <RadioGroup value={endCondition} onValueChange={(v: EndCondition) => setEndCondition(v)} className="mt-2 space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="count" id="ends-count" />
            <Label htmlFor="ends-count" className="flex items-center gap-2">After</Label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || '')}
              onClick={() => setEndCondition('count')}
              className="w-24"
              disabled={endCondition !== 'count'}
            />
            <Label>occurrences</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="until" id="ends-until" />
            <Label htmlFor="ends-until" className="flex items-center gap-2">On</Label>
            <Popover>
              <PopoverTrigger asChild disabled={endCondition !== 'until'}>
                <Button
                  variant={"outline"}
                  className={cn("w-[240px] justify-start text-left font-normal", !until && "text-muted-foreground")}
                  onClick={() => setEndCondition('until')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {until ? format(until, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={until}
                  onSelect={setUntil}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </RadioGroup>
      </div>

      {/* Occurrence Preview and Warning */}
      <div className="p-3 mt-4 rounded-lg bg-background/50 border">
        {generatedOccurrences !== null && generatedOccurrences > 0 ? (
          <p className="text-sm text-muted-foreground">
            This rule will generate <span className="font-bold text-primary">{generatedOccurrences > 9998 ? 'a very large number of' : generatedOccurrences}</span> session(s).
            {generatedOccurrences > 100 && (
              <span className="block mt-2 text-xs text-amber-600 dark:text-amber-500">
                <b>Warning:</b> Creating a large number of sessions may take a long time after submitting. Please be patient.
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {"Enter an end condition to see a preview of the number of sessions."}
          </p>
        )}
      </div>
    </div>
  );
});
