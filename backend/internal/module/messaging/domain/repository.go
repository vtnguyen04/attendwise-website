package domain

import "context"

type MessagingRepository interface {
	CreateConversation(ctx context.Context, conversation *Conversation, participantIDs []string) (*Conversation, error)
	GetConversationByID(ctx context.Context, conversationID string) (*Conversation, error)
	GetConversationsByUserID(ctx context.Context, userID string, page, limit int) ([]*Conversation, error)
	GetParticipantIDs(ctx context.Context, conversationID string) ([]string, error)
	CreateMessage(ctx context.Context, message *Message) (*Message, error)
	GetMessagesByConversationID(ctx context.Context, conversationID string, limit, offset int) ([]*Message, error)
	GetTotalUnreadMessageCount(ctx context.Context, userID string) (int, error)
	GetMessageByID(ctx context.Context, messageID string) (*Message, error)
	UpdateMessage(ctx context.Context, message *Message) (*Message, error)
	DeleteMessage(ctx context.Context, messageID string, userID string) error
	MarkConversationAsRead(ctx context.Context, conversationID, userID string) error
}