# Search

This module provides various endpoints for searching across different types of content in the application.

## Unified Search

Performs a full-text search across users, communities, events, and posts based on an optional type filter.

- **Endpoint**: `GET /api/v1/search`
- **Authentication**: Not Required

### Query Parameters

- `q` (string, required): The search term.
- `type` (string, optional): Filters results by a specific type. If omitted, searches all types. Valid values are:
  - `user`
  - `community`
  - `event`
  - `post`
- `limit` (integer, optional): The maximum number of results to return. Defaults to `20`.
- `offset` (integer, optional): The number of results to skip for pagination. Defaults to `0`.

### Response Body (200 OK)

Returns a list of search results, each containing the type, a relevance rank, and the result object itself.

```json
{
  "results": [
    {
      "type": "community",
      "rank": 0.95,
      "result": {
        "id": "a8833bce-c329-4242-856f-5709a9eb3dfd",
        "name": "Go Developers Club",
        "slug": "go-developers-club-a8833bce",
        "cover_image_url": null,
        "member_count": 1
      }
    },
    {
      "type": "event",
      "rank": 0.88,
      "result": {
        "id": "a7a6e4f1-f6ab-4952-8570-b8f011b22141",
        "name": "Intro to gRPC in Go",
        "slug": "intro-to-grpc-in-go-a7a6e4f1",
        "cover_image_url": null,
        "start_time": "2025-11-15T10:00:00Z"
      }
    }
  ]
}
```

### Example `curl`

```bash
# General search for 'Go'
curl -X GET "http://localhost:8080/api/v1/search?q=Go"

# Search only for users with the name 'Test'
curl -X GET "http://localhost:8080/api/v1/search?q=Test&type=user"
```

## Search Users

Searches for users by name or other relevant fields.

- **Endpoint**: `GET /api/v1/search/users`
- **Authentication**: Not Required

### Query Parameters

- `q` (string, required): The search term.
- `limit` (integer, optional): The maximum number of results to return. Defaults to `20`.
- `offset` (integer, optional): The number of results to skip for pagination. Defaults to `0`.

### Response Body (200 OK)

Returns a list of user search results.

```json
{
  "results": [
    {
      "type": "user",
      "rank": 0.92,
      "result": {
        "id": "user-id-1",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "profile_picture_url": "http://example.com/john.jpg"
      }
    }
  ]
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/search/users?q=John"
```

## Search Communities

Searches for communities by name or description.

- **Endpoint**: `GET /api/v1/search/communities`
- **Authentication**: Not Required

### Query Parameters

- `q` (string, required): The search term.
- `limit` (integer, optional): The maximum number of results to return. Defaults to `20`.
- `offset` (integer, optional): The number of results to skip for pagination. Defaults to `0`.

### Response Body (200 OK)

Returns a list of community search results.

```json
{
  "results": [
    {
      "type": "community",
      "rank": 0.90,
      "result": {
        "id": "community-id-1",
        "name": "Local Coders",
        "slug": "local-coders",
        "cover_image_url": "http://example.com/community.jpg",
        "member_count": 150
      }
    }
  ]
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/search/communities?q=Coders"
```

## Search Events

Searches for events by name or description within communities the user is a member of.

- **Endpoint**: `GET /api/v1/search/events`
- **Authentication**: Required (JWT)

### Query Parameters

- `q` (string, required): The search term.
- `limit` (integer, optional): The maximum number of results to return. Defaults to `20`.
- `offset` (integer, optional): The number of results to skip for pagination. Defaults to `0`.

### Response Body (200 OK)

Returns a list of event search results.

```json
{
  "results": [
    {
      "type": "event",
      "rank": 0.85,
      "result": {
        "id": "event-id-1",
        "name": "Monthly Meetup",
        "slug": "monthly-meetup",
        "cover_image_url": "http://example.com/event.jpg",
        "start_time": "2025-12-01T18:00:00Z"
      }
    }
  ]
}
```

### Example `curl`

```bash
curl -X GET -H "Authorization: Bearer YOUR_JWT_TOKEN" "http://localhost:8080/api/v1/search/events?q=Meetup"
```
