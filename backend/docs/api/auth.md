# Authentication

This module handles user registration and authentication.

## Register User

Registers a new user in the system.

- **Endpoint**: `POST /api/v1/auth/register`
- **Authentication**: Not Required

### Request Body

```json
{
  "name": "string", // Required: User's full name.
  "email": "string", // Required: User's email address (must be unique and valid format).
  "password": "string", // Required: User's password (minimum 8 characters).
  "phone": "string", // Optional: User's phone number (must be unique).
  "company": "string", // Optional: User's company.
  "position": "string", // Optional: User's job position.
  "profile_picture_url": "string", // Optional: URL to user's profile picture.
  "bio": "string", // Optional: User's biography.
  "location": "string" // Optional: User's location.
}
```

### Response Body (201 Created)

```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "phone": { "String": "string", "Valid": boolean }, // Nullable field
    "name": "string",
    "profile_picture_url": { "String": "string", "Valid": boolean }, // Nullable field
    "bio": { "String": "string", "Valid": boolean }, // Nullable field
    "company": { "String": "string", "Valid": boolean }, // Nullable field
    "position": { "String": "string", "Valid": boolean }, // Nullable field
    "location": { "String": "string", "Valid": boolean }, // Nullable field
    "face_id_enrolled": boolean,
    "face_id_consent_given": boolean,
    "face_id_consent_time": { "Time": "timestamp", "Valid": boolean }, // Nullable field
    "face_samples_count": number,
    "is_active": boolean,
    "is_banned": boolean,
    "is_verified": boolean,
    "ban_reason": { "String": "string", "Valid": boolean }, // Nullable field
    "banned_until": { "Time": "timestamp", "Valid": boolean }, // Nullable field
    "profile_visibility": "string", // e.g., "public", "private"
    "last_login_at": { "Time": "timestamp", "Valid": boolean }, // Nullable field
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Login User

Authenticates a user and returns JWT access and refresh tokens.

- **Endpoint**: `POST /api/v1/auth/login`
- **Authentication**: Not Required

### Request Body

```json
{
  "email": "string", // Required: User's email address.
  "password": "string" // Required: User's password.
}
```

### Response Body (200 OK)

```json
{
  "access_token": "string", // JWT token to be used in Authorization header for subsequent requests.
  "refresh_token": "string", // JWT token to refresh the access token.
  "user": {
    "id": "uuid",
    "email": "string",
    "phone": { "String": "string", "Valid": boolean },
    "name": "string",
    "profile_picture_url": { "String": "string", "Valid": boolean },
    "bio": { "String": "string", "Valid": boolean },
    "company": { "String": "string", "Valid": boolean },
    "position": { "String": "string", "Valid": boolean },
    "location": { "String": "string", "Valid": boolean },
    "face_id_enrolled": boolean,
    "face_id_consent_given": boolean,
    "face_id_consent_time": { "Time": "timestamp", "Valid": boolean },
    "face_samples_count": number,
    "is_active": boolean,
    "is_banned": boolean,
    "is_verified": boolean,
    "ban_reason": { "String": "string", "Valid": boolean },
    "banned_until": { "Time": "timestamp", "Valid": boolean },
    "profile_visibility": "string",
    "last_login_at": { "Time": "timestamp", "Valid": boolean },
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```