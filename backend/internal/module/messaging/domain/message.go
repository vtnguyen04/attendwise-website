package domain

import "time"

type MessageType string

const (
	Text  MessageType = "text"
	Image MessageType = "image"
	File  MessageType = "file"
)

type Message struct {
	ID             string      `json:"id"`
	ConversationID string      `json:"conversation_id"`
	SenderID       string      `json:"sender_id"`
	Content        string      `json:"content"`
	MessageType    MessageType `json:"message_type"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
	IsEdited       bool        `json:"is_edited"`
	EditedAt       *time.Time  `json:"edited_at,omitempty"`
	IsDeleted      bool        `json:"is_deleted"`
	DeletedAt      *time.Time  `json:"deleted_at,omitempty"`
	Author         *Author     `json:"author,omitempty"`
}

// Author represents the sender of a message, containing denormalized user data.
type Author struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
}