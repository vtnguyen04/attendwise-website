// lib/adapters/event-form.adapter.ts
import { AppEvent } from '@/lib/types';
import { EventFormValues } from '@/lib/schemas/event-form.schema';
import { extractStringValue, extractTimeValue, extractIntValue, extractFloatValue } from '@/lib/utils';
import { CreateEventPayload, UpdateEventPayload } from '@/lib/types'; // Assuming these types are exported from the service

/**
 * Maps the AppEvent data structure from the API to the structure required by the event form.
 * This function handles all conversions, nullability, and default values.
 *
 * @param event - The event object fetched from the API.
 * @returns An object compatible with the EventFormValues type for react-hook-form.
 */
export const mapApiEventToFormValues = (event: AppEvent): Partial<EventFormValues> => {
  return {
    community_id: event.community_id,
    name: event.name,
    description: extractStringValue(event.description),
    cover_image_url: extractStringValue(event.cover_image_url),
    start_time: extractTimeValue(event.start_time) ? new Date(extractTimeValue(event.start_time)!) : null,
    end_time: extractTimeValue(event.end_time) ? new Date(extractTimeValue(event.end_time)!) : null,
    timezone: event.timezone,
    location_type: event.location_type as 'physical' | 'online' | 'hybrid',
    location_address: extractStringValue(event.location_address),
    online_meeting_url: extractStringValue(event.online_meeting_url),
    is_recurring: event.is_recurring,
    recurrence_rule: (event.recurrence_rule as { rrule?: string })?.rrule || '',
    registration_required: event.registration_required,
    registration_opens_at: extractTimeValue(event.registration_opens_at) ? new Date(extractTimeValue(event.registration_opens_at)!) : null,
    registration_closes_at: extractTimeValue(event.registration_closes_at) ? new Date(extractTimeValue(event.registration_closes_at)!) : null,
    max_attendees: extractIntValue(event.max_attendees),
    waitlist_enabled: event.waitlist_enabled,
    max_waitlist: extractIntValue(event.max_waitlist),
    whitelist_only: event.whitelist_only,
    require_approval: event.require_approval,
    face_verification_required: event.face_verification_required,
    liveness_check_required: event.liveness_check_required,
    is_paid: event.is_paid,
    fee: extractFloatValue(event.fee), // Assuming fee is NullableFloat
    currency: event.currency,
    status: event.status,
    reminder_schedule: (event.reminder_schedule ? (Array.isArray(event.reminder_schedule) ? event.reminder_schedule : [event.reminder_schedule]) : []) as { offset_minutes: number; channels: string[]; }[],
  };
};

/**
 * Maps the form data into the correct payload structure for the API.
 * This handles converting JS types back to the Go backend's nullable structures.
 *
 * @param values - The validated form data from react-hook-form.
 * @returns A payload object ready to be sent to the create or update API endpoint.
 */
export const mapFormValuesToApiPayload = (values: EventFormValues): CreateEventPayload | { event: UpdateEventPayload } => {
  const toNullString = (val?: string) => (val ? { String: val, Valid: true } : { String: '', Valid: false });
  const toNullTime = (val?: Date) => (val ? { Time: val.toISOString(), Valid: true } : { Time: '0001-01-01T00:00:00Z', Valid: false });
  const toNullInt = (val?: number) => (val !== undefined && val !== null ? { Int32: val, Valid: true } : { Int32: 0, Valid: false });
  const toNullFloat = (val?: number) => (val !== undefined && val !== null ? { Float64: val, Valid: true } : { Float64: 0, Valid: false });
  
  const eventPayload: UpdateEventPayload = {
    name: values.name,
    description: toNullString(values.description),
    cover_image_url: toNullString(values.cover_image_url),
    start_time: toNullTime(values.start_time),
    end_time: toNullTime(values.end_time),
    timezone: values.timezone,
    location_type: values.location_type,
    location_address: toNullString(values.location_address),
    online_meeting_url: toNullString(values.online_meeting_url),
    is_recurring: !!values.is_recurring,
    // The API expects a JSON object like {"rrule": "FREQ=..."}, not a raw string.
    recurrence_rule: values.recurrence_rule ? { rrule: values.recurrence_rule } : null,
    registration_required: values.registration_required,
    registration_opens_at: toNullTime(values.registration_opens_at),
    registration_closes_at: toNullTime(values.registration_closes_at),
    max_attendees: toNullInt(values.max_attendees),
    waitlist_enabled: values.waitlist_enabled,
    max_waitlist: toNullInt(values.max_waitlist),
    whitelist_only: values.whitelist_only,
    require_approval: values.require_approval,
    face_verification_required: values.face_verification_required,
    liveness_check_required: values.liveness_check_required,
    is_paid: values.is_paid,
    fee: toNullFloat(values.fee),
    currency: values.currency,
    status: values.status,
    reminder_schedule: values.reminder_schedule ? values.reminder_schedule[0] : null,
  };

  console.log("DEBUG: Event Payload to be sent:", { is_recurring: eventPayload.is_recurring, recurrence_rule: eventPayload.recurrence_rule, form_is_recurring: values.is_recurring, form_recurrence_rule: values.recurrence_rule });

  return {
    event: {
      community_id: values.community_id, // Always include community_id
      ...eventPayload,
    }
  };
};