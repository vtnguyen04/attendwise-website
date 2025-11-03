package domain

import (
	"context"
	"time"

	community_domain "github.com/attendwise/backend/internal/module/community/domain"
	event_domain "github.com/attendwise/backend/internal/module/event/domain"
)

// Scope defines the subset of feed items to retrieve.
type Scope string

const (
	ScopeAll       Scope = "all"
	ScopeCommunity Scope = "community"
	ScopeGlobal    Scope = "global"
)

// Item represents an entry in a user's feed timeline.
type Item struct {
	Type      string                  `json:"type"` // "post" or "event"
	Post      *community_domain.Post  `json:"post,omitempty"`
	Event     *event_domain.EventItem `json:"event,omitempty"`
	CreatedAt time.Time               `json:"created_at"`
}

// Service captures the behaviors exposed by the feed module.
type Service interface {
	GetFeed(ctx context.Context, userID string, limit int, scope Scope) ([]*Item, error)
	ListGlobalPosts(ctx context.Context, userID string, limit, offset int, authorID string) ([]*community_domain.Post, int, error)
}

// Repository abstracts persistence for feed-specific data.
type Repository interface {
	ListGlobalPosts(ctx context.Context, userID string, limit, offset int, authorID string) ([]*community_domain.Post, int, error)
}
