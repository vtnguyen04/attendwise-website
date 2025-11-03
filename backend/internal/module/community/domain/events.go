package domain

import (
	"time"
)

const (
	PostCreatedEventSubject     = "community.post.created"
	CommentCreatedEventSubject  = "community.comment.created"
	ReactionCreatedEventSubject = "community.reaction.created"
)

type PostCreatedEvent struct {
	PostID        string    `json:"post_id"`
	CommunityID   string    `json:"community_id"`
	AuthorID      string    `json:"author_id"`
	AuthorName    string    `json:"author_name"`
	CommunityName string    `json:"community_name"`
	PostContent   string    `json:"post_content"`
	CreatedAt     time.Time `json:"created_at"`
}

type CommentCreatedEvent struct {
	CommentID      string    `json:"comment_id"`
	PostID         string    `json:"post_id"`
	CommunityID    string    `json:"community_id"`
	AuthorID       string    `json:"author_id"`
	AuthorName     string    `json:"author_name"`
	CommunityName  string    `json:"community_name"`
	CommentContent string    `json:"comment_content"`
	PostAuthorID   string    `json:"post_author_id"`
	CreatedAt      time.Time `json:"created_at"`
}

type ReactionCreatedEvent struct {
	ReactionID     string    `json:"reaction_id"`
	TargetType     string    `json:"target_type"` // "post" or "comment"
	TargetID       string    `json:"target_id"`
	ReactorID      string    `json:"reactor_id"`
	ReactorName    string    `json:"reactor_name"`
	ReactionType   string    `json:"reaction_type"`
	TargetAuthorID string    `json:"target_author_id"`
	CommunityID    string    `json:"community_id"`
	CreatedAt      time.Time `json:"created_at"`
}
