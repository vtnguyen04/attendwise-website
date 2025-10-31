
// lib/services/event.client.service.ts
'use client';

import apiClient from '@/lib/api-client';
import type {
  AppEvent,
  EventAttendee,
  EventAttendanceReport,
  CreateEventPayload,
  RegistrationWithEventDetails,
  UpdateEventPayload,
} from '@/lib/types';

/**
 * [CLIENT] Creates a new event.
 */
export const createEvent = async (payload: CreateEventPayload): Promise<AppEvent> => {
  const response = await apiClient.post<{ event: AppEvent }>('/api/v1/events', payload);
  return response.data.event;
};

/**
 * [CLIENT] Updates an existing event.
 */
export const updateEvent = async ({ eventId, eventData }: { eventId: string, eventData: UpdateEventPayload }): Promise<AppEvent> => {
  const response = await apiClient.patch<{ event: AppEvent }>(`/api/v1/events/${eventId}`, eventData);
  return response.data.event;
};


/**
 * [CLIENT] Registers the current user for an event.
 */
export const registerForEvent = (eventId: string): Promise<void> => {
  return apiClient.post(`/api/v1/events/${eventId}/registrations`);
};

/**
 * [CLIENT] Unregisters from an event.
 */
export const unregisterFromEvent = (eventId: string, registrationId: string): Promise<void> => {
  return apiClient.delete(`/api/v1/events/${eventId}/registrations/${registrationId}`);
};

/**
 * [CLIENT] Approves a pending registration for an event.
 */
export const approveRegistration = ({ eventId, registrationId }: { eventId: string; registrationId: string }): Promise<void> => {
  return apiClient.post(`/api/v1/events/${eventId}/registrations/${registrationId}/approve`);
};

/**
 * [CLIENT] Fetches registrations that are pending approval for an event.
 */
export const getPendingRegistrations = async (eventId: string): Promise<EventAttendee[]> => {
    const response = await apiClient.get<{ pending_registrations: EventAttendee[] }>(`/api/v1/events/${eventId}/registrations/pending`);
    return response.data.pending_registrations || [];
  };

/**
 * [CLIENT] Manually checks in a user for a specific session.
 */
export const manualCheckin = ({ sessionId, userId }: { sessionId: string; userId: string }): Promise<void> => {
  return apiClient.post('/api/v1/checkin/manual-override', { session_id: sessionId, user_id: userId });
};

/**
 * [CLIENT] Deletes an event permanently (hard delete).
 */
export const deleteEvent = (eventId: string): Promise<void> => {
  return apiClient.delete(`/api/v1/events/${eventId}/hard`);
};

/**
 * [CLIENT] Cancels an event (soft delete).
 */
export const cancelEvent = (eventId: string): Promise<void> => {
  return apiClient.delete(`/api/v1/events/${eventId}`);
};

/**
 * [CLIENT] Generates a check-in ticket (QR payload and fallback code) for a session.
 */
export const getTicket = async ({ eventId, sessionId }: { eventId: string; sessionId: string }): Promise<{ qr_payload: string; fallback_code: string }> => {
  const response = await apiClient.post(`/api/v1/events/${eventId}/sessions/${sessionId}/ticket`);
  return response.data;
};

/**
 * [CLIENT] Fetches all attendees for a specific event session.
 */
export const getEventAttendees = async (eventId: string, sessionId: string): Promise<EventAttendee[]> => {
    const response = await apiClient.get<{ attendees: EventAttendee[] }>(`/api/v1/events/${eventId}/attendance/attendees?sessionID=${sessionId}`);
    return response.data.attendees || [];
  };

/**
 * [CLIENT] Cancels a specific event session.
 */
export const cancelEventSession = async (sessionId: string, reason?: string): Promise<void> => {
    await apiClient.post(`/api/v1/events/sessions/${sessionId}/cancel`, { reason });
};

/**
 * [CLIENT] Adds a list of users to an event's whitelist.
 */
export const addUsersToWhitelist = async (eventId: string, user_ids: string[]): Promise<void> => {
    await apiClient.post(`/api/v1/events/${eventId}/whitelist`, { user_ids });
};

/**
 * [CLIENT] Fetches the attendance summary for an event.
 */
export const getEventAttendanceSummary = async (eventId: string): Promise<EventAttendanceReport | null> => {
    const response = await apiClient.get(`/api/v1/events/${eventId}/attendance/summary`);
    return response.data || null;
};

/**
 * [CLIENT] Fetches events the current user is registered for.
 */
export const getMyRegisteredEvents = async (): Promise<RegistrationWithEventDetails[]> => {
  const response = await apiClient.get<{ registrations: RegistrationWithEventDetails[] }>(
    '/api/v1/users/me/registrations'
  );
  return response.data.registrations || [];
};

/**
 * [CLIENT] Fetches the user's registration for a specific event.
 */
export const getMyRegistrationForEvent = async (eventId: string): Promise<EventAttendee | null> => {
  const response = await apiClient.get<{ registrations: RegistrationWithEventDetails[] }>(
    '/api/v1/users/me/registrations'
  );
  console.log('getMyRegistrationForEvent response:', response.data);
  const registrations = response.data.registrations || [];
  return registrations.find((reg) => reg.event_id === eventId) ?? null;
};

/**
 * [CLIENT] Fetches a single event by its ID.
 */
export const getEventById = async (eventId: string): Promise<AppEvent | null> => {
  if (!eventId) return null;
  try {
    const response = await apiClient.get<{ event: AppEvent }>(`/api/v1/events/${eventId}`);
    return response.data.event;
  } catch (error) {
    console.error(`Failed to fetch event ${eventId}:`, error);
    return null;
  }
};
