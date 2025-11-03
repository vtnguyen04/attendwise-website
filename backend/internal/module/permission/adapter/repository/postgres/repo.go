package postgres

import (
	"context"
	"errors"
	"fmt" // Added
	"log"

	community_domain "github.com/attendwise/backend/internal/module/community/domain" // Changed
	"github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// permissionRepository is the Postgres implementation of the domain.PermissionRepository interface.
type permissionRepository struct {
	db *pgxpool.Pool
}

// NewPermissionRepository creates a new PermissionRepository.
func NewPermissionRepository(db *pgxpool.Pool) domain.PermissionRepository {
	return &permissionRepository{db: db}
}

// CheckUserRoleInCommunity retrieves the role of a user within a specific community.
func (r *permissionRepository) CheckUserRoleInCommunity(ctx context.Context, communityID, userID string) (string, error) {
	var role string
	query := `SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2 AND status = 'active'`
	log.Printf("[DEBUG] CheckUserRoleInCommunity: Executing query for communityID=%s, userID=%s", communityID, userID)
	err := r.db.QueryRow(ctx, query, communityID, userID).Scan(&role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			log.Printf("[DEBUG] CheckUserRoleInCommunity: No active member entry found for communityID=%s, userID=%s", communityID, userID)
			return "", community_domain.ErrNotMember
		}
		log.Printf("[ERROR] CheckUserRoleInCommunity: Database error for communityID=%s, userID=%s: %v", communityID, userID, err)
		return "", err
	}
	log.Printf("[DEBUG] CheckUserRoleInCommunity: Found role '%s' for communityID=%s, userID=%s", role, communityID, userID)
	return role, nil
}

// IsEventHost checks if a user is the creator (host) of a specific event.
func (r *permissionRepository) IsEventHost(ctx context.Context, eventID, userID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND created_by = $2)`
	err := r.db.QueryRow(ctx, query, eventID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("database error when checking event host: %w", err)
	}
	return exists, nil
}

// GetCommunityType retrieves the type of a community (e.g., "public", "private").
func (r *permissionRepository) GetCommunityType(ctx context.Context, communityID string) (string, error) {
	var communityType string
	query := `SELECT type FROM communities WHERE id = $1`
	err := r.db.QueryRow(ctx, query, communityID).Scan(&communityType)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", domain.ErrCommunityNotFound // Use a domain error
		}
		return "", fmt.Errorf("database error when getting community type: %w", err)
	}
	return communityType, nil
}

func (r *permissionRepository) GetCommunitySettings(ctx context.Context, communityID string) (*domain.CommunitySettings, error) {
	var settings domain.CommunitySettings
	query := `SELECT auto_approve_posts FROM communities WHERE id = $1`
	err := r.db.QueryRow(ctx, query, communityID).Scan(&settings.AutoApprovePosts)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrCommunityNotFound
		}
		return nil, fmt.Errorf("database error when getting community settings: %w", err)
	}
	return &settings, nil
}
