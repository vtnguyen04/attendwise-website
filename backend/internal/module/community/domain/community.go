package domain

import (
	"context"
	"database/sql"
	"errors"
	"time"

	event_domain "github.com/attendwise/backend/internal/module/event/domain"
	user_domain "github.com/attendwise/backend/internal/module/user/domain"
	"github.com/lib/pq"
)

var (
	ErrEmailMismatch         = errors.New("logged-in user email does not match invitee email")
	ErrUserNotFoundForInvite = errors.New("user with invitee email not found, please register or log in first")
)

// --- Errors ---
var (
	ErrCommunityNotFound         = errors.New("community not found")
	ErrPostNotFound              = errors.New("post not found")
	ErrCommentNotFound           = errors.New("comment not found")
	ErrNotMember                 = errors.New("user is not a member of this community")
	ErrPermissionDenied          = errors.New("permission denied")
	ErrCannotJoinSecretCommunity = errors.New("cannot join a secret community directly")
	ErrUserAlreadyMember         = errors.New("user is already a member of this community")
	ErrUserAlreadyInvited        = errors.New("user has already been invited to this community")
	ErrInviterPermissionDenied   = errors.New("inviter does not have permission to invite members")
	ErrInviteNotFound            = errors.New("invitation not found")
	ErrInviteExpired             = errors.New("invitation expired")
)

// --- Domain Models ---

// Author represents a simplified user object, used for embedding in other structs.
type Author struct {
	ID                string         `json:"id"`
	Name              string         `json:"name"`
	ProfilePictureURL sql.NullString `json:"profile_picture_url,omitempty"`
}

// Community represents a community, mapping to the 'communities' table.
type Community struct {
	ID                 string         `json:"id"`
	OwnerID            string         `json:"owner_id"`
	Name               string         `json:"name"`
	Slug               string         `json:"slug"`
	Description        sql.NullString `json:"description,omitempty"`
	CoverImageURL      sql.NullString `json:"cover_image_url,omitempty"`
	Type               string         `json:"type"` // 'public', 'private', 'secret'
	RequireApproval    bool           `json:"require_approval"`
	AllowMemberPosts   bool           `json:"allow_member_posts"`
	AutoApprovePosts   bool           `json:"auto_approve_posts"`
	AllowMemberInvites bool           `json:"allow_member_invites"`
	MemberCount        int            `json:"member_count"`
	PostCount          int            `json:"post_count"`
	EventCount         int            `json:"event_count"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          sql.NullTime   `json:"deleted_at,omitempty"`

	// Enriched data from joins
	AdminName      string              `json:"admin_name,omitempty"`
	AdminAvatarURL string              `json:"admin_avatar_url,omitempty"`
	Role           string              `json:"role,omitempty"`
	Status         string              `json:"status,omitempty"`
	CommonMembers  int64               `json:"common_members,omitempty"`
	MemberPreviews []*CommunityMember `json:"member_previews,omitempty"`
}

// CommunityMember represents a user's membership within a specific community,
// including their role and status in that community.
type CommunityMember struct {
	user_domain.User
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	JoinedAt  time.Time `json:"joined_at"`
}

// CommunityInvite represents an invitation to a community.
type CommunityInvite struct {
	ID           string    `json:"id"`
	CommunityID  string    `json:"community_id"`
	InviterID    string    `json:"inviter_id"`
	InviteeEmail string    `json:"invitee_email"`
	Token        string    `json:"token"`  // Unique token for the invitation link
	Status       string    `json:"status"` // e.g., "pending", "accepted", "declined", "expired"
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Attachment struct {
	Name string `json:"name"`
	Url  string `json:"url"`
	Type string `json:"type"`
}

// Post maps to the 'posts' table.
type Post struct {
	ID               string         `json:"id"`
	Title            sql.NullString `json:"title,omitempty"`
	AuthorID         string         `json:"author_id"`
	CommunityID      sql.NullString `json:"community_id,omitempty"`
	EventID          sql.NullString `json:"event_id,omitempty"`
	Content          string         `json:"content"`
	ContentHTML      sql.NullString `json:"content_html,omitempty"`
	MediaURLs        pq.StringArray `json:"media_urls,omitempty" gorm:"type:text[]"`
	FileAttachments  []Attachment   `json:"file_attachments,omitempty" gorm:"type:jsonb"`
	Hashtags         pq.StringArray `json:"hashtags,omitempty" gorm:"type:text[]"`
	MentionedUserIDs pq.StringArray `json:"mentioned_user_ids,omitempty" gorm:"type:text[]"`
	Visibility       string         `json:"visibility"`
	Status           string         `json:"status"`
	PostType         string         `json:"post_type"`
	ReviewedBy       sql.NullString `json:"reviewed_by,omitempty"`
	ReviewedAt       sql.NullTime   `json:"reviewed_at,omitempty"`
	RejectionReason  sql.NullString `json:"rejection_reason,omitempty"`
	FlaggedCount     int            `json:"flagged_count"`
	CommentCount     int            `json:"comment_count"`
	ReactionCount    int            `json:"reaction_count"`
	ShareCount       int            `json:"share_count"`
	ViewCount        int            `json:"view_count"`
	IsPinned         bool           `json:"is_pinned"`
	PinnedUntil      sql.NullTime   `json:"pinned_until,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	PublishedAt      sql.NullTime   `json:"published_at,omitempty"`
	DeletedAt        sql.NullTime   `json:"deleted_at,omitempty"`
	Author           Author         `json:"author" gorm:"-"`
	UserHasLiked     bool           `json:"user_has_liked,omitempty" gorm:"-"`
	CommunityRole    string         `json:"community_role,omitempty" gorm:"-"`
	PollOptions      []PollOption   `json:"poll_options,omitempty"`
}

// Comment maps to the 'comments' table.
type Comment struct {
	ID               string         `json:"id"`
	PostID           string         `json:"post_id"`
	AuthorID         string         `json:"author_id"`
	ParentCommentID  sql.NullString `json:"parent_comment_id,omitempty"`
	Content          string         `json:"content"`
	ContentHTML      sql.NullString `json:"content_html,omitempty"`
	MediaURLs        []string       `json:"media_urls,omitempty"`
	MentionedUserIDs []string       `json:"mentioned_user_ids,omitempty"`
	Status           string         `json:"status"`
	ReviewedBy       sql.NullString `json:"reviewed_by,omitempty"`
	ReviewedAt       sql.NullTime   `json:"reviewed_at,omitempty"`
	FlaggedCount     int            `json:"flagged_count"`
	ThreadDepth      int            `json:"thread_depth"`
	ThreadPath       sql.NullString `json:"thread_path,omitempty"`
	ReactionCount    int            `json:"reaction_count"`
	ReplyCount       int            `json:"reply_count"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        sql.NullTime   `json:"deleted_at,omitempty"`

	// Enriched data
	Author Author `json:"author"`
}

// Reaction maps to the 'reactions' table.
type Reaction struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	TargetType   string    `json:"target_type"` // 'post', 'comment'
	TargetID     string    `json:"target_id"`
	ReactionType string    `json:"reaction_type"` // 'like', 'love', etc.
	CreatedAt    time.Time `json:"created_at"`
}

// ContentReport maps to the 'content_reports' table.
type ContentReport struct {
	ID               string         `json:"id"`
	ReporterID       string         `json:"reporter_id"`
	ContentType      string         `json:"content_type"` // 'post', 'comment', 'user'
	ContentID        string         `json:"content_id"`
	Reason           string         `json:"reason"`
	Description      sql.NullString `json:"description,omitempty"`
	Status           string         `json:"status"` // 'pending', 'resolved', etc.
	ReviewedBy       sql.NullString `json:"reviewed_by,omitempty"`
	ReviewedAt       sql.NullTime   `json:"reviewed_at,omitempty"`
	ResolutionAction sql.NullString `json:"resolution_action,omitempty"`
	ResolutionNotes  sql.NullString `json:"resolution_notes,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
}

// PollOption represents an option in a poll.
type PollOption struct {
	ID         string    `json:"id"`
	PostID     string    `json:"post_id"`
	OptionText string    `json:"option_text"`
	VoteCount  int       `json:"vote_count"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// PollVote represents a user's vote on a poll.
type PollVote struct {
	PostID    string    `json:"post_id"`
	UserID    string    `json:"user_id"`
	OptionID  string    `json:"option_id"`
	CreatedAt time.Time `json:"created_at"`
}


// --- Interfaces ---

// CommunityRepository defines the data access layer for community-related operations.
type CommunityRepository interface {
	CreateCommunity(ctx context.Context, community *Community) (*Community, error)
	GetCommunityByID(ctx context.Context, id string, userID string) (*Community, error)
	GetCommunitiesByIDs(ctx context.Context, ids []string) ([]*Community, error)
	GetBaseCommunityByID(ctx context.Context, id string) (*Community, error) // New method
	ListCommunities(ctx context.Context, userID string, limit, offset int) ([]*Community, int, error)
	ListUserCommunities(ctx context.Context, userID string) ([]*Community, error)
	UpdateCommunity(ctx context.Context, userID string, community *Community, fieldMask []string) (*Community, error)
	AddMember(ctx context.Context, communityID string, userID string, role string, status string) error
	LeaveCommunity(ctx context.Context, communityID string, userID string) error
	UpdateMemberRole(ctx context.Context, communityID string, userID string, role string) error
	RemoveMember(ctx context.Context, communityID string, userID string) error
	GetCommunityMembers(ctx context.Context, communityID string) ([]*CommunityMember, error)
	GetPendingMembers(ctx context.Context, communityID string) ([]*CommunityMember, error)
	GetCommunityMemberPreviews(ctx context.Context, communityID string, limit int) ([]*CommunityMember, error)
	UpdateMemberStatus(ctx context.Context, communityID, targetUserID, status string) error
	CheckUserRole(ctx context.Context, communityID, userID string) (string, error)

	// Posts
	CreatePost(ctx context.Context, post *Post) (*Post, error)
	GetPostByID(ctx context.Context, postID, userID string) (*Post, error)
	GetPostsByCommunityID(ctx context.Context, communityID, eventID, userID, status string, limit, offset int, authorID string) ([]*Post, int, error)
	GetPostsForFeed(ctx context.Context, communityIDs []string, userID string, limit int, includeGeneral bool) ([]*Post, int, error)
	UpdatePost(ctx context.Context, post *Post) (*Post, error)
	DeletePost(ctx context.Context, postID string, userID string) error
	UpdatePostStatus(ctx context.Context, postID string, status string) error
	UpdatePostPinStatus(ctx context.Context, postID string, isPinned bool) error

	// Comments
	CreateComment(ctx context.Context, comment *Comment) (*Comment, error)
	GetCommentsByPostID(ctx context.Context, postID string) ([]*Comment, error)
	GetCommentByID(ctx context.Context, commentID string) (*Comment, error)
	UpdateComment(ctx context.Context, comment *Comment) (*Comment, error)
	DeleteComment(ctx context.Context, commentID string, userID string) error
	UpdateCommentStatus(ctx context.Context, commentID string, status string) error

	// Reactions
	CreateReaction(ctx context.Context, reaction *Reaction) error
	DeleteReaction(ctx context.Context, userID, targetType, targetID string) error
	IncrementReactionCount(ctx context.Context, targetType, targetID string) error
	DecrementReactionCount(ctx context.Context, targetType, targetID string) error
	GetReactionsByTarget(ctx context.Context, targetType, targetID string) ([]*Reaction, error)

	// Reporting
	CreateContentReport(ctx context.Context, report *ContentReport) error

	// Events (bridging to event module)
	GetEventsByCommunityID(ctx context.Context, communityID string, userID string, statusFilter string, page, limit int) ([]*event_domain.EventItem, error)

	// Suggestions (bridging to neo4j)
	ListPopularCommunities(ctx context.Context, limit int) ([]*Community, error)

	// Invites
	CreateCommunityInvite(ctx context.Context, invite *CommunityInvite) error
	GetCommunityInviteByToken(ctx context.Context, token string) (*CommunityInvite, error)
	GetCommunityInviteByEmail(ctx context.Context, communityID, inviteeEmail string) (*CommunityInvite, error)
	UpdateCommunityInviteStatus(ctx context.Context, inviteID, status string) error

	// User (bridging to user module for invitee lookup)
	GetUserByEmail(ctx context.Context, email string) (*user_domain.User, error)
	GetUserByID(ctx context.Context, userID string) (*user_domain.User, error)
	GetCommunitiesByMember(ctx context.Context, userID string) ([]*Community, error) // New method
	BulkDeleteCommunities(ctx context.Context, userID string, communityIDs []string) error
	DeleteCommunity(ctx context.Context, communityID string) error

	// Polls
	CreatePollOptions(ctx context.Context, options []PollOption) error
	GetPollOptionsByPostID(ctx context.Context, postID string) ([]PollOption, error)
	CreatePollVote(ctx context.Context, vote *PollVote) error
	GetPollVote(ctx context.Context, postID, userID string) (*PollVote, error)
	IncrementPollVoteCount(ctx context.Context, optionID string) error
}

type Neo4jCommunityRepository interface {
	CreateUserNode(ctx context.Context, userID, username string) error
	CreateCommunityNode(ctx context.Context, community *Community) error
	UpdateCommunityNode(ctx context.Context, community *Community) error
	CreateEventNode(ctx context.Context, event *event_domain.Event) error
	BulkDeleteCommunityNodes(ctx context.Context, communityIDs []string) error
	AddMemberRelationship(ctx context.Context, userID, communityID, role string) error
	RemoveMemberRelationship(ctx context.Context, userID, communityID string) error
	IsMember(ctx context.Context, userID, communityID string) (bool, error)
	AddFollowRelationship(ctx context.Context, followerID, followeeID string) error
	RemoveFollowRelationship(ctx context.Context, followerID, followeeID string) error
	CheckFollowRelationship(ctx context.Context, followerID, followeeID string) (bool, error)
	GetFollowers(ctx context.Context, userID string) ([]string, error)
	CreatePostNode(ctx context.Context, post *Post, communityName, authorName string) error
	CreateCommentNode(ctx context.Context, comment *Comment) error
	AddCommentRelationship(ctx context.Context, commentID, postID string) error
	SuggestCommunities(ctx context.Context, userID string, limit int) ([]map[string]interface{}, error)
	ListCommunities(ctx context.Context, userID string, limit, offset int) ([]*Community, int, error)
	ListUserCommunities(ctx context.Context, userID string) ([]*Community, error)
	SuggestUsersToFollow(ctx context.Context, userID string, limit int) ([]map[string]interface{}, error)
	CreateReactionRelationship(ctx context.Context, userID, targetID, targetType, reactionType string) error
	GetRecommendedPosts(ctx context.Context, userID, postID string, limit int) ([]map[string]interface{}, error)
	GetFeedForUser(ctx context.Context, userID string, limit int) ([]map[string]interface{}, error)
	Close() error
}

// CommunityService defines the interface for community-related business logic.
type CommunityService interface {
	CreateCommunity(ctx context.Context, name, description, ownerID, coverImageURL, communityType string, allowMemberPosts, autoApprovePosts, allowMemberInvites bool) (*Community, error)
	GetCommunity(ctx context.Context, id string, userID string) (*Community, error)
	ListCommunities(ctx context.Context, userID string, limit, offset int) ([]*Community, int, error)
	ListUserCommunities(ctx context.Context, userID string) ([]*Community, error)
	UpdateCommunity(ctx context.Context, userID string, community *Community, fieldMask []string) (*Community, error)
	JoinCommunity(ctx context.Context, communityID string, userID string) (*Community, error)
	LeaveCommunity(ctx context.Context, communityID string, userID string) error
	UpdateMemberRole(ctx context.Context, communityID string, performingUserID string, targetUserID string, role string) error
	RemoveMember(ctx context.Context, communityID string, performingUserID string, targetUserID string) error
	DeleteCommunity(ctx context.Context, communityID string, userID string) error

	// Invites
	InviteMember(ctx context.Context, communityID, inviterID, inviteeEmail string) error
	AcceptInvite(ctx context.Context, token, acceptingUserID string) (string, error)

	// Posts
	CreatePost(ctx context.Context, post *Post) (*Post, error)
	GetPost(ctx context.Context, postID, userID string) (*Post, error)
	GetPosts(ctx context.Context, communityID, eventID, userID, status string, limit, offset int, authorID string) ([]*Post, int, error)
	UpdatePost(ctx context.Context, post *Post) (*Post, error)
	DeletePost(ctx context.Context, postID string, userID string) error
	ApprovePost(ctx context.Context, postID, performingUserID string) error
	RejectPost(ctx context.Context, postID string) error
	PinPost(ctx context.Context, postID, userID string, isPinned bool) error
	GetRecommendedPosts(ctx context.Context, postID, userID string, limit int) ([]map[string]interface{}, error)

	// Comments
	CreateComment(ctx context.Context, comment *Comment) (*Comment, error)
	GetComments(ctx context.Context, postID string) ([]*Comment, error)
	UpdateComment(ctx context.Context, comment *Comment) (*Comment, error)
	DeleteComment(ctx context.Context, commentID string, userID string) error
	ApproveComment(ctx context.Context, commentID string) error
	RejectComment(ctx context.Context, commentID string) error

	// Reactions
	ReactToTarget(ctx context.Context, userID, targetType, targetID, reactionType string) error
	DeleteReaction(ctx context.Context, userID, targetType, targetID string) error
	GetReactions(ctx context.Context, targetType, targetID string) ([]*Reaction, error)

	SuggestCommunities(ctx context.Context, userID string) ([]*Community, error)
	ListMembers(ctx context.Context, communityID string) ([]*CommunityMember, error)
	ListPendingMembers(ctx context.Context, communityID, userID string) ([]*CommunityMember, error)
	ListMemberPreviews(ctx context.Context, communityID string) ([]*CommunityMember, error)
	ApproveMember(ctx context.Context, communityID, performingUserID, targetUserID string) error

	// Activity Feed
	GetActivityFeed(ctx context.Context, userID string, limit, offset int) ([]*Activity, int, error)

	// Polls
	CreatePoll(ctx context.Context, post *Post, options []string) (*Post, error)
	VotePoll(ctx context.Context, userID, postID, optionID string) error
}
