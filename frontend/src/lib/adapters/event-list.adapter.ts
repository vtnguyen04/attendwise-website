// lib/adapters/event-list.adapter.ts
import { EventItem, RegistrationWithEventDetails } from '@/lib/types';
import { extractStringValue, extractTimeValue } from '@/lib/utils';

/**
 * A unified, simplified structure for displaying any event in a list or card.
 * This prevents components like EventListCard from needing to handle multiple complex types.
 */
export type DisplayEvent = {
  id: string; // This can be event_id or session_id
  eventId: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  coverImageUrl: string;
  isRegistered: boolean;
  status: 'upcoming' | 'ongoing' | 'past';
};

/**
 * Maps an EventItem from `getEvents` API to the unified DisplayEvent structure.
 */
function mapEventItemToDisplayEvent(item: EventItem): DisplayEvent {
  return {
    id: item.session_id?.Valid ? item.session_id.String : item.event_id,
    eventId: item.event_id,
    name: item.event_name,
    startTime: item.start_time,
    endTime: item.end_time,
    coverImageUrl: extractStringValue(item.cover_image_url),
    isRegistered: item.is_registered,
    status: item.status,
  };
}

/**
 * Maps a RegistrationWithEventDetails from `getMyRegisteredEvents` API to the unified DisplayEvent structure.
 */
function mapRegistrationToDisplayEvent(reg: RegistrationWithEventDetails): DisplayEvent {
  return {
    id: reg.event_id, // For a registration, the main event ID is the key
    eventId: reg.event_id,
    name: reg.event.name,
    startTime: extractTimeValue(reg.event.start_time),
    endTime: extractTimeValue(reg.event.end_time),
    coverImageUrl: extractStringValue(reg.event.cover_image_url),
    isRegistered: true, // Always true for this list
    status: reg.event.status as 'upcoming' | 'ongoing' | 'past', // Assuming status from summary is correct
  };
}

/**
 * The main adapter function that takes raw API data and returns a clean, unified array.
 * @param data - The array of data from the API (either EventItem[] or RegistrationWithEventDetails[]).
 * @param dataType - The type of data being passed ('event' or 'registration').
 * @returns An array of DisplayEvent objects.
 */
export const adaptEventListData = (
  data: (EventItem | RegistrationWithEventDetails)[],
  dataType: 'event' | 'registration'
): DisplayEvent[] => {
  if (dataType === 'registration') {
    return (data as RegistrationWithEventDetails[]).map(mapRegistrationToDisplayEvent);
  }
  // Default is 'event'
  return (data as EventItem[]).map(mapEventItemToDisplayEvent);
};