package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/attendwise/backend/internal/module/community/domain"
	event_domain "github.com/attendwise/backend/internal/module/event/domain"
	user_domain "github.com/attendwise/backend/internal/module/user/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// communityRepository is the Postgres implementation of the domain.CommunityRepository interface.

type communityRepository struct {
	db *pgxpool.Pool

	redis *redis.Client

	eventRepo event_domain.EventRepository
}

// NewCommunityRepository creates a new CommunityRepository.
func NewCommunityRepository(db *pgxpool.Pool, redis *redis.Client, eventRepo event_domain.EventRepository) domain.CommunityRepository {
	return &communityRepository{db: db, redis: redis, eventRepo: eventRepo}
}

func (r *communityRepository) scanCommunity(row pgx.Row) (*domain.Community, error) {
	var community domain.Community
	var adminAvatar sql.NullString

	err := row.Scan(
		&community.ID, &community.OwnerID, &community.Name, &community.Slug, &community.Description, &community.CoverImageURL,
		&community.Type, &community.AllowMemberPosts, &community.AutoApprovePosts, &community.AllowMemberInvites,
		&community.MemberCount, &community.PostCount, &community.EventCount, &community.CreatedAt, &community.UpdatedAt, &community.DeletedAt,
		&community.AdminName, &adminAvatar,
	)
	if err != nil {
		return nil, err
	}

	if adminAvatar.Valid {
		community.AdminAvatarURL = adminAvatar.String
	}
	// Role and Status are user-specific and will be populated by a separate query in GetCommunityByID
	log.Printf("[DEBUG] scanCommunity: CommunityID: %s, Type: %s", community.ID, community.Type)
	return &community, nil
}

func (r *communityRepository) scanCommunityWithUserRole(row pgx.Row) (*domain.Community, error) {
	var community domain.Community
	var adminAvatar sql.NullString
	var role, status sql.NullString // Use sql.NullString for potentially null role/status

	err := row.Scan(
		&community.ID, &community.OwnerID, &community.Name, &community.Slug, &community.Description, &community.CoverImageURL,
		&community.Type, &community.AllowMemberPosts, &community.AutoApprovePosts, &community.AllowMemberInvites,
		&community.MemberCount, &community.PostCount, &community.EventCount, &community.CreatedAt, &community.UpdatedAt, &community.DeletedAt,
		&community.AdminName, &adminAvatar,
		&role, &status, // Scan role and status
	)
	if err != nil {
		return nil, err
	}

	if adminAvatar.Valid {
		community.AdminAvatarURL = adminAvatar.String
	}
	if role.Valid {
		community.Role = role.String
	}
	if status.Valid {
		community.Status = status.String
	}
	log.Printf("[DEBUG] scanCommunityWithUserRole: CommunityID: %s, Type: %s, Role: %s, Status: %s", community.ID, community.Type, community.Role, community.Status)
	return &community, nil
}

func (r *communityRepository) scanPost(row pgx.Row) (*domain.Post, error) {
	var post domain.Post
	var mediaURLsJSON []byte
	var fileAttachmentsJSON []byte
	var userHasLiked bool
	var hashtagsJSON []byte
	var mentionedJSON []byte

	log.Printf("[DEBUG] scanPost: Attempting to scan row into Post struct.")

	err := row.Scan(
		&post.ID, &post.Title, &post.AuthorID, &post.CommunityID, &post.EventID, &post.Content, &post.ContentHTML,
		&mediaURLsJSON,
		&fileAttachmentsJSON, &hashtagsJSON, &mentionedJSON, &post.Visibility, &post.Status, &post.PostType, &post.ReviewedBy,
		&post.ReviewedAt, &post.RejectionReason, &post.FlaggedCount, &post.CommentCount, &post.ReactionCount,
		&post.ShareCount, &post.ViewCount, &post.IsPinned, &post.PinnedUntil, &post.CreatedAt, &post.UpdatedAt,
		&post.PublishedAt, &post.DeletedAt,
		&post.Author.ID, &post.Author.Name, &post.Author.ProfilePictureURL,
		&userHasLiked,
	)
	if err != nil {
		return nil, err
	}

	post.UserHasLiked = userHasLiked

	if len(mediaURLsJSON) > 0 && string(mediaURLsJSON) != "null" {
		if err := json.Unmarshal(mediaURLsJSON, &post.MediaURLs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal media_urls: %w", err)
		}
	}
	if len(hashtagsJSON) > 0 {
		if err := json.Unmarshal(hashtagsJSON, &post.Hashtags); err != nil {
			return nil, fmt.Errorf("failed to unmarshal hashtags: %w", err)
		}
	}
	if len(mentionedJSON) > 0 {
		if err := json.Unmarshal(mentionedJSON, &post.MentionedUserIDs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal mentioned_user_ids: %w", err)
		}
	}

	if len(fileAttachmentsJSON) > 0 && string(fileAttachmentsJSON) != "null" {
		if err := json.Unmarshal(fileAttachmentsJSON, &post.FileAttachments); err != nil {
			log.Printf("[ERROR] scanPost: failed to unmarshal file_attachments: %v", err)
			return nil, fmt.Errorf("failed to unmarshal file_attachments: %w", err)
		}
	}

	return &post, nil
}

// scanComment is a helper function to scan a comment row.
func (r *communityRepository) scanUserAndMembership(row pgx.Row) (*domain.CommunityMember, error) {
	var member domain.CommunityMember
	var ( // Temporary variables for scanning nullable fields
		phone, bio, company, position, location, banReason, profilePictureURL sql.NullString
		faceIDConsentTime, bannedUntil, lastLoginAt, deletedAt                sql.NullTime
		role, status                                                          sql.NullString
		joinedAt                                                              sql.NullTime
	)

	err := row.Scan(
		&member.ID, &member.Email, &phone, &member.Name, &profilePictureURL, &bio, &company, &position, &location, &member.FaceIDEnrolled, &member.FaceIDConsentGiven, &faceIDConsentTime, &member.FaceSamplesCount, &member.IsActive, &member.IsBanned, &member.IsVerified, &banReason, &bannedUntil, &member.ProfileVisibility, &lastLoginAt, &member.CreatedAt, &member.UpdatedAt, &deletedAt, // User fields
		&role, &status, &joinedAt, // CommunityMember specific fields
	)
	if err != nil {
		return nil, err
	}

	// Assign values from temporary variables, handling nulls
	if phone.Valid {
		member.Phone = phone
	}
	if profilePictureURL.Valid {
		member.ProfilePictureURL = profilePictureURL
	}
	if bio.Valid {
		member.Bio = bio
	}
	if company.Valid {
		member.Company = company
	}
	if position.Valid {
		member.Position = position
	}
	if location.Valid {
		member.Location = location
	}
	if faceIDConsentTime.Valid {
		member.FaceIDConsentTime = faceIDConsentTime
	}
	if bannedUntil.Valid {
		member.BannedUntil = bannedUntil
	}
	if lastLoginAt.Valid {
		member.LastLoginAt = lastLoginAt
	}
	if deletedAt.Valid {
		member.DeletedAt = deletedAt
	}

	if role.Valid {
		member.Role = role.String
	}
	if status.Valid {
		member.Status = status.String
	}
	if joinedAt.Valid {
		member.JoinedAt = joinedAt.Time
	}

	return &member, nil
}

func (r *communityRepository) scanComment(row pgx.Row) (*domain.Comment, error) {
	var comment domain.Comment
	err := row.Scan(
		&comment.ID, &comment.PostID, &comment.AuthorID, &comment.ParentCommentID, &comment.Content, &comment.ContentHTML, &comment.MediaURLs,
		&comment.MentionedUserIDs, &comment.Status, &comment.ReviewedBy, &comment.ReviewedAt, &comment.FlaggedCount, &comment.ThreadDepth,
		&comment.ThreadPath, &comment.ReactionCount, &comment.ReplyCount, &comment.CreatedAt, &comment.UpdatedAt, &comment.DeletedAt,
		&comment.Author.ID, &comment.Author.Name, &comment.Author.ProfilePictureURL,
	)
	return &comment, err
}

func (r *communityRepository) CreateCommunity(ctx context.Context, community *domain.Community) (*domain.Community, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	communityQuery := `
        INSERT INTO communities (id, owner_id, name, slug, description, cover_image_url, type, allow_member_posts, auto_approve_posts, allow_member_invites)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING created_at, updated_at, member_count
    `
	err = tx.QueryRow(ctx, communityQuery, community.ID, community.OwnerID, community.Name, community.Slug, community.Description, community.CoverImageURL, community.Type, community.AllowMemberPosts, community.AutoApprovePosts, community.AllowMemberInvites).Scan(
		&community.CreatedAt, &community.UpdatedAt, &community.MemberCount,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert community: %w", err)
	}

	memberQuery := `INSERT INTO community_members (community_id, user_id, role, status) VALUES ($1, $2, 'community_admin', 'active')`
	_, err = tx.Exec(ctx, memberQuery, community.ID, community.OwnerID)
	if err != nil {
		return nil, fmt.Errorf("failed to add owner as member: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	community.Role = "community_admin"
	community.Status = "active"
	return community, nil
}

func (r *communityRepository) GetCommunityByID(ctx context.Context, id string, userID string) (*domain.Community, error) {
	query := `
		SELECT
			c.id, c.owner_id, c.name, c.slug, c.description, c.cover_image_url, c.type, c.allow_member_posts, c.auto_approve_posts, c.allow_member_invites,
			c.member_count, c.post_count, c.event_count, c.created_at, c.updated_at, c.deleted_at,
			u.name as admin_name, u.profile_picture_url as admin_avatar_url,
			cm.role, cm.status
		FROM communities c
		JOIN users u ON c.owner_id = u.id
		LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_id = $2
		WHERE c.id = $1 AND c.deleted_at IS NULL
	`
	community, err := r.scanCommunityWithUserRole(r.db.QueryRow(ctx, query, id, userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrCommunityNotFound
		}
		return nil, err
	}

	return community, nil
}

func (r *communityRepository) GetCommunitiesByIDs(ctx context.Context, ids []string) ([]*domain.Community, error) {
	query := `
		SELECT
			c.id, c.owner_id, c.name, c.slug, c.description, c.cover_image_url,
			c.type, c.allow_member_posts, c.auto_approve_posts, c.allow_member_invites,
			c.member_count, c.post_count, c.event_count, c.created_at, c.updated_at, c.deleted_at,
			u.name as admin_name, u.profile_picture_url as admin_avatar_url
		FROM communities c
		JOIN users u ON c.owner_id = u.id
		WHERE c.id = ANY($1) AND c.deleted_at IS NULL
	`
	rows, err := r.db.Query(ctx, query, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	communities, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*domain.Community, error) {
		return r.scanCommunity(row)
	})
	if err != nil {
		return nil, err
	}

	// Fetch member previews for each community
	for _, community := range communities {
		memberPreviews, err := r.GetCommunityMemberPreviews(ctx, community.ID, 3) // Limit to 3 previews
		if err != nil {
			log.Printf("[ERROR] GetCommunitiesByIDs: Failed to fetch member previews for community %s: %v", community.ID, err)
			// Continue without member previews if there's an error
		}
		community.MemberPreviews = memberPreviews
	}

	return communities, nil
}

func (r *communityRepository) GetBaseCommunityByID(ctx context.Context, id string) (*domain.Community, error) {
	// 1. Try to get the community from cache first
	cacheKey := fmt.Sprintf("community:%s", id)
	val, err := r.redis.Get(ctx, cacheKey).Result()
	var community *domain.Community

	if err == nil {
		// Cache hit
		if err := json.Unmarshal([]byte(val), &community); err != nil {
			community = nil // Invalidate if unmarshal fails
		}
	}

	// 2. Cache miss or error, get from database
	if community == nil {
		query := `
		SELECT
			c.id, c.owner_id, c.name, c.slug, c.description, c.cover_image_url, c.type, c.allow_member_posts, c.auto_approve_posts, c.allow_member_invites,
			c.member_count, c.post_count, c.event_count, c.created_at, c.updated_at, c.deleted_at,
			u.name as admin_name, u.profile_picture_url as admin_avatar_url
		FROM communities c
		JOIN users u ON c.owner_id = u.id
		WHERE c.id = $1 AND c.deleted_at IS NULL
		`
		dbCommunity, err := r.scanCommunity(r.db.QueryRow(ctx, query, id))
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, domain.ErrCommunityNotFound
			}
			return nil, err
		}
		community = dbCommunity

		// 3. Populate cache
		marshaledCommunity, err := json.Marshal(community)
		if err == nil {
			r.redis.Set(ctx, cacheKey, marshaledCommunity, 10*time.Minute)
		}
	}

	return community, nil
}
func (r *communityRepository) ListCommunities(ctx context.Context, userID string, limit, offset int) ([]*domain.Community, int, error) {
	query := `
        SELECT
            c.id, c.owner_id, c.name, c.slug, c.description, c.cover_image_url,
            c.type, c.allow_member_posts, c.auto_approve_posts, c.allow_member_invites,
            c.member_count, c.post_count, c.event_count, c.created_at, c.updated_at, c.deleted_at,
            u.name as admin_name, u.profile_picture_url as admin_avatar_url,
            cm.role, COALESCE(cm.status, 'not_joined') as status,
            COUNT(*) OVER() AS total_count
        FROM communities c
        JOIN users u ON c.owner_id = u.id
        LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_id = $1
        WHERE c.deleted_at IS NULL
          AND (c.type = 'public' OR c.type = 'private' OR (c.type = 'secret' AND cm.user_id IS NOT NULL AND cm.status = 'active'))
        ORDER BY c.member_count DESC, c.created_at DESC, c.id ASC
        LIMIT $2 OFFSET $3
    `
	log.Printf("[DEBUG] ListCommunities Repo - Executing query: %s with args: userID=%s, limit=%d, offset=%d", query, userID, limit, offset)
	rows, err := r.db.Query(ctx, query, userID, interface{}(limit), interface{}(offset))
	if err != nil {
		log.Printf("[ERROR] ListCommunities Repo - Query execution failed: %v", err)
		return nil, 0, err
	}
	defer rows.Close()

	var communities []*domain.Community
	var total int
	for rows.Next() {
		var community domain.Community
		var adminAvatar sql.NullString
		var role, status sql.NullString
		if err := rows.Scan(
			&community.ID, &community.OwnerID, &community.Name, &community.Slug, &community.Description, &community.CoverImageURL,
			&community.Type, &community.AllowMemberPosts, &community.AutoApprovePosts, &community.AllowMemberInvites,
			&community.MemberCount, &community.PostCount, &community.EventCount, &community.CreatedAt, &community.UpdatedAt, &community.DeletedAt,
			&community.AdminName, &adminAvatar,
			&role, &status,
			&total,
		); err != nil {
			log.Printf("[ERROR] ListCommunities Repo - Row scan failed: %v", err)
			return nil, 0, err
		}
		if adminAvatar.Valid {
			community.AdminAvatarURL = adminAvatar.String
		}
		if role.Valid {
			community.Role = role.String
		}
		if status.Valid {
			community.Status = status.String
		} else {
			community.Status = "not_joined" // Explicitly set default status
		}
		communities = append(communities, &community)
	}
	return communities, total, nil
}

func (r *communityRepository) ListUserCommunities(ctx context.Context, userID string) ([]*domain.Community, error) {
	query := `
        SELECT
            c.id, c.owner_id, c.name, c.slug, c.description, c.cover_image_url,
            c.type, c.allow_member_posts, c.auto_approve_posts, c.allow_member_invites,
            c.member_count, c.post_count, c.event_count, c.created_at, c.updated_at, c.deleted_at,
            u.name as admin_name, u.profile_picture_url as admin_avatar_url,
            cm.role, cm.status
        FROM communities c
        JOIN users u ON c.owner_id = u.id
        JOIN community_members cm ON c.id = cm.community_id
        WHERE cm.user_id = $1 AND c.deleted_at IS NULL
        ORDER BY cm.is_pinned DESC, c.name ASC
    `
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	communities, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*domain.Community, error) {
		return r.scanCommunityWithUserRole(row)
	})
	if err != nil {
		return nil, err
	}

	return communities, nil
}

func (r *communityRepository) GetCommunitiesByMember(ctx context.Context, userID string) ([]*domain.Community, error) {
	query := `
        SELECT
            c.id, c.owner_id, c.name, c.slug, c.description, c.cover_image_url,
            c.type, c.allow_member_posts, c.auto_approve_posts, c.allow_member_invites,
            c.member_count, c.post_count, c.event_count, c.created_at, c.updated_at, c.deleted_at,
            u.name as admin_name, u.profile_picture_url as admin_avatar_url,
            cm.role, cm.status
        FROM communities c
        JOIN users u ON c.owner_id = u.id
        JOIN community_members cm ON c.id = cm.community_id
        WHERE cm.user_id = $1 AND cm.status = 'active' AND c.deleted_at IS NULL
        ORDER BY c.created_at DESC
    `
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	communities, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*domain.Community, error) {
		return r.scanCommunityWithUserRole(row)
	})
	if err != nil {
		return nil, err
	}

	return communities, nil
}

func (r *communityRepository) UpdateCommunity(ctx context.Context, userID string, community *domain.Community, fieldMask []string) (*domain.Community, error) {
	var setClauses []string
	args := []interface{}{community.ID, userID}
	argCount := 3

	for _, field := range fieldMask {
		switch field {
		case "name":
			setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
			args = append(args, community.Name)
		case "description":
			setClauses = append(setClauses, fmt.Sprintf("description = $%d", argCount))
			args = append(args, community.Description)
		case "cover_image_url":
			setClauses = append(setClauses, fmt.Sprintf("cover_image_url = $%d", argCount))
			args = append(args, community.CoverImageURL)
		case "type":
			setClauses = append(setClauses, fmt.Sprintf("type = $%d", argCount))
			args = append(args, community.Type)
		case "allow_member_posts":
			setClauses = append(setClauses, fmt.Sprintf("allow_member_posts = $%d", argCount))
			args = append(args, community.AllowMemberPosts)
		case "auto_approve_posts":
			setClauses = append(setClauses, fmt.Sprintf("auto_approve_posts = $%d", argCount))
			args = append(args, community.AutoApprovePosts)
		case "allow_member_invites":
			setClauses = append(setClauses, fmt.Sprintf("allow_member_invites = $%d", argCount))
			args = append(args, community.AllowMemberInvites)
		default:
			continue
		}
		argCount++
	}

	if len(setClauses) == 0 {
		return community, nil
	}

	query := fmt.Sprintf(`
		UPDATE communities
		SET %s, updated_at = NOW()
		WHERE id = $1
		  AND (
			  owner_id = $2 OR EXISTS (
				  SELECT 1
				  FROM community_members
				  WHERE community_id = $1
				    AND user_id = $2
				    AND role = 'community_admin'
				    AND status = 'active'
			  )
		  )`,
		strings.Join(setClauses, ", "),
	)

	commandTag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	if commandTag.RowsAffected() == 0 {
		return nil, domain.ErrPermissionDenied
	}

	cacheKey := fmt.Sprintf("community:%s", community.ID)
	r.redis.Del(ctx, cacheKey)

	return community, nil
}

func (r *communityRepository) AddMember(ctx context.Context, communityID string, userID string, role string, status string) error {
	query := `
		INSERT INTO community_members (community_id, user_id, role, status)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (community_id, user_id) DO UPDATE SET status = $4, role = $3
	`
	log.Printf("[DEBUG] AddMember: Attempting to add/update member. CommunityID: %s, UserID: %s, Role: %s, Status: %s", communityID, userID, role, status)
	_, err := r.db.Exec(ctx, query, communityID, userID, role, status)
	if err != nil {
		log.Printf("[ERROR] AddMember: Failed to add/update member. CommunityID: %s, UserID: %s, Error: %v", communityID, userID, err)
	}
	cacheKey := fmt.Sprintf("community:%s", communityID)
	r.redis.Del(ctx, cacheKey)
	return err
}

func (r *communityRepository) LeaveCommunity(ctx context.Context, communityID string, userID string) error {
	query := `DELETE FROM community_members WHERE community_id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, communityID, userID)
	cacheKey := fmt.Sprintf("community:%s", communityID)
	r.redis.Del(ctx, cacheKey)
	return err
}

func (r *communityRepository) UpdateMemberRole(ctx context.Context, communityID string, userID string, role string) error {
	query := `UPDATE community_members SET role = $3 WHERE community_id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, communityID, userID, role)
	return err
}

func (r *communityRepository) RemoveMember(ctx context.Context, communityID string, userID string) error {
	return r.LeaveCommunity(ctx, communityID, userID)
}

func (r *communityRepository) GetCommunityMembers(ctx context.Context, communityID string) ([]*domain.CommunityMember, error) {
	query := `
		SELECT u.id, u.email, u.phone, u.name, u.profile_picture_url, u.bio, u.company, u.position, u.location, u.face_id_enrolled, u.face_id_consent_given, u.face_id_consent_time, u.face_samples_count, u.is_active, u.is_banned, u.is_verified, u.ban_reason, u.banned_until, u.profile_visibility, u.last_login_at, u.created_at, u.updated_at, u.deleted_at, cm.role, cm.status, cm.joined_at
		FROM users u
		JOIN community_members cm ON u.id = cm.user_id
		WHERE cm.community_id = $1 AND cm.status = 'active'
		ORDER BY cm.joined_at ASC
	`
	rows, err := r.db.Query(ctx, query, communityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*domain.CommunityMember
	for rows.Next() {
		member, err := r.scanUserAndMembership(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	return members, nil
}

func (r *communityRepository) CheckUserRole(ctx context.Context, communityID, userID string) (string, error) {
	var role string
	query := `SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2 AND status = 'active'`
	log.Printf("[DEBUG] CheckUserRole: Checking role for communityID=%s, userID=%s with query: %s", communityID, userID, query)
	err := r.db.QueryRow(ctx, query, communityID, userID).Scan(&role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			log.Printf("[DEBUG] CheckUserRole: No active member entry found for communityID=%s, userID=%s", communityID, userID)
			return "", domain.ErrNotMember
		}
		log.Printf("[ERROR] CheckUserRole: Database error for communityID=%s, userID=%s: %v", communityID, userID, err)
		return "", err
	}
	log.Printf("[DEBUG] CheckUserRole: Found role '%s' for communityID=%s, userID=%s", role, communityID, userID)
	return role, nil
}

func (r *communityRepository) CreatePost(ctx context.Context, post *domain.Post) (*domain.Post, error) {
	attachmentsJSON, err := json.Marshal(post.FileAttachments)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal attachments: %w", err)
	}

	query := `
		INSERT INTO posts (id, author_id, community_id, event_id, title, content, content_html, file_attachments, visibility, status, post_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING created_at, updated_at
	`

	var communityID sql.NullString
	if post.CommunityID.Valid {
		communityID = post.CommunityID
	}

	var eventID sql.NullString
	if post.EventID.Valid {
		eventID = post.EventID
	}

	err = r.db.QueryRow(ctx, query,
		post.ID, post.AuthorID, communityID, eventID, post.Title, post.Content, post.ContentHTML,
		attachmentsJSON, post.Visibility, post.Status, post.PostType,
	).Scan(&post.CreatedAt, &post.UpdatedAt)

	if err != nil {
		log.Printf("--- DEBUG: Error creating post in repository: %v ---", err)
		return nil, fmt.Errorf("failed to create post: %w", err)
	}

	return r.GetPostByID(ctx, post.ID, post.AuthorID)
}

func (r *communityRepository) GetPostByID(ctx context.Context, postID, userID string) (*domain.Post, error) {
	// 1. Try to get the post from cache first
	cacheKey := fmt.Sprintf("post:%s", postID)
	val, err := r.redis.Get(ctx, cacheKey).Result()
	var post *domain.Post

	if err == nil {
		// Cache hit
		if err := json.Unmarshal([]byte(val), &post); err == nil {
			// Still need to check if the current user has liked this post, as this is user-specific
			// This is a small, fast query
			var userHasLiked bool
			likeQuery := `SELECT EXISTS(SELECT 1 FROM reactions WHERE target_id = $1 AND target_type = 'post' AND user_id = $2)`
			if err := r.db.QueryRow(ctx, likeQuery, postID, userID).Scan(&userHasLiked); err == nil {
				post.UserHasLiked = userHasLiked
			}
			return post, nil
		}
	}

	// 2. Cache miss or error, get from database
	query := `
        SELECT 
            p.id, p.title, p.author_id, p.community_id, p.event_id, p.content, p.content_html,
            COALESCE(to_json(p.media_urls), '[]'::json) AS media_urls_json,
            p.file_attachments, p.hashtags, p.mentioned_user_ids, p.visibility, p.status, p.post_type, p.reviewed_by, 
            p.reviewed_at, p.rejection_reason, p.flagged_count, p.comment_count, p.reaction_count, 
            p.share_count, p.view_count, p.is_pinned, p.pinned_until, p.created_at, p.updated_at, 
            p.published_at, p.deleted_at,
            u.id as author_id_fk, u.name as author_name, u.profile_picture_url as author_avatar,
			(CASE WHEN react.id IS NOT NULL THEN TRUE ELSE FALSE END) as user_has_liked
        FROM posts p
        JOIN users u ON p.author_id = u.id
		LEFT JOIN reactions react ON react.target_id = p.id AND react.target_type = 'post' AND react.user_id = $2
        WHERE p.id = $1 AND p.deleted_at IS NULL
    `
	dbPost, err := r.scanPost(r.db.QueryRow(ctx, query, postID, userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrPostNotFound
		}
		return nil, err
	}

	if dbPost.PostType == "poll" {
		pollOptions, err := r.GetPollOptionsByPostID(ctx, dbPost.ID)
		if err != nil {
			return nil, err
		}
		dbPost.PollOptions = pollOptions
	}

	// 3. Populate cache
	// We cache the post without the user-specific 'user_has_liked' field
	postToCache := *dbPost
	postToCache.UserHasLiked = false // Ensure this is not cached
	marshaledPost, err := json.Marshal(postToCache)
	if err == nil {
		r.redis.Set(ctx, cacheKey, marshaledPost, 10*time.Minute)
	}

	return dbPost, nil
}

func (r *communityRepository) GetPostsByCommunityID(ctx context.Context, communityID, eventID, userID, status string, limit, offset int, authorID string) ([]*domain.Post, int, error) {
	selectQuery := `
        SELECT 
            p.id, p.title, p.author_id, p.community_id, p.event_id, p.content, p.content_html,
            COALESCE(to_json(p.media_urls), '[]'::json) AS media_urls_json,
            p.file_attachments, 
            COALESCE(to_json(p.hashtags), '[]'::json) AS hashtags_json,
            COALESCE(to_json(p.mentioned_user_ids), '[]'::json) AS mentioned_json,
            p.visibility, p.status, p.post_type, p.reviewed_by, 
            p.reviewed_at, p.rejection_reason, p.flagged_count, p.comment_count, p.reaction_count, 
            p.share_count, p.view_count, p.is_pinned, p.pinned_until, p.created_at, p.updated_at, 
            p.published_at, p.deleted_at,
            u.id as author_id_fk, u.name as author_name, u.profile_picture_url as author_avatar,
            EXISTS(SELECT 1 FROM reactions WHERE target_id = p.id AND target_type = 'post' AND user_id = $1) as user_has_liked,
            COUNT(*) OVER() as total_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.community_id = $2 AND p.deleted_at IS NULL`

	args := []interface{}{userID, communityID}
	argCount := 3 // Next placeholder is $3

	if status != "" {
		selectQuery += fmt.Sprintf(" AND p.status = $%d", argCount)
		args = append(args, status)
		argCount++
	}

	if eventID != "" {
		selectQuery += fmt.Sprintf(" AND p.event_id = $%d", argCount)
		args = append(args, eventID)
		argCount++
	}

	if authorID != "" {
		selectQuery += fmt.Sprintf(" AND p.author_id = $%d", argCount)
		args = append(args, authorID)
		argCount++
	}

	selectQuery += fmt.Sprintf(" ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT $%d OFFSET $%d", argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, selectQuery, args...)
	if err != nil {
		log.Printf("[ERROR] GetPostsByCommunityID: failed to query posts: %v", err)
		return nil, 0, err
	}
	defer rows.Close()

	var posts []*domain.Post
	var total int
	for rows.Next() {
		var post domain.Post
		var mediaURLsJSON []byte
		var fileAttachmentsJSON []byte
		var hashtagsJSON []byte
		var mentionedJSON []byte
		var userHasLiked bool

		if err := rows.Scan(
			&post.ID, &post.Title, &post.AuthorID, &post.CommunityID, &post.EventID, &post.Content, &post.ContentHTML, &mediaURLsJSON,
			&fileAttachmentsJSON, &hashtagsJSON, &mentionedJSON, &post.Visibility, &post.Status, &post.PostType, &post.ReviewedBy,
			&post.ReviewedAt, &post.RejectionReason, &post.FlaggedCount, &post.CommentCount, &post.ReactionCount,
			&post.ShareCount, &post.ViewCount, &post.IsPinned, &post.PinnedUntil, &post.CreatedAt, &post.UpdatedAt,
			&post.PublishedAt, &post.DeletedAt,
			&post.Author.ID, &post.Author.Name, &post.Author.ProfilePictureURL,
			&userHasLiked,
			&total,
		); err != nil {
			return nil, 0, err
		}

		post.UserHasLiked = userHasLiked

		if len(mediaURLsJSON) > 0 && string(mediaURLsJSON) != "null" {
			if err := json.Unmarshal(mediaURLsJSON, &post.MediaURLs); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal media_urls: %w", err)
			}
		}

		if len(hashtagsJSON) > 0 {
			if err := json.Unmarshal(hashtagsJSON, &post.Hashtags); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal hashtags: %w", err)
			}
		}
		if len(mentionedJSON) > 0 {
			if err := json.Unmarshal(mentionedJSON, &post.MentionedUserIDs); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal mentioned_user_ids: %w", err)
			}
		}

		if len(fileAttachmentsJSON) > 0 && string(fileAttachmentsJSON) != "null" {
			if err := json.Unmarshal(fileAttachmentsJSON, &post.FileAttachments); err != nil {
				log.Printf("[ERROR] scanPost: failed to unmarshal file_attachments: %v", err)
				return nil, 0, fmt.Errorf("failed to unmarshal file_attachments: %w", err)
			}
		}
		posts = append(posts, &post)
	}

	// Fetch poll options if post is a poll
	for _, post := range posts {
		if post.PostType == "poll" {
			pollOptions, err := r.GetPollOptionsByPostID(ctx, post.ID)
			if err != nil {
				log.Printf("[ERROR] GetPostsByCommunityID: failed to get poll options for post %s: %v", post.ID, err)
				// Continue without poll options if there's an error
			}
			post.PollOptions = pollOptions
		}
	}

	return posts, total, nil
}

func (r *communityRepository) UpdatePostStatus(ctx context.Context, postID string, status string) error {
	query := `UPDATE posts SET status = $2::content_status, updated_at = NOW() WHERE id = $1`
	log.Printf("[DEBUG] Repo UpdatePostStatus for post %s to status %s", postID, status)
	_, err := r.db.Exec(ctx, query, postID, status)
	if err != nil {
		log.Printf("[ERROR] Repo UpdatePostStatus failed for post %s: %v", postID, err)
		return err
	}

	// Invalidate the cache for the post
	cacheKey := fmt.Sprintf("post:%s", postID)
	r.redis.Del(ctx, cacheKey)

	return nil
}

func (r *communityRepository) CreateComment(ctx context.Context, comment *domain.Comment) (*domain.Comment, error) {
	query := `
		INSERT INTO comments (id, post_id, author_id, parent_comment_id, content, content_html, media_urls, mentioned_user_ids, status, thread_depth, thread_path)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.db.Exec(ctx, query,
		comment.ID, comment.PostID, comment.AuthorID, comment.ParentCommentID, comment.Content, comment.ContentHTML,
		comment.MediaURLs, comment.MentionedUserIDs, comment.Status, comment.ThreadDepth, comment.ThreadPath,
	)

	if err != nil {
		return nil, err
	}

	// Invalidate the cache for the post's comments
	cacheKey := fmt.Sprintf("comments:%s", comment.PostID)
	r.redis.Del(ctx, cacheKey)

	return r.GetCommentByID(ctx, comment.ID)
}

func (r *communityRepository) GetCommentsByPostID(ctx context.Context, postID string) ([]*domain.Comment, error) {
	// 1. Try to get the comments from cache first
	cacheKey := fmt.Sprintf("comments:%s", postID)
	val, err := r.redis.Get(ctx, cacheKey).Result()
	var comments []*domain.Comment

	if err == nil {
		// Cache hit
		if err := json.Unmarshal([]byte(val), &comments); err == nil {
			return comments, nil
		}
	}

	// 2. Cache miss or error, get from database
	query := `
        SELECT 
            c.id, c.post_id, c.author_id, c.parent_comment_id, c.content, c.content_html, c.media_urls, 
            c.mentioned_user_ids, c.status, c.reviewed_by, c.reviewed_at, c.flagged_count, c.thread_depth, 
            c.thread_path, c.reaction_count, c.reply_count, c.created_at, c.updated_at, c.deleted_at,
            u.id as author_id_fk, u.name as author_name, u.profile_picture_url as author_avatar
        FROM comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.post_id = $1 AND c.deleted_at IS NULL
        		ORDER BY c.created_at DESC    `
	rows, err := r.db.Query(ctx, query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		comment, err := r.scanComment(rows)
		if err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}

	// 3. Populate cache
	marshaledComments, err := json.Marshal(comments)
	if err == nil {
		r.redis.Set(ctx, cacheKey, marshaledComments, 5*time.Minute) // Cache for 5 minutes
	}

	return comments, nil
}

func (r *communityRepository) GetCommentByID(ctx context.Context, commentID string) (*domain.Comment, error) {
	query := `
        SELECT 
            c.id, c.post_id, c.author_id, c.parent_comment_id, c.content, c.content_html, c.media_urls, 
            c.mentioned_user_ids, c.status, c.reviewed_by, c.reviewed_at, c.flagged_count, c.thread_depth, 
            c.thread_path, c.reaction_count, c.reply_count, c.created_at, c.updated_at, c.deleted_at,
            u.id as author_id_fk, u.name as author_name, u.profile_picture_url as author_avatar
        FROM comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.id = $1 AND c.deleted_at IS NULL
    `
	comment, err := r.scanComment(r.db.QueryRow(ctx, query, commentID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrCommentNotFound
		}
		return nil, err
	}
	return comment, nil
}

func (r *communityRepository) UpdateCommentStatus(ctx context.Context, commentID string, status string) error {
	query := `UPDATE comments SET status = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, commentID, status)
	return err
}

func (r *communityRepository) GetEventsByCommunityID(ctx context.Context, communityID string, userID string, statusFilter string, page, limit int) ([]*event_domain.EventItem, error) {
	// Diagnostic comment to force rebuild
	// When called from community module, we can pass a status filter, defaulting to "all" if not provided.
	if statusFilter == "" {
		statusFilter = "all"
	}
	return r.eventRepo.ListEventItemsByCommunity(ctx, communityID, userID, statusFilter, page, limit)
}

func (r *communityRepository) ListPopularCommunities(ctx context.Context, limit int) ([]*domain.Community, error) {
	communities, _, err := r.ListCommunities(ctx, "", limit, 0)
	if err != nil {
		return nil, err
	}
	return communities, nil
}

func (r *communityRepository) UpdatePostPinStatus(ctx context.Context, postID string, isPinned bool) error {
	query := `UPDATE posts SET is_pinned = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, postID, isPinned)
	return err
}

func (r *communityRepository) CreateReaction(ctx context.Context, reaction *domain.Reaction) error {
	query := `
        INSERT INTO reactions (id, user_id, target_type, target_id, reaction_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET reaction_type = $5, created_at = NOW()
    `
	_, err := r.db.Exec(ctx, query, reaction.ID, reaction.UserID, reaction.TargetType, reaction.TargetID, reaction.ReactionType)
	if err != nil {
		return err
	}
	return r.IncrementReactionCount(ctx, reaction.TargetType, reaction.TargetID)
}

func (r *communityRepository) DeleteReaction(ctx context.Context, userID, targetType, targetID string) error {
	query := `DELETE FROM reactions WHERE user_id = $1 AND target_type = $2 AND target_id = $3`
	commandTag, err := r.db.Exec(ctx, query, userID, targetType, targetID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return nil
	}

	// Invalidate the cache for the target
	switch targetType {
	case "post":
		cacheKey := fmt.Sprintf("post:%s", targetID)
		r.redis.Del(ctx, cacheKey)
	case "comment":
		var postID string
		// Get the postID from the comment
		getPostIDQuery := `SELECT post_id FROM comments WHERE id = $1`
		if err := r.db.QueryRow(ctx, getPostIDQuery, targetID).Scan(&postID); err == nil {
			cacheKey := fmt.Sprintf("comments:%s", postID)
			r.redis.Del(ctx, cacheKey)
		}
	}

	return r.DecrementReactionCount(ctx, targetType, targetID)
}

func (r *communityRepository) IncrementReactionCount(ctx context.Context, targetType, targetID string) error {
	var query string
	switch targetType {
	case "post":
		query = `UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = $1`
	case "comment":
		query = `UPDATE comments SET reaction_count = reaction_count + 1 WHERE id = $1`
	default:
		return fmt.Errorf("invalid target type for reaction count: %s", targetType)
	}
	_, err := r.db.Exec(ctx, query, targetID)
	return err
}

func (r *communityRepository) DecrementReactionCount(ctx context.Context, targetType, targetID string) error {
	var query string
	switch targetType {
	case "post":
		query = `UPDATE posts SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = $1`
	case "comment":
		query = `UPDATE comments SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = $1`
	default:
		return fmt.Errorf("invalid target type for reaction count: %s", targetType)
	}
	_, err := r.db.Exec(ctx, query, targetID)
	return err
}

func (r *communityRepository) GetReactionsByTarget(ctx context.Context, targetType, targetID string) ([]*domain.Reaction, error) {
	query := `SELECT id, user_id, target_type, target_id, reaction_type, created_at FROM reactions WHERE target_type = $1 AND target_id = $2 ORDER BY created_at DESC`
	rows, err := r.db.Query(ctx, query, targetType, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reactions []*domain.Reaction
	for rows.Next() {
		var reaction domain.Reaction
		if err := rows.Scan(&reaction.ID, &reaction.UserID, &reaction.TargetType, &reaction.TargetID, &reaction.ReactionType, &reaction.CreatedAt); err != nil {
			return nil, err
		}
		reactions = append(reactions, &reaction)
	}
	return reactions, nil
}

func (r *communityRepository) CreateContentReport(ctx context.Context, report *domain.ContentReport) error {
	query := `
        INSERT INTO content_reports (id, reporter_id, content_type, content_id, reason, description)
        VALUES ($1, $2, $3, $4, $5, $6)
    `
	_, err := r.db.Exec(ctx, query, report.ID, report.ReporterID, report.ContentType, report.ContentID, report.Reason, report.Description)
	return err
}

func (r *communityRepository) BulkDeleteCommunities(ctx context.Context, userID string, communityIDs []string) error {
	query := `
		DELETE FROM communities
		WHERE id = ANY($1) AND owner_id = $2
	`
	_, err := r.db.Exec(ctx, query, communityIDs, userID)
	return err
}

func (r *communityRepository) DeleteCommunity(ctx context.Context, communityID string) error {
	query := `UPDATE communities SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	ct, err := r.db.Exec(ctx, query, communityID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.ErrCommunityNotFound // Or a more specific error if the community was already deleted
	}
	cacheKey := fmt.Sprintf("community:%s", communityID)
	r.redis.Del(ctx, cacheKey)
	return nil
}

func (r *communityRepository) GetPendingMembers(ctx context.Context, communityID string) ([]*domain.CommunityMember, error) {
	query := `
		SELECT u.id, u.email, u.phone, u.name, u.profile_picture_url, u.bio, u.company, u.position, u.location, u.face_id_enrolled, u.face_id_consent_given, u.face_id_consent_time, u.face_samples_count, u.is_active, u.is_banned, u.is_verified, u.ban_reason, u.banned_until, u.profile_visibility, u.last_login_at, u.created_at, u.updated_at, u.deleted_at, cm.role, cm.status, cm.joined_at
		FROM users u
		JOIN community_members cm ON u.id = cm.user_id
		WHERE cm.community_id = $1 AND cm.status = 'pending'
		ORDER BY cm.joined_at ASC
	`
	rows, err := r.db.Query(ctx, query, communityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*domain.CommunityMember
	for rows.Next() {
		member, err := r.scanUserAndMembership(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	return members, nil
}

func (r *communityRepository) GetCommunityMemberPreviews(ctx context.Context, communityID string, limit int) ([]*domain.CommunityMember, error) {
	query := `
		SELECT u.id, u.email, u.phone, u.name, u.profile_picture_url, u.bio, u.company, u.position, u.location, u.face_id_enrolled, u.face_id_consent_given, u.face_id_consent_time, u.face_samples_count, u.is_active, u.is_banned, u.is_verified, u.ban_reason, u.banned_until, u.profile_visibility, u.last_login_at, u.created_at, u.updated_at, u.deleted_at, cm.role, cm.status, cm.joined_at
		FROM users u
		JOIN community_members cm ON u.id = cm.user_id
		WHERE cm.community_id = $1 AND cm.status = 'active'
		ORDER BY cm.joined_at ASC
		LIMIT $2
	`
	rows, err := r.db.Query(ctx, query, communityID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*domain.CommunityMember
	for rows.Next() {
		member, err := r.scanUserAndMembership(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	return members, nil
}

func (r *communityRepository) UpdateMemberStatus(ctx context.Context, communityID, targetUserID, status string) error {
	query := `UPDATE community_members SET status = $3 WHERE community_id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, communityID, targetUserID, status)
	return err
}

func (r *communityRepository) GetPostsForFeed(ctx context.Context, communityIDs []string, userID string, limit int, includeGeneral bool) ([]*domain.Post, int, error) {
	visibilityClauses := make([]string, 0, 2)
	args := []interface{}{userID}
	nextArg := 2

	if len(communityIDs) > 0 {
		visibilityClauses = append(visibilityClauses, fmt.Sprintf("p.community_id = ANY($%d)", nextArg))
		args = append(args, communityIDs)
		nextArg++
	}

	if includeGeneral {
		visibilityClauses = append(visibilityClauses, "p.post_type = 'general'")
	}

	if len(visibilityClauses) == 0 {
		return []*domain.Post{}, 0, nil
	}

	query := fmt.Sprintf(`
        SELECT p.id, p.title, p.author_id, p.community_id, p.event_id, p.content, p.content_html, p.media_urls,
            p.file_attachments,
            COALESCE(to_json(p.hashtags), '[]'::json) AS hashtags_json,
            COALESCE(to_json(p.mentioned_user_ids), '[]'::json) AS mentioned_json,
			p.visibility, p.status, p.post_type, p.reviewed_by,
			p.reviewed_at, p.rejection_reason, p.flagged_count, p.comment_count, p.reaction_count,
			p.share_count, p.view_count, p.is_pinned, p.pinned_until, p.created_at, p.updated_at,
			p.published_at, p.deleted_at, u.id, u.name, u.profile_picture_url, EXISTS(
				SELECT 1 FROM reactions WHERE target_id = p.id AND target_type = 'post' AND user_id = $1
			) as user_has_liked
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE (%s)
			AND p.status = 'approved' AND p.deleted_at IS NULL
		ORDER BY p.created_at DESC
		LIMIT $%d
	`, strings.Join(visibilityClauses, " OR "), nextArg)

	args = append(args, limit)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query posts for feed: %w", err)
	}
	defer rows.Close()

	var posts []*domain.Post
	for rows.Next() {
		post, err := r.scanPost(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan post for feed: %w", err)
		}
		posts = append(posts, post)
	}

	// Fetch poll options if post is a poll
	for _, post := range posts {
		if post.PostType == "poll" {
			pollOptions, err := r.GetPollOptionsByPostID(ctx, post.ID)
			if err != nil {
				log.Printf("[ERROR] GetPostsForFeed: failed to get poll options for post %s: %v", post.ID, err)
				// Continue without poll options if there's an error
			}
			post.PollOptions = pollOptions
		}
	}

	// For simplicity, we are not calculating the total number of posts for the feed.
	return posts, len(posts), nil
}

func (r *communityRepository) UpdatePost(ctx context.Context, post *domain.Post) (*domain.Post, error) {
	var setClauses []string
	args := []interface{}{post.ID, post.AuthorID}
	argCount := 3

	if post.Title.Valid {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argCount))
		args = append(args, post.Title)
		argCount++
	}

	if post.Content != "" {
		setClauses = append(setClauses, fmt.Sprintf("content = $%d", argCount))
		args = append(args, post.Content)
		argCount++
	}

	if post.Visibility != "" {
		setClauses = append(setClauses, fmt.Sprintf("visibility = $%d", argCount))
		args = append(args, post.Visibility)
		argCount++
	}

	if len(setClauses) == 0 {
		return r.GetPostByID(ctx, post.ID, post.AuthorID)
	}

	query := fmt.Sprintf(`
		UPDATE posts
		SET %s, updated_at = NOW()
		WHERE id = $1 AND author_id = $2
	`, strings.Join(setClauses, ", "))

	_, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	// Get the updated post to update the cache
	updatedPost, err := r.GetPostByID(ctx, post.ID, post.AuthorID)
	if err != nil {
		// If getting the post fails, it's better to invalidate the cache
		cacheKey := fmt.Sprintf("post:%s", post.ID)
		r.redis.Del(ctx, cacheKey)
		return nil, err
	}

	// Update the cache
	postToCache := *updatedPost
	postToCache.UserHasLiked = false // Ensure this is not cached
	marshaledPost, err := json.Marshal(postToCache)
	if err == nil {
		cacheKey := fmt.Sprintf("post:%s", post.ID)
		r.redis.Set(ctx, cacheKey, marshaledPost, 10*time.Minute)
	}

	return updatedPost, nil
}

func (r *communityRepository) DeletePost(ctx context.Context, postID string, userID string) error {
	query := `UPDATE posts SET deleted_at = NOW() WHERE id = $1`
	ct, err := r.db.Exec(ctx, query, postID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.ErrPostNotFound
	}
	return nil
}

func (r *communityRepository) UpdateComment(ctx context.Context, comment *domain.Comment) (*domain.Comment, error) {
	// First, get the post ID from the comment
	var postID string
	err := r.db.QueryRow(ctx, "SELECT post_id FROM comments WHERE id = $1", comment.ID).Scan(&postID)
	if err != nil {
		return nil, err
	}

	query := `
		UPDATE comments
		SET content = $1, updated_at = NOW()
		WHERE id = $2 AND author_id = $3
	`
	_, err = r.db.Exec(ctx, query, comment.Content, comment.ID, comment.AuthorID)
	if err != nil {
		return nil, err
	}

	// Invalidate the cache for the post's comments
	cacheKey := fmt.Sprintf("comments:%s", postID)
	r.redis.Del(ctx, cacheKey)

	return r.GetCommentByID(ctx, comment.ID)
}

func (r *communityRepository) DeleteComment(ctx context.Context, commentID string, userID string) error {
	// First, get the post ID from the comment
	var postID string
	err := r.db.QueryRow(ctx, "SELECT post_id FROM comments WHERE id = $1", commentID).Scan(&postID)
	if err != nil {
		return err
	}

	query := `UPDATE comments SET deleted_at = NOW() WHERE id = $1 AND author_id = $2`
	ct, err := r.db.Exec(ctx, query, commentID, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.ErrPermissionDenied
	}

	// Invalidate the cache for the post's comments
	cacheKey := fmt.Sprintf("comments:%s", postID)
	r.redis.Del(ctx, cacheKey)

	return nil
}

func (r *communityRepository) GetUserByEmail(ctx context.Context, email string) (*user_domain.User, error) {
	var user user_domain.User
	query := `SELECT id, name, email, profile_picture_url FROM users WHERE email = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, email).Scan(&user.ID, &user.Name, &user.Email, &user.ProfilePictureURL)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, sql.ErrNoRows // Return standard sql.ErrNoRows if user not found
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return &user, nil
}

func (r *communityRepository) CreateCommunityInvite(ctx context.Context, invite *domain.CommunityInvite) error {
	query := `
		INSERT INTO community_invites (id, community_id, inviter_id, invitee_email, token, status, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(ctx, query,
		invite.ID, invite.CommunityID, invite.InviterID, invite.InviteeEmail, invite.Token, invite.Status, invite.ExpiresAt,
	)
	if err != nil {
		// Check for unique constraint violation
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint \"community_invites_community_id_invitee_email_key\"") {
			return domain.ErrUserAlreadyInvited
		}
		return fmt.Errorf("failed to create community invite: %w", err)
	}
	return nil
}

func (r *communityRepository) GetCommunityInviteByToken(ctx context.Context, token string) (*domain.CommunityInvite, error) {
	var invite domain.CommunityInvite
	query := `SELECT id, community_id, inviter_id, invitee_email, token, status, expires_at, created_at, updated_at FROM community_invites WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`
	err := r.db.QueryRow(ctx, query, token).Scan(
		&invite.ID, &invite.CommunityID, &invite.InviterID, &invite.InviteeEmail, &invite.Token, &invite.Status, &invite.ExpiresAt, &invite.CreatedAt, &invite.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrCommunityNotFound // Or a more specific ErrInviteNotFound
		}
		return nil, fmt.Errorf("failed to get community invite by token: %w", err)
	}
	return &invite, nil
}

func (r *communityRepository) GetCommunityInviteByEmail(ctx context.Context, communityID, inviteeEmail string) (*domain.CommunityInvite, error) {
	var invite domain.CommunityInvite
	query := `SELECT id, community_id, inviter_id, invitee_email, token, status, expires_at, created_at, updated_at FROM community_invites WHERE community_id = $1 AND invitee_email = $2 AND status = 'pending' AND expires_at > NOW()`
	err := r.db.QueryRow(ctx, query, communityID, inviteeEmail).Scan(
		&invite.ID, &invite.CommunityID, &invite.InviterID, &invite.InviteeEmail, &invite.Token, &invite.Status, &invite.ExpiresAt, &invite.CreatedAt, &invite.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, sql.ErrNoRows // Indicate no active invite found
		}
		return nil, fmt.Errorf("failed to get community invite by email: %w", err)
	}
	return &invite, nil
}

func (r *communityRepository) UpdateCommunityInviteStatus(ctx context.Context, inviteID, status string) error {
	query := `UPDATE community_invites SET status = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, inviteID, status)
	if err != nil {
		return fmt.Errorf("failed to update community invite status: %w", err)
	}
	return nil
}

func (r *communityRepository) GetUserByID(ctx context.Context, userID string) (*user_domain.User, error) {
	var user user_domain.User
	query := `SELECT id, name, email, profile_picture_url FROM users WHERE id = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(ctx, query, userID).Scan(&user.ID, &user.Name, &user.Email, &user.ProfilePictureURL)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, sql.ErrNoRows // Return standard sql.ErrNoRows if user not found
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}
	return &user, nil
}

func (r *communityRepository) CreatePollOptions(ctx context.Context, options []domain.PollOption) error {
	query := `INSERT INTO poll_options (id, post_id, option_text) VALUES ($1, $2, $3)`
	batch := &pgx.Batch{}
	for _, option := range options {
		batch.Queue(query, option.ID, option.PostID, option.OptionText)
	}
	br := r.db.SendBatch(ctx, batch)
	defer br.Close()
	_, err := br.Exec()
	return err
}

func (r *communityRepository) GetPollOptionsByPostID(ctx context.Context, postID string) ([]domain.PollOption, error) {
	query := `SELECT id, post_id, option_text, vote_count, created_at, updated_at FROM poll_options WHERE post_id = $1 ORDER BY created_at ASC`
	rows, err := r.db.Query(ctx, query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var options []domain.PollOption
	for rows.Next() {
		var option domain.PollOption
		if err := rows.Scan(&option.ID, &option.PostID, &option.OptionText, &option.VoteCount, &option.CreatedAt, &option.UpdatedAt); err != nil {
			return nil, err
		}
		options = append(options, option)
	}
	return options, nil
}

func (r *communityRepository) CreatePollVote(ctx context.Context, vote *domain.PollVote) error {
	query := `INSERT INTO poll_votes (post_id, user_id, option_id) VALUES ($1, $2, $3)`
	_, err := r.db.Exec(ctx, query, vote.PostID, vote.UserID, vote.OptionID)
	if err != nil {
		// Check for unique constraint violation (user already voted on this poll)
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint \"poll_votes_pkey\"") {
			return errors.New("user has already voted on this poll")
		}
		return fmt.Errorf("failed to create poll vote: %w", err)
	}
	return nil
}

func (r *communityRepository) GetPollVote(ctx context.Context, postID, userID string) (*domain.PollVote, error) {
	query := `SELECT post_id, user_id, option_id, created_at FROM poll_votes WHERE post_id = $1 AND user_id = $2`
	var vote domain.PollVote
	err := r.db.QueryRow(ctx, query, postID, userID).Scan(&vote.PostID, &vote.UserID, &vote.OptionID, &vote.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // No vote found is not an error
		}
		return nil, err
	}
	return &vote, nil
}

func (r *communityRepository) IncrementPollVoteCount(ctx context.Context, optionID string) error {
	query := `UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, optionID)
	return err
}
