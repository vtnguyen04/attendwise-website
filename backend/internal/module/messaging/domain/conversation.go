package domain

import "time"

type ConversationType string

const (
	Direct ConversationType = "direct"
	Group      ConversationType = "group"
)

type Conversation struct {
	ID            string           `json:"id"`
	Type          ConversationType `json:"type"`
	Name          *string          `json:"name,omitempty"` // For group chats or the other user's name in DMs
	AvatarURL     *string          `json:"avatar_url,omitempty"` // For group chats or the other user's avatar in DMs
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
	Participants  []Participant    `json:"participants,omitempty"`
	LastMessage   *string          `json:"last_message,omitempty"`
	LastMessageAt *time.Time       `json:"last_message_at,omitempty"`
	UnreadCount   int              `json:"unread_count"`
}

type Participant struct {
	UserID      string    `json:"user_id"`
	JoinedAt    time.Time `json:"joined_at"`
	LastReadAt  *time.Time `json:"last_read_at,omitempty"`
	UnreadCount int       `json:"unread_count"`
}