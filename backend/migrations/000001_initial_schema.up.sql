-- =====================================================
-- OPTIMIZED DATABASE SCHEMA FOR COMMUNITY PLATFORM
-- Version: 2.0
-- =====================================================



-- =====================================================
-- CUSTOM TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('system_admin', 'community_admin', 'moderator', 'instructor', 'member');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'ongoing', 'completed', 'cancelled');
CREATE TYPE event_attendee_status AS ENUM ('registered', 'waitlist', 'cancelled', 'attended', 'no_show');
CREATE TYPE event_attendee_role AS ENUM ('host', 'instructor', 'attendee');
CREATE TYPE checkin_status AS ENUM ('pending', 'success', 'failed', 'manual_override');
CREATE TYPE checkin_method AS ENUM ('qr_code', 'fallback_code', 'manual', 'face_only');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'voice', 'video');
CREATE TYPE conversation_type AS ENUM ('direct', 'group', 'community', 'event');
CREATE TYPE notification_channel AS ENUM ('email', 'push', 'sms', 'in_app');
CREATE TYPE notification_type AS ENUM ('event_reminder', 'event_updated', 'event_cancelled', 'registration_confirmed', 'checkin_success', 'new_post', 'new_comment', 'new_message', 'mention', 'post_approved', 'post_rejected');
CREATE TYPE post_visibility AS ENUM ('public', 'community_only', 'event_only', 'members_only');
CREATE TYPE content_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'flagged');
CREATE TYPE recurrence_pattern AS ENUM ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom');

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_picture_url TEXT,
    bio TEXT,
    company VARCHAR(255),
    position VARCHAR(255),
    location VARCHAR(255),
    
    -- Face ID Setup
    face_id_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
    face_id_consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    face_id_consent_time TIMESTAMPTZ,
    face_samples_count INT DEFAULT 0,
    
    -- Account Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ban_reason TEXT,
    banned_until TIMESTAMPTZ,
    
    -- Privacy Settings
    profile_visibility VARCHAR(20) DEFAULT 'public', -- public, friends, private
    
    -- Timestamps
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- User Roles (System-wide and Community-specific)
CREATE TABLE IF NOT EXISTS user_system_roles (
    user_id UUID NOT NULL,
    role user_role NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID,
    PRIMARY KEY (user_id, role),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Face Embeddings (Encrypted)
CREATE TABLE IF NOT EXISTS user_face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    embedding BYTEA NOT NULL, -- Encrypted vector
    embedding_version VARCHAR(20) NOT NULL, -- Model version for future updates
    quality_score REAL,
    capture_device_info JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional data retention policy
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_face_embeddings_user_active ON user_face_embeddings(user_id) WHERE is_active = TRUE;

-- Device Fingerprints (for QR binding)
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- mobile, tablet, desktop
    os_info VARCHAR(100),
    browser_info VARCHAR(100),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id);

-- =====================================================
-- COMMUNITIES
-- =====================================================

CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    
    -- Settings
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    require_approval BOOLEAN NOT NULL DEFAULT TRUE,
    allow_member_posts BOOLEAN NOT NULL DEFAULT TRUE,
    auto_approve_posts BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Stats (denormalized for performance)
    member_count INT NOT NULL DEFAULT 0,
    post_count INT NOT NULL DEFAULT 0,
    event_count INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_owner ON communities(owner_id);

-- Community Members
CREATE TABLE IF NOT EXISTS community_members (
    community_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, pending, banned
    custom_title VARCHAR(100),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_role ON community_members(community_id, role);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members (community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id_status ON community_members (community_id, status);

-- =====================================================
-- EVENTS & SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL,
    created_by UUID NOT NULL,
    
    -- Basic Info
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    
    -- Location
    location_type VARCHAR(20) NOT NULL DEFAULT 'physical', -- physical, online, hybrid
    location_address TEXT,
    online_meeting_url TEXT,
    
    -- Scheduling
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    
    -- Recurrence
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern recurrence_pattern DEFAULT 'none',
    recurrence_rule JSONB, -- Stores rrule or custom JSON
    recurrence_end_date TIMESTAMPTZ,
    max_occurrences INT,
    
    -- Capacity & Access
    max_attendees INT,
    current_attendees INT NOT NULL DEFAULT 0,
    waitlist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    max_waitlist INT,
    
    -- Registration
    registration_required BOOLEAN NOT NULL DEFAULT TRUE,
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,
    whitelist_only BOOLEAN NOT NULL DEFAULT FALSE,
    require_approval BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Check-in Requirements
    face_verification_required BOOLEAN NOT NULL DEFAULT FALSE,
    liveness_check_required BOOLEAN NOT NULL DEFAULT TRUE,
    qr_code_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    fallback_code_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    manual_checkin_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Pricing
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    fee NUMERIC(10, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'VND',
    
    -- Status
    status event_status NOT NULL DEFAULT 'draft',
    
    -- Reminders (JSON array of reminder configs)
    reminder_schedule JSONB DEFAULT '[{"offset_minutes": -1440, "channels": ["email", "push"]},{"offset_minutes": -15, "channels": ["push", "sms"]}]'::jsonb,
    
    -- Stats
    total_sessions INT NOT NULL DEFAULT 0,
    total_registrations INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_events_community ON events(community_id);
CREATE INDEX idx_events_creator ON events(created_by);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_slug ON events(slug);

-- Event Whitelist
CREATE TABLE IF NOT EXISTS event_whitelists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    user_id UUID,
    email VARCHAR(255),
    phone VARCHAR(20),
    added_by UUID NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (user_id IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL)
);

CREATE UNIQUE INDEX idx_event_whitelists_unique ON event_whitelists (event_id, COALESCE(user_id::text, email, phone));

CREATE INDEX idx_event_whitelists_user ON event_whitelists(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_event_whitelists_email ON event_whitelists(email) WHERE email IS NOT NULL;

-- Event Sessions (Generated from recurrence or manually created)
CREATE TABLE IF NOT EXISTS event_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    
    -- Session Info
    session_number INT NOT NULL, -- 1, 2, 3... for recurring events
    name VARCHAR(500), -- Optional custom name per session
    
    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    
    -- Location Override (if different from event)
    location_override TEXT,
    online_meeting_url_override TEXT,
    
    -- Check-in Window
    checkin_opens_at TIMESTAMPTZ, -- e.g., 30 min before start
    checkin_closes_at TIMESTAMPTZ, -- e.g., 30 min after start
    
    -- Session-specific Settings
    max_attendees_override INT,
    face_verification_required_override BOOLEAN,
    
    -- Status
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    cancellation_reason TEXT,
    
    -- Stats
    total_checkins INT NOT NULL DEFAULT 0,
    total_no_shows INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE (event_id, session_number)
);

CREATE INDEX idx_event_sessions_event ON event_sessions(event_id);
CREATE INDEX idx_event_sessions_start_time ON event_sessions(start_time);
CREATE INDEX idx_event_sessions_event_start ON event_sessions(event_id, start_time);

-- Event Attendees (Registration)
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Role & Status
    role event_attendee_role NOT NULL DEFAULT 'attendee',
    status event_attendee_status NOT NULL DEFAULT 'registered',
    
    -- Registration Info
    registration_form_data JSONB, -- Store custom form responses
    registration_source VARCHAR(50) DEFAULT 'web', -- web, api, import, whitelist
    
    -- Payment (if applicable)
    payment_status VARCHAR(20), -- pending, completed, refunded
    payment_amount NUMERIC(10, 2),
    payment_id VARCHAR(255),
    
    -- Face Enrollment (for this event)
    face_sample_provided BOOLEAN NOT NULL DEFAULT FALSE,
    face_sample_quality_score REAL,
    
    -- QR Code
    qr_code_token VARCHAR(255) UNIQUE,
    fallback_code VARCHAR(20) UNIQUE,
    qr_device_binding VARCHAR(255), -- Bound to specific device fingerprint
    
    -- Timestamps
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    cancelled_at TIMESTAMPTZ,
    
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_status ON event_attendees(event_id, status);
CREATE INDEX idx_event_attendees_qr_token ON event_attendees(qr_code_token) WHERE qr_code_token IS NOT NULL;

-- =====================================================
-- CHECK-IN SYSTEM
-- =====================================================

-- Session Check-ins (One record per user per session)
CREATE TABLE IF NOT EXISTS event_session_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    attendee_id UUID NOT NULL, -- Link to registration
    
    -- Check-in Status
    status checkin_status NOT NULL DEFAULT 'pending',
    method checkin_method NOT NULL,
    
    -- Timing
    checkin_time TIMESTAMPTZ,
    checkout_time TIMESTAMPTZ,
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    minutes_late INT,
    
    -- QR Code Verification
    qr_token_used VARCHAR(255),
    nonce_hash VARCHAR(255) UNIQUE, -- One-time use verification
    qr_scanned_at TIMESTAMPTZ,
    
    -- Face Verification
    face_verification_attempted BOOLEAN NOT NULL DEFAULT FALSE,
    face_verification_passed BOOLEAN,
    face_confidence_score REAL,
    face_match_threshold REAL DEFAULT 0.9999, -- FAR ≤ 1e-4
    
    -- Liveness Check
    liveness_check_attempted BOOLEAN NOT NULL DEFAULT FALSE,
    liveness_check_passed BOOLEAN,
    liveness_score REAL,
    liveness_challenge JSONB, -- Store what challenge was given
    liveness_response_time_ms INT,
    
    -- Device Info
    device_id VARCHAR(255),
    device_fingerprint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Failure Tracking
    failure_reason TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    
    -- Manual Override
    manual_override_by UUID,
    manual_override_reason TEXT,
    manual_override_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB, -- Additional check-in data
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (session_id) REFERENCES event_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (attendee_id) REFERENCES event_attendees(id) ON DELETE CASCADE,
    FOREIGN KEY (manual_override_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (session_id, user_id)
);

CREATE INDEX idx_session_checkins_session ON event_session_checkins(session_id);
CREATE INDEX idx_session_checkins_user ON event_session_checkins(user_id);
CREATE INDEX idx_session_checkins_status ON event_session_checkins(session_id, status);
CREATE INDEX idx_session_checkins_time ON event_session_checkins(checkin_time);
CREATE INDEX idx_session_checkins_nonce ON event_session_checkins(nonce_hash) WHERE nonce_hash IS NOT NULL;

-- Check-in Attempts Log (for audit and security)
CREATE TABLE IF NOT EXISTS checkin_attempt_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID,
    
    -- Attempt Details
    attempt_method checkin_method NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    
    -- Verification Scores
    face_confidence_score REAL,
    liveness_score REAL,
    
    -- Device & Network
    device_fingerprint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    metadata JSONB,
    
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (session_id) REFERENCES event_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_checkin_logs_session ON checkin_attempt_logs(session_id);
CREATE INDEX idx_checkin_logs_user ON checkin_attempt_logs(user_id);
CREATE INDEX idx_checkin_logs_time ON checkin_attempt_logs(attempted_at);

-- Offline Check-in Queue (for sync when back online)
CREATE TABLE IF NOT EXISTS offline_checkin_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Check-in Data (to be synced)
    checkin_data JSONB NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    
    -- Queue Status
    is_synced BOOLEAN NOT NULL DEFAULT FALSE,
    sync_attempted_at TIMESTAMPTZ,
    sync_error TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    
    FOREIGN KEY (session_id) REFERENCES event_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_offline_queue_unsynced ON offline_checkin_queue(is_synced, created_at) WHERE is_synced = FALSE;

-- =====================================================
-- SOCIAL FEATURES - POSTS & COMMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL,
    community_id UUID,
    event_id UUID,
    
    -- Content
    content TEXT NOT NULL,
    content_html TEXT, -- Sanitized HTML version
    media_urls TEXT[], -- Array of image/video URLs
    file_attachments JSONB, -- Array of {name, url, size, type}
    
    -- Metadata
    hashtags TEXT[],
    mentioned_user_ids UUID[],
    
    -- Visibility & Status
    visibility post_visibility NOT NULL DEFAULT 'community_only',
    status content_status NOT NULL DEFAULT 'pending',
    
    -- Moderation
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    flagged_count INT NOT NULL DEFAULT 0,
    
    -- Engagement Stats (denormalized)
    comment_count INT NOT NULL DEFAULT 0,
    reaction_count INT NOT NULL DEFAULT 0,
    share_count INT NOT NULL DEFAULT 0,
    view_count INT NOT NULL DEFAULT 0,
    
    -- Pinning
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (community_id IS NOT NULL OR event_id IS NOT NULL)
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_community ON posts(community_id) WHERE community_id IS NOT NULL;
CREATE INDEX idx_posts_event ON posts(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_visibility_status ON posts(visibility, status, created_at DESC);
CREATE INDEX idx_posts_hashtags ON posts USING GIN(hashtags);
CREATE INDEX idx_posts_mentions ON posts USING GIN(mentioned_user_ids);

-- Comments (Threaded)
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    author_id UUID NOT NULL,
    parent_comment_id UUID,
    
    -- Content
    content TEXT NOT NULL,
    content_html TEXT,
    media_urls TEXT[],
    
    -- Metadata
    mentioned_user_ids UUID[],
    
    -- Status
    status content_status NOT NULL DEFAULT 'approved',
    
    -- Moderation
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    flagged_count INT NOT NULL DEFAULT 0,
    
    -- Thread Info
    thread_depth INT NOT NULL DEFAULT 0,
    thread_path TEXT, -- Materialized path for efficient queries (e.g., "root/child1/child2")
    
    -- Engagement
    reaction_count INT NOT NULL DEFAULT 0,
    reply_count INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_comments_thread_path ON comments USING btree(thread_path) WHERE thread_path IS NOT NULL;

-- Reactions (for posts and comments)
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL, -- 'post', 'comment'
    target_id UUID NOT NULL,
    reaction_type VARCHAR(20) NOT NULL, -- 'like', 'love', 'haha', 'wow', 'sad', 'angry'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX idx_reactions_user ON reactions(user_id);

-- =====================================================
-- MESSAGING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type conversation_type NOT NULL,
    
    -- References (optional)
    community_id UUID,
    event_id UUID,
    
    -- Group Chat Info
    name VARCHAR(255),
    description TEXT,
    avatar_url TEXT,
    
    -- Settings
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    participant_count INT NOT NULL DEFAULT 0,
    message_count INT NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_conversations_community ON conversations(community_id) WHERE community_id IS NOT NULL;
CREATE INDEX idx_conversations_event ON conversations(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Conversation Participants
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Participant Role
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- admin, member
    
    -- Read Status
    last_read_message_id UUID,
    last_read_at TIMESTAMPTZ,
    unread_count INT NOT NULL DEFAULT 0,
    
    -- Settings
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    muted_until TIMESTAMPTZ,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_unread ON conversation_participants(user_id, unread_count) WHERE unread_count > 0;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    
    -- Content
    content TEXT NOT NULL,
    message_type message_type NOT NULL DEFAULT 'text',
    
    -- Media & Files
    media_url TEXT,
    file_metadata JSONB, -- {name, size, mime_type, url}
    
    -- Reply/Thread
    reply_to_message_id UUID,
    
    -- Metadata
    mentioned_user_ids UUID[],
    
    -- Status
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    
    -- Delivery Status
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_reply ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

-- Message Read Receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_message_receipts_user ON message_read_receipts(user_id);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Notification Type & Content
    type notification_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    
    -- Action & Link
    action_url TEXT,
    action_label VARCHAR(100),
    
    -- Related Entities
    related_user_id UUID,
    related_post_id UUID,
    related_comment_id UUID,
    related_event_id UUID,
    related_conversation_id UUID,
    
    -- Metadata
    metadata JSONB,
    
    -- Status
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- Channels Sent
    sent_via_channels notification_channel[],
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (related_post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (related_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (related_event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (related_conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY,
    
    -- Global Toggles
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Event Notifications
    event_reminders_email BOOLEAN NOT NULL DEFAULT TRUE,
    event_reminders_push BOOLEAN NOT NULL DEFAULT TRUE,
    event_reminders_sms BOOLEAN NOT NULL DEFAULT FALSE,
    event_updates_email BOOLEAN NOT NULL DEFAULT TRUE,
    event_cancelled_email BOOLEAN NOT NULL DEFAULT TRUE,
    registration_confirmation_email BOOLEAN NOT NULL DEFAULT TRUE,
    checkin_confirmation_push BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Social Notifications
    new_post_email BOOLEAN NOT NULL DEFAULT FALSE,
    new_post_push BOOLEAN NOT NULL DEFAULT TRUE,
    new_comment_email BOOLEAN NOT NULL DEFAULT FALSE,
    new_comment_push BOOLEAN NOT NULL DEFAULT TRUE,
    mention_email BOOLEAN NOT NULL DEFAULT TRUE,
    mention_push BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Messaging Notifications
    new_message_email BOOLEAN NOT NULL DEFAULT FALSE,
    new_message_push BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Moderation Notifications
    post_approved_email BOOLEAN NOT NULL DEFAULT TRUE,
    post_rejected_email BOOLEAN NOT NULL DEFAULT TRUE,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Scheduled Notifications (for reminders)
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_id UUID,
    session_id UUID,
    
    -- Schedule
    scheduled_for TIMESTAMPTZ NOT NULL,
    
    -- Notification Details
    type notification_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    channels notification_channel[] NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, failed, cancelled
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES event_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_scheduled_notif_pending ON scheduled_notifications(scheduled_for, status) 
    WHERE status = 'pending';
CREATE INDEX idx_scheduled_notif_user ON scheduled_notifications(user_id);

-- =====================================================
-- REPORTING & ANALYTICS
-- =====================================================

-- Attendance Reports (Pre-computed aggregates)
CREATE TABLE IF NOT EXISTS attendance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    session_id UUID,
    
    -- Report Period
    report_date DATE NOT NULL,
    report_type VARCHAR(20) NOT NULL, -- session, event, monthly, quarterly
    
    -- Attendance Metrics
    total_registered INT NOT NULL DEFAULT 0,
    total_attended INT NOT NULL DEFAULT 0,
    total_no_show INT NOT NULL DEFAULT 0,
    total_late INT NOT NULL DEFAULT 0,
    total_waitlist INT NOT NULL DEFAULT 0,
    
    -- Check-in Method Breakdown
    checkin_via_qr INT NOT NULL DEFAULT 0,
    checkin_via_fallback INT NOT NULL DEFAULT 0,
    checkin_via_manual INT NOT NULL DEFAULT 0,
    
    -- Verification Stats
    face_verification_attempts INT NOT NULL DEFAULT 0,
    face_verification_success INT NOT NULL DEFAULT 0,
    face_verification_failed INT NOT NULL DEFAULT 0,
    liveness_check_attempts INT NOT NULL DEFAULT 0,
    liveness_check_success INT NOT NULL DEFAULT 0,
    liveness_check_failed INT NOT NULL DEFAULT 0,
    
    -- Time Analysis
    avg_checkin_duration_seconds REAL,
    peak_checkin_time TIMESTAMPTZ,
    peak_checkin_count INT,
    
    -- Computed Rates
    attendance_rate REAL, -- attended / registered
    no_show_rate REAL,
    late_rate REAL,
    face_success_rate REAL,
    liveness_success_rate REAL,
    
    -- Metadata
    metadata JSONB,
    
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES event_sessions(id) ON DELETE CASCADE,
    UNIQUE (event_id, session_id, report_date, report_type)
);

CREATE INDEX idx_attendance_reports_event ON attendance_reports(event_id);
CREATE INDEX idx_attendance_reports_session ON attendance_reports(session_id);
CREATE INDEX idx_attendance_reports_date ON attendance_reports(report_date);

-- User Attendance History (for frequency analysis)
CREATE TABLE IF NOT EXISTS user_attendance_stats (
    user_id UUID NOT NULL,
    community_id UUID NOT NULL,
    
    -- Period
    year INT NOT NULL,
    month INT NOT NULL,
    
    -- Metrics
    events_registered INT NOT NULL DEFAULT 0,
    events_attended INT NOT NULL DEFAULT 0,
    events_no_show INT NOT NULL DEFAULT 0,
    total_sessions_attended INT NOT NULL DEFAULT 0,
    
    -- Rates
    attendance_rate REAL,
    
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (user_id, community_id, year, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_attendance_stats_community ON user_attendance_stats(community_id, year, month);

-- =====================================================
-- MODERATION & CONTENT SAFETY
-- =====================================================

-- Content Reports (for posts, comments, messages)
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL,
    
    -- Reported Content
    content_type VARCHAR(20) NOT NULL, -- post, comment, message, user
    content_id UUID NOT NULL,
    
    -- Report Details
    reason VARCHAR(50) NOT NULL, -- spam, harassment, hate_speech, inappropriate, other
    description TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, reviewing, resolved, dismissed
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    resolution_action VARCHAR(50), -- no_action, content_removed, user_warned, user_banned
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_content_reports_status ON content_reports(status, created_at);
CREATE INDEX idx_content_reports_content ON content_reports(content_type, content_id);

-- Blocked Users (user-level blocking)
CREATE TABLE IF NOT EXISTS blocked_users (
    blocker_id UUID NOT NULL,
    blocked_id UUID NOT NULL,
    reason TEXT,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Moderation Actions Log
CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id UUID NOT NULL,
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL, -- approve_post, reject_post, ban_user, delete_comment, etc.
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    
    -- Context
    reason TEXT,
    metadata JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_moderation_logs_moderator ON moderation_logs(moderator_id);
CREATE INDEX idx_moderation_logs_target ON moderation_logs(target_type, target_id);
CREATE INDEX idx_moderation_logs_created ON moderation_logs(created_at);

-- =====================================================
-- AUDIT & SECURITY
-- =====================================================

-- Audit Logs (for critical operations)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    
    -- Action
    action VARCHAR(100) NOT NULL, -- user_login, user_logout, event_created, checkin_success, etc.
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Details
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    
    -- Result
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Security Events (failed logins, suspicious activities)
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    
    -- Event Type
    event_type VARCHAR(50) NOT NULL, -- failed_login, suspicious_checkin, rate_limit_exceeded
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Details
    description TEXT,
    metadata JSONB,
    
    -- Status
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_unresolved ON security_events(is_resolved, severity, created_at) WHERE is_resolved = FALSE;

-- =====================================================
-- SYSTEM CONFIGURATION
-- =====================================================

-- System Settings (key-value store)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Rate Limits Configuration
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL, -- api_calls, checkin_attempts, login_attempts
    max_requests INT NOT NULL,
    window_seconds INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (resource)
);

-- Insert default rate limits
INSERT INTO rate_limits (resource, max_requests, window_seconds) VALUES
    ('api_general', 1000, 3600),
    ('checkin_attempts', 3, 300),
    ('login_attempts', 5, 900),
    ('password_reset', 3, 3600),
    ('message_send', 100, 60)
ON CONFLICT (resource) DO NOTHING;

-- =====================================================
-- FILE UPLOADS
-- =====================================================

CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL,
    
    -- File Info
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL, -- bytes
    mime_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    
    -- Storage
    storage_provider VARCHAR(50) NOT NULL DEFAULT 's3', -- s3, cloudinary, local
    storage_path TEXT NOT NULL,
    
    -- Usage Tracking
    usage_type VARCHAR(50), -- profile_picture, post_media, event_cover, message_attachment
    usage_reference_id UUID,
    
    -- Status
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_processed BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    width INT, -- for images
    height INT, -- for images
    duration_seconds INT, -- for videos/audio
    metadata JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_file_uploads_user ON file_uploads(uploaded_by);
CREATE INDEX idx_file_uploads_usage ON file_uploads(usage_type, usage_reference_id);

-- =====================================================
-- ACTIVITY FEED (Denormalized for performance)
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Who will see this activity
    
    -- Activity Details
    actor_id UUID NOT NULL, -- Who performed the action
    action_type VARCHAR(50) NOT NULL, -- created_post, commented, registered_event, checked_in
    
    -- Target Entity
    target_type VARCHAR(50) NOT NULL, -- post, comment, event
    target_id UUID NOT NULL,
    
    -- Context
    community_id UUID,
    event_id UUID,
    
    -- Content Preview (denormalized for performance)
    preview_text TEXT,
    preview_image_url TEXT,
    
    -- Metadata
    metadata JSONB,
    
    -- Status
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_feed_user_unread ON activity_feed(user_id, is_read, created_at DESC);
CREATE INDEX idx_activity_feed_community ON activity_feed(community_id, created_at DESC) 
    WHERE community_id IS NOT NULL;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_sessions_updated_at BEFORE UPDATE ON event_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON event_session_checkins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update community member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE communities 
        SET member_count = member_count + 1 
        WHERE id = NEW.community_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE communities 
        SET member_count = GREATEST(0, member_count - 1) 
        WHERE id = OLD.community_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_community_member_count
    AFTER INSERT OR DELETE ON community_members
    FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts 
        SET comment_count = comment_count + 1 
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts 
        SET comment_count = GREATEST(0, comment_count - 1) 
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_comment_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_message_at = NEW.created_at,
        message_count = message_count + 1
    WHERE id = NEW.conversation_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Function to update event attendee count
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'registered' THEN
        UPDATE events 
        SET current_attendees = current_attendees + 1 
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'registered' AND NEW.status = 'registered' THEN
            UPDATE events 
            SET current_attendees = current_attendees + 1 
            WHERE id = NEW.event_id;
        ELSIF OLD.status = 'registered' AND NEW.status != 'registered' THEN
            UPDATE events 
            SET current_attendees = GREATEST(0, current_attendees - 1) 
            WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'registered' THEN
        UPDATE events 
        SET current_attendees = GREATEST(0, current_attendees - 1) 
        WHERE id = OLD.event_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_attendee_count
    AFTER INSERT OR UPDATE OR DELETE ON event_attendees
    FOR EACH ROW EXECUTE FUNCTION update_event_attendee_count();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Active Events with Session Count
CREATE OR REPLACE VIEW v_active_events AS
SELECT 
    e.*,
    c.name as community_name,
    c.slug as community_slug,
    u.name as creator_name,
    COUNT(DISTINCT es.id) as session_count,
    COUNT(DISTINCT ea.user_id) FILTER (WHERE ea.status = 'registered') as registered_count,
    MIN(es.start_time) as next_session_time
FROM events e
JOIN communities c ON e.community_id = c.id
JOIN users u ON e.created_by = u.id
LEFT JOIN event_sessions es ON e.id = es.event_id AND es.is_cancelled = FALSE
LEFT JOIN event_attendees ea ON e.id = ea.event_id
WHERE e.status IN ('published', 'ongoing')
    AND e.deleted_at IS NULL
GROUP BY e.id, c.name, c.slug, u.name;

-- View: User Feed (Recent Posts)
CREATE OR REPLACE VIEW v_user_feed AS
SELECT 
    p.*,
    u.name as author_name,
    u.profile_picture_url as author_avatar,
    c.name as community_name,
    c.slug as community_slug
FROM posts p
JOIN users u ON p.author_id = u.id
LEFT JOIN communities c ON p.community_id = c.id
WHERE p.status = 'approved'
    AND p.deleted_at IS NULL
    AND p.visibility IN ('public', 'community_only');

-- View: Session Check-in Summary
CREATE OR REPLACE VIEW v_session_checkin_summary AS
SELECT 
    es.id as session_id,
    es.event_id,
    e.name as event_name,
    es.start_time,
    es.end_time,
    COUNT(DISTINCT ea.user_id) as total_registered,
    COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.status = 'success') as total_checked_in,
    COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.status = 'success' AND esc.is_late = TRUE) as total_late,
    COUNT(DISTINCT ea.user_id) FILTER (WHERE ea.status = 'registered' AND esc.user_id IS NULL) as total_no_show,
    ROUND(
        COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.status = 'success')::NUMERIC / 
        NULLIF(COUNT(DISTINCT ea.user_id), 0) * 100, 
        2
    ) as attendance_rate
FROM event_sessions es
JOIN events e ON es.event_id = e.id
LEFT JOIN event_attendees ea ON es.event_id = ea.event_id AND ea.status = 'registered'
LEFT JOIN event_session_checkins esc ON es.id = esc.session_id AND ea.user_id = esc.user_id
GROUP BY es.id, es.event_id, e.name, es.start_time, es.end_time;

CREATE INDEX idx_posts_feed ON posts(community_id, status, created_at DESC) WHERE status = 'approved' AND deleted_at IS NULL;

CREATE INDEX idx_messages_conversation_unread ON messages(conversation_id, created_at DESC)
    WHERE is_deleted = FALSE;

CREATE INDEX idx_events_upcoming ON events(community_id, start_time) WHERE status IN ('published', 'ongoing') AND deleted_at IS NULL;

CREATE INDEX idx_session_checkins_stats ON event_session_checkins(session_id, status, is_late) WHERE status = 'success';

-- Full-text search indexes
CREATE INDEX idx_posts_content_fts ON posts USING GIN(to_tsvector('english', content));
CREATE INDEX idx_events_search_fts ON events USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_users_search_fts ON users USING GIN(to_tsvector('english', name || ' ' || COALESCE(company, '')));



