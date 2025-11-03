package usecase

import (
	"context"
	"errors"

	"log"

	community_domain "github.com/attendwise/backend/internal/module/community/domain"
	"github.com/attendwise/backend/internal/module/permission/domain"
)

// Service is the implementation of the PermissionService interface.
type Service struct {
	permRepo domain.PermissionRepository
}

// NewService creates a new permission service.
func NewService(permRepo domain.PermissionRepository) domain.PermissionService {
	return &Service{
		permRepo: permRepo,
	}
}

// CheckUserRoleInCommunity retrieves the role of a user within a specific community.
func (s *Service) CheckUserRoleInCommunity(ctx context.Context, communityID, userID string) (string, error) {
	return s.permRepo.CheckUserRoleInCommunity(ctx, communityID, userID)
}

// IsCommunityAdmin checks if a user has an "admin" or "owner" role in the community.
func (s *Service) IsCommunityAdmin(ctx context.Context, communityID, userID string) (bool, error) {
	role, err := s.permRepo.CheckUserRoleInCommunity(ctx, communityID, userID)
	if err != nil {
		log.Printf("[DEBUG] IsCommunityAdmin: CheckUserRoleInCommunity returned error for communityID=%s, userID=%s: %v", communityID, userID, err)
		if errors.Is(err, community_domain.ErrNotMember) {
			return false, nil // Not a member, thus not an admin, but not an error condition for this check
		}
		return false, err
	}
	log.Printf("[DEBUG] IsCommunityAdmin: Role for communityID=%s, userID=%s is '%s'", communityID, userID, role)
	return role == "community_admin", nil
}

// IsCommunityMember checks if a user is an active member of the community.
func (s *Service) IsCommunityMember(ctx context.Context, communityID, userID string) (bool, error) {
	role, err := s.permRepo.CheckUserRoleInCommunity(ctx, communityID, userID)
	if err != nil {
		return false, err
	}
	// Any role implies membership.
	return role != "", nil
}

// IsEventHost checks if a user is the host of the event.
func (s *Service) IsEventHost(ctx context.Context, eventID, userID string) (bool, error) {
	return s.permRepo.IsEventHost(ctx, eventID, userID)
}

// CanViewCommunityContent checks if a user can view content within a community.
func (s *Service) CanViewCommunityContent(ctx context.Context, communityID, userID string) (bool, error) {
	communityType, err := s.permRepo.GetCommunityType(ctx, communityID)
	if err != nil {
		return false, err // Handles ErrCommunityNotFound
	}

	if communityType == "public" {
		return true, nil
	}

	// For private/secret communities, user must be a member.
	// An empty userID means the user is not logged in.
	if userID == "" {
		return false, nil
	}

	isMember, err := s.IsCommunityMember(ctx, communityID, userID)
	if err != nil {
		return false, err
	}

	return isMember, nil
}

// GetCommunityType retrieves the type of a community (e.g., "public", "private").
func (s *Service) GetCommunityType(ctx context.Context, communityID string) (string, error) {
	return s.permRepo.GetCommunityType(ctx, communityID)
}

func (s *Service) GetCommunitySettings(ctx context.Context, communityID string) (*domain.CommunitySettings, error) {
	return s.permRepo.GetCommunitySettings(ctx, communityID)
}
