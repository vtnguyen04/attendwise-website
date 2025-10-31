/**
 * @file lib/types.ts
 * @description This file serves as the single source of truth (Singleton) for all
 * API data structures and client-side type definitions.
 * It is generated based on the official backend API documentation and Go structs.
 * @version 2.1 - Added TicketPayload type.
 */

// =================================================================================
// 1. UTILITY TYPES (Handling Go Backend Nullable Structures)
// =================================================================================

/** Represents a nullable string from the Go backend (sql.NullString). */
export type NullableString = { String: string; Valid: boolean };

/** Represents a nullable timestamp from the Go backend (sql.NullTime). */
export type NullableTime = { Time: string; Valid: boolean };

/** Represents a nullable integer from the Go backend (sql.NullInt32/64). */
export type NullableInt = { Int32: number; Valid: boolean } | { Int64: number; Valid: boolean };

/** Represents a nullable float from the Go backend (sql.NullFloat64). */
export type NullableFloat = { Float64: number; Valid: boolean };

/** Represents a nullable boolean from the Go backend (sql.NullBool). */
export type NullableBoolean = { Bool: boolean; Valid: boolean };


// =================================================================================
// 2. API OBJECT MODELS (Direct 1:1 mapping with backend API responses)
// =================================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone: NullableString;
  profile_picture_url: NullableString;
  company: NullableString;
  position: NullableString;
  bio: NullableString;
  location: NullableString;
  face_id_enrolled: boolean;
  face_id_consent_given: boolean;
  face_id_consent_time: NullableTime;
  face_samples_count: number;
  is_active: boolean;
  is_banned: boolean;
  is_verified: boolean;
  ban_reason: NullableString;
  banned_until: NullableTime;
  profile_visibility: 'public' | 'private';
  last_login_at: NullableTime;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  is_online?: boolean; // Optional: Client-side enriched property
  role?: 'community_admin' | 'moderator' | 'member' | 'pending'; // Added for community context
}

export type Community = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: NullableString;
  cover_image_url: NullableString;
  type: 'public' | 'private' | 'secret';
  allow_member_posts: boolean;
  auto_approve_posts: boolean;
  allow_member_invites: boolean;
  member_count: number;
  post_count: number;
  event_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: NullableTime;
  // Enriched data (may not always be present)
  admin_name?: string;
  admin_avatar_url?: string | null;
  role?: 'community_admin' | 'moderator' | 'member' | 'pending'; // Added for user's role in this community
  status?: 'active' | 'pending';
  common_members?: number;
  member_previews?: User[];
};

export type EventItem = {
  event_id: string;
  session_id: NullableString;
  event_name: string;
  cover_image_url: NullableString;
  community_id: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  status: 'upcoming' | 'ongoing' | 'past';
  is_registered: boolean;
  location_type: string;
  location_address: NullableString;
  created_by_name: string;
  created_by_avatar: NullableString;
};

export interface FeedItem {
    type: 'post' | 'event';
    id: string; 
    community_id?: string;
    created_at: string;
    updated_at?: string;
    author_id: string;
    author_name: string;
    author_avatar_url?: string;
    
    // --- Post-specific fields ---
    content?: string; 
    file_attachments?: { url: string; name: string; type: string }[]; 

    // --- Event-specific fields ---
    name?: string; 
    start_time?: string; 
    end_time?: string;   
}

export type AppEvent = {
  id: string;
  community_id: string;
  created_by: string;
  name: string;
  slug: string;
  description: NullableString;
  cover_image_url: NullableString;
  location_type: string;
  location_address: NullableString;
  online_meeting_url: NullableString;
  timezone: string;
  start_time: NullableTime;
  end_time: NullableTime;
  is_recurring: boolean;
  recurrence_pattern: NullableString;
  recurrence_rule: Record<string, any> | null;
  recurrence_end_date: NullableTime;
  max_occurrences: NullableInt;
  max_attendees: NullableInt;
  current_attendees: number;
  waitlist_enabled: boolean;
  max_waitlist: NullableInt;
  registration_required: boolean;
  registration_opens_at: NullableTime;
  registration_closes_at: NullableTime;
  whitelist_only: boolean;
  require_approval: boolean;
  face_verification_required: boolean;
  liveness_check_required: boolean;
  qr_code_enabled: boolean;
  fallback_code_enabled: boolean;
  manual_checkin_allowed: boolean;
  is_paid: boolean;
  fee: NullableFloat;
  currency: string;
  status: 'draft' | 'published' | 'cancelled';
  reminder_schedule: Record<string, any> | null;
  total_sessions: number;
  total_registrations: number;
  created_at: string;
  updated_at: string;
  published_at: NullableTime;
  deleted_at: NullableTime;
  community_type?: string;
  created_by_name?: string;
  created_by_avatar?: NullableString;
  sessions?: EventSession[];
  is_registered?: boolean;
};

export type EventSession = {
  id: string;
  event_id: string;
  session_number: number;
  name: NullableString;
  start_time: string;
  end_time: string;
  timezone: string;
  location_override: NullableString;
  online_meeting_url_override: NullableString;
  checkin_opens_at: NullableTime;
  checkin_closes_at: NullableTime;
  max_attendees_override: NullableInt;
  face_verification_required_override: NullableBoolean;
  is_cancelled: boolean;
  cancellation_reason: NullableString;
  total_checkins: number;
  total_no_shows: number;
  created_at: string;
  updated_at: string;
};

export type Author = {
  id: string;
  name: string;
  profile_picture_url: NullableString;
};

export interface Attachment {
  Name: string;
  Url: string;
  Type: string;
}

export type Post = {
  id: string;
  author_id: string;
  community_id: string;
  event_id: NullableString;
  content: string;
  content_html: NullableString;
  media_urls: string[];
  file_attachments: Attachment[];
  hashtags: string[];
  mentioned_user_ids: string[];
  visibility: 'public' | 'community_only' | 'event_only' | 'members_only';
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'flagged';
  reviewed_by: NullableString;
  reviewed_at: NullableTime;
  rejection_reason: NullableString;
  flagged_count: number;
  comment_count: number;
  reaction_count: number;
  share_count: number;
  view_count: number;
  is_pinned: boolean;
  pinned_until: NullableTime;
  created_at: string;
  updated_at: string;
  published_at: NullableTime;
  deleted_at: NullableTime;
  author: Author;
  user_has_liked?: boolean;
  community_role?: 'community_admin' | 'moderator' | 'member' | 'pending';
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: NullableString;
  content: string;
  content_html: NullableString;
  media_urls: string[];
  mentioned_user_ids: string[];
  status: 'approved' | 'rejected';
  reviewed_by: NullableString;
  reviewed_at: NullableTime;
  flagged_count: number;
  thread_depth: number;
  thread_path: NullableString;
  reaction_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: NullableTime;
  author: Author;
};

export type EventAttendee = {
  id: string;
  event_id: string;
  user_id: string;
  role: 'host' | 'attendee';
  status: 'registered' | 'pending' | 'cancelled' | 'attended' | 'no_show';
  registration_form_data: Record<string, any> | null;
  registration_source: NullableString;
  payment_status: NullableString;
  payment_amount: NullableFloat;
  payment_id: NullableString;
  face_sample_provided: boolean;
  face_sample_quality_score: NullableFloat;
  qr_code_token: NullableString;
  fallback_code: NullableString;
  qr_device_binding: NullableString;
  registered_at: string;
  approved_at: NullableTime;
  approved_by: NullableString;
  cancelled_at: NullableTime;
  user_name: string;
  user_email: string;
  user_profile_picture_url: NullableString;
  checkin_id: NullableString;
  checkin_time: NullableTime;
  checkin_method: NullableString;
  is_late: NullableBoolean;
  liveness_score: NullableFloat;
  failure_reason: NullableString;
  checkedIn?: boolean;
  checkInTime?: string;
  checkInMethod?: string;
};

/**
 * Represents the decoded payload of a check-in QR code ticket.
 * This mirrors the `domain.Ticket` struct from the backend.
 */
export interface TicketPayload {
  user_id: string;
  session_id: string;
  nonce: string;
  expires_at: string; // ISO 8601 timestamp
}

export interface ConversationParticipant {
  user_id: string;
  joined_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'community' | 'event';
  community_id: string | null;
  event_id: string | null;
  name: string | null;
  description: string | null;
  avatar_url: NullableString;
  is_archived: boolean;
  participant_count: number;
  message_count: number;
  last_message_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];

  // FIX: Add missing fields to match the actual API response and component usage
  unread_count: number;
  last_message: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'voice' | 'video';
  media_url: string | null;
  file_metadata: Record<string, any> | null;
  reply_to_message_id: NullableString;
  mentioned_user_ids: string[];
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  sent_at: string;
  created_at: string;
  author?: Author;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: NullableString;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'new_comment'
  | 'event_reminder'
  | 'community_post'
  | 'new_message'
  | 'registration_approved'
  | 'registration_pending'
  | 'event_cancelled';

export interface NotificationChannelPreferences {
  enabled: boolean;
  types: Partial<Record<NotificationType, boolean>>;
}

export interface NotificationChannels {
  email: NotificationChannelPreferences;
  push: NotificationChannelPreferences;
  in_app: NotificationChannelPreferences;
}

export interface NotificationPreferences {
  user_id: string;
  channels: NotificationChannels;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}


// =================================================================================
// 3. CLIENT-SIDE ENRICHED & COMPOSITE TYPES
// =================================================================================

// =================================================================================
// API PAYLOAD TYPES
// =================================================================================

/**
 * Type definition for the payload required to create an event.
 * Mirrors the structure expected by the backend: `{"event": {...}, "whitelist": [...]}`
 */
export type CreateEventPayload = {
  event: {
    community_id: string;
    name: string;
    description?: { String: string; Valid: boolean };
    start_time: { Time: string; Valid: boolean };
    end_time: { Time: string; Valid: boolean };
    is_recurring?: boolean;
    recurrence_rule?: { rrule: string };
    require_approval?: boolean;
    status?: 'draft' | 'published';
    // Add other required/optional fields as needed for the creation form
  };
  whitelist?: string[];
};

/**
 * Type definition for the payload to update an event.
 * Uses Partial<> as updates are incremental.
 */
export type UpdateEventPayload = Partial<Omit<AppEvent, 'id' | 'created_at' | 'updated_at'>>;


export type EventSummary = {
  id: string;
  name: string;
  start_time: NullableTime;
  end_time: NullableTime;
  cover_image_url: NullableString;
  status: string;
};

export type RegistrationWithEventDetails = EventAttendee & {
  event: EventSummary;
};

export type AnyEventStatus = AppEvent['status'] | EventItem['status'];

export type DetailedAppEvent = AppEvent & {
  status: AnyEventStatus;
};

export type UnifiedSearchResult = {
  type: 'user' | 'community' | 'event' | 'post';
  rank: number;
  result: User | Community | AppEvent | Post;
};

export type UserRelationship = {
  is_following: boolean;
};

// =================================================================================
// 4. REPORTING & ANALYTICS TYPES
// =================================================================================

export interface EventAttendanceReport {
  total_registrations: number;
  total_attendees: number;
  attendance_rate: number;
  checkin_success_rate: number;
  checkin_failure_rate: number;
  absence_rate: number;
}

export interface ActiveUser {
  user_id: string;
  user_name: string;
  post_count: number;
  comment_count: number;
  total_activity: number;
}

export interface PopularPost {
  post_id: string;
  content_preview: string;
  author_id: string;
  author_name: string;
  reaction_count: number;
  comment_count: number;
  total_engagement: number;
  created_at: string;
}

export interface ActivityDataPoint {
  date: string;
  post_count: number;
  comment_count: number;
}

export interface CommunityEngagementReport {
  community_id: string;
  generated_at: string;
  most_active_users: ActiveUser[];
  popular_posts: PopularPost[];
  activity_over_time: ActivityDataPoint[];
}