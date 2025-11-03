package postgres

import (
	"context"

	"github.com/attendwise/backend/internal/module/community/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type activityRepository struct {
	db *pgxpool.Pool
}

func NewActivityRepository(db *pgxpool.Pool) domain.ActivityRepository {
	return &activityRepository{db: db}
}

func (r *activityRepository) CreateActivity(ctx context.Context, activity *domain.Activity) error {
	query := `
		INSERT INTO activity_feed (id, user_id, actor_id, action_type, target_type, target_id, community_id, event_id, preview_text, preview_image_url, is_read, is_visible)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.db.Exec(ctx, query,
		activity.ID, activity.UserID, activity.ActorID, activity.ActionType, activity.TargetType, activity.TargetID, activity.CommunityID, activity.EventID, activity.PreviewText, activity.PreviewImageURL, activity.IsRead, activity.IsVisible,
	)
	return err
}

func (r *activityRepository) GetActivityFeed(ctx context.Context, userID string, limit, offset int) ([]*domain.Activity, int, error) {
	query := `
		SELECT
			id, user_id, actor_id, action_type, target_type, target_id, community_id, event_id, preview_text, preview_image_url, is_read, is_visible, created_at,
			COUNT(*) OVER() as total_count
		FROM activity_feed
		WHERE user_id = $1 AND is_visible = TRUE
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var activities []*domain.Activity
	var total int
	for rows.Next() {
		var activity domain.Activity
		if err := rows.Scan(
			&activity.ID, &activity.UserID, &activity.ActorID, &activity.ActionType, &activity.TargetType, &activity.TargetID, &activity.CommunityID, &activity.EventID, &activity.PreviewText, &activity.PreviewImageURL, &activity.IsRead, &activity.IsVisible, &activity.CreatedAt,
			&total,
		); err != nil {
			return nil, 0, err
		}
		activities = append(activities, &activity)
	}
	return activities, total, nil
}
