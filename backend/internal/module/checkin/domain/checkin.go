package domain

import (
	"errors"
	"time"
)

var (
	ErrNonceConsumed = errors.New("nonce has already been consumed or is invalid")
)

// Ticket represents the data encoded in the check-in QR code.
type Ticket struct {
	UserID    string    `json:"user_id"`
	SessionID string    `json:"session_id"`
	Nonce     string    `json:"nonce"`
	ExpiresAt time.Time `json:"expires_at"`
}