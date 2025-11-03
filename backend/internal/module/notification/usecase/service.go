package usecase

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/attendwise/backend/internal/module/notification/domain"
	user_domain "github.com/attendwise/backend/internal/module/user/domain"
	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
)

type NotificationService interface {
	CreateNotification(ctx context.Context, userID string, notificationType domain.NotificationType, title, message, link string, relatedUserID, relatedPostID, relatedCommentID, relatedEventID, relatedConversationID sql.NullString) (*domain.Notification, error)
	GetNotifications(ctx context.Context, userID string, limit, offset int) ([]*domain.Notification, error)
	MarkAsRead(ctx context.Context, notificationID string, userID string) error
	GetPreferences(ctx context.Context, userID string) (*domain.NotificationPreferences, error)
	UpdatePreferences(ctx context.Context, userID string, preferences *domain.NotificationPreferences) (*domain.NotificationPreferences, error)
	MarkAllAsRead(ctx context.Context, userID string) error
	DeleteNotification(ctx context.Context, userID, notificationID string) error
}

type Service struct {
	repo     domain.NotificationRepository
	nc       *nats.Conn
	userRepo user_domain.UserRepository
}

func NewService(repo domain.NotificationRepository, nc *nats.Conn, userRepo user_domain.UserRepository) *Service {
	return &Service{repo: repo, nc: nc, userRepo: userRepo}
}
func (s *Service) CreateNotification(ctx context.Context, userID string, notificationType domain.NotificationType, title, message, link string, relatedUserID, relatedPostID, relatedCommentID, relatedEventID, relatedConversationID sql.NullString) (*domain.Notification, error) {
	notification := &domain.Notification{
		ID:                    uuid.New().String(),
		UserID:                userID,
		Type:                  notificationType,
		Title:                 title,
		Message:               message,
		Link:                  sql.NullString{String: link, Valid: link != ""},
		RelatedUserID:         relatedUserID,
		RelatedPostID:         relatedPostID,
		RelatedCommentID:      relatedCommentID,
		RelatedEventID:        relatedEventID,
		RelatedConversationID: relatedConversationID,
		IsRead:                false,
		CreatedAt:             time.Now(),
	}

	if relatedUserID.Valid {
		user, err := s.userRepo.GetUserByID(ctx, relatedUserID.String)
		if err == nil {
			notification.RelatedUserName = sql.NullString{String: user.Name, Valid: true}
			notification.RelatedUserAvatar = user.ProfilePictureURL
		}
	}

	createdNotification, err := s.repo.CreateNotification(ctx, notification)
	if err != nil {
		return nil, err
	}

	// Publish create event to NATS
	msgData, err := json.Marshal(createdNotification)
	if err != nil {
		log.Printf("Error marshalling created notification for NATS: %v", err)
	} else {
		subject := fmt.Sprintf("notifications.%s", userID)
		if err := s.nc.Publish(subject, msgData); err != nil {
			log.Printf("Error publishing created notification to NATS: %v", err)
		}
	}

	return createdNotification, nil
}

func (s *Service) GetNotifications(ctx context.Context, userID string, limit, offset int) ([]*domain.Notification, error) {
	return s.repo.GetNotificationsByUserID(ctx, userID, limit, offset)
}

func (s *Service) MarkAsRead(ctx context.Context, notificationID string, userID string) error {
	if err := s.repo.MarkNotificationAsRead(ctx, notificationID, userID); err != nil {
		return err
	}

	// Publish read event to NATS
	eventPayload := map[string]string{"event": "read", "notification_id": notificationID}
	msgData, err := json.Marshal(eventPayload)
	if err != nil {
		log.Printf("Error marshalling read event for NATS: %v", err)
		return nil
	}

	subject := fmt.Sprintf("notifications.%s", userID)
	if err := s.nc.Publish(subject, msgData); err != nil {
		log.Printf("Error publishing read event to NATS: %v", err)
	}

	return nil
}
func (s *Service) GetPreferences(ctx context.Context, userID string) (*domain.NotificationPreferences, error) {
	return s.repo.GetNotificationPreferencesWithDefaults(ctx, userID)
}
func (s *Service) UpdatePreferences(ctx context.Context, userID string, preferences *domain.NotificationPreferences) (*domain.NotificationPreferences, error) {
	preferences.UserID = userID // Ensure the userID is set correctly from the context
	return s.repo.UpdateNotificationPreferences(ctx, preferences)
}

func (s *Service) MarkAllAsRead(ctx context.Context, userID string) error {
	if err := s.repo.MarkAllNotificationsAsRead(ctx, userID); err != nil {
		return err
	}

	// Publish read-all event to NATS
	eventPayload := map[string]string{"event": "read_all"}
	msgData, err := json.Marshal(eventPayload)
	if err != nil {
		log.Printf("Error marshalling read_all event for NATS: %v", err)
		return nil // Do not fail the operation, just log the error
	}

	subject := fmt.Sprintf("notifications.%s", userID)
	if err := s.nc.Publish(subject, msgData); err != nil {
		log.Printf("Error publishing read_all event to NATS: %v", err)
	}

	return nil
}

func (s *Service) DeleteNotification(ctx context.Context, userID, notificationID string) error {
	if err := s.repo.DeleteNotification(ctx, userID, notificationID); err != nil {
		return err
	}

	// Publish delete event to NATS
	eventPayload := map[string]string{"event": "deleted", "notification_id": notificationID}
	msgData, err := json.Marshal(eventPayload)
	if err != nil {
		log.Printf("Error marshalling delete event for NATS: %v", err)
		return nil // Do not fail the operation, just log the error
	}

	subject := fmt.Sprintf("notifications.%s", userID)
	if err := s.nc.Publish(subject, msgData); err != nil {
		log.Printf("Error publishing delete event to NATS: %v", err)
	}

	return nil
}
