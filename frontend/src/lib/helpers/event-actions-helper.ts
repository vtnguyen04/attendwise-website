import { isAfter, isBefore } from 'date-fns';
import { AppEvent, EventAttendee, User, EventSession } from '@/lib/types';
import { extractTimeValue, extractIntValue, parseUtcTime } from '@/lib/utils'; // <-- IMPORT parseUtcTime here

export type ActionState =
  | { state: 'LOGIN_TO_REGISTER' }
  | { state: 'EVENT_ENDED'; message: string }
  | { state: 'REGISTRATION_CLOSED' }
  | { state: 'EVENT_FULL' }
  | { state: 'FACE_ID_REQUIRED' }
  | { state: 'CAN_REGISTER' }
  | { state: 'PENDING_APPROVAL' }
  | { state: 'ATTENDED' }
  | { state: 'CAN_CHECK_IN' }
  | { state: 'REGISTERED_UPCOMING' }
  | { state: 'HOST_MANAGE' };

export const determineActionState = (
  event: AppEvent,
  user: User | null,
  isHost: boolean,
  myRegistration: EventAttendee | null,
  selectedSession: EventSession | undefined // New parameter
): ActionState => {
  const now = parseUtcTime(new Date().toISOString()); // Ensure now is UTC

  // Determine the relevant start and end times, prioritizing session times
  const relevantStartTimeStr = selectedSession?.start_time || extractTimeValue(event.start_time);
  const relevantEndTimeStr = selectedSession?.end_time || extractTimeValue(event.end_time);

  const parsedRelevantStartTime = parseUtcTime(relevantStartTimeStr);
  const parsedRelevantEndTime = parseUtcTime(relevantEndTimeStr);

  // Highest priority: Event is over (considering session or overall event).
  // Ensure 'now' is valid before comparison
  if (!now) {
    return { state: 'EVENT_ENDED', message: 'Error: Could not determine current time.' };
  }

  if (event.status === 'cancelled' || (parsedRelevantEndTime && isAfter(now, parsedRelevantEndTime))) {
    return { state: 'EVENT_ENDED', message: `Event ${event.status === 'cancelled' ? 'Cancelled' : 'Ended'}` };
  }

  // User is the host.
  if (isHost) {
    return { state: 'HOST_MANAGE' };
  }

  // User is not logged in.
  if (!user) {
    return { state: 'LOGIN_TO_REGISTER' };
  }
  
  // User is logged in, check registration status.
  // A valid registration must be a non-null object with a meaningful status.
  const isRegistered = !!myRegistration;

  if (isRegistered) {
    if (myRegistration.status === 'attended') {
      return { state: 'ATTENDED' };
    }
    if (myRegistration.status === 'pending') {
      return { state: 'PENDING_APPROVAL' };
    }
    
    // User is registered, check if check-in is open.
    // Use parsedRelevantStartTime and parsedRelevantEndTime for ongoing check
    const isEventOngoing = parsedRelevantStartTime && parsedRelevantEndTime && isAfter(now, parsedRelevantStartTime) && isBefore(now, parsedRelevantEndTime);

    if (isEventOngoing) {
        return { state: 'CAN_CHECK_IN' };
    } else {
        return { state: 'REGISTERED_UPCOMING' };
    }
  }

  // User is not registered, check if they *can* register.
  const regClosesTime = parseUtcTime(extractTimeValue(event.registration_closes_at) || '');
  if (regClosesTime && isAfter(now, regClosesTime)) {
    return { state: 'REGISTRATION_CLOSED' };
  }

  const maxAttendees = extractIntValue(event.max_attendees);
  if (maxAttendees !== undefined && (event.current_attendees >= maxAttendees)) {
    return { state: 'EVENT_FULL' };
  }

  if (event.face_verification_required && !user.face_id_enrolled) {
    return { state: 'FACE_ID_REQUIRED' };
  }

  // If all checks pass, user can register.
  return { state: 'CAN_REGISTER' };
};