package domain

import "time"

// User represents a user in the system.

type User struct {
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	Email             string    `json:"email"`
	Company           string    `json:"company,omitempty"`
	Title             string    `json:"title,omitempty"`
	ProfilePictureURL string    `json:"profile_picture_url,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// Community represents a community in the system.

type Community struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description,omitempty"`
	CoverImageURL   string    `json:"cover_image_url,omitempty"`
	Type            string    `json:"type"`
	MemberCount     int       `json:"member_count"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Event represents an event in the system.

type Event struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description,omitempty"`
	CoverImageURL   string    `json:"cover_image_url,omitempty"`
	StartTime       time.Time `json:"start_time"`
	EndTime         time.Time `json:"end_time"`
	CommunityID     string    `json:"community_id"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
