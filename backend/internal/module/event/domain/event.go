package domain

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

var (
	ErrEventNotFound      = errors.New("event not found")
	ErrAttendeeNotFound   = errors.New("event attendee not found")
	ErrSessionNotFound    = errors.New("event session not found")
	ErrNotRegistered      = errors.New("user is not registered for this event")
	ErrWhitelistOnly      = errors.New("this event is for whitelisted users only")
	ErrRegistrationClosed = errors.New("event registration is closed")
	ErrEventFull          = errors.New("event is full")
	ErrAlreadyRegistered  = errors.New("user is already registered for this event")
	ErrPermissionDenied   = errors.New("permission denied")
)

// Event corresponds to the 'events' table, holding all core event information.
type Event struct {
	ID                       string          `json:"id"`
		CommunityID        string         `json:"community_id" binding:"required"`
	CreatedBy                string          `json:"created_by"`
	Name                     string          `json:"name"`
	Slug                     string          `json:"slug"`
	Description              sql.NullString  `json:"description,omitempty"`
	CoverImageURL            sql.NullString  `json:"cover_image_url,omitempty"`
	LocationType             string          `json:"location_type"`
	LocationAddress          sql.NullString  `json:"location_address,omitempty"`
	OnlineMeetingURL         sql.NullString  `json:"online_meeting_url,omitempty"`
	Timezone                 string          `json:"timezone"`
	StartTime                sql.NullTime    `json:"start_time,omitempty"`
	EndTime                  sql.NullTime    `json:"end_time,omitempty"`
	IsRecurring              bool            `json:"is_recurring"`
	RecurrencePattern        sql.NullString  `json:"recurrence_pattern,omitempty"`
	RecurrenceRule           json.RawMessage `json:"recurrence_rule,omitempty"`
	RecurrenceEndDate        sql.NullTime    `json:"recurrence_end_date,omitempty"`
	MaxOccurrences           sql.NullInt32   `json:"max_occurrences,omitempty"`
	MaxAttendees             sql.NullInt32   `json:"max_attendees,omitempty"`
	CurrentAttendees         int             `json:"current_attendees"`
	WaitlistEnabled          bool            `json:"waitlist_enabled"`
	MaxWaitlist              sql.NullInt32   `json:"max_waitlist,omitempty"`
	RegistrationRequired     bool            `json:"registration_required"`
	RegistrationOpensAt      sql.NullTime    `json:"registration_opens_at,omitempty"`
	RegistrationClosesAt     sql.NullTime    `json:"registration_closes_at,omitempty"`
	WhitelistOnly            bool            `json:"whitelist_only"`
	RequireApproval          bool            `json:"require_approval"`
	FaceVerificationRequired bool            `json:"face_verification_required"`
	LivenessCheckRequired    bool            `json:"liveness_check_required"`
	QRCodeEnabled            bool            `json:"qr_code_enabled"`
	FallbackCodeEnabled      bool            `json:"fallback_code_enabled"`
	ManualCheckinAllowed     bool            `json:"manual_checkin_allowed"`
	IsPaid                   bool            `json:"is_paid"`
	Fee                      sql.NullFloat64 `json:"fee"`
	Currency                 string          `json:"currency"`
	Status                   string          `json:"status"`
	ReminderSchedule         json.RawMessage `json:"reminder_schedule,omitempty"`
	TotalSessions            int             `json:"total_sessions"`
	TotalRegistrations       int             `json:"total_registrations"`
	CreatedAt                time.Time       `json:"created_at"`
	UpdatedAt                time.Time       `json:"updated_at"`
	PublishedAt              sql.NullTime    `json:"published_at,omitempty"`
	DeletedAt                sql.NullTime    `json:"deleted_at,omitempty"`

	// Enriched data (from joins)
	CommunityType   string         `json:"community_type,omitempty"`
	CreatedByName   string         `json:"created_by_name,omitempty"`
	CreatedByAvatar sql.NullString `json:"created_by_avatar,omitempty"`
	Sessions        []EventSession `json:"sessions,omitempty"`
	IsRegistered    bool           `json:"is_registered"`
}

// EventItem represents a single schedulable event or session in a list.
type EventItem struct {
	EventID         string         `json:"event_id"`
	SessionID       sql.NullString `json:"session_id,omitempty"`
	EventName       string         `json:"event_name"`
	CoverImageURL   sql.NullString `json:"cover_image_url,omitempty"`
	CommunityID     string         `json:"community_id"`
	StartTime       time.Time      `json:"start_time"`
	EndTime         time.Time      `json:"end_time"`
	IsRecurring     bool           `json:"is_recurring"`
	Status          string         `json:"status"`
	IsRegistered    bool           `json:"is_registered"`
	LocationType    string         `json:"location_type"`
	LocationAddress sql.NullString `json:"location_address,omitempty"`
	CreatedByName   string         `json:"created_by_name,omitempty"`
	CreatedByAvatar sql.NullString `json:"created_by_avatar,omitempty"`
	CreatedAt       time.Time      `json:"created_at"` // Add this line
}

// EventSession corresponds to the 'event_sessions' table.
type EventSession struct {
	ID                               string         `json:"id"`
	EventID                          string         `json:"event_id"`
	SessionNumber                    int            `json:"session_number"`
	Name                             sql.NullString `json:"name,omitempty"`
	StartTime                        time.Time      `json:"start_time"`
	EndTime                          time.Time      `json:"end_time"`
	Timezone                         string         `json:"timezone"`
	LocationOverride                 sql.NullString `json:"location_override,omitempty"`
	OnlineMeetingURLOverride         sql.NullString `json:"online_meeting_url_override,omitempty"`
	CheckinOpensAt                   sql.NullTime   `json:"checkin_opens_at,omitempty"`
	CheckinClosesAt                  sql.NullTime   `json:"checkin_closes_at,omitempty"`
	MaxAttendeesOverride             sql.NullInt32  `json:"max_attendees_override,omitempty"`
	FaceVerificationRequiredOverride sql.NullBool   `json:"face_verification_required_override,omitempty"`
	IsCancelled                      bool           `json:"is_cancelled"`
	CancellationReason               sql.NullString `json:"cancellation_reason,omitempty"`
	TotalCheckins                    int            `json:"total_checkins"`
	TotalNoShows                     int            `json:"total_no_shows"`
	CreatedAt                        time.Time      `json:"created_at"`
	UpdatedAt                        time.Time      `json:"updated_at"`
}

// EventAttendee corresponds to the 'event_attendees' table.
type EventAttendee struct {
	ID                     string          `json:"id"`
	EventID                string          `json:"event_id"`
	UserID                 string          `json:"user_id"`
	Role                   string          `json:"role"`
	Status                 string          `json:"status"`
	RegistrationFormData   json.RawMessage `json:"registration_form_data,omitempty"`
	RegistrationSource     sql.NullString  `json:"registration_source,omitempty"`
	PaymentStatus          sql.NullString  `json:"payment_status,omitempty"`
	PaymentAmount          sql.NullFloat64 `json:"payment_amount,omitempty"`
	PaymentID              sql.NullString  `json:"payment_id,omitempty"`
	FaceSampleProvided     bool            `json:"face_sample_provided"`
	FaceSampleQualityScore sql.NullFloat64 `json:"face_sample_quality_score,omitempty"`
	QRCodeToken            sql.NullString  `json:"qr_code_token,omitempty"`
	FallbackCode           sql.NullString  `json:"fallback_code,omitempty"`
	QRDeviceBinding        sql.NullString  `json:"qr_device_binding,omitempty"`
	RegisteredAt           time.Time       `json:"registered_at"`
	ApprovedAt             sql.NullTime    `json:"approved_at,omitempty"`
	ApprovedBy             sql.NullString  `json:"approved_by,omitempty"`
	CancelledAt            sql.NullTime    `json:"cancelled_at,omitempty"`

	// Enriched data
	UserName              string         `json:"user_name,omitempty"`
	UserEmail             string         `json:"user_email,omitempty"`
	UserProfilePictureURL sql.NullString `json:"user_profile_picture_url,omitempty"`

	// Check-in specific data (from event_session_checkins)
	CheckinID             sql.NullString  `json:"checkin_id,omitempty"`
	CheckinTime           sql.NullTime    `json:"checkin_time,omitempty"`
	CheckinMethod         sql.NullString  `json:"checkin_method,omitempty"`
	IsLate                sql.NullBool    `json:"is_late,omitempty"`
	LivenessScore         sql.NullFloat64 `json:"liveness_score,omitempty"`
	FailureReason         sql.NullString  `json:"failure_reason,omitempty"`
}

// EventSummary is a subset of the main Event struct for embedding in other responses.
type EventSummary struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	StartTime     sql.NullTime   `json:"start_time"`
	EndTime       sql.NullTime   `json:"end_time"`
	CoverImageURL sql.NullString `json:"cover_image_url"`
	Status        string         `json:"status"`
}

// RegistrationWithEvent holds registration details along with the parent event's info.
type RegistrationWithEvent struct {
	*EventAttendee
	Event *EventSummary `json:"event"`
}

// WhitelistEntry represents an entry in the 'event_whitelists' table.
type WhitelistEntry struct {
	EventID string         `json:"event_id"`
	UserID  sql.NullString `json:"user_id,omitempty"`
	Email   sql.NullString `json:"email,omitempty"`
	Phone   sql.NullString `json:"phone,omitempty"`
	AddedBy string         `json:"added_by"`
	AddedAt time.Time      `json:"added_at"`
	Notes   sql.NullString `json:"notes,omitempty"`
}

// AttendanceSummary is a DTO for reporting.
type AttendanceSummary struct {
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

// UpcomingSessionInfo is a DTO for the notification worker.
type UpcomingSessionInfo struct {
	ID          string
	EventID     string
	EventName   string
	StartTime   time.Time
	AttendeeIDs []string
}

// EventRepository defines the data access layer for event-related operations.
type EventRepository interface {
	CreateEvent(ctx context.Context, event *Event, sessions []EventSession, hostID string, whitelistUserIDs []string) (*Event, error)
	GetEventByID(ctx context.Context, id string, userID string) (*Event, error)
	GetEventBySessionID(ctx context.Context, sessionID string) (*Event, error)
	ListEventItemsByCommunity(ctx context.Context, communityID string, userID string, statusFilter string, page, limit int) ([]*EventItem, error)
	ListEventItemsForUser(ctx context.Context, userID string, statusFilter string, page, limit int) ([]*EventItem, error)
	GetEventAttendee(ctx context.Context, eventID, userID string) (*EventAttendee, error)
	CheckRegistrationEligibility(ctx context.Context, eventID, userID string) error
	RegisterForEvent(ctx context.Context, eventID, userID, status string, formData json.RawMessage) error
	AddUsersToWhitelist(ctx context.Context, eventID string, userIDs []string, addedBy string) error
	GetPendingRegistrations(ctx context.Context, eventID string) ([]*EventAttendee, error)
	UpdateRegistrationStatus(ctx context.Context, registrationID, status string, approverID sql.NullString) error
	CancelRegistration(ctx context.Context, registrationID, userID string) error
	GetRegistrationsByUserID(ctx context.Context, userID string, status string) ([]*RegistrationWithEvent, error)
	UpdateEvent(ctx context.Context, event *Event, fieldMask []string) (*Event, error)
	IsUserInWhitelist(ctx context.Context, eventID, userID string) (bool, error)
	GetEventAttendanceSummary(ctx context.Context, eventID string) (*AttendanceSummary, error)
	GetEventAttendees(ctx context.Context, eventID, sessionID, status string) ([]*EventAttendee, error)
	GetEventSessions(ctx context.Context, eventID string) ([]EventSession, error)
	GetEventSessionByID(ctx context.Context, sessionID string) (*EventSession, error)
	GetUpcomingSessionsWithAttendees(ctx context.Context, from, to time.Time) ([]*UpcomingSessionInfo, error)
	GetActiveRecurringEvents(ctx context.Context) ([]*Event, error)
	CreateSessions(ctx context.Context, sessions []EventSession) error
	GetSessionStartTimes(ctx context.Context, eventID string) (map[time.Time]bool, error)
	GetMaxSessionNumber(ctx context.Context, eventID string) (int, error)
	DeleteEvent(ctx context.Context, eventID string) error
	HardDeleteEvent(ctx context.Context, eventID string) error
	CancelEventSession(ctx context.Context, sessionID string, reason sql.NullString) error
	IncrementEventAttendeeCount(ctx context.Context, eventID string) error
	InvalidateEventCache(ctx context.Context, eventID, userID string) error
	DecrementEventAttendeeCount(ctx context.Context, eventID string) error
	GetEventIDByRegistrationID(ctx context.Context, registrationID string) (string, error)
	GetUpcomingEventsByCommunityIDs(ctx context.Context, communityIDs []string, limit int) ([]*EventItem, error) // New method

	// Transaction management
	BeginTx(ctx context.Context) (pgx.Tx, error)
	RollbackTx(ctx context.Context, tx pgx.Tx) error
	CommitTx(ctx context.Context, tx pgx.Tx) error
}
