package domain

import "context"

type NotificationRepository interface {
	CreateNotification(ctx context.Context, notification *Notification) (*Notification, error)
	GetNotificationsByUserID(ctx context.Context, userID string, limit, offset int) ([]*Notification, error)
	MarkNotificationAsRead(ctx context.Context, notificationID string, userID string) error
	GetNotificationPreferences(ctx context.Context, userID string) (*NotificationPreferences, error)
	GetNotificationPreferencesWithDefaults(ctx context.Context, userID string) (*NotificationPreferences, error)
	UpdateNotificationPreferences(ctx context.Context, preferences *NotificationPreferences) (*NotificationPreferences, error)
	MarkAllNotificationsAsRead(ctx context.Context, userID string) error
	DeleteNotification(ctx context.Context, userID, notificationID string) error
}
