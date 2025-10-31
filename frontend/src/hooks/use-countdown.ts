// hooks/use-countdown.ts
'use client';

import { useState, useEffect } from 'react';
import { differenceInSeconds, intervalToDuration } from 'date-fns';

/**
 * A custom hook to manage countdown logic.
 *
 * @param targetDate The future date to count down to (ISO 8601 string).
 * @param onEnd Callback function to execute when the countdown reaches zero.
 * @returns The duration object { days, hours, minutes, seconds } or null if time is up.
 */
export const useCountdown = (targetDate: string, onEnd?: () => void) => {
  const calculateSecondsLeft = () => differenceInSeconds(new Date(targetDate), new Date());

  const [secondsLeft, setSecondsLeft] = useState(calculateSecondsLeft);
  console.log({targetDate, secondsLeft});

  useEffect(() => {
    // Ensure secondsLeft is recalculated if targetDate changes
    setSecondsLeft(calculateSecondsLeft());

    if (secondsLeft <= 0) {
      onEnd?.();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prevSeconds => {
        if (prevSeconds <= 1) {
          clearInterval(timer);
          onEnd?.(); // Fire onEnd when countdown finishes
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // onEnd is a function, it's safer to wrap it in useCallback on the parent side
    // or exclude it if it's stable. For this use case, including it is fine.
  }, [targetDate]);

  if (secondsLeft <= 0) {
    return null; // Return null to indicate the countdown is over
  }

  // Calculate the duration object from seconds for display
  const duration = intervalToDuration({ start: 0, end: secondsLeft * 1000 });

  return duration;
};