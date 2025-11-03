# Notifications

This module provides endpoints for managing user notifications and preferences.

## Notification Object Structure

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "string", // e.g., "new_comment", "event_reminder"
  "title": "string",
  "message": "string",
  "link": { "String": "string", "Valid": true }, // Nullable: URL for the notification action.
  "related_user_id": { "String": "uuid", "Valid": boolean }, // Nullable: ID of the user related to the notification (e.g., comment author).
  "related_post_id": { "String": "uuid", "Valid": boolean }, // Nullable: ID of the post related to the notification.
  "related_comment_id": { "String": "uuid", "Valid": boolean }, // Nullable: ID of the comment related to the notification.
  "related_event_id": { "String": "uuid", "Valid": boolean }, // Nullable: ID of the event related to the notification.
  "related_conversation_id": { "String": "uuid", "Valid": boolean }, // Nullable: ID of the conversation related to the notification.
  "is_read": boolean,
  "created_at": "timestamp"
}
```

## Notification Preferences Object Structure

```json
{
  "user_id": "uuid",
  "channels": {
    "email": {
      "enabled": boolean,
      "types": {
        "new_comment": boolean,
        "event_reminder": boolean,
        "community_post": boolean,
        "direct_message": boolean,
        "registration_approved": boolean,
        "registration_pending": boolean,
        "event_cancelled": boolean
      }
    },
    "push": {
      "enabled": boolean,
      "types": {
        "new_comment": boolean,
        "event_reminder": boolean,
        "community_post": boolean,
        "direct_message": boolean,
        "registration_approved": boolean,
        "registration_pending": boolean,
        "event_cancelled": boolean
      }
    },
    "in_app": {
      "enabled": boolean,
      "types": {
        "new_comment": boolean,
        "event_reminder": boolean,
        "community_post": boolean,
        "direct_message": boolean,
        "registration_approved": boolean,
        "registration_pending": boolean,
        "event_cancelled": boolean
      }
    }
  }
}
```

---

## List Notifications

Retrieves a list of notifications for the authenticated user.

- **Endpoint**: `GET /api/v1/notifications`
- **Authentication**: Required (Bearer Token)

### Query Parameters

- `limit`: Optional. Maximum number of notifications to return (default 10).
- `offset`: Optional. Number of notifications to skip (default 0).

### Response Body (200 OK)

```json
{
  "notifications": [ /* Array of Notification Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/notifications?limit=5&offset=0" \
  -H "Authorization: Bearer <your_access_token>"
```

## Mark Notification as Read

Marks a specific notification as read.

- **Endpoint**: `POST /api/v1/notifications/:id/read`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the notification to mark as read.

### Response Body (204 No Content)

```
(No content)
```

### Example `curl`

```bash
cURL -X POST http://localhost:8080/api/v1/notifications/<notification_id>/read \
  -H "Authorization: Bearer <your_access_token>"
```

## Mark All Notifications as Read

Marks all of the authenticated user's unread notifications as read.

- **Endpoint**: `POST /api/v1/notifications/read-all`
- **Authentication**: Required (Bearer Token)

### Response Body (204 No Content)

```
(No content)
```

### Example `curl`

```bash
cURL -X POST http://localhost:8080/api/v1/notifications/read-all \
  -H "Authorization: Bearer <your_access_token>"
```

## Delete Notification

Deletes a specific notification belonging to the authenticated user.

- **Endpoint**: `DELETE /api/v1/notifications/:id`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the notification to delete.

### Response Body (204 No Content)

```
(No content)
```

### Example `curl`

```bash
cURL -X DELETE http://localhost:8080/api/v1/notifications/<notification_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## Get Notification Preferences

Retrieves the notification preferences for the authenticated user.

- **Endpoint**: `GET /api/v1/notifications/preferences`
- **Authentication**: Required (Bearer Token)

### Response Body (200 OK)

```json
{
  "preferences": { /* Notification Preferences Object */ }
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/notifications/preferences \
  -H "Authorization: Bearer <your_access_token>"
```

## Update Notification Preferences

Updates the notification preferences for the authenticated user.

- **Endpoint**: `PUT /api/v1/notifications/preferences`
- **Authentication**: Required (Bearer Token)

### Request Body

```json
{
  "channels": {
    "email": {
      "enabled": boolean, // Required: Enable/disable email notifications globally.
      "types": { // Optional: Fine-grained control for email notification types.
        "new_comment": boolean,
        "event_reminder": boolean,
        "community_post": boolean,
        "direct_message": boolean,
        "registration_approved": boolean,
        "registration_pending": boolean,
        "event_cancelled": boolean
      }
    },
    "push": {
      "enabled": boolean, // Required: Enable/disable push notifications globally.
      "types": { // Optional: Fine-grained control for push notification types.
        "new_comment": boolean,
        "event_reminder": boolean,
        "community_post": boolean,
        "direct_message": boolean,
        "registration_approved": boolean,
        "registration_pending": boolean,
        "event_cancelled": boolean
      }
    },
    "in_app": {
      "enabled": boolean, // Required: Enable/disable in-app notifications globally.
      "types": { // Optional: Fine-grained control for in-app notification types.
        "new_comment": boolean,
        "event_reminder": boolean,
        "community_post": boolean,
        "direct_message": boolean,
        "registration_approved": boolean,
        "registration_pending": boolean,
        "event_cancelled": boolean
      }
    }
  }
}
```

### Response Body (200 OK)

```json
{
  "preferences": { /* Updated Notification Preferences Object */ }
}
```

### Example `curl`

```bash
curl -X PUT http://localhost:8080/api/v1/notifications/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "channels": {
      "email": {
        "enabled": true,
        "types": {
          "new_comment": true,
          "event_reminder": false
        }
      },
      "push": {
        "enabled": false
      },
      "in_app": {
        "enabled": true,
        "types": {
          "direct_message": true
        }
      }
    }
  }'
```