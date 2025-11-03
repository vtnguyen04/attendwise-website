# Messaging

This module provides endpoints for managing conversations and sending/receiving messages.

## Conversation Object Structure

```json
{
  "id": "uuid",
  "type": "string", // e.g., "direct", "group", "community", "event"
  "community_id": "uuid", // Nullable
  "event_id": "uuid", // Nullable
  "name": "string", // Nullable, for group chats
  "description": "string", // Nullable
  "avatar_url": "string", // Nullable
  "is_archived": boolean,
  "participant_count": number,
  "message_count": number,
  "last_message_at": "timestamp", // Nullable
  "created_by": "uuid", // Nullable
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "participants": [ // Array of Conversation Participant Objects
    {
      "user_id": "uuid",
      "joined_at": "timestamp"
    }
  ]
}
```

## Message Object Structure

```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "sender_id": "uuid",
  "content": "string",
  "message_type": "string", // e.g., "text", "image", "file", "voice", "video"
  "media_url": "string", // Nullable
  "file_metadata": {}, // JSONB object, Nullable
  "reply_to_message_id": { "String": "uuid", "Valid": boolean }, // Nullable
  "mentioned_user_ids": ["uuid"], // Nullable
  "is_edited": boolean,
  "edited_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "is_deleted": boolean,
  "deleted_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "sent_at": "timestamp",
  "created_at": "timestamp"
}
```

---

## Create Conversation

Creates a new conversation. Can be a direct message, group chat, or linked to a community/event.

- **Endpoint**: `POST /api/v1/conversations`
- **Authentication**: Required (Bearer Token)

### Request Body

```json
{
  "type": "string", // Required: Type of conversation (e.g., "direct", "group", "community", "event").
  "participant_ids": ["uuid"], // Required for "direct" or "group" types. Array of user IDs to include.
  "community_id": "uuid", // Optional: Required if type is "community".
  "event_id": "uuid", // Optional: Required if type is "event".
  "name": "string", // Optional: Name for group chats.
  "description": "string", // Optional: Description for group chats.
  "avatar_url": "string" // Optional: Avatar URL for group chats.
}
```

### Response Body (201 Created)

```json
{
  "conversation": { /* Conversation Object */ }
}
```

### Example `curl` (Direct Message)

```bash
curl -X POST http://localhost:8080/api/v1/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "type": "direct",
    "participant_ids": ["<other_user_id>"]
  }'
```

## List User Conversations

Retrieves a list of all conversations the authenticated user is a part of.

- **Endpoint**: `GET /api/v1/conversations`
- **Authentication**: Required (Bearer Token)

### Response Body (200 OK)

```json
{
  "conversations": [ /* Array of Conversation Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/conversations \
  -H "Authorization: Bearer <your_access_token>"
```

## Get Conversation Details

Retrieves detailed information about a specific conversation.

- **Endpoint**: `GET /api/v1/conversations/:id`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the conversation.

### Response Body (200 OK)

```json
{
  "conversation": { /* Conversation Object */ }
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/conversations/<conversation_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## Send Message

Sends a message to a specific conversation.

- **Endpoint**: `POST /api/v1/conversations/:id/messages`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the conversation to send the message to.

### Request Body

```json
{
  "content": "string", // Required: The content of the message.
  "type": "string", // Optional: Default "text". e.g., "text", "image", "file", "voice", "video".
  "media_url": "string", // Optional: URL to media file if type is "image" or "video".
  "file_metadata": {}, // Optional: JSONB object for file metadata if type is "file".
  "reply_to_message_id": "uuid", // Optional: UUID of the message this is a reply to.
  "mentioned_user_ids": ["uuid"] // Optional: Array of user IDs mentioned in the message.
}
```

### Response Body (201 Created)

```json
{
  "message": { /* Message Object */ }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/conversations/<conversation_id>/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "content": "Hello there!",
    "type": "text"
  }'
```

## List Messages

Retrieves a list of messages from a specific conversation.

- **Endpoint**: `GET /api/v1/conversations/:id/messages`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the conversation.

### Response Body (200 OK)

```json
{
  "messages": [ /* Array of Message Objects */ ]
}
```

func (r *MessagingRepository) GetMessagesByConversationID(ctx context.Context, conversationID string) ([]*domain.Message, error) {
	query := `
		SELECT id, conversation_id, sender_id, content, message_type, created_at, is_edited, edited_at, is_deleted, deleted_at
		FROM messages
		WHERE conversation_id = $1 AND is_deleted = FALSE
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(ctx, query, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*domain.Message
	for rows.Next() {
		var message domain.Message
		err := rows.Scan(
			&message.ID, &message.ConversationID, &message.SenderID, &message.Content,
			&message.MessageType, &message.CreatedAt, &message.IsEdited, &message.EditedAt,
			&message.IsDeleted, &message.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		messages = append(messages, &message)
	}

	return messages, nil
}

## Update Message

Updates a message that the authenticated user owns.

- **Endpoint**: `PATCH /api/v1/messages/:id`
- **Authentication**: Required (Bearer Token, user must be the author of the message)

### Path Parameters

- `id`: The UUID of the message to update.

### Request Body

```json
{
  "content": "string" // Required: The updated content of the message.
}
```

### Response Body (200 OK)

```json
{
  "message": { /* Updated Message Object */ }
}
```

### Example `curl`

```bash
curl -X PATCH http://localhost:8080/api/v1/messages/<message_id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "content": "This is the updated message content!"
  }'
```

## Delete Message

Deletes a message that the authenticated user owns. This is a soft delete.

- **Endpoint**: `DELETE /api/v1/messages/:id`
- **Authentication**: Required (Bearer Token, user must be the author of the message)

### Path Parameters

- `id`: The UUID of the message to delete.

### Response Body (200 OK)

```json
{
  "message": "Message deleted successfully"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/messages/<message_id> \
  -H "Authorization: Bearer <your_access_token>"
```