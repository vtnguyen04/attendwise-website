package domain

import (
	"context"

	event_domain "github.com/attendwise/backend/internal/module/event/domain"
)

// CheckinRepository defines the interface for check-in data persistence.
type CheckinRepository interface {
	// SaveNonce stores a nonce for a specific user and session to prevent replay attacks.
	SaveNonce(ctx context.Context, userID, sessionID, attendeeID, nonceHash string) error
	// CheckNonce verifies if a nonce is valid.
	CheckNonce(ctx context.Context, userID, sessionID, nonceHash string) error
	// ConsumeNonce consumes a nonce.
	ConsumeNonce(ctx context.Context, userID, sessionID, nonceHash string) error
	// UpdateCheckinFailureReason records the reason for a failed check-in attempt.
	UpdateCheckinFailureReason(ctx context.Context, userID, sessionID, reason string) error
	// OverrideCheckinStatus manually sets a user's check-in status for a session.
	OverrideCheckinStatus(ctx context.Context, userID, sessionID, attendeeID string) error
	// SaveTicketCodes stores the generated QR token and fallback code for an attendee.
	SaveTicketCodes(ctx context.Context, attendeeID, qrToken, fallbackCode, deviceFingerprint string) error
	// GetAttendeeByFallbackCode finds an attendee using their unique fallback code.
	GetAttendeeByFallbackCode(ctx context.Context, code string) (*event_domain.EventAttendee, error)
	// ConsumeFallbackCode nullifies a fallback code after use.
	ConsumeFallbackCode(ctx context.Context, code string) error
	// ConfirmCheckin marks a pending check-in as successful.
	ConfirmCheckin(ctx context.Context, userID, sessionID, method string) error
	// UpdateCheckinStatusAndAIResults updates the check-in record with final status and AI verification results.
	UpdateCheckinStatusAndAIResults(ctx context.Context, userID, sessionID, status, method string, faceVerified bool, faceConfidence float64, livenessPassed bool, livenessConfidence float64) error
	// GetEventAndAttendeeForTicketGeneration retrieves event and attendee details for ticket generation.
	GetEventAndAttendeeForTicketGeneration(ctx context.Context, sessionID, userID string) (*event_domain.Event, *event_domain.EventAttendee, error) // New method
}