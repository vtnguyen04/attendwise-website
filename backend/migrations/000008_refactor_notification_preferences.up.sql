ALTER TABLE notification_preferences
DROP COLUMN email_enabled,
DROP COLUMN push_enabled,
DROP COLUMN in_app_enabled;

ALTER TABLE notification_preferences
ADD COLUMN channels JSONB NOT NULL DEFAULT '{}';