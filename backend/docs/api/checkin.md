# Check-in

This module provides endpoints for managing event check-ins, including QR code generation, FaceID verification, and manual overrides.

## Generate Check-in Ticket (QR Payload)

Generates a one-time use check-in ticket (JWT payload) and a fallback code for a specific event session. This payload is typically encoded into a QR code.

- **Endpoint**: `POST /api/v1/events/:id/sessions/:sessionID/ticket`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the event.
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

## Verify Check-in

Verifies a user's check-in attempt using either a QR payload or a fallback code, optionally with FaceID and liveness checks.

- **Endpoint**: `POST /api/v1/checkin`
- **Authentication**: Not Required (Authentication is handled via the QR payload/FaceID)

### Request Body

```json
{
  "qr_payload": "string", // Optional, but required if not using fallback_code. The JWT from the ticket.
  "fallback_code": "string", // Optional, but required if not using qr_payload.
  "image_data": "string", // Optional. Base64 encoded JPEG/PNG image. Required if the event has `face_verification_required: true`.
  "liveness_video_stream_data": "string", // Optional. Base64 encoded WEBM/MP4 video. Required if the event has `liveness_check_required: true`.
  "scanner_device_fingerprint": "string" // Optional. A unique fingerprint of the device performing the scan. Used for enhanced security if device binding is enabled on the ticket.
}
```

### Response Body (200 OK)

```json
{
  "message": "Check-in successful",
  "status": true,
  "attendee": { /* Enriched Event Attendee Object */ }
}
```

### Error Responses

- `409 Conflict`: If the QR payload is invalid, expired, or already used, or if FaceID/liveness checks fail.

### Example `curl` (using QR payload and image data)

```bash
curl -X POST http://localhost:8080/api/v1/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qr_payload": "<jwt_qr_payload>",
    "image_data": "<base64_encoded_face_image>"
  }'
```

## Manual Override Check-in

Allows an event host to manually check in a user for a specific session. Requires event creator privileges.

- **Endpoint**: `POST /api/v1/checkin/manual-override`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Request Body

```json
{
  "session_id": "uuid", // Required: The UUID of the session.
  "user_id": "uuid" // Required: The UUID of the user to check in.
}
```

### Response Body (200 OK)

```json
{
  "status": "success",
  "message": "Successfully checked in user <user_name>",
  "attendee": { /* Enriched Event Attendee Object */ }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/checkin/manual-override \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "session_id": "<session_id>",
    "user_id": "<user_id>"
  }'
```

## Sync Offline Check-ins

Synchronizes a batch of check-in attempts that were collected by a client device while it was offline.

- **Endpoint**: `POST /api/v1/checkin/sync`
- **Authentication**: Required (Bearer Token for the device operator)

### Request Body

```json
{
  "device_id": "string", // Required: A unique identifier for the scanning device.
  "attempts": [
    {
      "qr_payload": "string", // Required: The JWT payload from the scanned QR code.
      "image_data": "string", // Optional: Base64 encoded face image if required by the event.
      "scanned_at": "timestamp", // Required: The ISO 8601 timestamp when the QR code was scanned.
      "attempt_id": "string" // Required: A client-generated unique ID for this specific attempt.
    }
  ]
}
```

### Response Body (200 OK)

```json
{
  "message": "Processed 1 check-in attempts.",
  "results": [
    {
      "attempt_id": "client-uuid-12345",
      "success": true,
      "message": "Check-in successful"
    }
  ]
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/checkin/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <operator_access_token>" \
  -d '{
    "device_id": "scanner-001",
    "attempts": [
      {
        "qr_payload": "<jwt_qr_payload_1>",
        "scanned_at": "2025-10-10T10:01:15Z",
        "attempt_id": "attempt-uuid-1"
      },
      {
        "qr_payload": "<jwt_qr_payload_2>",
        "scanned_at": "2025-10-10T10:01:25Z",
        "attempt_id": "attempt-uuid-2"
      }
    ]
  }'
```
