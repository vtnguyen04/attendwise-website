# Activity and Messaging API

This API provides endpoints for retrieving user activity feeds and managing messaging read statuses.

## Endpoints

### Get Activity Feed

- **Method:** `GET`
- **Endpoint:** `/api/v1/feed/activity`
- **Description:** Retrieves a paginated list of activities for the authenticated user.
- **Query Parameters:**
  - `limit`: (Optional) Maximum number of activities to return. Default is 20, max is 100.
  - `offset`: (Optional) Number of activities to skip. Default is 0.
- **Responses:**
  - `200 OK`: A paginated list of activity objects.
    ```json
    {
      "activities": [
        {
          "id": "string",
          "user_id": "string",
          "actor_id": "string",
          "action_type": "string",
          "target_type": "string",
          "target_id": "string",
          "community_id": { "String": "string", "Valid": true },
          "event_id": { "String": "string", "Valid": false },
          "preview_text": "string",
          "preview_image_url": "string",
          "is_read": false,
          "is_visible": true,
          "created_at": "2025-10-26T23:25:45.827659+07:00"
        }
      ],
      "pagination": {
        "has_more": false,
        "limit": 20,
        "page": 1,
        "total": 1
      }
    }
    ```
  - `401 Unauthorized`: User is not authenticated.
  - `500 Internal Server Error`: Server error.

### Mark Conversation as Read

- **Method:** `POST`
- **Endpoint:** `/api/v1/conversations/{id}/read`
- **Description:** Marks a specific conversation as read for the authenticated user. Resets the unread message count for that conversation.
- **Path Parameters:**
  - `id`: The ID of the conversation to mark as read.
- **Responses:**
  - `204 No Content`: Conversation successfully marked as read.
  - `401 Unauthorized`: User is not authenticated.
  - `500 Internal Server Error`: Server error.