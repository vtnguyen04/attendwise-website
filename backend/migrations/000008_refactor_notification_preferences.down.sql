ALTER TABLE notification_preferences
DROP COLUMN channels;

ALTER TABLE notification_preferences
ADD COLUMN email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE;