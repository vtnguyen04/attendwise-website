package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/attendwise/backend/internal/module/notification/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationRepository struct {
	db *pgxpool.Pool
}

func NewNotificationRepository(db *pgxpool.Pool) domain.NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) CreateNotification(ctx context.Context, notification *domain.Notification) (*domain.Notification, error) {
	query := `
		INSERT INTO notifications (id, user_id, type, title, message, action_url, is_read, related_user_id, related_post_id, related_comment_id, related_event_id, related_conversation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING created_at
	`
	log.Printf("[DEBUG] Repo executing CreateNotification query for user: %s", notification.UserID)
	err := r.db.QueryRow(ctx, query, notification.ID, notification.UserID, notification.Type, notification.Title, notification.Message, notification.Link, notification.IsRead, notification.RelatedUserID, notification.RelatedPostID, notification.RelatedCommentID, notification.RelatedEventID, notification.RelatedConversationID).Scan(&notification.CreatedAt)
	if err != nil {
		log.Printf("[ERROR] Repo CreateNotification failed: %v", err)
		return nil, fmt.Errorf("failed to insert notification: %w", err)
	}
	log.Printf("[DEBUG] Repo successfully inserted notification ID: %s", notification.ID)
	return notification, nil
}

func (r *NotificationRepository) GetNotificationsByUserID(ctx context.Context, userID string, limit, offset int) ([]*domain.Notification, error) {
	log.Printf("[DEBUG] GetNotificationsByUserID called for userID: %s, limit: %d, offset: %d", userID, limit, offset)
	query := `
		SELECT id, user_id, type, title, message, action_url, is_read, created_at, related_user_id, related_post_id, related_comment_id, related_event_id, related_conversation_id
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		log.Printf("[ERROR] GetNotificationsByUserID query failed: %v", err)
		return make([]*domain.Notification, 0), err
	}
	defer rows.Close()

	var notifications []*domain.Notification = make([]*domain.Notification, 0)
	for rows.Next() {
		var notification domain.Notification
		err := rows.Scan(&notification.ID, &notification.UserID, &notification.Type, &notification.Title, &notification.Message, &notification.Link, &notification.IsRead, &notification.CreatedAt, &notification.RelatedUserID, &notification.RelatedPostID, &notification.RelatedCommentID, &notification.RelatedEventID, &notification.RelatedConversationID)
		if err != nil {
			log.Printf("[ERROR] GetNotificationsByUserID row scan failed: %v", err)
			return make([]*domain.Notification, 0), err
		}
		notifications = append(notifications, &notification)
	}
	log.Printf("[DEBUG] GetNotificationsByUserID found %d notifications for userID: %s", len(notifications), userID)
	return notifications, nil
}

func (r *NotificationRepository) MarkNotificationAsRead(ctx context.Context, notificationID string, userID string) error {
	query := `
		UPDATE notifications
		SET is_read = TRUE
		WHERE id = $1 AND user_id = $2
	`
	result, err := r.db.Exec(ctx, query, notificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("notification not found or not owned by user")
	}
	return nil
}

func (r *NotificationRepository) GetNotificationPreferences(ctx context.Context, userID string) (*domain.NotificationPreferences, error) {
	query := `
		SELECT user_id, channels
		FROM notification_preferences
		WHERE user_id = $1
	`
	row := r.db.QueryRow(ctx, query, userID)
	preferences := &domain.NotificationPreferences{}
	var channelsJSON []byte
	err := row.Scan(&preferences.UserID, &channelsJSON)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("preferences not found")
		}
		return nil, err
	}

	if err := json.Unmarshal(channelsJSON, &preferences.Channels); err != nil {
		return nil, fmt.Errorf("failed to unmarshal notification channels: %w", err)
	}

	return preferences, nil
}

func (r *NotificationRepository) GetNotificationPreferencesWithDefaults(ctx context.Context, userID string) (*domain.NotificationPreferences, error) {
	preferences, err := r.GetNotificationPreferences(ctx, userID)
	if err != nil {
		if err.Error() == "preferences not found" {
			// Return default preferences if not found
			return &domain.NotificationPreferences{
				UserID: userID,
				Channels: domain.NotificationChannels{
					Email: domain.NotificationChannelPreferences{
						Enabled: true,
						Types: map[domain.NotificationType]bool{
							domain.NewCommentNotification:           true,
							domain.EventReminderNotification:        true,
							domain.CommunityPostNotification:        true,
							domain.NewPostNotification:              true,
							domain.ResponseNotification:             true,
							domain.ReplyNotification:                true,
							domain.ReactionNotification:             true,
							domain.NewMessageNotification:           true,
							domain.RegistrationApprovedNotification: true,
							domain.RegistrationPendingNotification:  true,
							domain.EventCancelledNotification:       true,
						},
					},
					Push: domain.NotificationChannelPreferences{
						Enabled: true,
						Types: map[domain.NotificationType]bool{
							domain.NewCommentNotification:           true,
							domain.EventReminderNotification:        true,
							domain.CommunityPostNotification:        true,
							domain.NewPostNotification:              true,
							domain.ResponseNotification:             true,
							domain.ReplyNotification:                true,
							domain.ReactionNotification:             true,
							domain.NewMessageNotification:           true,
							domain.RegistrationApprovedNotification: true,
							domain.RegistrationPendingNotification:  true,
							domain.EventCancelledNotification:       true,
						},
					},
					InApp: domain.NotificationChannelPreferences{
						Enabled: true,
						Types: map[domain.NotificationType]bool{
							domain.NewCommentNotification:           true,
							domain.EventReminderNotification:        true,
							domain.CommunityPostNotification:        true,
							domain.NewPostNotification:              true,
							domain.ResponseNotification:             true,
							domain.ReplyNotification:                true,
							domain.ReactionNotification:             true,
							domain.NewMessageNotification:           true,
							domain.RegistrationApprovedNotification: true,
							domain.RegistrationPendingNotification:  true,
							domain.EventCancelledNotification:       true,
						},
					},
				},
			}, nil
		}
		return nil, err
	}
	return preferences, nil
}

func (r *NotificationRepository) UpdateNotificationPreferences(ctx context.Context, preferences *domain.NotificationPreferences) (*domain.NotificationPreferences, error) {
	channelsJSON, err := json.Marshal(preferences.Channels)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal notification channels: %w", err)
	}

	query := `
		INSERT INTO notification_preferences (user_id, channels)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE
		SET channels = EXCLUDED.channels
		RETURNING user_id, channels
	`
	var returnedChannelsJSON []byte
	err = r.db.QueryRow(ctx, query, preferences.UserID, channelsJSON).Scan(
		&preferences.UserID, &returnedChannelsJSON,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update notification preferences: %w", err)
	}

	if err := json.Unmarshal(returnedChannelsJSON, &preferences.Channels); err != nil {
		return nil, fmt.Errorf("failed to unmarshal returned notification channels: %w", err)
	}

	return preferences, nil
}

func (r *NotificationRepository) MarkAllNotificationsAsRead(ctx context.Context, userID string) error {
	query := `
		UPDATE notifications
		SET is_read = TRUE
		WHERE user_id = $1 AND is_read = FALSE
	`
	_, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}
	return nil
}

func (r *NotificationRepository) DeleteNotification(ctx context.Context, userID, notificationID string) error {
	query := `
		DELETE FROM notifications
		WHERE id = $1 AND user_id = $2
	`
	result, err := r.db.Exec(ctx, query, notificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("notification not found or not owned by user")
	}
	return nil
}