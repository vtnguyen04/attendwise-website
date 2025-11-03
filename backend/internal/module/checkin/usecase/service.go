package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	pb "github.com/attendwise/backend/generated/go/ai"
	"github.com/attendwise/backend/internal/module/checkin/domain"
	event_domain "github.com/attendwise/backend/internal/module/event/domain"
	user_domain "github.com/attendwise/backend/internal/module/user/domain"
	"github.com/attendwise/backend/internal/platform"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
)

// OfflineCheckinAttempt defines the structure for a single offline check-in attempt from the client.
type OfflineCheckinAttempt struct {
	QRPayload string    `json:"qr_payload" binding:"required"`
	ImageData []byte    `json:"image_data"`
	ScannedAt time.Time `json:"scanned_at" binding:"required"`
	AttemptID string    `json:"attempt_id" binding:"required"`
}

// BatchProcessResult holds the result for a single processed offline attempt.
type BatchProcessResult struct {
	AttemptID string `json:"attempt_id"`
	Success   bool   `json:"success"`
	Message   string `json:"message"`
}

// CheckinService interface updated to reflect new return values
type CheckinService interface {
	GenerateTicket(ctx context.Context, sessionID, userID, deviceFingerprint string) (string, string, error)
	VerifyCheckinFromQR(ctx context.Context, qrPayload string, imageData []byte, livenessStream []byte, challengeType string, scannerDeviceFingerprint string) (*event_domain.EventAttendee, bool, string, error)
	ManualOverrideCheckin(ctx context.Context, sessionID, userID, hostID string) (*event_domain.EventAttendee, error)
	VerifyCheckinFromFallback(ctx context.Context, fallbackCode string, imageData []byte) (*event_domain.EventAttendee, bool, string, error)
	ProcessOfflineBatch(ctx context.Context, deviceID string, attempts []OfflineCheckinAttempt) ([]BatchProcessResult, error)
}

type service struct {
	checkinRepo domain.CheckinRepository
	eventRepo   event_domain.EventRepository
	userRepo    user_domain.UserRepository
	jwtSecret   string
	aiClient    *platform.AIClient
	nc          *nats.Conn
}

func NewService(checkinRepo domain.CheckinRepository, eventRepo event_domain.EventRepository, userRepo user_domain.UserRepository, jwtSecret string, aiClient *platform.AIClient, nc *nats.Conn) CheckinService {
	return &service{
		checkinRepo: checkinRepo,
		eventRepo:   eventRepo,
		userRepo:    userRepo,
		jwtSecret:   jwtSecret,
		aiClient:    aiClient,
		nc:          nc,
	}
}

func (s *service) GenerateTicket(ctx context.Context, sessionID, userID, deviceFingerprint string) (string, string, error) {
	// 0. Get event and attendee details first
	_, attendee, err := s.checkinRepo.GetEventAndAttendeeForTicketGeneration(ctx, sessionID, userID)
	if err != nil {
		return "", "", fmt.Errorf("failed to get event and attendee for ticket generation: %w", err)
	}

	// 1. Create a nonce and fallback code
	nonce := uuid.New().String()
	fallbackCode := strings.ToUpper(uuid.New().String()[:6])

	// 2. Hash the nonce for storage
	nonceHash := s.hashNonce(nonce)

	// 3. Save the nonce hash to the check-ins table
	if err := s.checkinRepo.SaveNonce(ctx, userID, sessionID, attendee.ID, nonceHash); err != nil {
		return "", "", fmt.Errorf("could not save nonce: %w", err)
	}

	// 4. Create JWT claims
	expirationTime := time.Now().Add(10 * time.Minute)
	claims := &jwt.MapClaims{
		"sub": userID,
		"aud": sessionID,
		"jti": nonce, // The raw nonce is in the token
		"exp": expirationTime.Unix(),
		"iat": time.Now().Unix(),
	}

	// 5. Create and sign the token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", "", fmt.Errorf("could not sign token: %w", err)
	}

	// 6. Save codes and device fingerprint to the attendee record
	if err := s.checkinRepo.SaveTicketCodes(ctx, attendee.ID, signedToken, fallbackCode, deviceFingerprint); err != nil {
		log.Printf("Warning: could not save ticket codes for attendee %s: %v", attendee.ID, err)
	}

	return signedToken, fallbackCode, nil
}

func (s *service) VerifyCheckinFromQR(ctx context.Context, qrPayload string, imageData []byte, livenessStream []byte, challengeType string, scannerDeviceFingerprint string) (*event_domain.EventAttendee, bool, string, error) {
	// 1. Parse and validate claims from JWT
	claims, err := s.parseAndValidateClaims(qrPayload)
	if err != nil {
		return nil, false, "Invalid QR code", err
	}
	nonce := claims["jti"].(string)
	userID := claims["sub"].(string)
	sessionID := claims["aud"].(string)

	// 2. Get Event and Attendee details
	event, attendee, err := s.getEventAndAttendee(ctx, sessionID, userID)
	if err != nil {
		return nil, false, err.Error(), err
	}

	// 3. Check device fingerprint if applicable
	if err := s.validateDeviceFingerprint(attendee, scannerDeviceFingerprint); err != nil {
		return nil, false, err.Error(), err
	}

	// 4. Hash the nonce for DB comparison
	nonceHash := s.hashNonce(nonce)

	// 5. Atomically consume the nonce. This is the critical step for preventing duplicates.
	if err := s.checkinRepo.ConsumeNonce(ctx, userID, sessionID, nonceHash); err != nil {
		if errors.Is(err, domain.ErrNonceConsumed) {
			return nil, false, "Ticket already used.", err
		}
		return nil, false, "Failed to process ticket.", err
	}

	// If we reach here, the nonce was successfully consumed.
	// Now perform AI validations. If they fail, we update the check-in as failed.

	// 6. Perform Liveness Check (if required)
	livenessPassed := true
	livenessConfidence := 0.0
	if event.LivenessCheckRequired {
		livenessPassedResult, livenessConfidenceResult, err := s.performLivenessCheck(ctx, userID, sessionID, livenessStream, challengeType)
		if err != nil {
			log.Printf("Liveness check failed for user %s: %v", userID, err)
			s.checkinRepo.UpdateCheckinStatusAndAIResults(ctx, userID, sessionID, "failed", "qr_code", false, 0.0, false, 0.0)
			return nil, false, fmt.Sprintf("Liveness check failed: %v", err), err
		}
		livenessPassed = livenessPassedResult
		livenessConfidence = livenessConfidenceResult
	}

	// 7. Perform Face Verification (if required)
	faceVerified := false
	faceConfidence := 0.0
	if event.FaceVerificationRequired {
		verifyResp, err := s.verifyFace(ctx, userID, sessionID, imageData)
		if err != nil {
			log.Printf("Face verification failed for user %s: %v", userID, err)
			s.checkinRepo.UpdateCheckinStatusAndAIResults(ctx, userID, sessionID, "failed", "qr_code", false, 0.0, livenessPassed, livenessConfidence)
			return nil, false, fmt.Sprintf("Face verification failed: %v", err), err
		}
		faceVerified = verifyResp.Success
		faceConfidence = float64(verifyResp.Confidence)
	}

	// 8. Update check-in status in DB with AI results
	if err := s.checkinRepo.UpdateCheckinStatusAndAIResults(ctx, userID, sessionID, "success", "qr_code", faceVerified, faceConfidence, livenessPassed, livenessConfidence); err != nil {
		log.Printf("Failed to update check-in status with AI results for user %s: %v", userID, err)
		return nil, false, "Failed to finalize check-in.", err
	}

	// 9. Publish success event to NATS
	// user, _ := s.userRepo.GetUserByID(ctx, userID) // No longer needed to fetch user separately
	// Re-fetch attendee to get updated check-in details
	updatedAttendees, err := s.eventRepo.GetEventAttendees(ctx, event.ID, sessionID, "")
	if err != nil || len(updatedAttendees) == 0 {
		log.Printf("Failed to re-fetch attendee %s for event %s, session %s after check-in: %v", userID, event.ID, sessionID, err)
		return nil, false, "Check-in successful, but failed to retrieve updated attendee info.", fmt.Errorf("failed to retrieve updated attendee info")
	}
	var updatedAttendee *event_domain.EventAttendee
	for _, att := range updatedAttendees {
		if att.UserID == userID {
			updatedAttendee = att
			break
		}
	}
	if updatedAttendee == nil {
		return nil, false, "Check-in successful, but updated attendee not found.", fmt.Errorf("updated attendee not found")
	}

	s.publishCheckinEvent(sessionID, updatedAttendee, true, "Check-in successful")

	return updatedAttendee, true, "Check-in successful", nil
}

func (s *service) performLivenessCheck(ctx context.Context, userID, sessionID string, livenessStream []byte, challengeType string) (bool, float64, error) {
	if len(livenessStream) == 0 {
		s.checkinRepo.UpdateCheckinFailureReason(ctx, userID, sessionID, "missing_liveness_data")
		return false, 0.0, fmt.Errorf("liveness video data is required")
	}

	// Call AI client for liveness check
	livenessResp, aiErr := s.aiClient.SubmitLivenessVideo(ctx, sessionID, livenessStream)
	if aiErr != nil {
		s.checkinRepo.UpdateCheckinFailureReason(ctx, userID, sessionID, "ai_service_error")
		return false, 0.0, fmt.Errorf("an error occurred during liveness check: %w", aiErr)
	}
	if !livenessResp.Success {
		s.checkinRepo.UpdateCheckinFailureReason(ctx, userID, sessionID, livenessResp.FailureReason)
		return false, 0.0, fmt.Errorf("liveness check failed: %s", livenessResp.FailureReason)
	}
	// Assuming livenessResp.Confidence is available or a default value
	return true, 1.0, nil // Return true and a default confidence for now
}

func (s *service) ProcessOfflineBatch(ctx context.Context, deviceID string, attempts []OfflineCheckinAttempt) ([]BatchProcessResult, error) {
	results := make([]BatchProcessResult, 0, len(attempts))
	log.Printf("Processing offline batch of %d attempts from device %s", len(attempts), deviceID)

	for _, attempt := range attempts {
		_, success, message, err := s.VerifyCheckinFromQR(ctx, attempt.QRPayload, attempt.ImageData, nil, "", "offline_scanner_"+deviceID)

		resultMsg := message
		if err != nil {
			resultMsg = fmt.Sprintf("%s: %s", message, err.Error())
		}

		results = append(results, BatchProcessResult{
			AttemptID: attempt.AttemptID,
			Success:   success,
			Message:   resultMsg,
		})
	}

	log.Printf("Finished processing offline batch for device %s", deviceID)
	return results, nil
}

func (s *service) VerifyCheckinFromFallback(ctx context.Context, fallbackCode string, imageData []byte) (*event_domain.EventAttendee, bool, string, error) {
	attendee, err := s.checkinRepo.GetAttendeeByFallbackCode(ctx, fallbackCode)
	if err != nil {
		return nil, false, "Invalid fallback code.", err
	}

	event, err := s.eventRepo.GetEventByID(ctx, attendee.EventID, attendee.UserID)
	if err != nil {
		return nil, false, "Cannot find event for this registration.", err
	}
	if len(event.Sessions) == 0 {
		return nil, false, "Event has no sessions.", fmt.Errorf("no sessions found for event %s", event.ID)
	}
	sessionID := event.Sessions[0].ID

	if event.FaceVerificationRequired {
		if _, err := s.verifyFace(ctx, attendee.UserID, sessionID, imageData); err != nil {
			return nil, false, err.Error(), err
		}
	}

	if err := s.checkinRepo.ConsumeFallbackCode(ctx, fallbackCode); err != nil {
		return nil, false, "Failed to consume fallback code.", err
	}

	if err := s.checkinRepo.ConfirmCheckin(ctx, attendee.UserID, sessionID, "fallback_code"); err != nil {
		return nil, false, "Failed to update check-in status.", err
	}

	// After successful check-in, fetch the updated EventAttendee
	updatedAttendees, err := s.eventRepo.GetEventAttendees(ctx, event.ID, sessionID, "") // Fetch for the specific session
	if err != nil || len(updatedAttendees) == 0 {
		log.Printf("Could not get updated attendee %s for event %s, session %s: %v", attendee.UserID, event.ID, sessionID, err)
		return nil, false, "Failed to retrieve updated attendee info.", fmt.Errorf("failed to retrieve updated attendee info")
	}
	// Find the specific attendee
	var attendeeToReturn *event_domain.EventAttendee
	for _, att := range updatedAttendees {
		if att.UserID == attendee.UserID {
			attendeeToReturn = att
			break
		}
	}
	if attendeeToReturn == nil {
		return nil, false, "Updated attendee not found after fallback check-in.", fmt.Errorf("updated attendee not found after fallback check-in")
	}

	s.publishCheckinEvent(sessionID, attendeeToReturn, true, "Check-in successful via fallback code")

	return attendeeToReturn, true, "Check-in successful via fallback code", nil
}

func (s *service) ManualOverrideCheckin(ctx context.Context, sessionID, userID, hostID string) (*event_domain.EventAttendee, error) {
	event, err := s.eventRepo.GetEventBySessionID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("event not found for session")
	}
	if event.CreatedBy != hostID {
		return nil, fmt.Errorf("unauthorized: only the event host can perform manual override")
	}
	attendee, err := s.eventRepo.GetEventAttendee(ctx, event.ID, userID)
	if err != nil {
		return nil, fmt.Errorf("user is not registered for this event")
	}

	if err := s.checkinRepo.OverrideCheckinStatus(ctx, userID, sessionID, attendee.ID); err != nil {
		return nil, err
	}

	// After successful override, fetch the updated EventAttendee
	updatedAttendees, err := s.eventRepo.GetEventAttendees(ctx, event.ID, sessionID, "") // Fetch for the specific session
	if err != nil || len(updatedAttendees) == 0 {
		log.Printf("Could not get updated attendee %s for event %s, session %s: %v", userID, event.ID, sessionID, err)
		return nil, fmt.Errorf("failed to retrieve updated attendee info")
	}
	// Find the specific attendee
	var attendeeToReturn *event_domain.EventAttendee
	for _, att := range updatedAttendees {
		if att.UserID == userID {
			attendeeToReturn = att
			break
		}
	}
	if attendeeToReturn == nil {
		return nil, fmt.Errorf("updated attendee not found after manual check-in")
	}

	s.publishCheckinEvent(sessionID, attendeeToReturn, true, "Checked in by host")

	return attendeeToReturn, nil
}

func (s *service) publishCheckinEvent(sessionID string, attendee *event_domain.EventAttendee, success bool, message string) {
	if s.nc == nil {
		return
	}

	var userID, userName, profileURL string
	if attendee != nil {
		userID = attendee.UserID
		userName = attendee.UserName
		profileURL = attendee.UserProfilePictureURL.String
	}

	eventPayload := gin.H{
		"session_id":   sessionID,
		"user_id":      userID,
		"user_name":    userName,
		"profile_url":  profileURL,
		"success":      success,
		"message":      message,
		"checkin_time": time.Now(),
	}

	payloadBytes, err := json.Marshal(eventPayload)
	if err != nil {
		log.Printf("[ERROR] Error marshalling NATS check-in event: %v", err)
		return
	}

	subject := fmt.Sprintf("checkin.updates.%s", sessionID)
	if err := s.nc.Publish(subject, payloadBytes); err != nil {
		log.Printf("[ERROR] Error publishing NATS check-in event: %v", err)
	}
}

// --- Helper methods for VerifyCheckinFromQR ---

func (s *service) parseAndValidateClaims(qrPayload string) (jwt.MapClaims, error) {
	claims := jwt.MapClaims{}
	_, _, err := new(jwt.Parser).ParseUnverified(qrPayload, claims)
	if err != nil {
		return nil, fmt.Errorf("cannot parse JWT claims: %w", err)
	}

	if _, ok := claims["jti"].(string); !ok {
		return nil, fmt.Errorf("missing or invalid 'jti' claim")
	}
	if _, ok := claims["sub"].(string); !ok {
		return nil, fmt.Errorf("missing or invalid 'sub' claim")
	}
	if _, ok := claims["aud"].(string); !ok {
		return nil, fmt.Errorf("missing or invalid 'aud' claim")
	}

	if exp, ok := claims["exp"].(float64); ok {
		if time.Unix(int64(exp), 0).Before(time.Now()) {
			return nil, fmt.Errorf("token has expired")
		}
	} else {
		return nil, fmt.Errorf("missing or invalid 'exp' claim")
	}

	return claims, nil
}

func (s *service) getEventAndAttendee(ctx context.Context, sessionID, userID string) (*event_domain.Event, *event_domain.EventAttendee, error) {
	event, err := s.eventRepo.GetEventBySessionID(ctx, sessionID)
	if err != nil {
		return nil, nil, fmt.Errorf("cannot find event for this session")
	}
	attendee, err := s.eventRepo.GetEventAttendee(ctx, event.ID, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("user is not registered for this event")
	}
	return event, attendee, nil
}

func (s *service) validateDeviceFingerprint(attendee *event_domain.EventAttendee, scannerDeviceFingerprint string) error {
	if attendee.QRDeviceBinding.Valid && attendee.QRDeviceBinding.String != "" {
		if attendee.QRDeviceBinding.String != scannerDeviceFingerprint {
			return fmt.Errorf("device mismatch. This ticket is bound to another device")
		}
	}
	return nil
}

func (s *service) hashNonce(nonce string) string {
	hasher := sha256.New()
	hasher.Write([]byte(nonce))
	return hex.EncodeToString(hasher.Sum(nil))
}

func (s *service) verifyFace(ctx context.Context, userID, sessionID string, imageData []byte) (*pb.RecognizeFaceResponse, error) {
	if len(imageData) == 0 {
		s.checkinRepo.UpdateCheckinFailureReason(ctx, userID, sessionID, "missing_image_data")
		return nil, fmt.Errorf("face image data is required for verification")
	}

	storedEmbedding, err := s.userRepo.GetActiveFaceEmbedding(ctx, userID)
	if err != nil {
		s.checkinRepo.UpdateCheckinFailureReason(ctx, userID, sessionID, "enrollment_not_found")
		return nil, fmt.Errorf("could not retrieve face enrollment data")
	}

	verifyResp, aiErr := s.aiClient.RecognizeFace(ctx, imageData, storedEmbedding.Embedding)
	if aiErr != nil {
		s.checkinRepo.UpdateCheckinFailureReason(ctx, userID, sessionID, "ai_service_error")
		return nil, fmt.Errorf("an error occurred during face verification")
	}
	if !verifyResp.Success {
		s.checkinRepo.UpdateCheckinFailureReason(ctx, userID, sessionID, "face_mismatch")
		return nil, fmt.Errorf("face verification failed: Your face does not match")
	}
	return verifyResp, nil
}
