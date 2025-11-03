# Events

This module provides endpoints for managing events, event sessions, and registrations.

## Event Object Structure

This is the detailed object returned when fetching a single event by its ID.

```json
{
  "id": "uuid",
  //... (rest of the full event object)
}
```

## EventItem Object Structure

This is the object returned in lists of events (e.g., when listing by community). It represents either a single non-recurring event or one specific session of a recurring event.

```json
{
  "event_id": "uuid",
  "session_id": { "String": "uuid", "Valid": boolean }, // Null if the item is a non-recurring event
  "event_name": "string",
  "cover_image_url": { "String": "string", "Valid": boolean },
  "community_id": "uuid",
  "start_time": "timestamp",
  "end_time": "timestamp",
  "is_recurring": boolean,
  "status": "string", // "upcoming", "ongoing", or "past". Calculated dynamically.
  "is_registered": boolean, // True if the authenticated user is registered for the event.
  "location_type": "string",
  "location_address": { "String": "string", "Valid": boolean },
  "created_by_name": "string",
  "created_by_avatar": { "String": "string", "Valid": boolean }
}
```

## Event Session Object Structure

```json
{
  "id": "uuid",
  "event_id": "uuid",
  "session_number": number,
  "name": { "String": "string", "Valid": boolean }, // Nullable
  "start_time": "timestamp",
  "end_time": "timestamp",
  "timezone": "string",
  "location_override": { "String": "string", "Valid": boolean }, // Nullable
  "online_meeting_url_override": { "String": "string", "Valid": boolean }, // Nullable
  "checkin_opens_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "checkin_closes_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "max_attendees_override": { "Int32": number, "Valid": boolean }, // Nullable
  "face_verification_required_override": { "Bool": boolean, "Valid": boolean }, // Nullable
  "is_cancelled": boolean,
  "cancellation_reason": { "String": "string", "Valid": boolean }, // Nullable
  "total_checkins": number,
  "total_no_shows": number,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Event Attendee Object Structure

```json
{
  "id": "uuid",
  "event_id": "uuid",
  "user_id": "uuid",
  "role": "string", // e.g., "host", "attendee" 
  "status": "string", // e.g., "registered", "pending", "cancelled", "attended", "no_show"
  "registration_form_data": {}, // JSONB object
  "registration_source": { "String": "string", "Valid": boolean }, // Nullable
  "payment_status": { "String": "string", "Valid": boolean }, // Nullable
  "payment_amount": { "Float64": number, "Valid": boolean }, // Nullable
  "payment_id": { "String": "string", "Valid": boolean }, // Nullable
  "face_sample_provided": boolean,
  "face_sample_quality_score": { "Float64": number, "Valid": boolean }, // Nullable
  "qr_code_token": { "String": "string", "Valid": boolean }, // Nullable
  "fallback_code": { "String": "string", "Valid": boolean }, // Nullable
  "qr_device_binding": { "String": "string", "Valid": boolean }, // Nullable
  "registered_at": "timestamp",
  "approved_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "approved_by": { "String": "uuid", "Valid": boolean }, // Nullable
  "cancelled_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "user_name": "string",
  "user_email": "string",
  "user_profile_picture_url": { "String": "string", "Valid": boolean }, // Nullable

  // Check-in specific data (from event_session_checkins)
  "checkin_id": { "String": "uuid", "Valid": boolean }, // Nullable
  "checkin_time": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "checkin_method": { "String": "string", "Valid": boolean }, // Nullable, e.g., "qr_code", "fallback_code", "manual"
  "is_late": { "Bool": boolean, "Valid": boolean }, // Nullable
  "liveness_score": { "Float64": number, "Valid": boolean }, // Nullable
  "failure_reason": { "String": "string", "Valid": boolean } // Nullable
}
```

---

## List Events By Community

Retrieves a list of events for a specific community. This endpoint is optimized for performance and clarity.

- **Endpoint**: `GET /api/v1/events/by-community/:communityId`
- **Authentication**: Required (Bearer Token)

**Key Features & Logic:**
- **Dynamic Status**: The `status` of an event is not a stored value but is calculated in real-time on every request by comparing the event's start/end times with the current time.
- **Recurring Events**: For recurring events, this endpoint returns each session as a separate item in the list. This allows clients to clearly see the status of individual sessions (e.g., one session can be `past` while others are `upcoming`).
- **Response Object**: The endpoint returns an array of `EventItem` objects, which provide a consistent structure for both standalone events and individual sessions.

### Query Parameters

- `status`: Optional. Filter events by their dynamically calculated status. Can be `upcoming`, `ongoing`, or `past`. Defaults to `all`.
- `page`: Optional. The page number for pagination. Defaults to `1`.
- `limit`: Optional. The number of items per page for pagination. Defaults to `10`.

### Response Body (200 OK)

```json
{
  "events": [ /* Array of EventItem Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/events/by-community/<community_id>?status=upcoming" \
  -H "Authorization: Bearer <your_access_token>"
```

## Create Event

## Create Event

Creates a new event. The creator is automatically added as a `host` attendee.

- **Endpoint**: `POST /api/v1/events`
- **Authentication**: Required (Bearer Token)

### Request Body

**Important Note on Nullable Fields:** The Go backend uses types like `sql.NullString` and `sql.NullTime`. To pass a value for these, you must send a JSON object with the `String`/`Time` and `Valid` keys. Forgetting this will cause a binding error.

**Correct Format:**
```json
{
  "description": {"String": "My event description.", "Valid": true},
  "start_time": {"Time": "2025-11-01T10:00:00Z", "Valid": true}
}
```

**Incorrect Format (will cause an error):**
```json
{
  "description": "My event description.",
  "start_time": "2025-11-01T10:00:00Z"
}
```

```json
{
  "event": {
    "community_id": "uuid", // Required: The community this event belongs to. The authenticated user must be a `community_admin` of this community.
    "name": "string", // Required: Name of the event.
    "description": {"String": "string", "Valid": true}, // Optional: Description of the event.
    "cover_image_url": {"String": "string", "Valid": true}, // Optional: URL to event's cover image.
    "location_type": "string", // Optional: Default "physical". e.g., "physical", "online", "hybrid".
    "location_address": {"String": "string", "Valid": true}, // Optional: Physical address if location_type is "physical".
    "online_meeting_url": {"String": "string", "Valid": true}, // Optional: Online meeting link if location_type is "online".
    "timezone": "string", // Optional: Default "Asia/Ho_Chi_Minh". Timezone of the event.
    "start_time": {"Time": "timestamp", "Valid": true}, // Required: Start time of the first session (ISO 8601).
    "end_time": {"Time": "timestamp", "Valid": true}, // Required: End time of the first session (ISO 8601).
    "is_recurring": boolean, // Optional: Default false. If true, event has multiple sessions.
    "recurrence_pattern": "string", // Optional: ENUM value, e.g., "weekly", "daily", "monthly". Required if is_recurring is true.
    "recurrence_rule": {}, // Optional: JSON object defining the RRULE (e.g., {"rrule": "FREQ=WEEKLY;COUNT=4"}) if is_recurring is true. NOTE: The RRULE string should be nested within a JSON object.
    "reminder_schedule": {}, // Optional: JSON object defining reminders. e.g., {"reminders": [{"unit": "day", "value": 1}]}
    "max_attendees": number, // Optional: Maximum number of attendees.
    "waitlist_enabled": boolean, // Optional: Default false. If true, enables a waitlist.
    "registration_required": boolean, // Optional: Default true. If true, users must register.
    "registration_opens_at": {"Time": "timestamp", "Valid": true}, // Optional: When registration opens (ISO 8601).
    "registration_closes_at": {"Time": "timestamp", "Valid": true}, // Optional: When registration closes (ISO 8601).
    "whitelist_only": boolean, // Optional: Default false. If true, only whitelisted users can register.
    "require_approval": boolean, // Optional: Default false. If true, registrations need approval.
    "face_verification_required": boolean, // Optional: Default false. If true, FaceID is required for check-in.
    "liveness_check_required": boolean, // Optional: Default false. If true, liveness check is required for check-in.
    "status": "string" // Optional: Default "draft". e.g., "draft", "published".
  },
  "whitelist": ["uuid"] // Optional: Array of user IDs to add to the event's whitelist if `whitelist_only` is true.
}
```

### Response Body (201 Created)

```json
{
  "event": { /* Event Object */ }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>\" \
  -d '{
    "event": {
        "community_id": "<community_id>",
        "name": "Weekly Meeting",
        "description": {"String": "A recurring weekly meeting.", "Valid": true},
        "start_time": {"Time": "2025-11-01T10:00:00Z", "Valid": true},
        "end_time": {"Time": "2025-11-01T11:00:00Z", "Valid": true},
        "is_recurring": true,
        "recurrence_rule": {"rrule": "FREQ=WEEKLY;COUNT=4"},
        "require_approval": true,
        "status": "published"
    }
  }'
```

## List My Accessible Events

Retrieves a list of events from all communities that the authenticated user has joined. This endpoint uses the same optimized logic as listing events by community.

- **Endpoint**: `GET /api/v1/events/my-events`
- **Authentication**: Required (Bearer Token)

**Key Features & Logic:**
- **Dynamic Status**: The `status` is calculated in real-time for each event or session.
- **Recurring Events**: Returns individual sessions as separate items in the list.
- **Response Object**: Returns an array of `EventItem` objects.

### Query Parameters

- `status`: Optional. Filter events by their dynamically calculated status. Can be `upcoming`, `ongoing`, or `past`. Defaults to `all`.
- `page`: Optional. The page number for pagination. Defaults to `1`.
- `limit`: Optional. The number of items per page for pagination. Defaults to `10`.
### Response Body (200 OK)

```json
{
  "events": [ /* Array of EventItem Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/events/my-events?status=upcoming" \
  -H "Authorization: Bearer <your_access_token>"
``````

## Get Event Details

Retrieves detailed information about a specific event.

- **Authentication**: Required (Bearer Token, also requires membership in the event's community if it's private/secret)

### Path Parameters

- `eventID`: The UUID of the event.

### Response Body (200 OK)

```json
{
  "event": { /* Event Object */ }
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/events/<event_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## Update Event

Updates partial information for a specific event. Requires event creator privileges.

- **Endpoint**: `PATCH /api/v1/events/:eventID`
- **Authentication**: Required (Bearer Token, requires event creator role AND permission to view the event's community)

### Path Parameters

- `eventID`: The UUID of the event to update.

### Request Body

**Important Note on Nullable Fields & JSONB Objects:**
- For nullable fields (e.g., `description`, `cover_image_url`), you must send a JSON object with `{"String": "value", "Valid": true}` or `{"String": "", "Valid": false}`.
- For JSONB fields (e.g., `recurrence_rule`, `reminder_schedule`), you must send a valid JSON object (e.g., `{"rrule": "FREQ=WEEKLY;COUNT=4"}`).

```json
{
  "name": "string", // Optional: New name for the event.
  "description": {"String": "New description", "Valid": true}, // Optional: New description.
  "status": "string" // Optional: Update event status (e.g., "published", "cancelled").
  // Other fields can be updated similarly.
}
```

### Response Body (200 OK)

```json
{
  "event": { /* Updated Event Object */ }
}
```

### Example `curl`

```bash
curl -X PATCH http://localhost:8080/api/v1/events/<event_id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "description": {"String": "An updated description.", "Valid": true}
  }'
```

## Delete Event (Soft Delete)

Marks an event as 'cancelled' and sets its `deleted_at` timestamp. This is a soft delete, meaning the event data is preserved but the event is hidden from all public-facing lists and is no longer accessible. Requires event creator privileges.

- **Endpoint**: `DELETE /api/v1/events/:eventID`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `eventID`: The UUID of the event to delete.

### Response Body (200 OK)

```json
{
  "message": "Event cancelled successfully"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/events/<event_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## Hard Delete Event

Permanently deletes an event and all its associated data, including sessions, registrations, and whitelist entries. This action is irreversible. Requires event creator privileges.

- **Endpoint**: `DELETE /api/v1/events/:eventID/hard`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `eventID`: The UUID of the event to permanently delete.

### Response Body (200 OK)

```json
{
  "message": "Event deleted successfully"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/events/<event_id>/hard \
  -H "Authorization: Bearer <your_access_token>"
```

## Cancel Event Session

Cancels a specific event session. Requires event creator privileges.

- **Endpoint**: `POST /api/v1/events/sessions/:id/cancel`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `id`: The UUID of the event session to cancel.

### Request Body

```json
{
  "reason": "string" // Optional: The reason for cancelling the session.
}
```

### Response Body (200 OK)

```json
{
  "message": "Event session cancelled successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/events/sessions/<session_id>/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "reason": "Instructor is unavailable."
  }'
```



## Register for Event

Allows the authenticated user to register for an event. If `require_approval` is true, the registration status will be `pending`.
**Note:** The authenticated user must be a member of the community that created the event.

- **Endpoint**: `POST /api/v1/events/:id/registrations`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the event to register for.

### Request Body

```json
{
  "registration_form_data": {} // Optional: JSONB object for custom form data.
}
```

### Response Body (200 OK)

```json
{
  "message": "Successfully submitted registration request"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/events/<event_id>/registrations \
  -H "Authorization: Bearer <your_access_token>"
```

## Cancel Registration

Allows the authenticated user to cancel their registration for an event.

- **Endpoint**: `DELETE /api/v1/events/:eventID/registrations/:registrationID`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `eventID`: The UUID of the event.
- `registrationID`: The UUID of the registration to cancel.

### Response Body (200 OK)

```json
{
  "message": "Registration cancelled successfully"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/events/<event_id>/registrations/<registration_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## List My Registrations

Retrieves a list of all events the authenticated user has registered for, with event details embedded.

- **Endpoint**: `GET /api/v1/users/me/registrations`
- **Authentication**: Required (Bearer Token)

### Response Body (200 OK)

Returns a list of registration objects. Each object contains the full `EventAttendee` data, plus a nested `event` object with a summary of the parent event.

```json
{
  "registrations": [
    {
      "id": "registration_uuid",
      "event_id": "event_uuid",
      "user_id": "user_uuid",
      "status": "registered",
      // ... other registration fields
      "event": {
        "id": "event_uuid",
        "name": "Weekly Test Event",
        "start_time": {"Time": "2025-10-15T10:00:00Z", "Valid": true},
        "end_time": {"Time": "2025-10-15T11:00:00Z", "Valid": true},
        "cover_image_url": {"String": "", "Valid": false}
      }
    }
  ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/users/me/registrations \
  -H "Authorization: Bearer <your_access_token>"
```

## Get Event Attendance Summary

Retrieves an attendance summary for a specific event. Requires event creator privileges.

- **Endpoint**: `GET /api/v1/events/:eventID/attendance/summary`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `eventID`: The UUID of the event.

### Response Body (200 OK)

```json
{
  "total_registrations": 100,
  "total_attendees": 80,
  "attendance_rate": 80.0,
  "checkin_success_rate": 95.0,
  "checkin_failure_rate": 5.0,
  "absence_rate": 20.0
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/events/<event_id>/attendance/summary \
  -H "Authorization: Bearer <your_access_token>"
```

## Get Event Attendees

Retrieves a list of all attendees for a specific event and session, including their check-in details. Requires event creator privileges.

- **Endpoint**: `GET /api/v1/events/:eventID/attendance/attendees`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `eventID`: The UUID of the event.

### Query Parameters

- `sessionID`: Required. The UUID of the session for which to retrieve attendees. Check-in details are specific to a session.
- `status`: Optional. Filter attendees by their registration status (e.g., `registered`, `attended`, `pending`, `no_show`).

### Response Body (200 OK)

```json
{
  "attendees": [ /* Array of Event Attendee Objects (now includes check-in details) */ ]
}
```

### Example `curl`

```bash
# Get all attendees for a specific session with 'attended' status
curl -X GET "http://localhost:8080/api/v1/events/<event_id>/attendance/attendees?sessionID=<session_id>&status=attended" \
  -H "Authorization: Bearer <your_access_token>"
```

## Add Users to Whitelist

Adds a list of user IDs to an event's whitelist. Requires event creator privileges.

- **Endpoint**: `POST /api/v1/events/:eventID/whitelist`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `eventID`: The UUID of the event.

### Request Body

```json
{
  "user_ids": ["uuid"] // Required: Array of user IDs to add to the whitelist.
}
```

### Response Body (200 OK)

```json
{
  "message": "Users added to whitelist successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/events/<event_id>/whitelist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "user_ids": ["<user_id_1>", "<user_id_2>"]
  }'
```

## Get Event Sessions

Retrieves a list of all sessions for a specific event.

- **Endpoint**: `GET /api/v1/events/:eventID/sessions`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `eventID`: The UUID of the event.

### Response Body (200 OK)

```json
{
  "sessions": [ /* Array of Event Session Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/events/<event_id>/sessions \
  -H "Authorization: Bearer <your_access_token>"
```

## Get Event Session by ID

Retrieves details of a specific event session.

- **Endpoint**: `GET /api/v1/events/sessions/:id`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the event session.

### Response Body (200 OK)

```json
{
  "session": { /* Event Session Object */ }
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/events/sessions/<session_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## Generate Check-in Ticket (QR Payload)

**Note**: This endpoint is for generating the ticket payload. For the full check-in flow, including QR code verification and manual overrides, see the [Check-in API documentation](./checkin.md).

Generates a one-time use check-in ticket (JWT payload) and a fallback code for a specific event session. This payload is typically encoded into a QR code.

- **Endpoint**: `POST /api/v1/events/:eventID/sessions/:sessionID/ticket`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `eventID`: The UUID of the event.
- `sessionID`: The UUID of the specific session for which to generate the ticket.

### Response Body (200 OK)

```json
{
  "expires_at": "timestamp", // ISO 8601 timestamp when the QR payload expires.
  "fallback_code": "string", // A short, human-readable code for manual entry.
  "qr_payload": "string" // The JWT string to be encoded into a QR code.
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/events/<event_id>/sessions/<session_id>/ticket \
  -H "Authorization: Bearer <your_access_token>"
```

## List Pending Registrations

Retrieves a list of registrations that are pending approval for a specific event. Requires event creator privileges.

- **Endpoint**: `GET /api/v1/events/:eventID/registrations/pending`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `eventID`: The UUID of the event.

### Response Body (200 OK)

```json
{
  "pending_registrations": [ /* Array of Event Attendee Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/events/<event_id>/registrations/pending \
  -H "Authorization: Bearer <your_access_token>"
```

## Approve Registration

Approves a pending event registration. Requires event creator privileges.

- **Endpoint**: `POST /api/v1/events/:eventID/registrations/:registrationId/approve`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `eventID`: The UUID of the event.
- `registrationId`: The UUID of the registration to approve.

### Response Body (200 OK)

```json
{
  "message": "Registration approved successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/events/<event_id>/registrations/<registration_id>/approve \
  -H "Authorization: Bearer <your_access_token>"
```
