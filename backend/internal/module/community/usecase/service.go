package usecase

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/attendwise/backend/internal/module/community/domain"
	event_usecase "github.com/attendwise/backend/internal/module/event/usecase"
	permission_domain "github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/google/uuid"
	"github.com/gosimple/slug"
	"github.com/nats-io/nats.go"
)

// Service is the implementation of the CommunityService interface.
type Service struct {
	pgRepo       domain.CommunityRepository
	neo4jRepo    domain.Neo4jCommunityRepository
	activityRepo domain.ActivityRepository
	permService  permission_domain.PermissionService
	eventService event_usecase.EventService
	nc           *nats.Conn
}

// NewService creates a new community service.
func NewService(pgRepo domain.CommunityRepository, neo4jRepo domain.Neo4jCommunityRepository, activityRepo domain.ActivityRepository, permService permission_domain.PermissionService, eventService event_usecase.EventService, nc *nats.Conn) domain.CommunityService {
	return &Service{pgRepo: pgRepo, neo4jRepo: neo4jRepo, activityRepo: activityRepo, permService: permService, eventService: eventService, nc: nc}
}

// CreateCommunity now only relies on communityType
func (s *Service) CreateCommunity(ctx context.Context, name, description, ownerID, coverImageURL, communityType string, allowMemberPosts, autoApprovePosts, allowMemberInvites bool) (*domain.Community, error) {
	community := &domain.Community{
		ID:                 uuid.New().String(),
		Name:               name,
		Description:        sql.NullString{String: description, Valid: description != ""},
		OwnerID:            ownerID,
		CoverImageURL:      sql.NullString{String: coverImageURL, Valid: coverImageURL != ""},
		Type:               communityType,
		AllowMemberPosts:   allowMemberPosts,
		AutoApprovePosts:   autoApprovePosts,
		AllowMemberInvites: allowMemberInvites,
	}
	community.Slug = slug.Make(fmt.Sprintf("%s-%s", name, community.ID[:8]))

	createdCommunity, err := s.pgRepo.CreateCommunity(ctx, community)
	if err != nil {
		log.Printf("Error creating community in usecase: %v", err)
		return nil, err
	}

	log.Printf("[DEBUG] Created Community (before Neo4j sync): %+v", createdCommunity)

	// Enrich community with owner info
	owner, err := s.pgRepo.GetUserByID(ctx, ownerID)
	if err == nil {
		createdCommunity.AdminName = owner.Name
		if owner.ProfilePictureURL.Valid {
			createdCommunity.AdminAvatarURL = owner.ProfilePictureURL.String
		}
	}

	// Async sync with Neo4j
	go s.neo4jRepo.CreateCommunityNode(context.Background(), createdCommunity)
	go s.neo4jRepo.AddMemberRelationship(context.Background(), ownerID, createdCommunity.ID, "community_admin")

	return createdCommunity, nil
}

func (s *Service) GetCommunity(ctx context.Context, id string, userID string) (*domain.Community, error) {
	community, err := s.pgRepo.GetCommunityByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	// Perform authorization check
	if community.Type == "private" || community.Type == "secret" {
		if community.Role == "" || community.Status != "active" {
			return nil, domain.ErrPermissionDenied
		}
	}

	return community, nil
}

// func (s *Service) GetCommunity(ctx context.Context, id string, userID string) (*domain.Community, error) {
// 	return s.pgRepo.GetCommunityByID(ctx, id, userID)
// }

func (s *Service) ListCommunities(ctx context.Context, userID string, limit, offset int) ([]*domain.Community, int, error) {
	return s.pgRepo.ListCommunities(ctx, userID, limit, offset)
}

func (s *Service) ListUserCommunities(ctx context.Context, userID string) ([]*domain.Community, error) {
	return s.pgRepo.ListUserCommunities(ctx, userID)
}

// func (s *Service) ListCommunities(ctx context.Context, userID string, limit, offset int) ([]*domain.Community, int, error) {
// 	return s.neo4jRepo.ListCommunities(ctx, userID, limit, offset)
// }

// func (s *Service) ListUserCommunities(ctx context.Context, userID string) ([]*domain.Community, error) {
// 	return s.neo4jRepo.ListUserCommunities(ctx, userID)
// }

func (s *Service) UpdateCommunity(ctx context.Context, userID string, community *domain.Community, fieldMask []string) (*domain.Community, error) {
	// Authorization logic is handled by middleware for this endpoint
	updatedCommunity, err := s.pgRepo.UpdateCommunity(ctx, userID, community, fieldMask)
	if err != nil {
		return nil, err
	}

	// Asynchronously update the Neo4j node to keep it in sync
	go s.neo4jRepo.UpdateCommunityNode(context.Background(), updatedCommunity)

	return updatedCommunity, nil
}

func (s *Service) DeleteCommunity(ctx context.Context, communityID string, userID string) error {
	// First, check if the user is the owner of the community
	community, err := s.pgRepo.GetCommunityByID(ctx, communityID, userID)
	if err != nil {
		return err // Handles ErrCommunityNotFound
	}

	if community.OwnerID != userID {
		return permission_domain.ErrPermissionDenied
	}

	// Perform the deletion in PostgreSQL (soft delete)
	err = s.pgRepo.DeleteCommunity(ctx, communityID)
	if err != nil {
		return err
	}

	// Asynchronously delete the Neo4j node
	go s.neo4jRepo.BulkDeleteCommunityNodes(context.Background(), []string{communityID})

	return nil
}

// JoinCommunity logic is now stricter based on the 3-tier model
func (s *Service) JoinCommunity(ctx context.Context, communityID string, userID string) (*domain.Community, error) {
	// Check if user is already a member
	isMember, err := s.permService.IsCommunityMember(ctx, communityID, userID)
	if err != nil && !errors.Is(err, domain.ErrNotMember) {
		return nil, err
	}
	if isMember {
		return nil, domain.ErrUserAlreadyMember
	}

	// Fetch community type directly without full authorization check
	communityType, err := s.permService.GetCommunityType(ctx, communityID)
	if err != nil {
		return nil, err // Handles ErrCommunityNotFound
	}

	var status string
	switch communityType {
	case "public":
		status = "active"
	case "private":
		status = "pending" // Private communities always require approval
	case "secret":
		// Users cannot join secret communities directly, they must be invited.
		return nil, domain.ErrCannotJoinSecretCommunity
	default:
		return nil, fmt.Errorf("unknown community type: %s", communityType)
	}

	if err := s.pgRepo.AddMember(ctx, communityID, userID, "member", status); err != nil {
		return nil, err
	}

	if status == "active" {
		go s.neo4jRepo.AddMemberRelationship(context.Background(), userID, communityID, "member")

		// Create activity for followers
		go func() {
			followers, err := s.neo4jRepo.GetFollowers(context.Background(), userID)
			if err != nil {
				log.Printf("[ERROR] Failed to get followers for activity feed: %v", err)
				return
			}

			community, err := s.pgRepo.GetBaseCommunityByID(context.Background(), communityID)
			if err != nil {
				log.Printf("[ERROR] Failed to get community for activity feed: %v", err)
				return
			}

			for _, followerID := range followers {
				activity := &domain.Activity{
					ID:          uuid.New().String(),
					UserID:      followerID,
					ActorID:     userID,
					ActionType:  "joined_community",
					TargetType:  "community",
					TargetID:    communityID,
					CommunityID: sql.NullString{String: communityID, Valid: true},
					PreviewText: fmt.Sprintf("joined %s", community.Name),
					IsVisible:   true,
				}
				if err := s.activityRepo.CreateActivity(context.Background(), activity); err != nil {
					log.Printf("[ERROR] Failed to create activity: %v", err)
				}
			}
		}()
	}

	community, err := s.pgRepo.GetBaseCommunityByID(ctx, communityID)
	if err != nil {
		return nil, err
	}
	community.Role = "member"
	community.Status = status

	return community, nil
}

func (s *Service) LeaveCommunity(ctx context.Context, communityID string, userID string) error {
	if err := s.pgRepo.LeaveCommunity(ctx, communityID, userID); err != nil {
		return err
	}
	go s.neo4jRepo.RemoveMemberRelationship(context.Background(), userID, communityID)
	return nil
}

func (s *Service) UpdateMemberRole(ctx context.Context, communityID string, performingUserID string, targetUserID string, role string) error {
	isAdmin, err := s.permService.IsCommunityAdmin(ctx, communityID, performingUserID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return permission_domain.ErrPermissionDenied
	}
	return s.pgRepo.UpdateMemberRole(ctx, communityID, targetUserID, role)
}

func (s *Service) RemoveMember(ctx context.Context, communityID string, performingUserID string, targetUserID string) error {
	isAdmin, err := s.permService.IsCommunityAdmin(ctx, communityID, performingUserID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return permission_domain.ErrPermissionDenied
	}

	if err := s.pgRepo.RemoveMember(ctx, communityID, targetUserID); err != nil {
		return err
	}

	go s.neo4jRepo.RemoveMemberRelationship(context.Background(), targetUserID, communityID)

	return nil
}

func (s *Service) CreatePost(ctx context.Context, post *domain.Post) (*domain.Post, error) {
	log.Printf("--- DEBUG: Creating post in usecase: %+v ---", post)
	if post.CommunityID.Valid {
		// Authorization: check if post.AuthorID is a member of post.CommunityID
		isMember, err := s.permService.IsCommunityMember(ctx, post.CommunityID.String, post.AuthorID)
		if err != nil {
			return nil, fmt.Errorf("could not verify community membership: %w", err)
		}
		if !isMember {
			return nil, domain.ErrPermissionDenied
		}
	} else {
		post.PostType = "general"
	}

	// Get community settings to determine post status
	if post.CommunityID.Valid {
		communitySettings, err := s.permService.GetCommunitySettings(ctx, post.CommunityID.String)
		if err != nil {
			log.Printf("[WARN] Could not get community settings for post creation: %v", err)
			// Default to pending if settings can't be fetched
			post.Status = "pending"
		} else if communitySettings.AutoApprovePosts {
			post.Status = "approved"
		} else {
			post.Status = "pending"
		}
	} else {
		// General posts are always approved
		post.Status = "approved"
	}

	if post.Visibility == "" {
		if post.CommunityID.Valid {
			post.Visibility = "community_only"
		} else {
			post.Visibility = "public"
		}
	}

	post.ID = uuid.New().String()

	createdPost, err := s.pgRepo.CreatePost(ctx, post)
	if err != nil {
		return nil, fmt.Errorf("failed to create post in db: %w", err)
	}

	// --- Activity & Notification Logic ---
	if createdPost.CommunityID.Valid {
		// Create activity feed item
		members, err := s.pgRepo.GetCommunityMembers(context.Background(), post.CommunityID.String)
		if err != nil {
			log.Printf("[ERROR] Failed to get community members for activity feed: %v", err)
		} else {
			for _, member := range members {
				// Don't create an activity for the user who created the post
				if member.ID == post.AuthorID {
					continue
				}
				activity := &domain.Activity{
					UserID:      member.ID,
					ActorID:     post.AuthorID,
					ActionType:  "created_post",
					TargetType:  "post",
					TargetID:    post.ID,
					CommunityID: sql.NullString{String: post.CommunityID.String, Valid: post.CommunityID.Valid},
					PreviewText: post.Content,
				}
				if err := s.activityRepo.CreateActivity(context.Background(), activity); err != nil {
					log.Printf("[ERROR] Failed to create activity for user %s: %v", member.ID, err)
				}
			}
		}

		// Publish PostCreatedEvent to NATS
		if createdPost.Status == "approved" {
			community, err := s.pgRepo.GetBaseCommunityByID(context.Background(), createdPost.CommunityID.String)
			if err != nil {
				log.Printf("[ERROR] Failed to get community details for PostCreatedEvent: %v", err)
			} else {
				postAuthor, err := s.pgRepo.GetUserByID(context.Background(), createdPost.AuthorID)
				if err != nil {
					log.Printf("[ERROR] Failed to get post author for PostCreatedEvent: %v", err)
				} else {
					event := domain.PostCreatedEvent{
						PostID:        createdPost.ID,
						CommunityID:   createdPost.CommunityID.String,
						AuthorID:      createdPost.AuthorID,
						AuthorName:    postAuthor.Name,
						CommunityName: community.Name,
						PostContent:   createdPost.Content,
						CreatedAt:     createdPost.CreatedAt,
					}
					payload, err := json.Marshal(event)
					if err != nil {
						log.Printf("[ERROR] Failed to marshal PostCreatedEvent: %v", err)
					} else {
						if err := s.nc.Publish(domain.PostCreatedEventSubject, payload); err != nil {
							log.Printf("[ERROR] Failed to publish PostCreatedEvent: %v", err)
						}
					}
				}
			}
		}
	}

	// --- Graph DB Logic ---
	log.Printf("[DEBUG] CreatePost: Calling Neo4j CreatePostNode with CommunityID=\"%s\", AuthorID=\"%s\"", post.CommunityID.String, post.AuthorID)
	if err := s.neo4jRepo.CreatePostNode(context.Background(), createdPost, "", ""); err != nil {
		log.Printf("[ERROR] Failed to create post node in Neo4j: %v", err)
	}

	return createdPost, nil
}

func (s *Service) GetPost(ctx context.Context, postID, userID string) (*domain.Post, error) {
	// In a real app, add logic to check if the user has permission to view the post
	return s.pgRepo.GetPostByID(ctx, postID, userID)
}

func (s *Service) GetPosts(ctx context.Context, communityID, eventID, userID, status string, limit, offset int, authorID string) ([]*domain.Post, int, error) {
	// Authorization check
	canView, err := s.permService.CanViewCommunityContent(ctx, communityID, userID)
	if err != nil {
		log.Printf("[INFO] Usecase GetPosts: Authorization error for user %s, community %s: %v", userID, communityID, err)
		return nil, 0, err // The error from CanViewCommunityContent is already permission-aware
	}
	if !canView {
		log.Printf("[INFO] Usecase GetPosts: Denied access for user %s to community %s", userID, communityID)
		return nil, 0, permission_domain.ErrPermissionDenied
	}

	// If authorization passed, proceed to get posts.
	posts, total, err := s.pgRepo.GetPostsByCommunityID(ctx, communityID, eventID, userID, status, limit, offset, authorID)
	if err != nil {
		log.Printf("[ERROR] Usecase GetPosts: Failed to get posts from repository for community %s: %v", communityID, err)
		return nil, 0, err
	}
	return posts, total, nil
}

func (s *Service) ApprovePost(ctx context.Context, postID, performingUserID string) error {
	post, err := s.pgRepo.GetPostByID(ctx, postID, performingUserID)
	if err != nil {
		return err
	}

	isAdmin, err := s.permService.IsCommunityAdmin(ctx, post.CommunityID.String, performingUserID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return permission_domain.ErrPermissionDenied
	}

	err = s.pgRepo.UpdatePostStatus(ctx, postID, "approved")
	if err != nil {
		log.Printf("[ERROR] Usecase ApprovePost failed for post %s: %v", postID, err)
		return err
	}
	return nil
}

func (s *Service) RejectPost(ctx context.Context, postID string) error {
	return s.pgRepo.UpdatePostStatus(ctx, postID, "rejected")
}

func (s *Service) PinPost(ctx context.Context, postID, userID string, isPinned bool) error {
	post, err := s.pgRepo.GetPostByID(ctx, postID, userID)
	if err != nil {
		return err
	}

	isAdmin, err := s.permService.IsCommunityAdmin(ctx, post.CommunityID.String, userID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return permission_domain.ErrPermissionDenied
	}

	return s.pgRepo.UpdatePostPinStatus(ctx, postID, isPinned)
}

func (s *Service) GetRecommendedPosts(ctx context.Context, postID, userID string, limit int) ([]map[string]interface{}, error) {
	// In a real app, you might add authorization here to ensure the user can view the original post
	return s.neo4jRepo.GetRecommendedPosts(ctx, userID, postID, limit)
}

func (s *Service) CreateComment(ctx context.Context, comment *domain.Comment) (*domain.Comment, error) {
	// Authorization: check if user is a member
	post, err := s.pgRepo.GetPostByID(ctx, comment.PostID, comment.AuthorID)
	if err != nil {
		return nil, err
	}
	if post.CommunityID.Valid {
		isMember, err := s.permService.IsCommunityMember(ctx, post.CommunityID.String, comment.AuthorID)
		if err != nil {
			return nil, err
		}
		if !isMember {
			return nil, domain.ErrNotMember
		}
	}

	comment.ID = uuid.New().String()
	comment.Status = "approved"

	createdComment, err := s.pgRepo.CreateComment(ctx, comment)
	if err != nil {
		return nil, fmt.Errorf("could not create comment: %w", err)
	}

	// Create activity for post author and other commenters
	go func() {
		post, err := s.pgRepo.GetPostByID(context.Background(), createdComment.PostID, "") // userID is not needed here
		if err != nil {
			log.Printf("[ERROR] Failed to get post for activity feed: %v", err)
			return
		}

		comments, err := s.pgRepo.GetCommentsByPostID(context.Background(), createdComment.PostID)
		if err != nil {
			log.Printf("[ERROR] Failed to get comments for activity feed: %v", err)
			return
		}

		usersToNotify := make(map[string]bool)
		usersToNotify[post.AuthorID] = true
		for _, c := range comments {
			usersToNotify[c.AuthorID] = true
		}

		for userID := range usersToNotify {
			// Don't create an activity for the user who created the comment
			if userID == createdComment.AuthorID {
				continue
			}

			activity := &domain.Activity{
				ID:          uuid.New().String(),
				UserID:      userID,
				ActorID:     createdComment.AuthorID,
				ActionType:  "commented_on_post",
				TargetType:  "post",
				TargetID:    post.ID,
				CommunityID: sql.NullString{String: post.CommunityID.String, Valid: post.CommunityID.Valid}, PreviewText: createdComment.Content,
				IsVisible: true,
			}
			if err := s.activityRepo.CreateActivity(context.Background(), activity); err != nil {
				log.Printf("[ERROR] Failed to create activity: %v", err)
			}
		}
	}()

	// Publish CommentCreatedEvent to NATS asynchronously
	go func() {
		post, err := s.pgRepo.GetPostByID(context.Background(), createdComment.PostID, "") // userID is not needed here
		if err != nil {
			log.Printf("[ERROR] Failed to get post for CommentCreatedEvent: %v", err)
			return
		}

		commentAuthor, err := s.pgRepo.GetUserByID(context.Background(), createdComment.AuthorID)
		if err != nil {
			log.Printf("[ERROR] Failed to get comment author for CommentCreatedEvent: %v", err)
			return
		}

		var communityName string
		if post.CommunityID.Valid {
			community, err := s.pgRepo.GetBaseCommunityByID(context.Background(), post.CommunityID.String)
			if err != nil {
				log.Printf("[ERROR] Failed to get community details for CommentCreatedEvent: %v", err)
			} else {
				communityName = community.Name
			}
		}

		event := domain.CommentCreatedEvent{
			CommentID:      createdComment.ID,
			PostID:         createdComment.PostID,
			CommunityID:    post.CommunityID.String,
			AuthorID:       createdComment.AuthorID,
			AuthorName:     commentAuthor.Name,
			CommunityName:  communityName,
			CommentContent: createdComment.Content,
			PostAuthorID:   post.AuthorID,
			CreatedAt:      createdComment.CreatedAt,
		}

		payload, err := json.Marshal(event)
		if err != nil {
			log.Printf("[ERROR] Failed to marshal CommentCreatedEvent: %v", err)
			return
		}

		if err := s.nc.Publish(domain.CommentCreatedEventSubject, payload); err != nil {
			log.Printf("[ERROR] Failed to publish CommentCreatedEvent: %v", err)
		}
	}()

	// Update Neo4j synchronously
	if err := s.neo4jRepo.CreateCommentNode(context.Background(), createdComment); err != nil {
		log.Printf("[ERROR] Failed to create comment node in Neo4j: %v", err)
	}

	// Publish event to NATS asynchronously
	go func() {
		if s.nc != nil {
			author, err := s.pgRepo.GetUserByID(context.Background(), createdComment.AuthorID)
			if err != nil {
				log.Printf("[ERROR] Failed to get author for comment notification: %v", err)
				return
			}
			createdComment.Author = domain.Author{ // Populate the author field
				ID:                author.ID,
				Name:              author.Name,
				ProfilePictureURL: author.ProfilePictureURL,
			}

			eventPayload := map[string]interface{}{
				"comment":             createdComment,
				"post_author_id":      post.AuthorID,
				"comment_author_name": author.Name,
			}
			payloadBytes, err := json.Marshal(eventPayload)
			if err != nil {
				log.Printf("[ERROR] Failed to marshal NATS payload for new comment: %v", err)
			} else {
				subject := fmt.Sprintf("comment.created.%s", createdComment.PostID)
				if err := s.nc.Publish(subject, payloadBytes); err != nil {
					log.Printf("[ERROR] Failed to publish NATS message for new comment: %v", err)
				}
			}
		}
	}()

	return createdComment, nil
}

func (s *Service) GetComments(ctx context.Context, postID string) ([]*domain.Comment, error) {
	return s.pgRepo.GetCommentsByPostID(ctx, postID)
}

func (s *Service) ApproveComment(ctx context.Context, commentID string) error {
	return s.pgRepo.UpdateCommentStatus(ctx, commentID, "approved")
}

func (s *Service) RejectComment(ctx context.Context, commentID string) error {
	return s.pgRepo.UpdateCommentStatus(ctx, commentID, "rejected")
}

func (s *Service) ReactToTarget(ctx context.Context, userID, targetType, targetID, reactionType string) error {
	reaction := &domain.Reaction{
		ID:           uuid.New().String(),
		UserID:       userID,
		TargetType:   targetType,
		TargetID:     targetID,
		ReactionType: reactionType,
	}

	// Create the reaction in PostgreSQL
	if err := s.pgRepo.CreateReaction(ctx, reaction); err != nil {
		return err
	}

	// Synchronously create the relationship in Neo4j for recommendation engine
	if err := s.neo4jRepo.CreateReactionRelationship(context.Background(), userID, targetID, targetType, reactionType); err != nil {
		log.Printf("[ERROR] Failed to create reaction relationship in Neo4j: %v", err)
	}

	// Publish ReactionCreatedEvent to NATS
	go func() {
		var targetAuthorID string
		var communityID string

		if reaction.TargetType == "post" {
			post, err := s.pgRepo.GetPostByID(context.Background(), reaction.TargetID, "")
			if err != nil {
				log.Printf("[ERROR] Failed to get post for ReactionCreatedEvent: %v", err)
				return
			}
			communityID = post.CommunityID.String
		} else if reaction.TargetType == "comment" {
			comment, err := s.pgRepo.GetCommentByID(context.Background(), reaction.TargetID)
			if err != nil {
				log.Printf("[ERROR] Failed to get comment for ReactionCreatedEvent: %v", err)
				return
			}
			targetAuthorID = comment.AuthorID

			post, err := s.pgRepo.GetPostByID(context.Background(), comment.PostID, "")
			if err != nil {
				log.Printf("[ERROR] Failed to get post for comment ReactionCreatedEvent: %v", err)
				return
			}
			communityID = post.CommunityID.String
		}

		if targetAuthorID != "" && targetAuthorID != reaction.UserID {
			reactor, err := s.pgRepo.GetUserByID(context.Background(), reaction.UserID)
			if err != nil {
				log.Printf("[ERROR] Failed to get reactor user for ReactionCreatedEvent: %v", err)
				return
			}

			event := domain.ReactionCreatedEvent{
				ReactionID:     reaction.ID,
				TargetType:     reaction.TargetType,
				TargetID:       reaction.TargetID,
				ReactorID:      reaction.UserID,
				ReactorName:    reactor.Name,
				ReactionType:   reaction.ReactionType,
				TargetAuthorID: targetAuthorID,
				CommunityID:    communityID,
				CreatedAt:      time.Now(),
			}

			payload, err := json.Marshal(event)
			if err != nil {
				log.Printf("[ERROR] Failed to marshal ReactionCreatedEvent: %v", err)
				return
			}

			if err := s.nc.Publish(domain.ReactionCreatedEventSubject, payload); err != nil {
				log.Printf("[ERROR] Failed to publish ReactionCreatedEvent: %v", err)
			}
		}
	}()

	return nil
}

func (s *Service) DeleteReaction(ctx context.Context, userID, targetType, targetID string) error {
	return s.pgRepo.DeleteReaction(ctx, userID, targetType, targetID)
}

func (s *Service) SuggestCommunities(ctx context.Context, userID string) ([]*domain.Community, error) {
	suggestions, err := s.neo4jRepo.SuggestCommunities(ctx, userID, 10)
	if err != nil {
		return nil, err
	}

	if len(suggestions) == 0 {
		return []*domain.Community{}, nil
	}

	communityIDs := make([]string, 0, len(suggestions))
	suggestionMap := make(map[string]map[string]interface{})
	for _, suggestion := range suggestions {
		rawID, ok := suggestion["id"].(string)
		if !ok || rawID == "" {
			continue
		}
		communityIDs = append(communityIDs, rawID)
		suggestionMap[rawID] = suggestion
	}

	communities, err := s.pgRepo.GetCommunitiesByIDs(ctx, communityIDs)
	if err != nil {
		return nil, err
	}

	for _, community := range communities {
		if suggestion, ok := suggestionMap[community.ID]; ok {
			if val, ok := suggestion["common_members"].(int64); ok {
				community.CommonMembers = val
			}
		}
	}

	return communities, nil
}

func (s *Service) ListMembers(ctx context.Context, communityID string) ([]*domain.CommunityMember, error) {
	return s.pgRepo.GetCommunityMembers(ctx, communityID)
}

func (s *Service) GetReactions(ctx context.Context, targetType, targetID string) ([]*domain.Reaction, error) {
	return s.pgRepo.GetReactionsByTarget(ctx, targetType, targetID)
}

func (s *Service) ListPendingMembers(ctx context.Context, communityID, userID string) ([]*domain.CommunityMember, error) {
	// Authorization: check if userID is admin/moderator
	isAdmin, err := s.permService.IsCommunityAdmin(ctx, communityID, userID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, permission_domain.ErrPermissionDenied
	}

	return s.pgRepo.GetPendingMembers(ctx, communityID)
}

func (s *Service) ListMemberPreviews(ctx context.Context, communityID string) ([]*domain.CommunityMember, error) {
	// For member previews, we might want to limit the number of members returned
	// and potentially order them by some criteria (e.g., recent activity, join date).
	// For now, let's assume the repository method handles the limit.
	return s.pgRepo.GetCommunityMemberPreviews(ctx, communityID, 5) // Limit to 5 previews
}

func (s *Service) ApproveMember(ctx context.Context, communityID, performingUserID, targetUserID string) error {
	// Authorization: check if performingUserID is admin/moderator
	isAdmin, err := s.permService.IsCommunityAdmin(ctx, communityID, performingUserID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return permission_domain.ErrPermissionDenied
	}

	if err := s.pgRepo.UpdateMemberStatus(ctx, communityID, targetUserID, "active"); err != nil {
		return err
	}

	// Add to Neo4j after approval
	go s.neo4jRepo.AddMemberRelationship(context.Background(), targetUserID, communityID, "member")
	return nil
}

func (s *Service) InviteMember(ctx context.Context, communityID, inviterID, inviteeEmail string) error {
	// 1. Get Community Details
	community, err := s.pgRepo.GetCommunityByID(ctx, communityID, inviterID) // Pass inviterID to check permissions
	if err != nil {
		return err // Handles ErrCommunityNotFound and ErrPermissionDenied
	}

	// 2. Check Inviter's Permissions
	inviterRole, err := s.pgRepo.CheckUserRole(ctx, communityID, inviterID)
	if err != nil && !errors.Is(err, domain.ErrNotMember) {
		return err
	}

	canInvite := false
	if inviterRole == "community_admin" || inviterRole == "moderator" {
		canInvite = true
	} else if inviterRole == "member" && community.AllowMemberInvites {
		canInvite = true
	}

	if !canInvite {
		return domain.ErrInviterPermissionDenied
	}

	// 3. Check if Invitee is already an active member
	existingInviteeUser, err := s.pgRepo.GetUserByEmail(ctx, inviteeEmail)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err // Database error
	}

	if existingInviteeUser != nil {
		_, err := s.pgRepo.CheckUserRole(ctx, communityID, existingInviteeUser.ID)
		if err == nil { // No error means they are an active member
			return domain.ErrUserAlreadyMember
		}
		if !errors.Is(err, domain.ErrNotMember) { // Other error than not being a member
			return err
		}
	}

	// 4. Check if Invitee is already invited (pending invite)
	_, err = s.pgRepo.GetCommunityInviteByEmail(ctx, communityID, inviteeEmail)
	if err == nil { // No error means an active invite already exists
		return domain.ErrUserAlreadyInvited
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err // Database error
	}

	// 5. Always create a CommunityInvite record
	inviteToken := uuid.New().String()
	expiresAt := time.Now().Add(7 * 24 * time.Hour) // Invite valid for 7 days

	invite := &domain.CommunityInvite{
		ID:           uuid.New().String(),
		CommunityID:  communityID,
		InviterID:    inviterID,
		InviteeEmail: inviteeEmail,
		Token:        inviteToken,
		Status:       "pending",
		ExpiresAt:    expiresAt,
	}

	if err := s.pgRepo.CreateCommunityInvite(ctx, invite); err != nil {
		return err
	}

	// Placeholder for sending invitation email
	log.Printf("Invitation email would be sent to %s for community %s with token: %s", inviteeEmail, community.Name, inviteToken)

	return nil
}

func (s *Service) AcceptInvite(ctx context.Context, token, acceptingUserID string) (string, error) {
	// 1. Get invitation by token
	invite, err := s.pgRepo.GetCommunityInviteByToken(ctx, token)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", domain.ErrInviteNotFound
		}
		return "", err
	}

	// 2. Check if invite is expired
	if time.Now().After(invite.ExpiresAt) {
		s.pgRepo.UpdateCommunityInviteStatus(ctx, invite.ID, "expired") // Update status
		return "", domain.ErrInviteExpired
	}

	// 3. Get community details
	community, err := s.pgRepo.GetBaseCommunityByID(ctx, invite.CommunityID)
	if err != nil {
		return "", err // Should handle ErrCommunityNotFound
	}

	var actualUserID string
	if acceptingUserID != "" {
		// User is logged in, verify their email matches the invitee email
		loggedInUser, err := s.pgRepo.GetUserByID(ctx, acceptingUserID)
		if err != nil {
			return "", err
		}
		if loggedInUser.Email != invite.InviteeEmail {
			// Logged-in user's email does not match invitee email, return an error.
			return "", domain.ErrEmailMismatch
		}
		actualUserID = acceptingUserID
	} else {
		// User is not logged in, try to find user by invitee email
		userByEmail, err := s.pgRepo.GetUserByEmail(ctx, invite.InviteeEmail)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				// User not found, they need to register first.
				// In a real app, we'd redirect them to a registration page with pre-filled email.
				// For now, return an error.
				return "", domain.ErrUserNotFoundForInvite
			}
			return "", err
		}
		actualUserID = userByEmail.ID
	}

	// 4. Check if user is already a member
	_, err = s.pgRepo.CheckUserRole(ctx, community.ID, actualUserID)
	if err == nil { // No error means they are already a member
		// Update invite status to 'accepted' even if already a member
		s.pgRepo.UpdateCommunityInviteStatus(ctx, invite.ID, "accepted")
		return community.ID, domain.ErrUserAlreadyMember // Indicate they are already a member
	}
	if !errors.Is(err, domain.ErrNotMember) { // Other error than not being a member
		return "", err
	}

	// 5. Add user as a member
	var status string
	switch community.Type {
	case "public", "private", "secret": // Invites always add as active members
		status = "active"
	default:
		return "", fmt.Errorf("unknown community type: %s", community.Type)
	}

	if err := s.pgRepo.AddMember(ctx, community.ID, actualUserID, "member", status); err != nil {
		return "", err
	}

	// 6. Update invite status to 'accepted'
	if err := s.pgRepo.UpdateCommunityInviteStatus(ctx, invite.ID, "accepted"); err != nil {
		log.Printf("[ERROR] Failed to update invite status to accepted: %v", err)
		// Continue anyway, as member was added successfully
	}

	// 7. Sync with Neo4j
	go s.neo4jRepo.AddMemberRelationship(context.Background(), actualUserID, community.ID, "member")

	// Placeholder for sending notification to inviter and community admins
	log.Printf("Notification would be sent to inviter %s and admins for accepted invite to community %s by user %s", invite.InviterID, community.Name, actualUserID)

	return community.ID, nil // Return community ID on success
}

func (s *Service) UpdatePost(ctx context.Context, post *domain.Post) (*domain.Post, error) {
	// Authorization: check if user is the author
	// The authorID is already set in the post object from the handler.
	// The handler should ensure that the requesting user is the author.
	return s.pgRepo.UpdatePost(ctx, post)
}

func (s *Service) DeletePost(ctx context.Context, postID string, userID string) error {
	// Authorization: check if user is the author or a community admin
	post, err := s.pgRepo.GetPostByID(ctx, postID, userID)
	if err != nil {
		return err
	}

	if post.AuthorID != userID {
		isAdmin, err := s.permService.IsCommunityAdmin(ctx, post.CommunityID.String, userID)
		if err != nil {
			return err
		}
		if !isAdmin {
			return permission_domain.ErrPermissionDenied
		}
	}
	return s.pgRepo.DeletePost(ctx, postID, userID)
}

func (s *Service) UpdateComment(ctx context.Context, comment *domain.Comment) (*domain.Comment, error) {
	// Authorization: check if user is the author
	// The authorID is already set in the comment object from the handler.
	// The handler should ensure that the requesting user is the author.
	return s.pgRepo.UpdateComment(ctx, comment)
}

func (s *Service) DeleteComment(ctx context.Context, commentID string, userID string) error {
	comment, err := s.pgRepo.GetCommentByID(ctx, commentID)
	if err != nil {
		return err
	}

	if comment.AuthorID != userID {
		post, err := s.pgRepo.GetPostByID(ctx, comment.PostID, userID)
		if err != nil {
			return err
		}
		isAdmin, err := s.permService.IsCommunityAdmin(ctx, post.CommunityID.String, userID)
		if err != nil {
			return err
		}
		if !isAdmin {
			return permission_domain.ErrPermissionDenied
		}
	}

	return s.pgRepo.DeleteComment(ctx, commentID, userID)
}

func (s *Service) GetActivityFeed(ctx context.Context, userID string, limit, offset int) ([]*domain.Activity, int, error) {
	return s.activityRepo.GetActivityFeed(ctx, userID, limit, offset)
}

func (s *Service) CreatePoll(ctx context.Context, post *domain.Post, options []string) (*domain.Post, error) {
	post.PostType = "poll"
	createdPost, err := s.CreatePost(ctx, post)
	if err != nil {
		return nil, err
	}

	pollOptions := make([]domain.PollOption, len(options))
	for i, optionText := range options {
		pollOptions[i] = domain.PollOption{
			ID:         uuid.New().String(),
			PostID:     createdPost.ID,
			OptionText: optionText,
		}
	}

	if err := s.pgRepo.CreatePollOptions(ctx, pollOptions); err != nil {
		// TODO: Handle post creation rollback
		return nil, err
	}

	createdPost.PollOptions = pollOptions
	return createdPost, nil
}

func (s *Service) VotePoll(ctx context.Context, userID, postID, optionID string) error {
	// Check if user has already voted
	existingVote, err := s.pgRepo.GetPollVote(ctx, postID, userID)
	if err != nil {
		return err
	}
	if existingVote != nil {
		return errors.New("user has already voted on this poll")
	}

	vote := &domain.PollVote{
		PostID:   postID,
		UserID:   userID,
		OptionID: optionID,
	}

	if err := s.pgRepo.CreatePollVote(ctx, vote); err != nil {
		return err
	}

	return s.pgRepo.IncrementPollVoteCount(ctx, optionID)
}
