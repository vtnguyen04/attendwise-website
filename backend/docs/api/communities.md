# Communities

This module provides endpoints for managing communities, their members, posts, and comments.

## Community Object Structure

```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "name": "string",
  "slug": "string",
  "description": { "String": "string", "Valid": boolean }, // Nullable
  "cover_image_url": { "String": "string", "Valid": boolean }, // Nullable
  "type": "string", // Type of community: 'public', 'private', or 'secret'.
  "allow_member_posts": boolean, // If true, non-admin members can create posts.
  "auto_approve_posts": boolean, // If true, new posts are automatically approved.
  "allow_member_invites": boolean, // If true, members can invite others.
  "member_count": number,
  "post_count": number,
  "event_count": number,
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "deleted_at": { "Time": "timestamp", "Valid": boolean }, // Nullable

  // Enriched data (from joins, may not always be present)
  "admin_name": "string", // Name of the community owner.
  "admin_avatar_url": "string", // Avatar URL of the community owner.
  "role": "string", // User's role in this community (e.g., "community_admin", "member", "pending").
  "status": "string", // User's membership status in this community (e.g., "active", "pending").
  "common_members": number, // Number of common members with the requesting user (for suggestions).
  "member_previews": [ /* Array of CommunityMember Objects */ ]
}
```

## Post Object Structure

```json
{
  "id": "uuid",
  "author_id": "uuid",
  "community_id": "uuid",
  "event_id": { "String": "uuid", "Valid": boolean }, // Nullable
  "content": "string",
  "content_html": { "String": "string", "Valid": boolean }, // Nullable
  "media_urls": ["string"], // Array of URLs to media files.
  "file_attachments": {}, // JSONB object for file attachments.
  "hashtags": ["string"],
  "mentioned_user_ids": ["uuid"],
  "visibility": "string", // e.g., "public", "community_only", "event_only", "members_only"
  "status": "string", // e.g., "draft", "pending", "approved", "rejected", "flagged"
  "reviewed_by": { "String": "uuid", "Valid": boolean }, // Nullable
  "reviewed_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "rejection_reason": { "String": "string", "Valid": boolean }, // Nullable
  "flagged_count": number,
  "comment_count": number,
  "reaction_count": number,
  "share_count": number,
  "view_count": number,
  "is_pinned": boolean,
  "pinned_until": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "published_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "deleted_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "author": { /* User Object Subset */ }
}
```

## Comment Object Structure

```json
{
  "id": "uuid",
  "post_id": "uuid",
  "author_id": "uuid",
  "parent_comment_id": { "String": "uuid", "Valid": boolean }, // Nullable, for threaded comments.
  "content": "string",
  "content_html": { "String": "string", "Valid": boolean }, // Nullable
  "media_urls": ["string"], // Array of URLs to media files.
  "mentioned_user_ids": ["uuid"],
  "status": "string", // e.g., "approved", "rejected"
  "reviewed_by": { "String": "uuid", "Valid": boolean }, // Nullable
  "reviewed_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "flagged_count": number,
  "thread_depth": number,
  "thread_path": { "String": "string", "Valid": boolean }, // Nullable
  "reaction_count": number,
  "reply_count": number,
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "deleted_at": { "Time": "timestamp", "Valid": boolean }, // Nullable
  "author": { /* User Object Subset */ }
}
```

---

## Create Community

Creates a new community.

- **Endpoint**: `POST /api/v1/communities`
- **Authentication**: Required (Bearer Token)

### Request Body

```json
{
  "name": "string", // Required: Name of the community.
  "type": "string", // Required: The type of community. Can be 'public', 'private', or 'secret'.
  "description": "string", // Optional: Description of the community.
  "cover_image_url": "string", // Optional: URL to the community's cover image.
  "allow_member_posts": boolean, // Optional: Default true. If true, non-admin members can create posts.
  "auto_approve_posts": boolean, // Optional: Default true. If true, new posts are automatically approved.
  "allow_member_invites": boolean // Optional: Default true. If true, members can invite others.
}
```

### Response Body (201 Created)

```json
{
  "community": { /* Community Object */ }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/communities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "name": "My New Public Community",
    "type": "public",
    "description": "A place for interesting discussions."
  }'
```

## List All Communities

Retrieves a list of all communities visible to the authenticated user.

- **Endpoint**: `GET /api/v1/communities`
- **Authentication**: Required (Bearer Token)

### Response Body (200 OK)

```json
{
  "communities": [ /* Array of Community Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/communities \
  -H "Authorization: Bearer <your_access_token>"
```

## Get Community Suggestions

Retrieves a list of suggested communities for the authenticated user.

- **Endpoint**: `GET /api/v1/communities/suggestions`
- **Authentication**: Required (Bearer Token)

### Response Body (200 OK)

```json
{
  "suggestions": [ /* Array of Community Objects (subset) */ ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/communities/suggestions \
  -H "Authorization: Bearer <your_access_token>"
```

## List User's Communities

Retrieves a list of communities that the authenticated user is a member of.

- **Endpoint**: `GET /api/v1/my-communities`
- **Authentication**: Required (Bearer Token)

### Response Body (200 OK)

```json
{
  "communities": [ /* Array of Community Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/my-communities \
  -H "Authorization: Bearer <your_access_token>"
```

## Get Community Details

Retrieves detailed information about a specific community.

- **Authentication**: Required (Bearer Token, also requires membership in the community if it's private/secret)

### Path Parameters

- `id`: The UUID of the community.

### Response Body (200 OK)

```json
{
  "community": { /* Community Object */ }
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/communities/<community_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## Update Community

Updates partial information for a specific community. Requires `community_admin` role.

- **Endpoint**: `PATCH /api/v1/communities/:id`
- **Authentication**: Required (Bearer Token, requires `community_admin` role)

### Path Parameters

- `id`: The UUID of the community to update.

### Request Body

```json
{
  "name": "string", // Optional: New name for the community.
  "description": "string", // Optional: New description.
  "cover_image_url": "string", // Optional: New cover image URL.
  "type": "string", // Optional: Update community type. Can be 'public', 'private', or 'secret'.
  "allow_member_posts": boolean, // Optional: Update post creation permission.
  "auto_approve_posts": boolean, // Optional: Update auto-approval for posts.
  "allow_member_invites": boolean // Optional: Update member invite permission.
}
```

### Response Body (200 OK)

```json
{
  "community": { /* Updated Community Object */ }
}
```

### Example `curl`

```bash
curl -X PATCH http://localhost:8080/api/v1/communities/<community_id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_access_token>" \
  -d '{
    "description": "An updated description for the community."
  }'
```

## Join Community

Allows the authenticated user to join a community.

- **Endpoint**: `POST /api/v1/communities/:id/members`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the community to join.

### Response Body (200 OK)

```json
{
  "message": "Successfully processed join request",
  "community": { /* Community Object, with user's role and status updated */ }
}
```

**Note:** If the community type is `private`, the user's membership status will initially be `pending` and will require approval from a community admin. If the community type is `secret`, direct joining is not allowed; users must be invited.


### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/communities/<community_id>/members \
  -H "Authorization: Bearer <your_access_token>"
```

## Leave Community

Allows the authenticated user to leave a community.

- **Endpoint**: `DELETE /api/v1/communities/:id/members/me`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `id`: The UUID of the community to leave.

### Response Body (200 OK)

```json
{
  "message": "Successfully left community"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/communities/<community_id>/members/me \
  -H "Authorization: Bearer <your_access_token>"
```

## Update Member Role

Updates the role of a specific member within a community. Requires `community_admin` role.

- **Endpoint**: `PATCH /api/v1/communities/:id/members/:userId`
- **Authentication**: Required (Bearer Token, requires `community_admin` role)

### Path Parameters

- `id`: The UUID of the community.
- `userId`: The UUID of the member whose role is to be updated.

### Request Body

```json
{
  "role": "string" // Required: New role for the member (e.g., "member", "moderator", "community_admin").
}
```

### Response Body (200 OK)

```json
{
  "message": "Member role updated"
}
```

### Example `curl`

```bash
curl -X PATCH http://localhost:8080/api/v1/communities/<community_id>/members/<user_id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_access_token>" \
  -d '{
    "role": "moderator"
  }'
```

## Remove Member

Removes a specific member from a community. Requires `community_admin` role.

- **Endpoint**: `DELETE /api/v1/communities/:id/members/:userId`
- **Authentication**: Required (Bearer Token, requires `community_admin` role)

### Path Parameters

- `id`: The UUID of the community.
- `userId`: The UUID of the member to remove.

### Response Body (200 OK)

```json
{
  "message": "Member removed"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/communities/<community_id>/members/<user_id> \
  -H "Authorization: Bearer <admin_access_token>"
```

**Note on Community Deletion:** Currently, there is no API endpoint for deleting a community itself. The functionality to delete a community is not supported at this time.

## List Community Members

### Response Body (200 OK)

```json
{
  "members": [
    {
      "id": "uuid",
      "email": "string",
      "phone": "string",
      "name": "string",
      "profile_picture_url": "string",
      "bio": "string",
      "company": "string",
      "position": "string",
      "location": "string",
      "face_id_enrolled": boolean,
      "face_id_consent_given": boolean,
      "face_id_consent_time": "timestamp",
      "face_samples_count": number,
      "is_active": boolean,
      "is_banned": boolean,
      "is_verified": boolean,
      "ban_reason": "string",
      "banned_until": "timestamp",
      "profile_visibility": "string",
      "last_login_at": "timestamp",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "role": "string",
      "status": "string",
      "joined_at": "timestamp"
    }
  ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/communities/<community_id>/members \
  -H "Authorization: Bearer <your_access_token>"
```

## List Pending Members

Retrieves a list of members whose join requests are pending for a specific community. Requires `community_admin` or `moderator` role.

- **Endpoint**: `GET /api/v1/communities/:id/members/pending`
- **Authentication**: Required (Bearer Token, requires `community_admin` or `moderator` role)

### Path Parameters

- `id`: The UUID of the community.

### Response Body (200 OK)

```json
{
  "members": [
    {
      "id": "uuid",
      "email": "string",
      "phone": "string",
      "name": "string",
      "profile_picture_url": "string",
      "bio": "string",
      "company": "string",
      "position": "string",
      "location": "string",
      "face_id_enrolled": boolean,
      "face_id_consent_given": boolean,
      "face_id_consent_time": "timestamp",
      "face_samples_count": number,
      "is_active": boolean,
      "is_banned": boolean,
      "is_verified": boolean,
      "ban_reason": "string",
      "banned_until": "timestamp",
      "profile_visibility": "string",
      "last_login_at": "timestamp",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "role": "string",
      "status": "string",
      "joined_at": "timestamp"
    }
  ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/communities/<community_id>/members/pending \
  -H "Authorization: Bearer <admin_access_token>"
```

## Approve Member

Approves a pending member's join request for a community. Requires `community_admin` or `moderator` role.

- **Endpoint**: `POST /api/v1/communities/:id/members/:userId/approve`
- **Authentication**: Required (Bearer Token, requires `community_admin` or `moderator` role)

### Path Parameters

- `id`: The UUID of the community.
- `userId`: The UUID of the member to approve.

### Response Body (200 OK)

```json
{
  "message": "Member approved successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/communities/<community_id>/members/<user_id>/approve \
  -H "Authorization: Bearer <admin_access_token>"
```

## Create Post

Creates a new post in a community. If `auto_approve_posts` is false for the community, the post will be `pending`.

- **Endpoint**: `POST /api/v1/communities/:id/posts`
- **Authentication**: Required (Bearer Token, requires community membership)

### Path Parameters

- `id`: The UUID of the community where the post will be created.

### Request Body

```json
{
  "content": "string", // Required: The content of the post.
  "visibility": "string", // Optional: Default "community_only". e.g., "public", "community_only".
  "media_urls": ["string"] // Optional: Array of URLs to media files.
}
```

### Response Body (201 Created)

```json
{
  "post": { /* Post Object */ }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/communities/<community_id>/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "content": "This is my new post!",
    "visibility": "community_only"
  }'
```

## Create Poll

Creates a new poll in a community.

- **Endpoint**: `POST /api/v1/communities/:id/polls`
- **Authentication**: Required (Bearer Token, requires community membership)

### Path Parameters

- `id`: The UUID of the community where the poll will be created.

### Request Body

```json
{
  "title": "string", // Required: The question of the poll.
  "options": ["string"] // Required: An array of strings representing the poll options. Must have at least 2 options.
}
```

### Response Body (201 Created)

```json
{
  "post": { /* Post Object with poll_options */ }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/communities/<community_id>/polls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "title": "What is your favorite programming language?",
    "options": ["Go", "Python", "JavaScript"]
  }'
```

## Vote on a Poll

Casts a vote on a poll.

- **Endpoint**: `POST /api/v1/posts/:postID/poll/vote/:optionID`
- **Authentication**: Required (Bearer Token, requires community membership)

### Path Parameters

- `postID`: The UUID of the poll post.
- `optionID`: The UUID of the poll option to vote for.

### Response Body (204 No Content)

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/posts/<post_id>/poll/vote/<option_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## List Community Posts

Retrieves a list of posts for a specific community.

- **Endpoint**: `GET /api/v1/communities/:id/posts`
- **Authentication**: Required (Bearer Token, requires community membership)

### Path Parameters

- `id`: The UUID of the community.

### Query Parameters

- `status`: Optional. Filter posts by status (e.g., "approved", "pending").
- `page`: Optional. Page number for pagination (default 1).
- `limit`: Optional. Number of posts per page (default 10, max 50).

### Response Body (200 OK)

```json
{
  "posts": [ /* Array of Post Objects */ ],
  "pagination": {
    "total": number,
    "page": number,
    "limit": number,
    "has_more": boolean
  }
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/communities/<community_id>/posts?status=approved&page=1&limit=10" \
  -H "Authorization: Bearer <your_access_token>"
```

## List User Posts in Community

Retrieves a list of posts by a specific user within a specific community.

- **Endpoint**: `GET /api/v1/communities/:id/posts/user/:userId`
- **Authentication**: Required (Bearer Token, requires community membership)

### Path Parameters

- `id`: The UUID of the community.
- `userId`: The UUID of the user.

### Query Parameters

- `page`: Optional. Page number for pagination (default 1).
- `limit`: Optional. Number of posts per page (default 10, max 50).

### Response Body (200 OK)

```json
{
  "posts": [ /* Array of Post Objects */ ],
  "pagination": {
    "total": number,
    "page": number,
    "limit": number,
    "has_more": boolean
  }
}
```

### Example `curl`

```bash
curl -X GET "http://localhost:8080/api/v1/communities/<community_id>/posts/user/<user_id>?page=1&limit=10" \
  -H "Authorization: Bearer <your_access_token>"
```

## Get Post Details

Retrieves detailed information about a specific post.

- **Endpoint**: `GET /api/v1/posts/:postID`
- **Authentication**: Required (Bearer Token, requires community membership)

### Path Parameters

- `postID`: The UUID of the post.

### Response Body (200 OK)

```json
{
  "post": { /* Post Object */ }
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/posts/<post_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## Update Post

Updates a post that the authenticated user owns.

- **Endpoint**: `PATCH /api/v1/posts/:postID`
- **Authentication**: Required (Bearer Token, user must be the author of the post)

### Path Parameters

- `postID`: The UUID of the post to update.

### Request Body

```json
{
  "content": "string", // Optional: The updated content of the post.
  "visibility": "string", // Optional: The updated visibility of the post.
  "media_urls": ["string"] // Optional: The updated array of media URLs.
}
```

### Response Body (200 OK)

```json
{
  "post": { /* Updated Post Object */ }
}
```

### Example `curl`

```bash
curl -X PATCH http://localhost:8080/api/v1/posts/<post_id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "content": "This is the updated content of my post!"
  }'
```

## Delete Post

Deletes a post that the authenticated user owns.

- **Endpoint**: `DELETE /api/v1/posts/:postID`
- **Authentication**: Required (Bearer Token, user must be the author of the post or a community admin)

### Path Parameters

- `postID`: The UUID of the post to delete.

### Response Body (200 OK)

```json
{
  "message": "Post deleted successfully"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/posts/<post_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## Create Comment

Creates a new comment on a post. Comments are always `approved` by default.

- **Endpoint**: `POST /api/v1/posts/:postID/comments`
- **Authentication**: Required (Bearer Token, requires community membership)

### Path Parameters

- `postID`: The UUID of the post to comment on.

### Request Body

```json
{
  "content": "string", // Required: The content of the comment.
  "parent_comment_id": "string" // Optional: UUID of a parent comment for threaded replies.
}
```

### Response Body (201 Created)

```json
{
  "comment": { /* Comment Object */ }
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/posts/<post_id>/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "content": "Great post!",
    "parent_comment_id": "<optional_parent_comment_id>"
  }'
```

## List Comments

Retrieves a list of comments for a specific post.

- **Endpoint**: `GET /api/v1/posts/:postID/comments`
- **Authentication**: Required (Bearer Token, requires community membership)

### Path Parameters

- `postID`: The UUID of the post.

### Response Body (200 OK)

```json
{
  "comments": [ /* Array of Comment Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/posts/<post_id>/comments \
  -H "Authorization: Bearer <your_access_token>"
```

## Update Comment

Updates a comment that the authenticated user owns.

- **Endpoint**: `PATCH /api/v1/comments/:commentID`
- **Authentication**: Required (Bearer Token, user must be the author of the comment)

### Path Parameters

- `commentID`: The UUID of the comment to update.

### Request Body

```json
{
  "content": "string" // Required: The updated content of the comment.
}
```

### Response Body (200 OK)

```json
{
  "comment": { /* Updated Comment Object */ }
}
```

### Example `curl`

```bash
curl -X PATCH http://localhost:8080/api/v1/comments/<comment_id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "content": "This is the updated content of my comment!"
  }'
```

## Delete Comment

Deletes a comment that the authenticated user owns.

- **Endpoint**: `DELETE /api/v1/comments/:commentID`
- **Authentication**: Required (Bearer Token, user must be the author of the comment or a community admin)

### Path Parameters

- `commentID`: The UUID of the comment to delete.

### Response Body (200 OK)

```json
{
  "message": "Comment deleted successfully"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/comments/<comment_id> \
  -H "Authorization: Bearer <your_access_token>"
```

## Approve Post

Approves a pending post. Requires `community_admin` or `moderator` role.

- **Endpoint**: `POST /api/v1/posts/:postID/approve`
- **Authentication**: Required (Bearer Token, requires `community_admin` or `moderator` role)

### Path Parameters

- `postID`: The UUID of the post to approve.

### Response Body (200 OK)

```json
{
  "message": "Post approved successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/posts/<post_id>/approve \
  -H "Authorization: Bearer <admin_access_token>"
```

## Reject Post

Rejects a pending post. Requires `community_admin` or `moderator` role.

- **Endpoint**: `POST /api/v1/posts/:postID/reject`
- **Authentication**: Required (Bearer Token, requires `community_admin` or `moderator` role)

### Path Parameters

- `postID`: The UUID of the post to reject.

### Response Body (200 OK)

```json
{
  "message": "Post rejected successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/posts/<post_id>/reject \
  -H "Authorization: Bearer <admin_access_token>"
```

## React to Post

Adds or updates a reaction to a post.

- **Endpoint**: `POST /api/v1/posts/:postID/reactions`
- **Authentication**: Required (Bearer Token, requires community membership)

### Path Parameters

- `postID`: The UUID of the post to react to.

### Request Body

```json
{
  "reaction_type": "string" // Required: Type of reaction (e.g., "like", "love", "haha").
}
```

### Response Body (200 OK)

```json
{
  "message": "Reaction saved"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/posts/<post_id>/reactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "reaction_type": "like"
  }'
```

## Delete Reaction

Removes a reaction from a post.

- **Endpoint**: `DELETE /api/v1/posts/:postID/reactions`
- **Authentication**: Required (Bearer Token, user must be the one who created the reaction)

### Path Parameters

- `postID`: The UUID of the post.

### Response Body (200 OK)

```json
{
  "message": "Reaction removed"
}
```

### Example `curl`

```bash
curl -X DELETE http://localhost:8080/api/v1/posts/<post_id>/reactions \
  -H "Authorization: Bearer <your_access_token>"
```

## Pin Post

Pins or unpins a post. Requires `community_admin` or `moderator` role.

- **Endpoint**: `POST /api/v1/posts/:postID/pin`
- **Authentication**: Required (Bearer Token, requires `community_admin` or `moderator` role)

### Path Parameters

- `postID`: The UUID of the post to pin/unpin.

### Request Body

```json
{
  "is_pinned": boolean // Required: true to pin, false to unpin.
}
```

### Response Body (200 OK)

```json
{
  "message": "Post pin status updated"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/posts/<post_id>/pin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_access_token>" \
  -d '{
    "is_pinned": true
  }'
```

## List Post Reactions

Retrieves a list of reactions for a specific post.

- **Endpoint**: `GET /api/v1/posts/:postID/reactions`
- **Authentication**: Required (Bearer Token)

### Path Parameters

- `postID`: The UUID of the post.

### Response Body (200 OK)

```json
{
  "reactions": [ /* Array of Reaction Objects */ ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/posts/<post_id>/reactions \
  -H "Authorization: Bearer <your_access_token>"
```

## Approve Comment

Approves a pending comment. Requires `community_admin` or `moderator` role. (Note: Currently, comments are always approved by default upon creation, so this endpoint may not be directly testable without code modification.)

- **Endpoint**: `POST /api/v1/comments/:commentID/approve`
- **Authentication**: Required (Bearer Token, requires `community_admin` or `moderator` role)

### Path Parameters

- `commentID`: The UUID of the comment to approve.

### Response Body (200 OK)

```json
{
  "message": "Comment approved successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/comments/<comment_id>/approve \
  -H "Authorization: Bearer <admin_access_token>"
```

## Reject Comment

Rejects a pending comment. Requires `community_admin` or `moderator` role. (Note: Currently, comments are always approved by default upon creation, so this endpoint may not be directly testable without code modification.)

- **Endpoint**: `POST /api/v1/comments/:commentID/reject`
- **Authentication**: Required (Bearer Token, requires `community_admin` or `moderator` role)

### Path Parameters

- `commentID`: The UUID of the comment to reject.

### Response Body (200 OK)

```json
{
  "message": "Comment rejected successfully"
}
```

### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/comments/<comment_id>/reject \
  -H "Authorization: Bearer <admin_access_token>"
```
