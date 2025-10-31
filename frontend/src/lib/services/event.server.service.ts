// lib/services/event.server.service.ts
import { serverFetch } from '@/lib/server-fetch';
import type {
  AppEvent,
  EventAttendee,
  EventItem,
  EventSession,
  RegistrationWithEventDetails,
} from '@/lib/types';

/** [SERVER] Fetches event items by status ('upcoming', 'ongoing', 'past'). */
export async function getEventsByStatus(
  status: 'upcoming' | 'ongoing' | 'past'
): Promise<EventItem[]> {
  const data = await serverFetch<{ events: EventItem[] }>(
    `/api/v1/events/my-events?status=${status}`,
    [`events:status:${status}`]
  );
  return data?.events ?? [];
}

/** [SERVER] Fetches a single event by its ID. */
export async function getEventById(id: string, token?: string): Promise<AppEvent | null> {
  const data = await serverFetch<{ event: AppEvent }>(`/api/v1/events/${id}`, [`event:${id}`], token);
  return data?.event ?? null;
}

/** [SERVER] Fetches the user's registration for a specific event. */
export async function getMyRegistrationForEvent(eventId: string, token?: string): Promise<EventAttendee | null> {
  const data = await serverFetch<{ registrations: RegistrationWithEventDetails[] }>(
    `/api/v1/users/me/registrations`,
    ['users:me:registrations'],
    token
  );
  const registrations = data?.registrations ?? [];
  return registrations.find((reg) => reg.event_id === eventId) ?? null;
}

/** [SERVER] Fetches all events a user is registered for. */
export async function getMyRegisteredEvents(): Promise<RegistrationWithEventDetails[]> {
  const data = await serverFetch<{ registrations: RegistrationWithEventDetails[] }>(
    '/api/v1/users/me/registrations',
    ['users:me:registrations']
  );
  return data?.registrations ?? [];
}

/** [SERVER] Fetches all event items for a specific community. */
export async function getEventsByCommunity(communityId: string): Promise<EventItem[]> {
  const data = await serverFetch<{ events: EventItem[] }>(
    `/api/v1/events/by-community/${communityId}`,
    [`community:${communityId}:events`]
  );
  return data?.events ?? [];
}

/**
 * [SERVER] Fetches all sessions for a specific event.
 * @param eventId The ID of the event.
 * @returns An array of event session objects.
 */
export async function getEventSessions(eventId: string): Promise<EventSession[]> {
  const data = await serverFetch<{ sessions: EventSession[] }>(
    `/api/v1/events/${eventId}/sessions`,
    [`event:${eventId}:sessions`]
  );
  return data?.sessions ?? [];
}

/**
 * [SERVER] Fetches a single event session by its ID.
 * @param sessionId The ID of the event session.
 * @returns The event session object or null if not found.
 */
export async function getEventSessionById(sessionId: string): Promise<EventSession | null> {
  const data = await serverFetch<{ session: EventSession }>(
    `/api/v1/events/sessions/${sessionId}`,
    [`session:${sessionId}`]
  );
  return data?.session ?? null;
}
