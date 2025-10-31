// lib/helpers/session-helper.ts
import { isAfter } from 'date-fns';
import { EventSession } from '@/lib/types';

/**
 * Determines the initial session ID to display based on URL params and session times.
 * The logic prioritizes:
 * 1. A valid session ID from the URL search parameters.
 * 2. The next upcoming session.
 * 3. The first session in the list as a fallback.
 *
 * @param sessions - The array of all event sessions.
 * @param urlSessionId - The session ID from the URL ('?session=...').
 * @returns The determined initial session ID, or an empty string if no sessions exist.
 */
export const getInitialSessionId = (
  sessions: EventSession[] | undefined,
  urlSessionId: string | null
): string => {
  if (!sessions || sessions.length === 0) {
    return '';
  }

  // 1. Prioritize a valid session ID from the URL
  if (urlSessionId && sessions.some(s => s.id === urlSessionId)) {
    return urlSessionId;
  }

  const now = new Date();
  
  // 2. Find the next upcoming session
  const upcomingSessions = sessions
    .filter(s => isAfter(new Date(s.start_time), now))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  if (upcomingSessions.length > 0) {
    return upcomingSessions[0].id;
  }

  // 3. Fallback to the first session in the list
  return sessions[0].id;
};