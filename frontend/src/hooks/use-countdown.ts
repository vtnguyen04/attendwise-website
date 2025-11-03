// hooks/use-countdown.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import { differenceInSeconds, intervalToDuration } from 'date-fns';

/**
 * A custom hook to manage countdown logic.
 *
 * @param targetDate The future date to count down to (ISO 8601 string).
 * @param onEnd Callback function to execute when the countdown reaches zero.
 * @returns The duration object { days, hours, minutes, seconds } or null if time is up.
 */
export const useCountdown = (targetDate: string, onEnd?: () => void) => {
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onEndRef.current = onEnd;
  });

  const [secondsLeft, setSecondsLeft] = useState(
    differenceInSeconds(new Date(targetDate), new Date())
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      onEndRef.current?.();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prevSeconds => {
        if (prevSeconds <= 1) {
          clearInterval(timer);
          onEndRef.current?.();
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  if (secondsLeft <= 0) {
    return null; // Return null to indicate the countdown is over
  }

  // Calculate the duration object from seconds for display
  const duration = intervalToDuration({ start: 0, end: secondsLeft * 1000 });

  return duration;
};