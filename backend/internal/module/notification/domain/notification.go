package domain

import (
	"database/sql"
	"time"
)

type NotificationType string

const (
	NewCommentNotification           NotificationType = "new_comment"
	EventReminderNotification        NotificationType = "event_reminder"
	CommunityPostNotification        NotificationType = "community_post"
	NewPostNotification              NotificationType = "new_post"
	ResponseNotification             NotificationType = "response"
	ReplyNotification                NotificationType = "reply"
	ReactionNotification             NotificationType = "reaction"
	NewMessageNotification           NotificationType = "new_message"
	RegistrationApprovedNotification NotificationType = "registration_approved"
	RegistrationPendingNotification  NotificationType = "registration_pending"
	EventCancelledNotification       NotificationType = "event_cancelled"
)

type Notification struct {
	ID                    string           `json:"id"`
	UserID                string           `json:"user_id"`
	Type                  NotificationType `json:"type"`
	Title                 string           `json:"title"`
	Message               string           `json:"message"`
	Link                  sql.NullString   `json:"link,omitempty"`
	RelatedUserID         sql.NullString   `json:"related_user_id,omitempty"`
	RelatedPostID         sql.NullString   `json:"related_post_id,omitempty"`
	RelatedCommentID      sql.NullString   `json:"related_comment_id,omitempty"`
	RelatedEventID        sql.NullString   `json:"related_event_id,omitempty"`
	RelatedConversationID sql.NullString   `json:"related_conversation_id,omitempty"`
	RelatedUserName       sql.NullString   `json:"related_user_name,omitempty"`
	RelatedUserAvatar     sql.NullString   `json:"related_user_avatar,omitempty"`
	IsRead                bool             `json:"is_read"`
	CreatedAt             time.Time        `json:"created_at"`
}

type NotificationChannelPreferences struct {
	Enabled bool                      `json:"enabled"`
	Types   map[NotificationType]bool `json:"types"`
}

type NotificationChannels struct {
	Email NotificationChannelPreferences `json:"email"`
	Push  NotificationChannelPreferences `json:"push"`
	InApp NotificationChannelPreferences `json:"in_app"`
}

type NotificationPreferences struct {
	UserID   string               `json:"user_id"`
	Channels NotificationChannels `json:"channels"`
}
