package domain

import "time"

// CommunityEngagementReport aggregates various metrics for a community.
type CommunityEngagementReport struct {
	CommunityID      string               `json:"community_id"`
	GeneratedAt      time.Time            `json:"generated_at"`
	MostActiveUsers  []*ActiveUser        `json:"most_active_users"`
	PopularPosts     []*PopularPost       `json:"popular_posts"`
	ActivityOverTime []*ActivityDataPoint `json:"activity_over_time"`
}

// ActiveUser represents a user with high engagement.
type ActiveUser struct {
	UserID        string `json:"user_id"`
	UserName      string `json:"user_name"`
	PostCount     int    `json:"post_count"`
	CommentCount  int    `json:"comment_count"`
	TotalActivity int    `json:"total_activity"`
}

// PopularPost represents a post with high engagement.
type PopularPost struct {
	PostID         string    `json:"post_id"`
	ContentPreview string    `json:"content_preview"`
	AuthorID       string    `json:"author_id"`
	AuthorName     string    `json:"author_name"`
	ReactionCount  int       `json:"reaction_count"`
	CommentCount   int       `json:"comment_count"`
	TotalEngagement int      `json:"total_engagement"`
	CreatedAt      time.Time `json:"created_at"`
}

// ActivityDataPoint represents engagement activity over a time period.
type ActivityDataPoint struct {
	Date         time.Time `json:"date"`
	PostCount    int       `json:"post_count"`
	CommentCount int       `json:"comment_count"`
}