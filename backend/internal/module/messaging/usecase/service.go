package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/attendwise/backend/internal/module/messaging/domain"
	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
)

func uniqueStrings(elements []string) []string {
	encountered := map[string]bool{}
	result := []string{}
	for v := range elements {
		if !encountered[elements[v]] {
			encountered[elements[v]] = true
			result = append(result, elements[v])
		}
	}
	return result
}

type MessagingService interface {
	CreateConversation(ctx context.Context, conversationType domain.ConversationType, creatorID string, participantIDs []string) (*domain.Conversation, error)
	GetConversation(ctx context.Context, conversationID string) (*domain.Conversation, error)
	GetUserConversations(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, error)
	GetTotalUnreadMessageCount(ctx context.Context, userID string) (int, error)
	SendMessage(ctx context.Context, conversationID, senderID, content string, messageType domain.MessageType) (*domain.Message, error)
	GetMessages(ctx context.Context, conversationID string, limit, offset int) ([]*domain.Message, error)
	UpdateMessage(ctx context.Context, messageID, userID, content string) (*domain.Message, error)
	DeleteMessage(ctx context.Context, messageID, userID string) error
	MarkConversationAsRead(ctx context.Context, conversationID, userID string) error
}

type Service struct {
	repo domain.MessagingRepository
	nc   *nats.Conn
}

func NewService(repo domain.MessagingRepository, nc *nats.Conn) *Service {
	return &Service{repo: repo, nc: nc}
}

func (s *Service) CreateConversation(ctx context.Context, conversationType domain.ConversationType, creatorID string, participantIDs []string) (*domain.Conversation, error) {
	if conversationType == domain.Direct && len(participantIDs) != 1 {
		return nil, fmt.Errorf("direct conversation must have exactly one other participant")
	}

	if conversationType == domain.Group && len(participantIDs) < 1 {
		return nil, fmt.Errorf("group conversation must have at least one other participant")
	}

	allParticipantIDs := uniqueStrings(append(participantIDs, creatorID))

	conversation := &domain.Conversation{
		ID:   uuid.New().String(),
		Type: conversationType,
	}

	return s.repo.CreateConversation(ctx, conversation, allParticipantIDs)
}

func (s *Service) GetConversation(ctx context.Context, conversationID string) (*domain.Conversation, error) {
	return s.repo.GetConversationByID(ctx, conversationID)
}

func (s *Service) GetUserConversations(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, error) {
	return s.repo.GetConversationsByUserID(ctx, userID, page, limit)
}

func (s *Service) GetTotalUnreadMessageCount(ctx context.Context, userID string) (int, error) {
	return s.repo.GetTotalUnreadMessageCount(ctx, userID)
}

func (s *Service) SendMessage(ctx context.Context, conversationID, senderID, content string, messageType domain.MessageType) (*domain.Message, error) {
	if messageType == "" {
		messageType = domain.Text
	}

	message := &domain.Message{
		ID:             uuid.New().String(),
		ConversationID: conversationID,
		SenderID:       senderID,
		Content:        content,
		MessageType:    messageType,
		CreatedAt:      time.Now(),
	}

	// 1. Save message to the database
	createdMessage, err := s.repo.CreateMessage(ctx, message)
	if err != nil {
		return nil, err
	}

	// 2. Publish message to NATS
	log.Printf("DEBUG: createdMessage before marshal: %+v\n", createdMessage)
	msgData, err := json.Marshal(createdMessage)
	if err != nil {
		log.Printf("Error marshalling message for NATS: %v", err)
		// Do not fail the whole operation, just log the error
		return createdMessage, nil
	}

	subject := fmt.Sprintf("chat.%s", conversationID)
	if err := s.nc.Publish(subject, msgData); err != nil {
		log.Printf("Error publishing message to NATS: %v", err)
	}

	return createdMessage, nil
}

func (s *Service) GetMessages(ctx context.Context, conversationID string, limit, offset int) ([]*domain.Message, error) {
	return s.repo.GetMessagesByConversationID(ctx, conversationID, limit, offset)
}

func (s *Service) UpdateMessage(ctx context.Context, messageID, userID, content string) (*domain.Message, error) {
	// Update fields
	updatedAt := time.Now()
	message := &domain.Message{
		ID:        messageID,
		SenderID:  userID,
		Content:   content,
		IsEdited:  true,
		EditedAt:  &updatedAt,
	}

	// Persist changes
	updatedMessage, err := s.repo.UpdateMessage(ctx, message)
	if err != nil {
		return nil, err
	}

	// Publish update to NATS
	msgData, err := json.Marshal(updatedMessage)
	if err != nil {
		log.Printf("Error marshalling updated message for NATS: %v", err)
	} else {
		subject := fmt.Sprintf("chat.%s", updatedMessage.ConversationID)
		if err := s.nc.Publish(subject, msgData); err != nil {
			log.Printf("Error publishing updated message to NATS: %v", err)
		}
	}

	return updatedMessage, nil
}

func (s *Service) DeleteMessage(ctx context.Context, messageID, userID string) error {
	// Perform soft delete in the repo
	if err := s.repo.DeleteMessage(ctx, messageID, userID); err != nil {
		return err
	}

	// Publish deletion to NATS
	message, err := s.repo.GetMessageByID(ctx, messageID)
	if err != nil {
		log.Printf("Error getting message for NATS after deletion: %v", err)
		return nil
	}

	msgData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshalling deleted message for NATS: %v", err)
	} else {
		subject := fmt.Sprintf("chat.%s", message.ConversationID)
		if err := s.nc.Publish(subject, msgData); err != nil {
			log.Printf("Error publishing deleted message to NATS: %v", err)
		}
	}

	return nil
}

func (s *Service) MarkConversationAsRead(ctx context.Context, conversationID, userID string) error {
	if err := s.repo.MarkConversationAsRead(ctx, conversationID, userID); err != nil {
		return err
	}

	// Publish NATS event for real-time read status update
	eventPayload := map[string]interface{}{
		"conversation_id": conversationID,
		"user_id":         userID,
		"read_at":         time.Now(),
	}
	msgData, err := json.Marshal(eventPayload)
	if err != nil {
		log.Printf("Error marshalling read event for NATS: %v", err)
		return nil // Log error, but don't fail the operation
	}

	subject := fmt.Sprintf("message.read.%s", conversationID)
	if err := s.nc.Publish(subject, msgData); err != nil {
		log.Printf("Error publishing message read event to NATS: %v", err)
	}

	return nil
}