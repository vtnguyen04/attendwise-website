package domain

import (
	"context"
	"database/sql"
	"errors"
	"time"

	pb "github.com/attendwise/backend/generated/go/ai"
	googleauth "github.com/attendwise/backend/pkg/googleauth"
)

// --- Errors ---
var (
	ErrUserNotFound          = errors.New("user not found")
	ErrEmailExists           = errors.New("email already exists")
	ErrPhoneExists           = errors.New("phone number already exists")
	ErrFaceEmbeddingNotFound = errors.New("face embedding not found")
	ErrIncorrectPassword     = errors.New("incorrect old password")
	ErrConsentNotGiven       = errors.New("consent for storing face data is required")
	ErrImageDataMissing      = errors.New("face image data is required")
	ErrLivenessCheckFailed   = errors.New("liveness check failed")
	ErrNoFaceInImage         = errors.New("could not extract a face from the provided image")
)

// --- Domain Models ---

// User represents a user in the system, mapping to the 'users' table.
type User struct {
	ID                  string         `json:"id"`
	Email               string         `json:"email"`
	Phone               sql.NullString `json:"phone,omitempty"`
	PasswordHash        string         `json:"-"`
	Name                string         `json:"name"`
	ProfilePictureURL   sql.NullString `json:"profile_picture_url,omitempty"`
	Bio                 sql.NullString `json:"bio,omitempty"`
	Company             sql.NullString `json:"company,omitempty"`
	Position            sql.NullString `json:"position,omitempty"`
	Location            sql.NullString `json:"location,omitempty"`
	GoogleID            sql.NullString `json:"-"` // Google ID for OAuth, hidden from JSON
	FaceIDEnrolled      bool           `json:"face_id_enrolled"`
	FaceIDConsentGiven  bool           `json:"face_id_consent_given"`
	FaceIDConsentTime   sql.NullTime   `json:"face_id_consent_time,omitempty"`
	FaceSamplesCount    int            `json:"face_samples_count"`
	IsActive            bool           `json:"is_active"`
	IsBanned            bool           `json:"is_banned"`
	IsVerified          bool           `json:"is_verified"`
	BanReason           sql.NullString `json:"ban_reason,omitempty"`
	BannedUntil         sql.NullTime   `json:"banned_until,omitempty"`
	ProfileVisibility   string         `json:"profile_visibility,omitempty"`
	LastLoginAt         sql.NullTime   `json:"last_login_at,omitempty"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           sql.NullTime   `json:"-"`

	// Profile Enhancements
	Experience []UserExperience `json:"experience,omitempty"`
	Education  []UserEducation  `json:"education,omitempty"`
	Skills     []UserSkill      `json:"skills,omitempty"`
}

// UserExperience represents a user's work experience.
type UserExperience struct {
	ID          string         `json:"id"`
	UserID      string         `json:"user_id"`
	Title       string         `json:"title"`
	Company     string         `json:"company"`
	Location    sql.NullString `json:"location,omitempty"`
	StartDate   time.Time      `json:"start_date"`
	EndDate     sql.NullTime   `json:"end_date,omitempty"`
	Description sql.NullString `json:"description,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// UserEducation represents a user's educational background.
type UserEducation struct {
	ID           string         `json:"id"`
	UserID       string         `json:"user_id"`
	School       string         `json:"school"`
	Degree       sql.NullString `json:"degree,omitempty"`
	FieldOfStudy sql.NullString `json:"field_of_study,omitempty"`
	StartDate    sql.NullTime   `json:"start_date,omitempty"`
	EndDate      sql.NullTime   `json:"end_date,omitempty"`
	Description  sql.NullString `json:"description,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

// UserSkill represents a user's skill with endorsement count.
type UserSkill struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	SkillName        string    `json:"skill_name"`
	EndorsementCount int       `json:"endorsement_count"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// UserFaceEmbedding maps to the 'user_face_embeddings' table.
type UserFaceEmbedding struct {
	ID                string
	UserID            string
	Embedding         []byte
	EmbeddingVersion  string
	QualityScore      sql.NullFloat64
	CaptureDeviceInfo sql.NullString // JSONB
	IsActive          bool
	CreatedAt         time.Time
	ExpiresAt         sql.NullTime
}

// UserDevice maps to the 'user_devices' table.
type UserDevice struct {
	ID                string
	UserID            string
	DeviceFingerprint string
	DeviceName        sql.NullString
	DeviceType        sql.NullString
	OSInfo            sql.NullString
	BrowserInfo       sql.NullString
	LastUsedAt        time.Time
	IsTrusted         bool
	CreatedAt         time.Time
}

// FriendRequest represents a friend request.
type FriendRequest struct {
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Friend represents a friendship.
type Friend struct {
	UserID1   string    `json:"user_id1"`
	UserID2   string    `json:"user_id2"`
	CreatedAt time.Time `json:"created_at"`
}

// --- Interfaces ---

// UserRepository defines the interface for user data operations in the relational database.
type UserRepository interface {
	CreateUser(ctx context.Context, user *User) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserAuthByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id string) (*User, error)
	GetUserByIDWithCache(ctx context.Context, id string) (*User, error) // New method
	GetUserWithPasswordByID(ctx context.Context, id string) (*User, error)
	UpdateUser(ctx context.Context, user *User, fieldMask []string) (*User, error)
	UpdateLastLogin(ctx context.Context, id string) error
	SaveFaceEmbedding(ctx context.Context, userID string, embedding []byte, version string, qualityScore float64) error
	GetActiveFaceEmbedding(ctx context.Context, userID string) (*UserFaceEmbedding, error)
	GetActiveFaceEmbeddingWithCache(ctx context.Context, userID string) (*UserFaceEmbedding, error) // New method
	ChangePassword(ctx context.Context, userID, newPasswordHash string) error
	BanUser(ctx context.Context, userID, reason string, until time.Time) error
	FlagUsersAsSpam(ctx context.Context, userIDs []string) error
	ListUsers(ctx context.Context, page, limit int) ([]*User, error)
	GetUserByGoogleID(ctx context.Context, googleID string) (*User, error)
	UpdateUserGoogleID(ctx context.Context, userID, googleID string) error

	// User Experience
	CreateUserExperience(ctx context.Context, exp *UserExperience) (*UserExperience, error)
	UpdateUserExperience(ctx context.Context, exp *UserExperience) (*UserExperience, error)
	DeleteUserExperience(ctx context.Context, userID, id string) error
	ListUserExperience(ctx context.Context, userID string) ([]UserExperience, error)

	// User Education
	CreateUserEducation(ctx context.Context, edu *UserEducation) (*UserEducation, error)
	UpdateUserEducation(ctx context.Context, edu *UserEducation) (*UserEducation, error)
	DeleteUserEducation(ctx context.Context, id string) error
	ListUserEducation(ctx context.Context, userID string) ([]UserEducation, error)

	// User Skills
	CreateUserSkill(ctx context.Context, skill *UserSkill) (*UserSkill, error)
	DeleteUserSkill(ctx context.Context, id string) error
	ListUserSkills(ctx context.Context, userID string) ([]UserSkill, error)
	AddSkillEndorsement(ctx context.Context, skillID, endorserID string) error
	RemoveSkillEndorsement(ctx context.Context, skillID, endorserID string) error

	// Friend Requests & Friends
	CreateFriendRequest(ctx context.Context, senderID, receiverID string) error
	UpdateFriendRequest(ctx context.Context, senderID, receiverID, status string) error
	GetFriendRequest(ctx context.Context, senderID, receiverID string) (*FriendRequest, error)
	CreateFriend(ctx context.Context, userID1, userID2 string) error
	DeleteFriend(ctx context.Context, userID1, userID2 string) error
	GetFriends(ctx context.Context, userID string) ([]User, error)
}

// UserGraphRepository defines the interface for user data operations in the graph database.
type UserGraphRepository interface {
	CreateUserNode(ctx context.Context, user *User) error
	FindSpamAccounts(ctx context.Context, since time.Time, followThreshold int) ([]string, error)
	SuggestUsersToFollow(ctx context.Context, userID string, limit, offset int) ([]map[string]interface{}, error)
	CheckGDS(ctx context.Context) (bool, error)
}

// UserService defines the interface for user-related business logic.
type UserService interface {
	Register(ctx context.Context, name, email, password, phone, company, position, profilePictureURL, bio, location string) (*User, error)
	Login(ctx context.Context, email, password string) (user *User, accessToken string, refreshToken string, err error)
	GetProfile(ctx context.Context, userID string) (*User, error)
	UpdateProfile(ctx context.Context, user *User, fieldMask []string) (*User, error)
	ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error
	BanUser(ctx context.Context, userID, reason string, until time.Time) error

	// Face ID
	GetLivenessChallenge(ctx context.Context) (*pb.StartLivenessChallengeResponse, error)
	SubmitLivenessVideo(ctx context.Context, userID, sessionID string, videoData []byte, consentGiven bool) (bool, string, error)
	GetUserFaceEmbedding(ctx context.Context, userID string) (*UserFaceEmbedding, error)

	// User Actions & Suggestions
	FollowUser(ctx context.Context, followerID, followeeID string) error
	UnfollowUser(ctx context.Context, followerID, followeeID string) error
	CheckFollowStatus(ctx context.Context, followerID, followeeID string) (bool, error)
	ListUsers(ctx context.Context, page, limit int) ([]*User, error)
	SuggestUsersToFollow(ctx context.Context, userID string, page, limit int) ([]map[string]interface{}, error)
	CheckGDS(ctx context.Context) (bool, error)
	GoogleLoginOrRegister(ctx context.Context, googleUser *googleauth.GoogleUser) (user *User, accessToken string, refreshToken string, err error)

	// User Experience
	AddExperience(ctx context.Context, userID string, exp *UserExperience) (*UserExperience, error)
	UpdateExperience(ctx context.Context, userID string, exp *UserExperience) (*UserExperience, error)
	DeleteExperience(ctx context.Context, userID, experienceID string) error
	GetExperience(ctx context.Context, userID string) ([]UserExperience, error)

	// User Education
	AddEducation(ctx context.Context, userID string, edu *UserEducation) (*UserEducation, error)
	UpdateEducation(ctx context.Context, userID string, edu *UserEducation) (*UserEducation, error)
	DeleteEducation(ctx context.Context, userID, educationID string) error
	GetEducation(ctx context.Context, userID string) ([]UserEducation, error)

	// User Skills
	AddSkill(ctx context.Context, userID string, skillName string) (*UserSkill, error)
	DeleteSkill(ctx context.Context, userID, skillID string) error
	GetSkills(ctx context.Context, userID string) ([]UserSkill, error)
	EndorseSkill(ctx context.Context, userID, skillID string) error
	RemoveEndorsement(ctx context.Context, userID, skillID string) error

	// Friend Requests & Friends
	SendFriendRequest(ctx context.Context, senderID, receiverID string) error
	AcceptFriendRequest(ctx context.Context, senderID, receiverID string) error
	RejectFriendRequest(ctx context.Context, senderID, receiverID string) error
	Unfriend(ctx context.Context, userID1, userID2 string) error
	ListFriends(ctx context.Context, userID string) ([]User, error)
}