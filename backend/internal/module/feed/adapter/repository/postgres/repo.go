package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	community_domain "github.com/attendwise/backend/internal/module/community/domain"
	feed_domain "github.com/attendwise/backend/internal/module/feed/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type repository struct {
	db *pgxpool.Pool
}

// NewRepository provides a Postgres-backed feed repository.
func NewRepository(db *pgxpool.Pool) feed_domain.Repository {
	return &repository{db: db}
}

func (r *repository) ListGlobalPosts(ctx context.Context, userID string, limit, offset int, authorID string) ([]*community_domain.Post, int, error) {
	query := `
		SELECT p.id, p.title, p.author_id, p.community_id, p.event_id, p.content, p.content_html,
		       COALESCE(to_json(p.media_urls), '[]'::json) AS media_urls_json,
		       p.file_attachments,
		       COALESCE(to_json(p.hashtags), '[]'::json) AS hashtags_json,
		       COALESCE(to_json(p.mentioned_user_ids), '[]'::json) AS mentioned_json,
		       p.visibility, p.status, p.post_type, p.reviewed_by,
		       p.reviewed_at, p.rejection_reason, p.flagged_count, p.comment_count, p.reaction_count,
		       p.share_count, p.view_count, p.is_pinned, p.pinned_until, p.created_at, p.updated_at,
		       p.published_at, p.deleted_at, u.id, u.name, u.profile_picture_url,
		       EXISTS(
		           SELECT 1 FROM reactions WHERE target_id = p.id AND target_type = 'post' AND user_id = $1
		       ) as user_has_liked
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.post_type = 'general'
		  AND p.status = 'approved'
		  AND p.deleted_at IS NULL
	`

	args := []interface{}{userID}
	nextArg := 2

	if authorID != "" {
		query += fmt.Sprintf(" AND p.author_id = $%d", nextArg)
		args = append(args, authorID)
		nextArg++
	}

	query += fmt.Sprintf(" ORDER BY p.created_at DESC LIMIT $%d OFFSET $%d", nextArg, nextArg+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query global posts: %w", err)
	}
	defer rows.Close()

	var posts []*community_domain.Post
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan global post: %w", err)
		}
		posts = append(posts, post)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate global posts: %w", err)
	}

	countQuery := `
		SELECT COUNT(*)
		FROM posts p
		WHERE p.post_type = 'general'
			AND p.status = 'approved'
			AND p.deleted_at IS NULL
	`

	countArgs := make([]interface{}, 0, 1)
	if authorID != "" {
		countQuery += " AND p.author_id = $1"
		countArgs = append(countArgs, authorID)
	}

	var total int
	if err := r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count global posts: %w", err)
	}

	return posts, total, nil
}

func scanPost(row pgx.Row) (*community_domain.Post, error) {
	var post community_domain.Post
	var mediaURLsJSON []byte
	var fileAttachmentsJSON []byte
	var hashtagsJSON []byte
	var mentionedJSON []byte

	if err := row.Scan(
		&post.ID, &post.Title, &post.AuthorID, &post.CommunityID, &post.EventID, &post.Content, &post.ContentHTML,
		&mediaURLsJSON,
		&fileAttachmentsJSON, &hashtagsJSON, &mentionedJSON, &post.Visibility, &post.Status, &post.PostType, &post.ReviewedBy,
		&post.ReviewedAt, &post.RejectionReason, &post.FlaggedCount, &post.CommentCount, &post.ReactionCount,
		&post.ShareCount, &post.ViewCount, &post.IsPinned, &post.PinnedUntil, &post.CreatedAt, &post.UpdatedAt,
		&post.PublishedAt, &post.DeletedAt,
		&post.Author.ID, &post.Author.Name, &post.Author.ProfilePictureURL,
		&post.UserHasLiked,
	); err != nil {
		return nil, err
	}

	if len(mediaURLsJSON) > 0 && string(mediaURLsJSON) != "null" {
		if err := json.Unmarshal(mediaURLsJSON, &post.MediaURLs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal media_urls: %w", err)
		}
	}

	if len(fileAttachmentsJSON) > 0 && string(fileAttachmentsJSON) != "null" {
		if err := json.Unmarshal(fileAttachmentsJSON, &post.FileAttachments); err != nil {
			return nil, fmt.Errorf("failed to unmarshal file_attachments: %w", err)
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

	return &post, nil
}
