import { useState, useEffect, useCallback } from 'react';
import { RRule, RRuleSet, rrulestr, Weekday, Options } from 'rrule';

// Helper to convert JS Date.getDay() (Sun=0) to RRule weekday (Mon=0)
const jsDayToRRule = (day: number): Weekday => new Weekday((day + 6) % 7);

// Helper to parse an RRULE string into a more manageable Options object.
const parseRRuleString = (rruleString: string): Partial<Options> => {
  if (!rruleString) return {};
  try {
    // rrulestr can return RRule or RRuleSet. We handle both.
    const ruleOrSet: RRule | RRuleSet = rrulestr(rruleString);
    let sourceRule: RRule | null = null;

    if ((ruleOrSet as RRule) instanceof RRule) {
      sourceRule = ruleOrSet as RRule;
    } else if ((ruleOrSet as RRuleSet) instanceof RRuleSet) {
      const rules = (ruleOrSet as RRuleSet).rrules();
      if (rules.length > 0) sourceRule = rules[0];
    }

    return sourceRule ? sourceRule.options : {};
  } catch (e) {
    console.error('Failed to parse RRULE string:', e);
    return {};
  }
};

interface UseRRuleProps {
  initialRRuleString?: string;
  startDate: Date;
  onChange: (rruleString: string) => void;
}

export const useRRule = ({ initialRRuleString = '', startDate, onChange }: UseRRuleProps) => {
  const [options, setOptions] = useState<Partial<Options>>(() => parseRRuleString(initialRRuleString));

  // Effect to update internal state if the initial string prop changes from outside
  useEffect(() => {
    setOptions(parseRRuleString(initialRRuleString));
  }, [initialRRuleString]);

  // Effect to build the RRULE string and call onChange when options change
  useEffect(() => {
    // Don't generate a rule if frequency is not set
    if (options.freq === undefined || options.freq === null) {
      onChange('');
      return;
    }

    const ruleOptions: Partial<Options> = {
      ...options,
      dtstart: startDate,
      // Ensure interval is at least 1
      interval: options.interval && options.interval > 0 ? options.interval : 1,
    };
    
    // Clean up options based on frequency
    if (ruleOptions.freq !== RRule.WEEKLY) {
      delete ruleOptions.byweekday;
    }

    try {
      const rule = new RRule(ruleOptions as Options);
      const newRRuleString = rule.toString();
      // Only call onChange if the value has actually changed to prevent loops
      if (newRRuleString !== initialRRuleString) {
        onChange(newRRuleString);
      }
    } catch (e) {
      console.error('Failed to build RRULE:', e);
    }
  }, [options, startDate, onChange, initialRRuleString]);

  const updateOptions = useCallback((newOptions: Partial<Options>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  const setFrequency = useCallback((freq: number) => {
    updateOptions({ freq });
  }, [updateOptions]);

  const setInterval = useCallback((interval: number) => {
    updateOptions({ interval: Math.max(1, interval) });
  }, [updateOptions]);
  
  const setByWeekDay = useCallback((days: Weekday[]) => {
    updateOptions({ byweekday: days });
  }, [updateOptions]);

  const setCount = useCallback((count?: number) => {
    updateOptions({ count, until: undefined });
  }, [updateOptions]);

  const setUntil = useCallback((until?: Date) => {
    updateOptions({ until, count: undefined });
  }, [updateOptions]);

  return {
    options,
    setFrequency,
    setInterval,
    setByWeekDay,
    setCount,
    setUntil,
    jsDayToRRule,
  };
};