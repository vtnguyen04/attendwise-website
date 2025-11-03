package domain

import (
	"time"
)

// Session represents a single session within an event.
type Session struct {
	ID        string    `json:"id"`
	EventID   string    `json:"event_id"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Event represents an event in a community.
type Event struct {
	ID                       string     `json:"id"`
	CommunityID              string     `json:"community_id"`
	CreatedBy                string     `json:"created_by"`
	Name                     string     `json:"name"`
	Description              string     `json:"description,omitempty"`
	Location                 string     `json:"location,omitempty"`
	CoverImageURL            string     `json:"cover_image_url,omitempty"`
	Status                   string     `json:"status"`
	Fee                      float64    `json:"fee"`
	MaxAttendees             int        `json:"max_attendees"`
	FaceVerificationRequired bool       `json:"face_verification_required"`
	HostName                 string     `json:"host_name,omitempty"`
	HostAvatarURL            string     `json:"host_avatar_url,omitempty"`
	RegisteredAttendees      int        `json:"registered_attendees"`
	Sessions                 []*Session `json:"sessions,omitempty"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}
