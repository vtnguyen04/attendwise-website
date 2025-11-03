# Users

This module provides endpoints for managing user profiles and related actions.

## Get Current User Profile

Retrieves the profile information of the authenticated user.

- **Endpoint**: `GET /api/v1/users/me`
- **Authentication**: Required (Bearer Token)

### Response Body (200 OK)

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
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer <your_access_token>"
```

## List Users

Retrieves a paginated list of all users.

- **Endpoint**: `GET /api/v1/users`
- **Authentication**: Required (Bearer Token)

### Query Parameters

- `page`: Optional. The page number for pagination. Defaults to `1`.
- `limit`: Optional. The number of items per page for pagination. Defaults to `10`.

### Response Body (200 OK)

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "string",
      "name": "string",
      "profile_picture_url": { "String": "string", "Valid": boolean }
      // ... other user fields
    }
  ]
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer <your_access_token>"
```

## Update User Profile

Updates partial profile information for the authenticated user.

- **Endpoint**: `PATCH /api/v1/users/me`
- **Authentication**: Required (Bearer Token)

### Request Body

```json
{
  "name": "string", // Optional: User's full name.
  "phone": "string", // Optional: User's phone number.
  "company": "string", // Optional: User's company.
  "position": "string", // Optional: User's job position.
  "profile_picture_url": "string", // Optional: URL to user's profile picture.
  "bio": "string", // Optional: User's biography.
  "location": "string", // Optional: User's location.
  "profile_visibility": "string" // Optional: e.g., "public", "private"
}
```

### Response Body (200 OK)

```json
{
  "user": { /* Same as Get Current User Profile response */ }
}
```

### Example `curl`

```bash
curl -X PATCH http://localhost:8080/api/v1/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "company": "New Company Inc.",
    "position": "Senior Developer"
  }'
```

## Interactive Liveness Enrollment Flow

The face enrollment process is an interactive, multi-step workflow designed to verify a user is a live person. It requires the client to make multiple calls to the server.

### Step 1: Get Liveness Challenges

Starts a liveness session and returns a session ID and a list of challenges for the client to perform.

- **Endpoint**: `GET /api/v1/users/enroll-challenge`
- **Authentication**: Required (Bearer Token)

#### Response Body (200 OK)

```json
{
  "session_id": "uuid",
  "challenges": ["front", "smile", "right"] // Example list of challenges
}
```

### Step 2: Submit Frame for Each Challenge

For **each** challenge returned in Step 1, the client must capture a single frame of the user performing the action and submit it.

- **Endpoint**: `POST /api/v1/users/me/enroll-face`
- **Authentication**: Required (Bearer Token)

#### Request Body

```json
{
  "session_id": "string", // Required: The session ID from Step 1.
  "video_data": "string", // Required: Base64 encoded string of a SINGLE IMAGE FRAME (e.g., JPEG format).
  "consent_given": true // Required: Must be true.
}
```

### Step 3: Handle Server Responses

The client must inspect the response body after each frame submission to determine the next action. The server will always return an HTTP `200 OK` for these intermediate steps.

- **Response on Intermediate Success:**
  If the user passes a challenge but more challenges remain, the server returns a JSON object containing an `error` key. The client should check for the `CHALLENGE_PASSED_CONTINUE` substring.
  ```json
  {
    "error": "Face enrollment failed: CHALLENGE_PASSED_CONTINUE"
  }
  ```
  **Action**: The client should proceed to the next challenge in the list.

- **Response on Challenge Failure:**
  If the user fails to perform the action correctly, the server returns a JSON object with a `CHALLENGE_FAILED_RETRY` substring.
  ```json
  {
    "error": "Face enrollment failed: CHALLENGE_FAILED_RETRY"
  }
  ```
  **Action**: The client should instruct the user to **retry the same challenge**.

- **Response on Final Success:**
  After the final challenge is successfully passed, the server returns a success object.
  ```json
  {
    "status": "success",
    "message": "Face successfully enrolled for authentication.",
    "face_id_enrolled": true
  }
  ```
  **Action**: The enrollment process is complete.

- **Response on Other Errors:**
  For other errors (e.g., timeout, no face detected), a different error message will be returned, typically with an HTTP `400 Bad Request`.
  ```json
  {
    "error": "Face enrollment failed: Thu thach 'front' da het han."
  }
  ```
  **Action**: The client should terminate the enrollment flow and display the error.

## Ban User

Bans a specific user. This endpoint typically requires administrative privileges.

- **Endpoint**: `POST /api/v1/users/:id/ban`
- **Authentication**: Required (Bearer Token, requires admin/moderator role)

### Path Parameters

- `id`: The UUID of the user to ban.

### Request Body

```json
{
  "ban_reason": "string", // Optional: Reason for the ban.
  "banned_until": "timestamp" // Optional: ISO 8601 timestamp when the ban expires.
}
```

### Response Body (200 OK)

```json
{
  "message": "User has been banned successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/users/<user_id_to_ban>/ban \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_access_token>" \
  -d '{
    "ban_reason": "Violated community guidelines."
  }'
```

## Change Password

Allows the authenticated user to change their password.

- **Endpoint**: `POST /api/v1/users/change-password`
- **Authentication**: Required (Bearer Token)

### Request Body

```json
{
  "old_password": "string", // Required: User's current password.
  "new_password": "string" // Required: User's new password (minimum 8 characters).
}
```

### Response Body (200 OK)

```json
{
  "message": "Password changed successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/users/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "old_password": "password123",
    "new_password": "new_secure_password"
  }'
```

## Follow User

Creates a follow relationship from the authenticated user to another user.

- **Endpoint**: `POST /api/v1/users/:id/follow`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user to follow.

### Response Body (200 OK)

```json
{
  "message": "Successfully followed user"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/users/<user_id_to_follow>/follow \
  -H "Authorization: Bearer <your_access_token>"
```

## Unfollow User

Removes a follow relationship.

- **Endpoint**: `DELETE /api/v1/users/:id/follow`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user to unfollow.

### Response Body (200 OK)

```json
{
  "message": "Successfully unfollowed user"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/users/<user_id_to_unfollow>/follow \
  -H "Authorization: Bearer <your_access_token>"
```

## Get User Suggestions

Retrieves a paginated list of suggested users to follow, based on mutual communities.

- **Endpoint**: `GET /api/v1/users/suggestions`
- **Authentication**: Required (Bearer Token)

### Query Parameters

- `page`: Optional. The page number for pagination. Defaults to `1`.
- `limit`: Optional. The number of items per page for pagination. Defaults to `10`.

### Response Body (200 OK)

```json
{
  "suggestions": [
    {
      "id": "uuid",
      "name": "string",
      "mutual_communities": 1
    }
  ]
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/users/suggestions?page=1&limit=10" \
  -H "Authorization: Bearer <your_access_token>"
```

## User Experience

### Add Experience

Adds a new work experience entry to the authenticated user's profile.

- **Endpoint**: `POST /api/v1/users/:id/experience`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user whose profile is being modified. Must match the authenticated user's ID.

### Request Body

```json
{
  "title": "string", // Required: Job title.
  "company": "string", // Required: Company name.
  "location": { "String": "string", "Valid": boolean }, // Optional: Location of the job.
  "start_date": "timestamp", // Required: Start date of the experience (ISO 8601).
  "end_date": { "Time": "timestamp", "Valid": boolean }, // Optional: End date of the experience (ISO 8601). Null if current.
  "description": { "String": "string", "Valid": boolean } // Optional: Job description.
}
```

### Response Body (201 Created)

```json
{
  "experience": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "string",
    "company": "string",
    "location": { "String": "string", "Valid": boolean },
    "start_date": "timestamp",
    "end_date": { "Time": "timestamp", "Valid": boolean },
    "description": { "String": "string", "Valid": boolean },
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/users/<user_id>/experience \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "title": "Software Engineer",
    "company": "Tech Corp",
    "location": { "String": "San Francisco, CA", "Valid": true },
    "start_date": "2020-01-01T00:00:00Z",
    "description": { "String": "Developed scalable microservices.", "Valid": true }
  }'
```

### Update Experience

Updates an existing work experience entry.

- **Endpoint**: `PUT /api/v1/users/:id/experience/:exp_id`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user.
- `exp_id`: The UUID of the experience entry.

### Request Body

Same as Add Experience, with the `id` of the experience entry included.

### Response Body (200 OK)

Same as Add Experience response.

### Delete Experience

Deletes a work experience entry.

- **Endpoint**: `DELETE /api/v1/users/:id/experience/:exp_id`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user.
- `exp_id`: The UUID of the experience entry.

### Response Body (204 No Content)

### Get Experience

Retrieves all work experience entries for a user.

- **Endpoint**: `GET /api/v1/users/:id/experience`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user.

### Response Body (200 OK)

```json
{
  "experience": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "string",
      "company": "string",
      "location": { "String": "string", "Valid": boolean },
      "start_date": "timestamp",
      "end_date": { "Time": "timestamp", "Valid": boolean },
      "description": { "String": "string", "Valid": boolean },
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

## User Education

### Add Education

Adds a new education entry to the authenticated user's profile.

- **Endpoint**: `POST /api/v1/users/:id/education`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user whose profile is being modified. Must match the authenticated user's ID.

### Request Body

```json
{
  "school": "string", // Required: Name of the school.
  "degree": { "String": "string", "Valid": boolean }, // Optional: Degree obtained.
  "field_of_study": { "String": "string", "Valid": boolean }, // Optional: Field of study.
  "start_date": { "Time": "timestamp", "Valid": boolean }, // Optional: Start date of education (ISO 8601).
  "end_date": { "Time": "timestamp", "Valid": boolean }, // Optional: End date of education (ISO 8601).
  "description": { "String": "string", "Valid": boolean } // Optional: Description of activities, etc.
}
```

### Response Body (201 Created)

```json
{
  "education": {
    "id": "uuid",
    "user_id": "uuid",
    "school": "string",
    "degree": { "String": "string", "Valid": boolean },
    "field_of_study": { "String": "string", "Valid": boolean },
    "start_date": { "Time": "timestamp", "Valid": boolean },
    "end_date": { "Time": "timestamp", "Valid": boolean },
    "description": { "String": "string", "Valid": boolean },
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### Update Education

Updates an existing education entry.

- **Endpoint**: `PUT /api/v1/users/:id/education/:edu_id`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user.
- `edu_id`: The UUID of the education entry.

### Request Body

Same as Add Education, with the `id` of the education entry included.

### Response Body (200 OK)

Same as Add Education response.

### Delete Education

Deletes an education entry.

- **Endpoint**: `DELETE /api/v1/users/:id/education/:edu_id`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user.
- `edu_id`: The UUID of the education entry.

### Response Body (204 No Content)

### Get Education

Retrieves all education entries for a user.

- **Endpoint**: `GET /api/v1/users/:id/education`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user.

### Response Body (200 OK)

```json
{
  "education": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "school": "string",
      "degree": { "String": "string", "Valid": boolean },
      "field_of_study": { "String": "string", "Valid": boolean },
      "start_date": { "Time": "timestamp", "Valid": boolean },
      "end_date": { "Time": "timestamp", "Valid": boolean },
      "description": { "String": "string", "Valid": boolean },
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

## User Skills

### Add Skill

Adds a new skill to the authenticated user's profile.

- **Endpoint**: `POST /api/v1/users/:id/skills`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user whose profile is being modified. Must match the authenticated user's ID.

### Request Body

```json
{
  "skill_name": "string" // Required: The name of the skill.
}
```

### Response Body (201 Created)

```json
{
  "skill": {
    "id": "uuid",
    "user_id": "uuid",
    "skill_name": "string",
    "endorsement_count": 0,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### Delete Skill

Deletes a skill from a user's profile.

- **Endpoint**: `DELETE /api/v1/users/:id/skills/:skill_id`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user.
- `skill_id`: The UUID of the skill to delete.

### Response Body (204 No Content)

### Get Skills

Retrieves all skills for a user.

- **Endpoint**: `GET /api/v1/users/:id/skills`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user.

### Response Body (200 OK)

```json
{
  "skills": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "skill_name": "string",
      "endorsement_count": 0,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

### Endorse Skill

Endorses a skill for another user.

- **Endpoint**: `POST /api/v1/users/:id/skills/:skill_id/endorse`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user whose skill is being endorsed.
- `skill_id`: The UUID of the skill to endorse.

### Response Body (204 No Content)

### Remove Endorsement

Removes an endorsement for a skill.

- **Endpoint**: `DELETE /api/v1/users/:id/skills/:skill_id/endorse`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the user whose skill endorsement is being removed.
- `skill_id`: The UUID of the skill.

### Response Body (204 No Content)
