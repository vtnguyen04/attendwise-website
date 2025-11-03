# API Documentation

Welcome to the AttendWise API documentation for frontend developers. This document provides detailed information on how to interact with the backend services.

## Structure

This documentation is organized by functional modules. Each module has its own Markdown file detailing the available endpoints, their purpose, required payloads, and expected responses.

- [Authentication](#authentication)
- [Users](#users)
- [Communities](#communities)
- [Events](#events)
- [Check-in](#check-in)
- [Messaging](#messaging)
- [Notifications](#notifications)
- [Reports](#reports)
- [Media](#media)
- [Real-time (WebSockets)](#real-time-websockets)

## Base URL

The base URL for all API endpoints is `http://localhost:8080/api/v1` (for local development).

## Authentication

Most endpoints require authentication using a Bearer Token. After successful login, you will receive an `access_token`. Include this token in the `Authorization` header of your requests:

`Authorization: Bearer <your_access_token>`

## Data Types

- **UUID**: Represented as a string (e.g., `"a0d9e633-79e4-4dbf-93a8-9d1d3424607d"`).
- **Timestamp**: Represented as an ISO 8601 string (e.g., `"2025-10-10T00:00:00Z"`).
- **Nullable Fields**: For fields that can be null in the database (e.g., `description`, `cover_image_url`), the backend expects a simple string if a value is provided, or it can be omitted from the JSON payload if null. The backend handles conversion to `sql.NullString` or `sql.NullTime` internally.

## Error Handling

API errors are returned in JSON format with an `error` field and sometimes a `details` field.

```json
{
  "error": "Error message",
  "details": "Optional detailed error information"
}
```

Common HTTP Status Codes:
- `200 OK`: Request successful.
- `201 Created`: Resource successfully created.
- `204 No Content`: Request successful, but no content to return (e.g., DELETE).
- `400 Bad Request`: Invalid request payload or parameters.
- `401 Unauthorized`: Authentication token is missing or invalid.
- `403 Forbidden`: User does not have permission to perform the action.
- `404 Not Found`: Resource not found.
- `409 Conflict`: Resource already exists or a conflict occurred (e.g., duplicate email).
- `500 Internal Server Error`: An unexpected error occurred on the server.

---

## Modules

- [System Architecture](architecture.md)
- [Authentication](auth.md)
- [Users](users.md)
- [Communities](communities.md)
- [Events](events.md)
- [Check-in](checkin.md)
- [Messaging](messaging.md)
- [Notifications](notifications.md)
- [Reports](reports.md)
- [Media](media.md)
- [Real-time (WebSockets)](realtime.md)
- [Search](search.md)
