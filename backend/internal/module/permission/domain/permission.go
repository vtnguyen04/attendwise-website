package domain

import (
	"context"
	"errors"
)

var (
	ErrPermissionDenied = errors.New("permission denied")
	ErrCommunityNotFound = errors.New("community not found")
)

// CommunitySettings represents the settings of a community.

type CommunitySettings struct {
	AutoApprovePosts bool
}

// PermissionRepository defines the interface for accessing permission data from the database.

type PermissionRepository interface {
	// CheckUserRoleInCommunity retrieves the role of a user within a specific community.
	// It returns the role as a string (e.g., "community_admin", "member") or an empty string if not a member.
	CheckUserRoleInCommunity(ctx context.Context, communityID, userID string) (string, error)

	// IsEventHost checks if a user is the creator (host) of a specific event.
	IsEventHost(ctx context.Context, eventID, userID string) (bool, error)

	// GetCommunityType retrieves the type of a community (e.g., "public", "private").
	GetCommunityType(ctx context.Context, communityID string) (string, error)

	// GetCommunitySettings retrieves the settings of a community.
	GetCommunitySettings(ctx context.Context, communityID string) (*CommunitySettings, error)
}

// PermissionService defines the interface for permission-related business logic.

type PermissionService interface {
	// CheckUserRoleInCommunity retrieves the role of a user within a specific community.
	CheckUserRoleInCommunity(ctx context.Context, communityID, userID string) (string, error)

	// IsCommunityAdmin checks if a user has an "admin" role in the community.
	IsCommunityAdmin(ctx context.Context, communityID, userID string) (bool, error)

	// IsCommunityMember checks if a user is an active member of the community.
	IsCommunityMember(ctx context.Context, communityID, userID string) (bool, error)

	// IsEventHost checks if a user is the host of the event.
	IsEventHost(ctx context.Context, eventID, userID string) (bool, error)

	// CanViewCommunityContent checks if a user can view content within a community.
	// This encapsulates the logic for public vs. private/secret communities.
	CanViewCommunityContent(ctx context.Context, communityID, userID string) (bool, error)

	// GetCommunityType retrieves the type of a community (e.g., "public", "private").
	GetCommunityType(ctx context.Context, communityID string) (string, error)

	// GetCommunitySettings retrieves the settings of a community.
	GetCommunitySettings(ctx context.Context, communityID string) (*CommunitySettings, error)
}
