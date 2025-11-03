package main

import (
	"encoding/json"
	"time"

	"github.com/attendwise/backend/internal/module/user/domain"
)

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Name              string `json:"name" binding:"required"`
	Email             string `json:"email" binding:"required,email"`
	Password          string `json:"password" binding:"required,min=8"`
	Phone             string `json:"phone"`
	Company           string `json:"company"`
	Position          string `json:"position"`
	ProfilePictureURL string `json:"profile_picture_url"`
	Bio               string `json:"bio"`
	Location          string `json:"location"`
}

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// UpdateProfileRequest represents the request body for updating user profile
type UpdateProfileRequest struct {
	Name              *string `json:"name,omitempty"`
	Phone             *string `json:"phone,omitempty"`
	Company           *string `json:"company,omitempty"`
	Position          *string `json:"position,omitempty"`
	ProfilePictureURL *string `json:"profile_picture_url,omitempty"`
	Bio               *string `json:"bio,omitempty"`
	Location          *string `json:"location,omitempty"`
	ProfileVisibility *string `json:"profile_visibility,omitempty"`
}

// ChangePasswordRequest represents the request body for changing user password
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// BanRequest represents the request body for banning a user
type BanRequest struct {
	BanReason   string `json:"ban_reason"`
	BannedUntil string `json:"banned_until"` // e.g., "2025-12-31T23:59:59Z"
}

// AddSkillRequest represents the request body for adding a skill
type AddSkillRequest struct {
	SkillName string `json:"skill_name" binding:"required"`
}

// CheckGDSResponse represents the response for checking GDS installation
type CheckGDSResponse struct {
	GDSInstalled bool `json:"gds_installed"`
}

// EnrollFaceRequest represents the request body for enrolling face for authentication
type EnrollFaceRequest struct {
	SessionID    string `json:"session_id" binding:"required"`
	VideoData    []byte `json:"video_data" binding:"required"`
	ConsentGiven bool   `json:"consent_given" binding:"required"`
}

type UserResponse struct {
	ID                 string     `json:"id"`
	Email              string     `json:"email"`
	Phone              *string    `json:"phone,omitempty"`
	Name               string     `json:"name"`
	ProfilePictureURL  *string    `json:"profile_picture_url,omitempty"`
	Bio                *string    `json:"bio,omitempty"`
	Company            *string    `json:"company,omitempty"`
	Position           *string    `json:"position,omitempty"`
	Location           *string    `json:"location,omitempty"`
	FaceIDEnrolled     bool       `json:"face_id_enrolled"`
	FaceIDConsentGiven bool       `json:"face_id_consent_given"`
	FaceIDConsentTime  *time.Time `json:"face_id_consent_time,omitempty"`
	FaceSamplesCount   int        `json:"face_samples_count"`
	IsActive           bool       `json:"is_active"`
	IsBanned           bool       `json:"is_banned"`
	IsVerified         bool       `json:"is_verified"`
	BanReason          *string    `json:"ban_reason,omitempty"`
	BannedUntil        *time.Time `json:"banned_until,omitempty"`
	ProfileVisibility  string     `json:"profile_visibility,omitempty"`
	LastLoginAt        *time.Time `json:"last_login_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`

	Experience []UserExperienceResponse `json:"experience,omitempty"`
	Education  []UserEducationResponse  `json:"education,omitempty"`
	Skills     []domain.UserSkill       `json:"skills,omitempty"`
}

// UserExperienceResponse represents a user's work experience for API responses, handling nullable fields for Swagger.
type UserExperienceResponse struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	Title       string     `json:"title"`
	Company     string     `json:"company"`
	Location    *string    `json:"location,omitempty"`
	StartDate   time.Time  `json:"start_date"`
	EndDate     *time.Time `json:"end_date,omitempty"`
	Description *string    `json:"description,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// UserEducationResponse represents a user's educational background for API responses, handling nullable fields for Swagger.
type UserEducationResponse struct {
	ID           string     `json:"id"`
	UserID       string     `json:"user_id"`
	School       string     `json:"school"`
	Degree       *string    `json:"degree,omitempty"`
	FieldOfStudy *string    `json:"field_of_study,omitempty"`
	StartDate    *time.Time `json:"start_date,omitempty"`
	EndDate      *time.Time `json:"end_date,omitempty"`
	Description  *string    `json:"description,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// CommunityResponse represents a community object for API responses, handling nullable fields for Swagger.
type CommunityResponse struct {
	ID                 string     `json:"id"`
	OwnerID            string     `json:"owner_id"`
	Name               string     `json:"name"`
	Slug               string     `json:"slug"`
	Description        *string    `json:"description,omitempty"`
	CoverImageURL      *string    `json:"cover_image_url,omitempty"`
	Type               string     `json:"type"` // 'public', 'private', 'secret'
	RequireApproval    bool       `json:"require_approval"`
	AllowMemberPosts   bool       `json:"allow_member_posts"`
	AutoApprovePosts   bool       `json:"auto_approve_posts"`
	AllowMemberInvites bool       `json:"allow_member_invites"`
	MemberCount        int        `json:"member_count"`
	PostCount          int        `json:"post_count"`
	EventCount         int        `json:"event_count"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	DeletedAt          *time.Time `json:"deleted_at,omitempty"`

	AdminName      string          `json:"admin_name,omitempty"`
	AdminAvatarURL string          `json:"admin_avatar_url,omitempty"`
	Role           string          `json:"role,omitempty"`
	Status         string          `json:"status,omitempty"`
	CommonMembers  int64           `json:"common_members,omitempty"`
	MemberPreviews []*UserResponse `json:"member_previews,omitempty"`
}

// CommunityMemberResponse represents a community member object for API responses.
type CommunityMemberResponse struct {
	UserResponse
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	JoinedAt  time.Time `json:"joined_at"`
}

// PostResponse represents a post object for API responses, handling nullable fields for Swagger.
type PostResponse struct {
	ID               string               `json:"id"`
	Title            *string              `json:"title,omitempty"`
	AuthorID         string               `json:"author_id"`
	CommunityID      *string              `json:"community_id,omitempty"`
	EventID          *string              `json:"event_id,omitempty"`
	Content          string               `json:"content"`
	ContentHTML      *string              `json:"content_html,omitempty"`
	MediaURLs        []string             `json:"media_urls,omitempty"`
	FileAttachments  []Attachment         `json:"file_attachments,omitempty"`
	Hashtags         []string             `json:"hashtags,omitempty"`
	MentionedUserIDs []string             `json:"mentioned_user_ids,omitempty"`
	Visibility       string               `json:"visibility"`
	Status           string               `json:"status"`
	PostType         string               `json:"post_type"`
	ReviewedBy       *string              `json:"reviewed_by,omitempty"`
	ReviewedAt       *time.Time           `json:"reviewed_at,omitempty"`
	RejectionReason  *string              `json:"rejection_reason,omitempty"`
	FlaggedCount     int                  `json:"flagged_count"`
	CommentCount     int                  `json:"comment_count"`
	ReactionCount    int                  `json:"reaction_count"`
	ShareCount       int                  `json:"share_count"`
	ViewCount        int                  `json:"view_count"`
	IsPinned         bool                 `json:"is_pinned"`
	PinnedUntil      *time.Time           `json:"pinned_until,omitempty"`
	CreatedAt        time.Time            `json:"created_at"`
	UpdatedAt        time.Time            `json:"updated_at"`
	PublishedAt      *time.Time           `json:"published_at,omitempty"`
	DeletedAt        *time.Time           `json:"deleted_at,omitempty"`
	Author           AuthorResponse       `json:"author"`
	UserHasLiked     bool                 `json:"user_has_liked,omitempty"`
	CommunityRole    string               `json:"community_role,omitempty"`
	PollOptions      []PollOptionResponse `json:"poll_options,omitempty"`
}

// Pagination represents pagination metadata
type Pagination struct {
	Total   int  `json:"total"`
	Page    int  `json:"page"`
	Limit   int  `json:"limit"`
	HasMore bool `json:"has_more"`
}

// ListCommunitiesResponse represents the response for listing communities
type ListCommunitiesResponse struct {
	Communities []CommunityResponse `json:"communities"`
	Pagination  Pagination          `json:"pagination"`
}

// JoinCommunityResponse represents the response for joining a community
type JoinCommunityResponse struct {
	Message   string            `json:"message"`
	Community CommunityResponse `json:"community"`
}

// AcceptInviteResponse represents the response for accepting a community invite
type AcceptInviteResponse struct {
	Message     string `json:"message"`
	CommunityID string `json:"community_id"`
}

// AuthorResponse represents a simplified user object for API responses, handling nullable fields for Swagger.
type AuthorResponse struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	ProfilePictureURL *string `json:"profile_picture_url,omitempty"`
}

// PollOptionResponse represents an option in a poll for API responses.
type PollOptionResponse struct {
	ID         string    `json:"id"`
	PostID     string    `json:"post_id"`
	OptionText string    `json:"option_text"`
	VoteCount  int       `json:"vote_count"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Attachment represents a file attachment
type Attachment struct {
	Name string `json:"name"`
	Url  string `json:"url"`
	Type string `json:"type"`
}

// ListPostsResponse represents the response for listing posts
type ListPostsResponse struct {
	Posts      []PostResponse `json:"posts"`
	Pagination Pagination     `json:"pagination"`
}

// CommentResponse represents a comment object for API responses, handling nullable fields for Swagger.
type CommentResponse struct {
	ID               string     `json:"id"`
	PostID           string     `json:"post_id"`
	AuthorID         string     `json:"author_id"`
	ParentCommentID  *string    `json:"parent_comment_id,omitempty"`
	Content          string     `json:"content"`
	ContentHTML      *string    `json:"content_html,omitempty"`
	MediaURLs        []string   `json:"media_urls,omitempty"`
	MentionedUserIDs []string   `json:"mentioned_user_ids,omitempty"`
	Status           string     `json:"status"`
	ReviewedBy       *string    `json:"reviewed_by,omitempty"`
	ReviewedAt       *time.Time `json:"reviewed_at,omitempty"`
	FlaggedCount     int        `json:"flagged_count"`
	ThreadDepth      int        `json:"thread_depth"`
	ThreadPath       *string    `json:"thread_path,omitempty"`
	ReactionCount    int        `json:"reaction_count"`
	ReplyCount       int        `json:"reply_count"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at,omitempty"`

	Author AuthorResponse `json:"author"`
}

// ReactionResponse represents a reaction object for API responses.
type ReactionResponse struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	TargetType   string    `json:"target_type"` // 'post', 'comment'
	TargetID     string    `json:"target_id"`
	ReactionType string    `json:"reaction_type"` // 'like', 'love', etc.
	CreatedAt    time.Time `json:"created_at"`
}

// EventSessionResponse represents an event session object for API responses, handling nullable fields for Swagger.
type EventSessionResponse struct {
	ID                               string     `json:"id"`
	EventID                          string     `json:"event_id"`
	SessionNumber                    int        `json:"session_number"`
	Name                             *string    `json:"name,omitempty"`
	StartTime                        time.Time  `json:"start_time"`
	EndTime                          time.Time  `json:"end_time"`
	Timezone                         string     `json:"timezone"`
	LocationOverride                 *string    `json:"location_override,omitempty"`
	OnlineMeetingURLOverride         *string    `json:"online_meeting_url_override,omitempty"`
	CheckinOpensAt                   *time.Time `json:"checkin_opens_at,omitempty"`
	CheckinClosesAt                  *time.Time `json:"checkin_closes_at,omitempty"`
	MaxAttendeesOverride             *int32     `json:"max_attendees_override,omitempty"`
	FaceVerificationRequiredOverride *bool      `json:"face_verification_required_override,omitempty"`
	IsCancelled                      bool       `json:"is_cancelled"`
	CancellationReason               *string    `json:"cancellation_reason,omitempty"`
	TotalCheckins                    int        `json:"total_checkins"`
	TotalNoShows                     int        `json:"total_no_shows"`
	CreatedAt                        time.Time  `json:"created_at"`
	UpdatedAt                        time.Time  `json:"updated_at"`
}

// EventResponse represents an event object for API responses, handling nullable fields for Swagger.
type EventResponse struct {
	ID                       string         `json:"id"`
	CommunityID              string         `json:"community_id"`
	CreatedBy                string         `json:"created_by"`
	Name                     string         `json:"name"`
	Slug                     string         `json:"slug"`
	Description              *string        `json:"description,omitempty"`
	CoverImageURL            *string        `json:"cover_image_url,omitempty"`
	LocationType             string         `json:"location_type"`
	LocationAddress          *string        `json:"location_address,omitempty"`
	OnlineMeetingURL         *string        `json:"online_meeting_url,omitempty"`
	Timezone                 string         `json:"timezone"`
	StartTime                *time.Time     `json:"start_time,omitempty"`
	EndTime                  *time.Time     `json:"end_time,omitempty"`
	IsRecurring              bool           `json:"is_recurring"`
	RecurrencePattern        *string        `json:"recurrence_pattern,omitempty"`
	RecurrenceRule           RawJSONMessage `json:"recurrence_rule,omitempty"`
	RecurrenceEndDate        *time.Time     `json:"recurrence_end_date,omitempty"`
	MaxOccurrences           *int32         `json:"max_occurrences,omitempty"`
	MaxAttendees             *int32         `json:"max_attendees,omitempty"`
	CurrentAttendees         int            `json:"current_attendees"`
	WaitlistEnabled          bool           `json:"waitlist_enabled"`
	MaxWaitlist              *int32         `json:"max_waitlist,omitempty"`
	RegistrationRequired     bool           `json:"registration_required"`
	RegistrationOpensAt      *time.Time     `json:"registration_opens_at,omitempty"`
	RegistrationClosesAt     *time.Time     `json:"registration_closes_at,omitempty"`
	WhitelistOnly            bool           `json:"whitelist_only"`
	RequireApproval          bool           `json:"require_approval"`
	FaceVerificationRequired bool           `json:"face_verification_required"`
	LivenessCheckRequired    bool           `json:"liveness_check_required"`
	QRCodeEnabled            bool           `json:"qr_code_enabled"`
	FallbackCodeEnabled      bool           `json:"fallback_code_enabled"`
	ManualCheckinAllowed     bool           `json:"manual_checkin_allowed"`
	IsPaid                   bool           `json:"is_paid"`
	Fee                      *float64       `json:"fee"`
	Currency                 string         `json:"currency"`
	Status                   string         `json:"status"`
	ReminderSchedule         RawJSONMessage `json:"reminder_schedule,omitempty"`
	TotalSessions            int            `json:"total_sessions"`
	TotalRegistrations       int            `json:"total_registrations"`
	CreatedAt                time.Time      `json:"created_at"`
	UpdatedAt                time.Time      `json:"updated_at"`
	PublishedAt              *time.Time     `json:"published_at,omitempty"`
	DeletedAt                *time.Time     `json:"deleted_at,omitempty"`

	CommunityType   string                 `json:"community_type,omitempty"`
	CreatedByName   string                 `json:"created_by_name,omitempty"`
	CreatedByAvatar *string                `json:"created_by_avatar,omitempty"`
	Sessions        []EventSessionResponse `json:"sessions,omitempty"`
	IsRegistered    bool                   `json:"is_registered"`
}

// CreateEventRequest represents the request body for creating an event.
type CreateEventRequest struct {
	Event     EventResponse `json:"event"`
	Whitelist []string      `json:"whitelist"`
}

// EventItemResponse represents a single schedulable event or session in a list for API responses, handling nullable fields for Swagger.
type EventItemResponse struct {
	EventID         string    `json:"event_id"`
	SessionID       *string   `json:"session_id,omitempty"`
	EventName       string    `json:"event_name"`
	CoverImageURL   *string   `json:"cover_image_url,omitempty"`
	CommunityID     string    `json:"community_id"`
	StartTime       time.Time `json:"start_time"`
	EndTime         time.Time `json:"end_time"`
	IsRecurring     bool      `json:"is_recurring"`
	Status          string    `json:"status"`
	IsRegistered    bool      `json:"is_registered"`
	LocationType    string    `json:"location_type"`
	LocationAddress *string   `json:"location_address,omitempty"`
	CreatedByName   string    `json:"created_by_name,omitempty"`
	CreatedByAvatar *string   `json:"created_by_avatar,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

// AttendanceSummaryResponse represents the response for an event attendance summary.
type AttendanceSummaryResponse struct {
	SessionID       string    `json:"session_id"`
	EventID         string    `json:"event_id"`
	EventName       string    `json:"event_name"`
	StartTime       time.Time `json:"start_time"`
	EndTime         time.Time `json:"end_time"`
	TotalRegistered int       `json:"total_registered"`
	TotalCheckedIn  int       `json:"total_checked_in"`
	TotalLate       int       `json:"total_late"`
	TotalNoShow     int       `json:"total_no_show"`
	AttendanceRate  float32   `json:"attendance_rate"`
}

// EventAttendeeResponse represents an event attendee object for API responses, handling nullable fields for Swagger.
type EventAttendeeResponse struct {
	ID                     string         `json:"id"`
	EventID                string         `json:"event_id"`
	UserID                 string         `json:"user_id"`
	Role                   string         `json:"role"`
	Status                 string         `json:"status"`
	RegistrationFormData   RawJSONMessage `json:"registration_form_data,omitempty"`
	RegistrationSource     *string        `json:"registration_source,omitempty"`
	PaymentStatus          *string        `json:"payment_status,omitempty"`
	PaymentAmount          *float64       `json:"payment_amount,omitempty"`
	PaymentID              *string        `json:"payment_id,omitempty"`
	FaceSampleProvided     bool           `json:"face_sample_provided"`
	FaceSampleQualityScore *float64       `json:"face_sample_quality_score,omitempty"`
	QRCodeToken            *string        `json:"qr_code_token,omitempty"`
	FallbackCode           *string        `json:"fallback_code,omitempty"`
	QRDeviceBinding        *string        `json:"qr_device_binding,omitempty"`
	RegisteredAt           time.Time      `json:"registered_at"`
	ApprovedAt             *time.Time     `json:"approved_at,omitempty"`
	ApprovedBy             *string        `json:"approved_by,omitempty"`
	CancelledAt            *time.Time     `json:"cancelled_at,omitempty"`

	UserName              string  `json:"user_name,omitempty"`
	UserEmail             string  `json:"user_email,omitempty"`
	UserProfilePictureURL *string `json:"user_profile_picture_url,omitempty"`

	CheckinID     *string    `json:"checkin_id,omitempty"`
	CheckinTime   *time.Time `json:"checkin_time,omitempty"`
	CheckinMethod *string    `json:"checkin_method,omitempty"`
	IsLate        *bool      `json:"is_late,omitempty"`
	LivenessScore *float64   `json:"liveness_score,omitempty"`
	FailureReason *string    `json:"failure_reason,omitempty"`
}

// EventSummaryResponse is a subset of the main Event struct for embedding in other responses.
type EventSummaryResponse struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	StartTime     *time.Time `json:"start_time,omitempty"`
	EndTime       *time.Time `json:"end_time,omitempty"`
	CoverImageURL *string    `json:"cover_image_url,omitempty"`
	Status        string     `json:"status"`
}

// RegistrationWithEventResponse holds registration details along with the parent event's info for API responses.
type RegistrationWithEventResponse struct {
	EventAttendeeResponse
	Event *EventSummaryResponse `json:"event"`
}

// ParticipantResponse represents a participant in a conversation for API responses, handling nullable fields for Swagger.
type ParticipantResponse struct {
	UserID      string     `json:"user_id"`
	JoinedAt    time.Time  `json:"joined_at"`
	LastReadAt  *time.Time `json:"last_read_at,omitempty"`
	UnreadCount int        `json:"unread_count"`
}

// ConversationResponse represents a conversation object for API responses, handling nullable fields for Swagger.
type ConversationResponse struct {
	ID            string                `json:"id"`
	Type          string                `json:"type"`
	Name          *string               `json:"name,omitempty"`
	AvatarURL     *string               `json:"avatar_url,omitempty"`
	CreatedAt     time.Time             `json:"created_at"`
	UpdatedAt     time.Time             `json:"updated_at"`
	Participants  []ParticipantResponse `json:"participants,omitempty"`
	LastMessage   *string               `json:"last_message,omitempty"`
	LastMessageAt *time.Time            `json:"last_message_at,omitempty"`
	UnreadCount   int                   `json:"unread_count"`
}

// MessageAuthorResponse represents the author of a message for API responses.
type MessageAuthorResponse struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	ProfilePictureURL *string `json:"profile_picture_url,omitempty"`
}

// MessageResponse represents a message object for API responses, handling nullable fields for Swagger.
type MessageResponse struct {
	ID             string                 `json:"id"`
	ConversationID string                 `json:"conversation_id"`
	SenderID       string                 `json:"sender_id"`
	Content        string                 `json:"content"`
	MessageType    string                 `json:"message_type"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
	IsEdited       bool                   `json:"is_edited"`
	EditedAt       *time.Time             `json:"edited_at,omitempty"`
	IsDeleted      bool                   `json:"is_deleted"`
	DeletedAt      *time.Time             `json:"deleted_at,omitempty"`
	Author         *MessageAuthorResponse `json:"author,omitempty"`
}

// UnreadMessageCountResponse represents the response for total unread message count.
type UnreadMessageCountResponse struct {
	Count int `json:"count"`
}

// NotificationResponse represents a notification object for API responses, handling nullable fields for Swagger.
type NotificationResponse struct {
	ID                    string    `json:"id"`
	UserID                string    `json:"user_id"`
	Type                  string    `json:"type"`
	Title                 string    `json:"title"`
	Message               string    `json:"message"`
	Link                  *string   `json:"link,omitempty"`
	RelatedUserID         *string   `json:"related_user_id,omitempty"`
	RelatedPostID         *string   `json:"related_post_id,omitempty"`
	RelatedCommentID      *string   `json:"related_comment_id,omitempty"`
	RelatedEventID        *string   `json:"related_event_id,omitempty"`
	RelatedConversationID *string   `json:"related_conversation_id,omitempty"`
	IsRead                bool      `json:"is_read"`
	CreatedAt             time.Time `json:"created_at"`
}

// NotificationChannelPreferencesResponse represents notification channel preferences for API responses.
type NotificationChannelPreferencesResponse struct {
	Enabled bool            `json:"enabled"`
	Types   map[string]bool `json:"types"` // Using string for NotificationType
}

// NotificationChannelsResponse represents notification channels for API responses.
type NotificationChannelsResponse struct {
	Email NotificationChannelPreferencesResponse `json:"email"`
	Push  NotificationChannelPreferencesResponse `json:"push"`
	InApp NotificationChannelPreferencesResponse `json:"in_app"`
}

// NotificationPreferencesResponse represents notification preferences for API responses.
type NotificationPreferencesResponse struct {
	UserID   string                       `json:"user_id"`
	Channels NotificationChannelsResponse `json:"channels"`
}

// FeedItemResponse represents an entry in a user's feed timeline for API responses.
type FeedItemResponse struct {
	Type      string             `json:"type"` // "post" or "event"
	Post      *PostResponse      `json:"post,omitempty"`
	Event     *EventItemResponse `json:"event,omitempty"`
	CreatedAt time.Time          `json:"created_at"`
}

// RawJSONMessage is a wrapper for json.RawMessage to be parsable by swag.
type RawJSONMessage []byte

// NullString represents a string that can be null
// This is a workaround for swag to understand sql.NullString
type NullString struct {
	String string `json:"string"`
	Valid  bool   `json:"valid"`
}

// User represents a user
// This is a workaround for swag to understand domain.User
type User struct {
	ID                string     `json:"id"`
	Name              string     `json:"name"`
	Email             string     `json:"email"`
	Phone             NullString `json:"phone"`
	Company           NullString `json:"company"`
	Position          NullString `json:"position"`
	ProfilePictureURL NullString `json:"profile_picture_url"`
	Bio               NullString `json:"bio"`
	Location          NullString `json:"location"`
	ProfileVisibility string     `json:"profile_visibility"`
}

// UserExperience represents a user's work experience
type UserExperience struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	Title       string     `json:"title"`
	Company     string     `json:"company"`
	Location    NullString `json:"location"`
	StartDate   string     `json:"start_date"`
	EndDate     NullString `json:"end_date"`
	Description NullString `json:"description"`
}

// UserEducation represents a user's education
type UserEducation struct {
	ID           string     `json:"id"`
	UserID       string     `json:"user_id"`
	School       string     `json:"school"`
	Degree       NullString `json:"degree"`
	FieldOfStudy NullString `json:"field_of_study"`
	StartDate    string     `json:"start_date"`
	EndDate      NullString `json:"end_date"`
	Description  NullString `json:"description"`
}

// VerifyCheckinRequest represents the request body for the verify checkin endpoint
type VerifyCheckinRequest struct {
	QRPayload                string `json:"qr_payload"`
	FallbackCode             string `json:"fallback_code"`
	ImageData                string `json:"image_data"`
	LivenessStream           string `json:"liveness_video_stream_data"`
	ChallengeType            string `json:"liveness_challenge_type"`
	ScannerDeviceFingerprint string `json:"scanner_device_fingerprint"`
}

// ManualOverrideRequest represents the request body for the manual override endpoint
type ManualOverrideRequest struct {
	SessionID string `json:"session_id"`
	UserID    string `json:"user_id"`
}

// OfflineCheckinAttempt represents an offline checkin attempt
type OfflineCheckinAttempt struct {
	QRPayload    string `json:"qr_payload"`
	FallbackCode string `json:"fallback_code"`
	Timestamp    string `json:"timestamp"`
}

// SyncOfflineCheckinsRequest represents the request body for the sync offline checkins endpoint
type SyncOfflineCheckinsRequest struct {
	DeviceID string                  `json:"device_id"`
	Attempts []OfflineCheckinAttempt `json:"attempts"`
}

// CreateCommunityRequest represents the request body for creating a community
type CreateCommunityRequest struct {
	Name               string `json:"name"`
	Description        string `json:"description"`
	CoverImageURL      string `json:"cover_image_url"`
	Type               string `json:"type"`
	AllowMemberPosts   bool   `json:"allow_member_posts"`
	AutoApprovePosts   bool   `json:"auto_approve_posts"`
	AllowMemberInvites bool   `json:"allow_member_invites"`
}

// UpdateCommunityRequest represents the request body for updating a community
type UpdateCommunityRequest struct {
	Name               string     `json:"name"`
	Description        NullString `json:"description"`
	CoverImageURL      NullString `json:"cover_image_url"`
	Type               string     `json:"type"`
	AllowMemberPosts   bool       `json:"allow_member_posts"`
	AutoApprovePosts   bool       `json:"auto_approve_posts"`
	AllowMemberInvites bool       `json:"allow_member_invites"`
}

// UpdateMemberRoleRequest represents the request body for updating a member's role
type UpdateMemberRoleRequest struct {
	Role string `json:"role"`
}

// CreatePostRequest represents the request body for creating a post
type CreatePostRequest struct {
	Title           string       `json:"title"`
	Content         string       `json:"content"`
	Visibility      string       `json:"visibility"`
	MediaURLs       []string     `json:"media_urls"`
	FileAttachments []Attachment `json:"file_attachments"`
	Hashtags        []string     `json:"hashtags"`
	EventID         string       `json:"event_id"`
	PostType        string       `json:"post_type"`
}

// CreateCommentRequest represents the request body for creating a comment
type CreateCommentRequest struct {
	Content         string `json:"content"`
	ParentCommentID string `json:"parent_comment_id"`
}

// ReactToPostRequest represents the request body for reacting to a post
type ReactToPostRequest struct {
	ReactionType string `json:"reaction_type"`
}

// PinPostRequest represents the request body for pinning a post
type PinPostRequest struct {
	IsPinned bool `json:"is_pinned"`
}

// InviteMemberRequest represents the request body for inviting a member
type InviteMemberRequest struct {
	InviteeEmail string `json:"email"`
}

// UpdatePostRequest represents the request body for updating a post
type UpdatePostRequest struct {
	Content    string `json:"content"`
	Visibility string `json:"visibility"`
}

// UpdateCommentRequest represents the request body for updating a comment
type UpdateCommentRequest struct {
	Content string `json:"content"`
}

// CreatePollRequest represents the request body for creating a poll
type CreatePollRequest struct {
	Title      string   `json:"title"`
	Content    string   `json:"content"`
	Visibility string   `json:"visibility"`
	Options    []string `json:"options"`
}

// NullTime represents a time.Time that can be null
type NullTime struct {
	Time  time.Time `json:"time"`
	Valid bool      `json:"valid"`
}

// NullInt32 represents an int32 that can be null
type NullInt32 struct {
	Int32 int32 `json:"int32"`
	Valid bool  `json:"valid"`
}

// NullFloat64 represents a float64 that can be null
type NullFloat64 struct {
	Float64 float64 `json:"float64"`
	Valid   bool    `json:"valid"`
}

// Event represents an event
type Event struct {
	ID                       string      `json:"id"`
	Name                     string      `json:"name"`
	Description              NullString  `json:"description"`
	CoverImageURL            NullString  `json:"cover_image_url"`
	LocationType             string      `json:"location_type"`
	OnlineMeetingURL         NullString  `json:"online_meeting_url"`
	StartTime                NullTime    `json:"start_time"`
	EndTime                  NullTime    `json:"end_time"`
	Timezone                 string      `json:"timezone"`
	IsRecurring              bool        `json:"is_recurring"`
	RecurrencePattern        NullString  `json:"recurrence_pattern"`
	RecurrenceRule           []byte      `json:"recurrence_rule"`
	MaxAttendees             NullInt32   `json:"max_attendees"`
	WaitlistEnabled          bool        `json:"waitlist_enabled"`
	MaxWaitlist              NullInt32   `json:"max_waitlist"`
	RegistrationRequired     bool        `json:"registration_required"`
	WhitelistOnly            bool        `json:"whitelist_only"`
	RequireApproval          bool        `json:"require_approval"`
	FaceVerificationRequired bool        `json:"face_verification_required"`
	LivenessCheckRequired    bool        `json:"liveness_check_required"`
	QRCodeEnabled            bool        `json:"qr_code_enabled"`
	FallbackCodeEnabled      bool        `json:"fallback_code_enabled"`
	ManualCheckinAllowed     bool        `json:"manual_checkin_allowed"`
	IsPaid                   bool        `json:"is_paid"`
	Fee                      NullFloat64 `json:"fee"`
	Currency                 string      `json:"currency"`
	ReminderSchedule         []byte      `json:"reminder_schedule"`
	Status                   string      `json:"status"`
	CreatedBy                string      `json:"created_by"`
	CommunityID              NullString  `json:"community_id"`
	CreatedAt                time.Time   `json:"created_at"`
	UpdatedAt                time.Time   `json:"updated_at"`
}

// RawMessage represents a raw JSON message
type RawMessage []byte

// RegisterForEventRequest represents the request body for registering for an event
type RegisterForEventRequest struct {
	RegistrationFormData json.RawMessage `json:"registration_form_data"`
}

// AddUsersToWhitelistRequest represents the request body for adding users to a whitelist
type AddUsersToWhitelistRequest struct {
	UserIDs []string `json:"user_ids"`
}

// UpdateEventRequest represents the request body for updating an event
type UpdateEventRequest struct {
	Name                     string      `json:"name"`
	Description              NullString  `json:"description"`
	CoverImageURL            NullString  `json:"cover_image_url"`
	LocationType             string      `json:"location_type"`
	OnlineMeetingURL         NullString  `json:"online_meeting_url"`
	StartTime                NullTime    `json:"start_time"`
	EndTime                  NullTime    `json:"end_time"`
	Timezone                 string      `json:"timezone"`
	IsRecurring              bool        `json:"is_recurring"`
	RecurrencePattern        NullString  `json:"recurrence_pattern"`
	RecurrenceRule           []byte      `json:"recurrence_rule"`
	MaxAttendees             NullInt32   `json:"max_attendees"`
	WaitlistEnabled          bool        `json:"waitlist_enabled"`
	MaxWaitlist              NullInt32   `json:"max_waitlist"`
	RegistrationRequired     bool        `json:"registration_required"`
	WhitelistOnly            bool        `json:"whitelist_only"`
	RequireApproval          bool        `json:"require_approval"`
	FaceVerificationRequired bool        `json:"face_verification_required"`
	LivenessCheckRequired    bool        `json:"liveness_check_required"`
	QRCodeEnabled            bool        `json:"qr_code_enabled"`
	FallbackCodeEnabled      bool        `json:"fallback_code_enabled"`
	ManualCheckinAllowed     bool        `json:"manual_checkin_allowed"`
	IsPaid                   bool        `json:"is_paid"`
	Fee                      NullFloat64 `json:"fee"`
	Currency                 string      `json:"currency"`
	ReminderSchedule         []byte      `json:"reminder_schedule"`
	Status                   string      `json:"status"`
}

// CancelEventSessionRequest represents the request body for canceling an event session
type CancelEventSessionRequest struct {
	Reason string `json:"reason"`
}

// CreateConversationRequest represents the request body for creating a conversation
type CreateConversationRequest struct {
	Type           string   `json:"type"`
	ParticipantIDs []string `json:"participant_ids"`
}

// SendMessageRequest represents the request body for sending a message
type SendMessageRequest struct {
	Content string `json:"content"`
	Type    string `json:"type"`
}

// UpdateMessageRequest represents the request body for updating a message
type UpdateMessageRequest struct {
	Content string `json:"content"`
}

// NotificationChannels represents the notification channels
type NotificationChannels struct {
	Email bool `json:"email"`
	SMS   bool `json:"sms"`
	Push  bool `json:"push"`
}

// UpdateNotificationPreferencesRequest represents the request body for updating notification preferences
type UpdateNotificationPreferencesRequest struct {
	Channels NotificationChannels `json:"channels"`
}

// DeviceFingerprintRequest represents the request body for device fingerprint
type DeviceFingerprintRequest struct {
	DeviceFingerprint string `json:"device_fingerprint"`
}
