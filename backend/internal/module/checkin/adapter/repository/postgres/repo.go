package postgres

import (
	"context"
	"fmt"

	"github.com/attendwise/backend/internal/module/checkin/domain"
	event_domain "github.com/attendwise/backend/internal/module/event/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CheckinRepository struct {
	db *pgxpool.Pool
}

func NewCheckinRepository(db *pgxpool.Pool) domain.CheckinRepository {
	return &CheckinRepository{db: db}
}

func (r *CheckinRepository) GetEventAndAttendeeForTicketGeneration(ctx context.Context, sessionID, userID string) (*event_domain.Event, *event_domain.EventAttendee, error) {
	query := `
		SELECT
			e.id, e.community_id, e.created_by, e.name, e.slug, e.description, e.cover_image_url,
			e.location_type, e.location_address, e.online_meeting_url, e.timezone, e.start_time, e.end_time,
			e.is_recurring, e.recurrence_pattern, e.recurrence_rule, e.recurrence_end_date, e.max_occurrences,
			e.max_attendees, e.current_attendees, e.waitlist_enabled, e.max_waitlist, e.registration_required,
			e.registration_opens_at, e.registration_closes_at, e.whitelist_only, e.require_approval,
			e.face_verification_required, e.liveness_check_required, e.qr_code_enabled, e.fallback_code_enabled, e.manual_checkin_allowed,
			e.is_paid, e.fee, e.currency, e.status, e.reminder_schedule,
			e.total_sessions, e.total_registrations, e.created_at, e.updated_at, e.published_at, e.deleted_at,
			c.type as community_type, u.name as created_by_name, u.profile_picture_url as created_by_avatar,
			TRUE AS is_registered, -- Always true for this context

			ea.id as attendee_id, ea.event_id as attendee_event_id, ea.user_id as attendee_user_id, ea.role as attendee_role, ea.status as attendee_status,
			ea.registration_form_data, ea.registration_source, ea.payment_status, ea.payment_amount, ea.payment_id,
			ea.face_sample_provided, ea.face_sample_quality_score, ea.qr_code_token, ea.fallback_code,
			ea.qr_device_binding, ea.registered_at, ea.approved_at, ea.approved_by, ea.cancelled_at,
			ua.name as attendee_user_name, ua.email as attendee_user_email, ua.profile_picture_url as attendee_user_profile_picture_url,
			NULL as checkin_id, NULL as checkin_time, NULL as checkin_method, NULL as is_late, NULL as liveness_score, NULL as failure_reason
		FROM event_sessions es
		JOIN events e ON es.event_id = e.id
		JOIN users u ON e.created_by = u.id
		LEFT JOIN communities c ON e.community_id = c.id
		JOIN event_attendees ea ON e.id = ea.event_id AND ea.user_id = $2
		JOIN users ua ON ea.user_id = ua.id
		WHERE es.id = $1 AND e.deleted_at IS NULL AND ea.status = 'registered'
	`

	row := r.db.QueryRow(ctx, query, sessionID, userID)

	var event event_domain.Event
	var attendee event_domain.EventAttendee

	// Scan event fields
	err := row.Scan(
		&event.ID, &event.CommunityID, &event.CreatedBy, &event.Name, &event.Slug, &event.Description, &event.CoverImageURL,
		&event.LocationType, &event.LocationAddress, &event.OnlineMeetingURL, &event.Timezone, &event.StartTime, &event.EndTime,
		&event.IsRecurring, &event.RecurrencePattern, &event.RecurrenceRule, &event.RecurrenceEndDate, &event.MaxOccurrences,
		&event.MaxAttendees, &event.CurrentAttendees, &event.WaitlistEnabled, &event.MaxWaitlist, &event.RegistrationRequired,
		&event.RegistrationOpensAt, &event.RegistrationClosesAt, &event.WhitelistOnly, &event.RequireApproval,
		&event.FaceVerificationRequired, &event.LivenessCheckRequired, &event.QRCodeEnabled, &event.FallbackCodeEnabled, &event.ManualCheckinAllowed,
		&event.IsPaid, &event.Fee, &event.Currency, &event.Status, &event.ReminderSchedule,
		&event.TotalSessions, &event.TotalRegistrations, &event.CreatedAt, &event.UpdatedAt, &event.PublishedAt, &event.DeletedAt,
		&event.CommunityType, &event.CreatedByName, &event.CreatedByAvatar,
		&event.IsRegistered,

		// Scan attendee fields
		&attendee.ID, &attendee.EventID, &attendee.UserID, &attendee.Role, &attendee.Status,
		&attendee.RegistrationFormData, &attendee.RegistrationSource, &attendee.PaymentStatus, &attendee.PaymentAmount, &attendee.PaymentID,
		&attendee.FaceSampleProvided, &attendee.FaceSampleQualityScore, &attendee.QRCodeToken, &attendee.FallbackCode,
		&attendee.QRDeviceBinding, &attendee.RegisteredAt, &attendee.ApprovedAt, &attendee.ApprovedBy, &attendee.CancelledAt,
		&attendee.UserName, &attendee.UserEmail, &attendee.UserProfilePictureURL,
		&attendee.CheckinID, &attendee.CheckinTime, &attendee.CheckinMethod, &attendee.IsLate, &attendee.LivenessScore, &attendee.FailureReason,
	)

	if err != nil {
		return nil, nil, fmt.Errorf("failed to get event and attendee for ticket generation: %w", err)
	}

	return &event, &attendee, nil
}

func (r *CheckinRepository) SaveNonce(ctx context.Context, userID, sessionID, attendeeID, nonceHash string) error {
	query := `
		INSERT INTO event_session_checkins (id, user_id, session_id, attendee_id, nonce_hash, status, method) 
		VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', 'qr_code')
		ON CONFLICT (user_id, session_id) DO UPDATE 
		SET nonce_hash = EXCLUDED.nonce_hash, status = 'pending', updated_at = NOW(), method = 'qr_code'
	`
	_, err := r.db.Exec(ctx, query, userID, sessionID, attendeeID, nonceHash)
	if err != nil {
		return fmt.Errorf("failed to save nonce: %w", err)
	}
	return nil
}

func (r *CheckinRepository) CheckNonce(ctx context.Context, userID, sessionID, nonceHash string) error {
	query := `
		SELECT 1
		FROM event_session_checkins
		WHERE user_id = $1 AND session_id = $2 AND nonce_hash = $3 AND status = 'pending'
	`
	var exists int
	err := r.db.QueryRow(ctx, query, userID, sessionID, nonceHash).Scan(&exists)
	if err != nil {
		return fmt.Errorf("invalid or already used nonce")
	}
	return nil
}

func (r *CheckinRepository) ConsumeNonce(ctx context.Context, userID, sessionID, nonceHash string) error {
	query := `
		UPDATE event_session_checkins
		SET status = 'success', method = 'qr_code', nonce_hash = NULL, updated_at = NOW(), checkin_time = NOW()
		WHERE user_id = $1 AND session_id = $2 AND nonce_hash = $3 AND status = 'pending'
	`
	result, err := r.db.Exec(ctx, query, userID, sessionID, nonceHash)
	if err != nil {
		return fmt.Errorf("failed to execute nonce consumption: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.ErrNonceConsumed // Return a specific domain error
	}
	return nil
}

func (r *CheckinRepository) UpdateCheckinFailureReason(ctx context.Context, userID, sessionID, reason string) error {
	query := `
		UPDATE event_session_checkins
		SET status = 'failed', failure_reason = $3, updated_at = NOW()
		WHERE user_id = $1 AND session_id = $2
	`
	_, err := r.db.Exec(ctx, query, userID, sessionID, reason)
	if err != nil {
		return fmt.Errorf("failed to update failure reason: %w", err)
	}
	return nil
}

func (r *CheckinRepository) SaveTicketCodes(ctx context.Context, attendeeID, qrToken, fallbackCode, deviceFingerprint string) error {
	query := `
		UPDATE event_attendees 
		SET qr_code_token = $1, fallback_code = $2, qr_device_binding = $3
		WHERE id = $4`
	_, err := r.db.Exec(ctx, query, qrToken, fallbackCode, deviceFingerprint, attendeeID)
	return err
}

func (r *CheckinRepository) GetAttendeeByFallbackCode(ctx context.Context, code string) (*event_domain.EventAttendee, error) {
	var attendee event_domain.EventAttendee
	query := "SELECT id, event_id, user_id FROM event_attendees WHERE fallback_code = $1"
	err := r.db.QueryRow(ctx, query, code).Scan(&attendee.ID, &attendee.EventID, &attendee.UserID)
	if err != nil {
		return nil, fmt.Errorf("attendee not found for fallback code: %w", err)
	}
	return &attendee, nil
}

func (r *CheckinRepository) ConsumeFallbackCode(ctx context.Context, code string) error {
	query := "UPDATE event_attendees SET fallback_code = NULL WHERE fallback_code = $1"
	_, err := r.db.Exec(ctx, query, code)
	return err
}

func (r *CheckinRepository) ConfirmCheckin(ctx context.Context, userID, sessionID, method string) error {
	// Start a transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction for ConfirmCheckin: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Update event_session_checkins
	queryCheckin := `
		UPDATE event_session_checkins 
		SET status = 'success', method = $3, checkin_time = NOW(), updated_at = NOW() 
		WHERE user_id = $1 AND session_id = $2 AND status = 'pending'`
	commandTagCheckin, err := tx.Exec(ctx, queryCheckin, userID, sessionID, method)
	if err != nil {
		return fmt.Errorf("failed to update event_session_checkins: %w", err)
	}
	if commandTagCheckin.RowsAffected() == 0 {
		return fmt.Errorf("no pending check-in found to confirm")
	}

	// 2. Update event_attendees status to 'attended'
	queryAttendee := `
		UPDATE event_attendees 
		SET status = 'attended' 
		WHERE user_id = $1 AND event_id = (SELECT event_id FROM event_sessions WHERE id = $2)
	`
	_, err = tx.Exec(ctx, queryAttendee, userID, sessionID)
	if err != nil {
		return fmt.Errorf("failed to update event_attendees status: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *CheckinRepository) OverrideCheckinStatus(ctx context.Context, userID, sessionID, attendeeID string) error {
	// Start a transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction for OverrideCheckinStatus: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Insert/Update event_session_checkins
	queryCheckin := `
		INSERT INTO event_session_checkins (id, user_id, session_id, attendee_id, status, method, checkin_time)
		VALUES (gen_random_uuid(), $1, $2, $3, 'success', 'manual', NOW())
		ON CONFLICT (user_id, session_id) DO UPDATE
		SET status = 'success', 
		    method = 'manual', 
		    checkin_time = NOW(), 
		    updated_at = NOW()
	`
	_, err = tx.Exec(ctx, queryCheckin, userID, sessionID, attendeeID)
	if err != nil {
		return fmt.Errorf("failed to override check-in status in event_session_checkins: %w", err)
	}

	// 2. Update event_attendees status to 'attended'
	queryAttendee := `
		UPDATE event_attendees 
		SET status = 'attended' 
		WHERE user_id = $1 AND event_id = (SELECT event_id FROM event_sessions WHERE id = $2)
	`
	_, err = tx.Exec(ctx, queryAttendee, userID, sessionID)
	if err != nil {
		return fmt.Errorf("failed to update event_attendees status: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *CheckinRepository) UpdateCheckinStatusAndAIResults(ctx context.Context, userID, sessionID, status, method string, faceVerified bool, faceConfidence float64, livenessPassed bool, livenessConfidence float64) error {
	// Start a transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction for UpdateCheckinStatusAndAIResults: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Update event_session_checkins
	queryCheckin := `
		UPDATE event_session_checkins
		SET
			status = CAST($3 AS checkin_status),
			method = CAST($4 AS checkin_method),
			checkin_time = NOW(),
			face_verification_passed = $5,
			face_confidence_score = $6,
			liveness_check_passed = $7,
			liveness_score = $8,
			updated_at = NOW()
		WHERE user_id = $1 AND session_id = $2
	`
	_, err = tx.Exec(ctx, queryCheckin, userID, sessionID, status, method, faceVerified, faceConfidence, livenessPassed, livenessConfidence)
	if err != nil {
		return fmt.Errorf("failed to update event_session_checkins: %w", err)
	}

	// 2. Update event_attendees status to 'attended'
	queryAttendee := `
		UPDATE event_attendees
		SET status = 'attended'
		WHERE user_id = $1 AND event_id = (SELECT event_id FROM event_sessions WHERE id = $2)
	`
	_, err = tx.Exec(ctx, queryAttendee, userID, sessionID)
	if err != nil {
		return fmt.Errorf("failed to update event_attendees status: %w", err)
	}

	return tx.Commit(ctx)
}
