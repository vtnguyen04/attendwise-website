package domain

import (
	"context"
	"database/sql"
)

// ReportRepository defines the interface for the report data access layer.
type ReportRepository interface {
	GetSessionAttendanceDetails(ctx context.Context, sessionID, statusFilter string) ([]*SessionAttendeeDetail, error)
	GetEventAttendanceDetails(ctx context.Context, eventID string) ([]*SessionAttendeeDetail, error)
	ExportEventAttendanceCSV(ctx context.Context, eventID string) ([]byte, error)
	GetEventAttendanceReport(ctx context.Context, eventID string) (*EventAttendanceReport, error)
	ExportEventAttendanceReportPDF(ctx context.Context, eventID string) ([]byte, error)
	GetMonthlySummary(ctx context.Context) (*MonthlySummary, error)
	GetCommunityEngagementReport(ctx context.Context, communityID string) (*CommunityEngagementReport, error)
}

// ReportService defines the interface for the report business logic.
type ReportService interface {
	GetSessionAttendanceDetails(ctx context.Context, sessionID, statusFilter string) ([]*SessionAttendeeDetail, error)
	ExportEventAttendanceCSV(ctx context.Context, eventID string) ([]byte, error)
	GetEventAttendanceReport(ctx context.Context, eventID string) (*EventAttendanceReport, error)
	ExportEventAttendanceReportPDF(ctx context.Context, eventID string) ([]byte, error)
	GetMonthlySummary(ctx context.Context) (*MonthlySummary, error)
	GetCommunityEngagementReport(ctx context.Context, userID, communityID string) (*CommunityEngagementReport, error)
}

// SessionAttendeeDetail represents the detailed check-in information for a single attendee in a session.
type SessionAttendeeDetail struct {
	UserID                string         `json:"user_id"`
	UserName              string         `json:"user_name"`
	UserEmail             string         `json:"user_email"`
	Role                  string         `json:"role"`
	UserProfilePictureURL sql.NullString `json:"user_profile_picture_url,omitempty"`
	CheckinID             string         `json:"checkin_id"`
	Status                string         `json:"status"`
	CheckinTime           sql.NullTime   `json:"checkin_time,omitempty"`
	IsLate                sql.NullBool   `json:"is_late,omitempty"`
	LivenessScore         sql.NullFloat64 `json:"liveness_score,omitempty"`
	FaceConfidenceScore   sql.NullFloat64 `json:"face_confidence_score,omitempty"`
	FailureReason         sql.NullString `json:"failure_reason,omitempty"`
}

// EventAttendanceReport represents the summary of attendance for an event.
type EventAttendanceReport struct {
	TotalRegistrations   int     `json:"total_registrations"`
	TotalAttendees       int     `json:"total_attendees"`
	AttendanceRate       float64 `json:"attendance_rate"`
	CheckinSuccessRate   float64 `json:"checkin_success_rate"`
	CheckinFailureRate   float64 `json:"checkin_failure_rate"`
	AbsenceRate          float64 `json:"absence_rate"`
}

// MonthlySummary represents a summary of event activity for a given month.
type MonthlySummary struct {
	Month               string  `json:"month"`
	TotalEvents         int     `json:"total_events"`
	TotalAttendees      int     `json:"total_attendees"`
	AverageAttendanceRate float64 `json:"average_attendance_rate"`
}