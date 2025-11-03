package domain

import (
	"context"
	"encoding/json"
)

// SearchResult represents a single item in the search results list.
type SearchResult struct {
	Type   string          `json:"type"`
	Rank   float32         `json:"rank"`
	Result json.RawMessage `json:"result"`
}

// SearchRepository defines the interface for the search data access layer.
type SearchRepository interface {
	// Search và SearchUsers không có userID
	Search(ctx context.Context, query, typeFilter string, limit, offset int) ([]*SearchResult, error)
	SearchUsers(ctx context.Context, query string, limit, offset int) ([]*SearchResult, error)

	// FIX: Xóa userID khỏi SearchCommunities để khớp với repository
	SearchCommunities(ctx context.Context, query string, limit, offset int) ([]*SearchResult, error)

	// SearchEvents vẫn cần userID
	SearchEvents(ctx context.Context, userID, query string, limit, offset int) ([]*SearchResult, error)
}

// SearchService defines the interface for the search business logic.
type SearchService interface {
	// Search và SearchUsers không có userID
	Search(ctx context.Context, query, typeFilter string, limit, offset int) ([]*SearchResult, error)
	SearchUsers(ctx context.Context, query string, limit, offset int) ([]*SearchResult, error)

	// FIX: Xóa userID khỏi SearchCommunities để khớp với usecase
	SearchCommunities(ctx context.Context, query string, limit, offset int) ([]*SearchResult, error)

	// SearchEvents vẫn cần userID
	SearchEvents(ctx context.Context, userID, query string, limit, offset int) ([]*SearchResult, error)
}
