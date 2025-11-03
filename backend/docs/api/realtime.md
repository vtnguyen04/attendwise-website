# Real-time (WebSockets)

This module provides WebSocket endpoints for real-time communication, including chat and live dashboard updates.

## General WebSocket Connection Details

- **Base URL**: `ws://localhost:8080` (for local development)
- **Authentication**: Required for most WebSocket endpoints. Pass the JWT `access_token` in the `Authorization` header during the WebSocket handshake.

  Example `wscat` command with authentication:
  `wscat -c "ws://localhost:8080/ws" -H "Authorization: Bearer <your_access_token>"`

## Chat WebSocket

Establishes a WebSocket connection for real-time chat messages within conversations.

- **Endpoint**: `GET /ws`
- **Authentication**: Required (Bearer Token)

### Messages Sent to Client (JSON Format)

Clients will receive messages in the following format:

#### Chat Messages

```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "sender_id": "uuid",
  "content": "string",
  "message_type": "string", // e.g., "text"
  "created_at": "timestamp",
  "is_edited": true,
  "is_deleted": true
}
```

When a message is updated or deleted, the full message object is sent. The client is responsible for inspecting the `is_edited` or `is_deleted` flags to update the UI.

#### Notification Events

When a notification is created, read, or deleted, the client will receive a real-time event. The payload will vary based on the event type.

**Event: `created`** (This is the full notification object)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "new_comment",
  "title": "string",
  "message": "string",
  "link": {"String": "/path/to/content", "Valid": true},
  "is_read": false,
  "created_at": "timestamp"
}
```

**Event: `read`**
```json
{
  "event": "read",
  "notification_id": "uuid-of-notification"
}
```

**Event: `read_all`**
```json
{
  "event": "read_all"
}
```

**Event: `deleted`**
```json
{
  "event": "deleted",
  "notification_id": "uuid-of-notification"
}
```

### Messages Sent from Client (JSON Format)

Clients can send messages to the server in the following format. The server will then broadcast it to other participants in the conversation.

```json
{
  "conversation_id": "uuid", // Required: The ID of the conversation to send the message to.
  "content": "string", // Required: The content of the message.
  "type": "string" // Optional: Default "text". e.g., "text", "image".
}
```

### Example `wscat` Connection

```bash
wscat -c "ws://localhost:8080/ws" \
  -H "Authorization: Bearer <your_access_token>"
```

## Dashboard WebSocket

Establishes a WebSocket connection for real-time updates related to a specific event session, such as check-in events.

- **Endpoint**: `GET /ws/dashboard/:sessionID`
- **Authentication**: Not Required (Authorization to view the dashboard is handled by the backend based on user role, e.g., event host).

### Path Parameters

- `sessionID`: The UUID of the event session for which to receive dashboard updates.

### Messages Sent to Client (JSON Format)

Clients will receive check-in update messages in the following format:

```json
{
  "checkin_time": "timestamp",
  "message": "string", // e.g., "Check-in successful"
  "profile_url": "string", // Nullable: URL to the user's profile picture.
  "session_id": "uuid",
  "success": boolean,
  "user_id": "uuid",
  "user_name": "string"
}
```

### Example `wscat` Connection

```bash
wscat -c "ws://localhost:8080/ws/dashboard/<session_id>"
```

