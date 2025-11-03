# News Feed

This module provides endpoints for managing and retrieving a user's personalized news feed.

## Create Post

Allows an authenticated user to create a new post for the global feed. This post is not associated with a specific community or event by default, but can be linked if `community_id` or `event_id` is provided.

- **Endpoint**: `POST /api/v1/feed/posts`
- **Authentication**: Required (Bearer Token)

### Request Body

```json
{
  "content": "string",          // Required: The main content of the post.
  "visibility": "public",       // Optional: "public", "community", "class". Defaults to "public".
  "media_urls": ["string"],     // Optional: Array of URLs for images or videos.
  "hashtags": ["string"],       // Optional: Array of hashtags.
  "event_id": "uuid",           // Optional: Associate post with an event.
  "community_id": "uuid"        // Optional: Associate post with a community.
}
```

### Response Body (201 Created)

```json
{
  "post": {
    "id": "uuid",
    "author_id": "uuid",
    "community_id": "uuid",
    "event_id": "uuid",
    "content": "string",
    "content_html": "string",
    "media_urls": ["string"],
    "file_attachments": [],
    "hashtags": ["string"],
    "mentioned_user_ids": ["uuid"],
    "visibility": "public",
    "status": "approved",
    "post_type": "general",
    "reviewed_by": "uuid",
    "reviewed_at": "timestamp",
    "rejection_reason": "string",
    "flagged_count": 0,
    "comment_count": 0,
    "reaction_count": 0,
    "share_count": 0,
    "view_count": 0,
    "is_pinned": false,
    "pinned_until": "timestamp",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "published_at": "timestamp",
    "deleted_at": "timestamp",
    "author": {
      "id": "uuid",
      "name": "string",
      "profile_picture_url": "string"
    },
    "user_has_liked": false
  }
}
```

### Example `curl`

```bash
curl -X POST "http://localhost:8080/api/v1/feed/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "content": "My first general post! #hello #world",
    "visibility": "public",
    "media_urls": ["https://example.com/image.jpg"],
    "hashtags": ["hello", "world"]
  }'
```

## Get Feed

Retrieves a personalized feed of posts and events from the communities the authenticated user is a member of, and can optionally include global-general posts. The feed is sorted by creation date (newest first).

- **Endpoint**: `GET /api/v1/feed`
- **Authentication**: Required (Bearer Token)

### Query Parameters

- `limit` (optional): The maximum number of items to return. Defaults to 50, capped at 100.
- `scope` (optional): Controls which data sources are included. Supported values:
  - `all` *(default)* – community items plus global posts.
  - `community` – only activity from communities the user belongs to (posts + upcoming events).
  - `global` – only globally visible posts (no community events).

### Response Body (200 OK)

```json
[
  {
    "type": "post",
    "post": {
      "id": "uuid",
      "author_id": "uuid",
      "community_id": "uuid",
      "event_id": "uuid",
      "content": "string",
      "content_html": "string",
      "media_urls": ["string"],
      "file_attachments": [],
      "hashtags": ["string"],
      "mentioned_user_ids": ["uuid"],
      "visibility": "public",
      "status": "approved",
      "post_type": "general",
      "reviewed_by": "uuid",
      "reviewed_at": "timestamp",
      "rejection_reason": "string",
      "flagged_count": 0,
      "comment_count": 0,
      "reaction_count": 0,
      "share_count": 0,
      "view_count": 0,
      "is_pinned": false,
      "pinned_until": "timestamp",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "published_at": "timestamp",
      "deleted_at": "timestamp",
      "author": {
        "id": "uuid",
        "name": "string",
        "profile_picture_url": "string"
      },
      "user_has_liked": false
    },
    "created_at": "timestamp"
  },
  {
    "type": "event",
    "event": {
      "event_id": "uuid",
      "session_id": "uuid",
      "event_name": "string",
      "cover_image_url": "string",
      "community_id": "uuid",
      "start_time": "timestamp",
      "end_time": "timestamp",
      "is_recurring": false,
      "status": "upcoming",
      "is_registered": false,
      "location_type": "physical",
      "location_address": "string",
      "created_by_name": "string",
      "created_by_avatar": "string",
      "created_at": "timestamp"
    },
    "created_at": "timestamp"
  }
]
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/feed?limit=10&scope=community" \
  -H "Authorization: Bearer <your_access_token>"
```

## List Global Posts

Retrieves globally visible (non-community) posts, independent of the requesting user's community memberships. Results are ordered by creation time (newest first) and include pagination metadata.

- **Endpoint**: `GET /api/v1/feed/posts`
- **Authentication**: Required (Bearer Token)

### Query Parameters

- `limit` (optional): Number of posts to return. Defaults to 10, capped at 50.
- `offset` (optional): Zero-based offset for pagination. Defaults to 0.
- `author_id` (optional): Filter posts authored by a specific user.

### Response Body (200 OK)

```json
{
  "posts": [
    {
      "id": "uuid",
      "author_id": "uuid",
      "community_id": null,
      "event_id": null,
      "content": "string",
      "content_html": "string",
      "media_urls": ["string"],
      "file_attachments": [],
      "hashtags": ["string"],
      "mentioned_user_ids": ["uuid"],
      "visibility": "public",
      "status": "approved",
      "post_type": "general",
      "comment_count": 0,
      "reaction_count": 0,
      "share_count": 0,
      "view_count": 0,
      "is_pinned": false,
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "author": {
        "id": "uuid",
        "name": "string",
        "profile_picture_url": "string"
      },
      "user_has_liked": false
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/feed/posts?limit=10&offset=0" \
  -H "Authorization: Bearer <your_access_token>"
```

> **Internal note:** Global feed data is now served through the dedicated Feed module and repository, ensuring community-specific repositories are only responsible for community-scoped content.
