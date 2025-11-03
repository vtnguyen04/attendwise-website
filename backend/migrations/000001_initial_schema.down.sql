-- =====================================================
-- DOWN MIGRATION - ROLLBACK DATABASE SCHEMA
-- Version: 2.0
-- WARNING: This will DROP ALL TABLES and DATA!
-- =====================================================

BEGIN;

-- =====================================================
-- DROP TRIGGERS FIRST
-- =====================================================

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_communities_updated_at ON communities;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_event_sessions_updated_at ON event_sessions;
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS update_checkins_updated_at ON event_session_checkins;

DROP TRIGGER IF EXISTS trigger_community_member_count ON community_members;
DROP TRIGGER IF EXISTS trigger_post_comment_count ON comments;
DROP TRIGGER IF EXISTS trigger_conversation_last_message ON messages;
DROP TRIGGER IF EXISTS trigger_event_attendee_count ON event_attendees;

-- =====================================================
-- DROP FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_community_member_count();
DROP FUNCTION IF EXISTS update_post_comment_count();
DROP FUNCTION IF EXISTS update_conversation_last_message();
DROP FUNCTION IF EXISTS update_event_attendee_count();

-- =====================================================
-- DROP VIEWS
-- =====================================================

DROP VIEW IF EXISTS v_active_events;
DROP VIEW IF EXISTS v_user_feed;
DROP VIEW IF EXISTS v_session_checkin_summary;

-- =====================================================
-- DROP INDEXES (Explicit drops for clarity)
-- =====================================================

-- Users indexes
DROP INDEX IF EXISTS idx_face_embeddings_user_active;
DROP INDEX IF EXISTS idx_user_devices_user;

-- Communities indexes
DROP INDEX IF EXISTS idx_communities_slug;
DROP INDEX IF EXISTS idx_communities_owner;
DROP INDEX IF EXISTS idx_community_members_user;
DROP INDEX IF EXISTS idx_community_members_role;
DROP INDEX IF EXISTS idx_community_members_community_id;
DROP INDEX IF EXISTS idx_community_members_community_id_status;

-- Events indexes
DROP INDEX IF EXISTS idx_events_community;
DROP INDEX IF EXISTS idx_events_creator;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_start_time;
DROP INDEX IF EXISTS idx_events_slug;
DROP INDEX IF EXISTS idx_event_whitelists_user;
DROP INDEX IF EXISTS idx_event_whitelists_email;
DROP INDEX IF EXISTS idx_events_upcoming;

-- Event Sessions indexes
DROP INDEX IF EXISTS idx_event_sessions_event;
DROP INDEX IF EXISTS idx_event_sessions_start_time;
DROP INDEX IF EXISTS idx_event_sessions_event_start;

-- Event Attendees indexes
DROP INDEX IF EXISTS idx_event_attendees_event;
DROP INDEX IF EXISTS idx_event_attendees_user;
DROP INDEX IF EXISTS idx_event_attendees_status;
DROP INDEX IF EXISTS idx_event_attendees_qr_token;

-- Check-in indexes
DROP INDEX IF EXISTS idx_session_checkins_session;
DROP INDEX IF EXISTS idx_session_checkins_user;
DROP INDEX IF EXISTS idx_session_checkins_status;
DROP INDEX IF EXISTS idx_session_checkins_time;
DROP INDEX IF EXISTS idx_session_checkins_nonce;
DROP INDEX IF EXISTS idx_session_checkins_stats;

DROP INDEX IF EXISTS idx_checkin_logs_session;
DROP INDEX IF EXISTS idx_checkin_logs_user;
DROP INDEX IF EXISTS idx_checkin_logs_time;

DROP INDEX IF EXISTS idx_offline_queue_unsynced;

-- Posts indexes
DROP INDEX IF EXISTS idx_posts_author;
DROP INDEX IF EXISTS idx_posts_community;
DROP INDEX IF EXISTS idx_posts_event;
DROP INDEX IF EXISTS idx_posts_status;
DROP INDEX IF EXISTS idx_posts_created;
DROP INDEX IF EXISTS idx_posts_visibility_status;
DROP INDEX IF EXISTS idx_posts_hashtags;
DROP INDEX IF EXISTS idx_posts_mentions;
DROP INDEX IF EXISTS idx_posts_feed;
DROP INDEX IF EXISTS idx_posts_content_fts;

-- Comments indexes
DROP INDEX IF EXISTS idx_comments_post;
DROP INDEX IF EXISTS idx_comments_author;
DROP INDEX IF EXISTS idx_comments_parent;
DROP INDEX IF EXISTS idx_comments_thread_path;

-- Reactions indexes
DROP INDEX IF EXISTS idx_reactions_target;
DROP INDEX IF EXISTS idx_reactions_user;

-- Conversations indexes
DROP INDEX IF EXISTS idx_conversations_community;
DROP INDEX IF EXISTS idx_conversations_event;
DROP INDEX IF EXISTS idx_conversations_last_message;

-- Conversation Participants indexes
DROP INDEX IF EXISTS idx_conv_participants_user;
DROP INDEX IF EXISTS idx_conv_participants_unread;

-- Messages indexes
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_reply;
DROP INDEX IF EXISTS idx_messages_conversation_unread;
DROP INDEX IF EXISTS idx_message_receipts_user;

-- Notifications indexes
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_created;

DROP INDEX IF EXISTS idx_scheduled_notif_pending;
DROP INDEX IF EXISTS idx_scheduled_notif_user;

-- Reports indexes
DROP INDEX IF EXISTS idx_attendance_reports_event;
DROP INDEX IF EXISTS idx_attendance_reports_session;
DROP INDEX IF EXISTS idx_attendance_reports_date;
DROP INDEX IF EXISTS idx_user_attendance_stats_community;

-- Moderation indexes
DROP INDEX IF EXISTS idx_content_reports_status;
DROP INDEX IF EXISTS idx_content_reports_content;
DROP INDEX IF EXISTS idx_blocked_users_blocker;
DROP INDEX IF EXISTS idx_blocked_users_blocked;
DROP INDEX IF EXISTS idx_moderation_logs_moderator;
DROP INDEX IF EXISTS idx_moderation_logs_target;
DROP INDEX IF EXISTS idx_moderation_logs_created;

-- Audit indexes
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_audit_logs_created;
DROP INDEX IF EXISTS idx_security_events_user;
DROP INDEX IF EXISTS idx_security_events_type;
DROP INDEX IF EXISTS idx_security_events_unresolved;

-- File uploads indexes
DROP INDEX IF EXISTS idx_file_uploads_user;
DROP INDEX IF EXISTS idx_file_uploads_usage;

-- Activity feed indexes
DROP INDEX IF EXISTS idx_activity_feed_user_unread;
DROP INDEX IF EXISTS idx_activity_feed_community;

-- Search indexes
DROP INDEX IF EXISTS idx_events_search_fts;
DROP INDEX IF EXISTS idx_users_search_fts;

-- =====================================================
-- DROP TABLES (In reverse dependency order)
-- =====================================================

-- Activity & Feeds
DROP TABLE IF EXISTS activity_feed CASCADE;

-- Files
DROP TABLE IF EXISTS file_uploads CASCADE;

-- System Configuration
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- Security & Audit
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Moderation
DROP TABLE IF EXISTS moderation_logs CASCADE;
DROP TABLE IF EXISTS blocked_users CASCADE;
DROP TABLE IF EXISTS content_reports CASCADE;

-- Analytics & Reports
DROP TABLE IF EXISTS user_attendance_stats CASCADE;
DROP TABLE IF EXISTS attendance_reports CASCADE;

-- Notifications
DROP TABLE IF EXISTS scheduled_notifications CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Messaging
DROP TABLE IF EXISTS message_read_receipts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Social - Reactions
DROP TABLE IF EXISTS reactions CASCADE;

-- Social - Comments
DROP TABLE IF EXISTS comments CASCADE;

-- Social - Posts
DROP TABLE IF EXISTS posts CASCADE;

-- Check-in System
DROP TABLE IF EXISTS offline_checkin_queue CASCADE;
DROP TABLE IF EXISTS checkin_attempt_logs CASCADE;
DROP TABLE IF EXISTS event_session_checkins CASCADE;

-- Events - Attendees
DROP TABLE IF EXISTS event_attendees CASCADE;

-- Events - Sessions
DROP TABLE IF EXISTS event_sessions CASCADE;

-- Events - Whitelist
DROP TABLE IF EXISTS event_whitelists CASCADE;

-- Events
DROP TABLE IF EXISTS events CASCADE;

-- Communities
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS communities CASCADE;

-- Users - Related
DROP TABLE IF EXISTS user_devices CASCADE;
DROP TABLE IF EXISTS user_face_embeddings CASCADE;
DROP TABLE IF EXISTS user_system_roles CASCADE;

-- Users
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- DROP CUSTOM TYPES
-- =====================================================

DROP TYPE IF EXISTS recurrence_pattern CASCADE;
DROP TYPE IF EXISTS content_status CASCADE;
DROP TYPE IF EXISTS post_visibility CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_channel CASCADE;
DROP TYPE IF EXISTS conversation_type CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS checkin_method CASCADE;
DROP TYPE IF EXISTS checkin_status CASCADE;
DROP TYPE IF EXISTS event_attendee_role CASCADE;
DROP TYPE IF EXISTS event_attendee_status CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- List remaining tables (should be empty or only system tables)
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Remaining tables in public schema: %', table_count;
END $$;

-- List remaining types
DO $$
DECLARE
    type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO type_count
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.typtype = 'e';
    
    RAISE NOTICE 'Remaining custom types in public schema: %', type_count;
END $$;

-- List remaining functions
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    RAISE NOTICE 'Remaining functions in public schema: %', function_count;
END $$;

COMMIT;

-- =====================================================
-- CLEANUP COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DOWN MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All tables, types, functions, triggers, and views have been dropped.';
    RAISE NOTICE 'The database schema has been rolled back to empty state.';
    RAISE NOTICE 'To restore the schema, run the up migration script.';
END $$;