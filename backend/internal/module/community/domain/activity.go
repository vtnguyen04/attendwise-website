package domain

import (
	"context"
	"database/sql"
	"time"
)

// Activity represents an action performed by a user.

type Activity struct {
	ID              string         `json:"id"`
	UserID          string         `json:"user_id"`
	ActorID         string         `json:"actor_id"`
	ActionType      string         `json:"action_type"`
	TargetType      string         `json:"target_type"`
	TargetID        string         `json:"target_id"`
	CommunityID     sql.NullString `json:"community_id,omitempty"`
	EventID         sql.NullString `json:"event_id,omitempty"`
	PreviewText     string         `json:"preview_text,omitempty"`
	PreviewImageURL string         `json:"preview_image_url,omitempty"`
	IsRead          bool           `json:"is_read"`
	IsVisible       bool           `json:"is_visible"`
	CreatedAt       time.Time      `json:"created_at"`
}

// ActivityRepository defines the interface for activity data operations.

type ActivityRepository interface {
	CreateActivity(ctx context.Context, activity *Activity) error
	GetActivityFeed(ctx context.Context, userID string, limit, offset int) ([]*Activity, int, error)
}
