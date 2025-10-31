'use client';

import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo, useRef } from 'react';
import { RRule, RRuleSet, rrulestr, Weekday, Options } from 'rrule';
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

interface RecurrenceBuilderProps {
  value: string; // RRULE string
  onChange: (value: string) => void;
  startDate: Date;
}

type EndCondition = 'never' | 'count' | 'until';

import { memo } from 'react';

export const RecurrenceBuilder = memo(function RecurrenceBuilder({ value, onChange, startDate }: RecurrenceBuilderProps) {
  // --- Weekday Index Conversion --- 
  // rrule.js: MO=0, TU=1, ..., SU=6
  // JS Date.getDay(): SU=0, MO=1, ..., SA=6
  const jsDayToRrule = (day: number) => (day + 6) % 7;
  const rruleDayToJs = (day: number) => (day + 1) % 7;

  const [freq, setFreq] = useState<number>(RRule.WEEKLY);
  const [interval, setInterval] = useState<number>(1);
  // byday state is now stored in rrule format (MO=0)
  const [byday, setByday] = useState<number[]>([jsDayToRrule(startDate.getDay())]);
  const [endCondition, setEndCondition] = useState<EndCondition>('count');
  const [count, setCount] = useState<number | ''>(10);
  const [until, setUntil] = useState<Date | undefined>(undefined);

    const isInitialMount = useRef(true); // To prevent onChange on initial mount
  const lastEmittedRrule = useRef(value); // Store the last value emitted via onChange

  // Effect to parse incoming RRULE string and update internal state
  useEffect(() => {
    if (value !== lastEmittedRrule.current) { // Only parse if value prop is different from what we last emitted
      if (!value) { // If value is empty, reset to default state
        setFreq(RRule.WEEKLY);
        setInterval(1);
        setByday([jsDayToRrule(startDate.getDay())]);
        setEndCondition('count');
        setCount(10);
        setUntil(undefined);
        return; // Exit early
      }

      try {
        const ruleOrSet = rrulestr(value) as any;
        let sourceRule: RRule | null = null;

        if (ruleOrSet instanceof RRule) {
          sourceRule = ruleOrSet;
        } else if (ruleOrSet instanceof RRuleSet) {
          const rules = ruleOrSet.rrules();
          if (rules.length > 0) {
            sourceRule = rules[0];
          }
        }

        if (sourceRule) {
          const options = sourceRule.options;
          setFreq(options.freq);
          setInterval(options.interval);

          if (options.byweekday) {
            const daysArray = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday];
            if (daysArray.length > 0 && daysArray[0] !== null) {
                if (typeof daysArray[0] !== 'number') {
                  const dayNumbers = (daysArray as unknown as Weekday[]).map(wd => wd.weekday);
                  setByday(dayNumbers);
                } else {
                  setByday(daysArray as number[]);
                }
            } else {
                setByday([]);
            }
          } else {
            setByday([]);
          }

          if (options.count) {
            setEndCondition('count');
            setCount(options.count);
            setUntil(undefined);
          } else if (options.until) {
            setEndCondition('until');
            const untilDate = new Date(options.until);
            setUntil(untilDate);
            setCount('');
          }
        } else {
            setEndCondition('count');
            setCount(10);
            setUntil(undefined);
          }
      } catch (e) {
        console.error("Error parsing RRULE string:", e);
      }
    }
  }, [value]); // Only re-run when value prop changes

  // Effect to build and emit RRULE string when internal state changes (user interaction)
  useEffect(() => {
    const options: Partial<Options> = {
      freq: freq,
      interval: interval || 1,
      dtstart: startDate,
    };

    if (freq === RRule.WEEKLY && byday.length > 0) {
      options.byweekday = byday;
    } else if (freq === RRule.WEEKLY && byday.length === 0) {
      options.byweekday = [new Weekday(startDate.getDay())];
    }

    if (endCondition === 'count' && count) {
      options.count = Number(count);
    } else if (endCondition === 'until' && until) {
      options.until = until;
    }

    try {
      const rule = new RRule(options as Options);
      const rruleLineWithPrefix = rule.toString().split('\n').find(line => line.startsWith('RRULE:')) || '';
      const rruleLine = rruleLineWithPrefix.replace('RRULE:', '');

      if (rruleLine !== lastEmittedRrule.current) { // Only call onChange if the generated rule is different from the last emitted one
        onChange(rruleLine);
        lastEmittedRrule.current = rruleLine; // Update last emitted value
      }
    } catch (e) {
      console.error("Failed to build RRULE:", e);
    }
  }, [freq, interval, byday, endCondition, count, until, startDate.getTime(), onChange]);

  const weekDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const generatedOccurrences = useMemo(() => {
    try {
    const options: Partial<Options> = {
      freq: freq,
      interval: interval || 1,
      dtstart: startDate,
    };

    if (freq === RRule.WEEKLY && byday.length > 0) {
      options.byweekday = byday;
    } else if (freq === RRule.WEEKLY && byday.length === 0) {
      options.byweekday = [new Weekday(startDate.getDay())];
    }

      if (endCondition === 'count' && count) {
        return Number(count);
      } else if (endCondition === 'until' && until) {
        const rule = new RRule(options as Options);
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
            <SelectItem value={String(RRule.DAILY)}>Daily</SelectItem>
            <SelectItem value={String(RRule.WEEKLY)}>Weekly</SelectItem>
            <SelectItem value={String(RRule.MONTHLY)}>Monthly</SelectItem>
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
        <span>{freq === RRule.WEEKLY ? 'week(s)' : 'day(s)'}</span>
      </div>

      {freq === RRule.WEEKLY && (
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