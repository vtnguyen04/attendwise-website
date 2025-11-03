package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/attendwise/backend/internal/module/event/domain"
	permission_domain "github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// eventRepository implements the domain.EventRepository interface using PostgreSQL.
type eventRepository struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

// NewEventRepository creates a new EventRepository.
func NewEventRepository(db *pgxpool.Pool, redis *redis.Client) domain.EventRepository {
	return &eventRepository{db: db, redis: redis}
}

// --- Helper functions for scanning ---

func (r *eventRepository) scanEvent(scanner pgx.Row, event *domain.Event) error {
	// The 'sessions' field is omitted as it's populated separately
	return scanner.Scan(
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
	)
}

func (r *eventRepository) scanEventSession(scanner pgx.Row, session *domain.EventSession) error {
	return scanner.Scan(
		&session.ID, &session.EventID, &session.SessionNumber, &session.Name, &session.StartTime, &session.EndTime, &session.Timezone,
		&session.LocationOverride, &session.OnlineMeetingURLOverride, &session.CheckinOpensAt, &session.CheckinClosesAt,
		&session.MaxAttendeesOverride, &session.FaceVerificationRequiredOverride, &session.IsCancelled, &session.CancellationReason,
		&session.TotalCheckins, &session.TotalNoShows, &session.CreatedAt, &session.UpdatedAt,
	)
}

func (r *eventRepository) scanEventAttendee(scanner pgx.Row, attendee *domain.EventAttendee) error {
	// This helper needs to handle the possibility of check-in fields being NULL
	return scanner.Scan(
		&attendee.ID, &attendee.EventID, &attendee.UserID, &attendee.Role, &attendee.Status, &attendee.RegistrationFormData,
		&attendee.RegistrationSource, &attendee.PaymentStatus, &attendee.PaymentAmount, &attendee.PaymentID,
		&attendee.FaceSampleProvided, &attendee.FaceSampleQualityScore, &attendee.QRCodeToken, &attendee.FallbackCode,
		&attendee.QRDeviceBinding, &attendee.RegisteredAt, &attendee.ApprovedAt, &attendee.ApprovedBy, &attendee.CancelledAt,
		&attendee.UserName, &attendee.UserEmail, &attendee.UserProfilePictureURL,
		// New check-in fields
		&attendee.CheckinID, &attendee.CheckinTime, &attendee.CheckinMethod, &attendee.IsLate, &attendee.LivenessScore, &attendee.FailureReason,
	)
}

// GetEventAttendees retrieves a list of attendees for an event, optionally filtered by session and status.
func (r *eventRepository) CheckRegistrationEligibility(ctx context.Context, eventID, userID string) error {
	var communityID string
	var registrationRequired, whitelistOnly, requireApproval bool
	var registrationOpensAt, registrationClosesAt sql.NullTime
	var maxAttendees sql.NullInt32
	var currentAttendees int
	var isMember, isWhitelisted, isRegistered bool

	query := `
		SELECT
			e.community_id,
			e.registration_required,
			e.whitelist_only,
			e.require_approval,
			e.registration_opens_at,
			e.registration_closes_at,
			e.max_attendees,
			e.current_attendees,
			EXISTS(SELECT 1 FROM community_members cm WHERE cm.community_id = e.community_id AND cm.user_id = $2 AND cm.status = 'active'),
			EXISTS(SELECT 1 FROM event_whitelists ew WHERE ew.event_id = e.id AND ew.user_id = $2),
			EXISTS(SELECT 1 FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = $2 AND ea.status = 'registered')
		FROM events e
		WHERE e.id = $1
	`
	err := r.db.QueryRow(ctx, query, eventID, userID).Scan(
		&communityID,
		&registrationRequired,
		&whitelistOnly,
		&requireApproval,
		&registrationOpensAt,
		&registrationClosesAt,
		&maxAttendees,
		&currentAttendees,
		&isMember,
		&isWhitelisted,
		&isRegistered,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrEventNotFound
		}
		return fmt.Errorf("failed to check registration eligibility: %w", err)
	}

	if !isMember {
		return permission_domain.ErrPermissionDenied
	}

	now := time.Now()
	if registrationOpensAt.Valid && now.Before(registrationOpensAt.Time) {
		return fmt.Errorf("registration has not opened yet")
	}
	if registrationClosesAt.Valid && now.After(registrationClosesAt.Time) {
		return domain.ErrRegistrationClosed
	}

	if whitelistOnly && !isWhitelisted {
		return domain.ErrWhitelistOnly
	}

	if maxAttendees.Valid && currentAttendees >= int(maxAttendees.Int32) {
		return domain.ErrEventFull
	}

	if isRegistered {
		return domain.ErrAlreadyRegistered
	}

	return nil
}

func (r *eventRepository) GetEventAttendees(ctx context.Context, eventID, sessionID, status string) ([]*domain.EventAttendee, error) {
	var queryBuilder strings.Builder
	args := []interface{}{eventID}

	queryBuilder.WriteString(`
		SELECT
			ea.id, ea.event_id, ea.user_id, ea.role, ea.status, ea.registration_form_data,
			ea.registration_source, ea.payment_status, ea.payment_amount, ea.payment_id,
			ea.face_sample_provided, ea.face_sample_quality_score, ea.qr_code_token, ea.fallback_code,
			ea.qr_device_binding, ea.registered_at, ea.approved_at, ea.approved_by, ea.cancelled_at,
			u.name as user_name, u.email as user_email, u.profile_picture_url as user_profile_picture_url,
			esc.id as checkin_id, esc.checkin_time, esc.method as checkin_method, esc.is_late, esc.liveness_score, esc.failure_reason
		FROM event_attendees ea
		JOIN users u ON ea.user_id = u.id
	`)

	// If a sessionID is provided, join with check-ins for that session
	if sessionID != "" {
		queryBuilder.WriteString(` LEFT JOIN event_session_checkins esc ON ea.user_id = esc.user_id AND esc.session_id = $2`)
		args = append(args, sessionID)
	} else {
		// If no sessionID, we can't fetch specific check-in data, so return NULLs
		queryBuilder.WriteString(` LEFT JOIN (SELECT NULL AS id, NULL AS checkin_time, NULL AS method, NULL AS is_late, NULL AS liveness_score, NULL AS failure_reason) esc ON FALSE`)
	}

	queryBuilder.WriteString(` WHERE ea.event_id = $1`)

	if status != "" {
		queryBuilder.WriteString(fmt.Sprintf(" AND ea.status = $%d", len(args)+1))
		args = append(args, status)
	}

	queryBuilder.WriteString(" ORDER BY ea.registered_at ASC")

	rows, err := r.db.Query(ctx, queryBuilder.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get event attendees: %w", err)
	}
	defer rows.Close()

	var attendees []*domain.EventAttendee
	for rows.Next() {
		var attendee domain.EventAttendee
		if err := r.scanEventAttendee(rows, &attendee); err != nil {
			return nil, fmt.Errorf("failed to scan event attendee: %w", err)
		}
		attendees = append(attendees, &attendee)
	}
	return attendees, nil
}

// CreateEvent inserts a new event, its initial sessions, host, and whitelist into the database within a single transaction.
func (r *eventRepository) CreateEvent(ctx context.Context, event *domain.Event, sessions []domain.EventSession, hostID string, whitelistUserIDs []string) (*domain.Event, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Insert the main event
	eventQuery := `
		INSERT INTO events (
			id, community_id, created_by, name, slug, description, cover_image_url,
			location_type, location_address, online_meeting_url, timezone, start_time, end_time,
			is_recurring, recurrence_pattern, recurrence_rule, recurrence_end_date, max_occurrences,
			max_attendees, waitlist_enabled, max_waitlist, registration_required,
			registration_opens_at, registration_closes_at, whitelist_only, require_approval,
			face_verification_required, liveness_check_required, qr_code_enabled, fallback_code_enabled, manual_checkin_allowed,
			is_paid, fee, currency, status, reminder_schedule
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
			$19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
		) RETURNING created_at, updated_at, published_at`

	err = tx.QueryRow(ctx, eventQuery,
		event.ID, event.CommunityID, hostID, event.Name, event.Slug, event.Description, event.CoverImageURL,
		event.LocationType, event.LocationAddress, event.OnlineMeetingURL, event.Timezone, event.StartTime, event.EndTime,
		event.IsRecurring, event.RecurrencePattern, event.RecurrenceRule, event.RecurrenceEndDate, event.MaxOccurrences,
		event.MaxAttendees, event.WaitlistEnabled, event.MaxWaitlist, event.RegistrationRequired,
		event.RegistrationOpensAt, event.RegistrationClosesAt, event.WhitelistOnly, event.RequireApproval,
		event.FaceVerificationRequired, event.LivenessCheckRequired, event.QRCodeEnabled, event.FallbackCodeEnabled, event.ManualCheckinAllowed,
		event.IsPaid, event.Fee, event.Currency, event.Status, event.ReminderSchedule,
	).Scan(&event.CreatedAt, &event.UpdatedAt, &event.PublishedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to insert event: %w", err)
	}

	// 2. Insert event sessions
	if len(sessions) > 0 {
		rows := make([][]interface{}, len(sessions))
		for i, s := range sessions {
			rows[i] = []interface{}{s.ID, event.ID, s.SessionNumber, s.Name, s.StartTime, s.EndTime, s.Timezone,
				s.LocationOverride, s.OnlineMeetingURLOverride, s.CheckinOpensAt, s.CheckinClosesAt,
				s.MaxAttendeesOverride, s.FaceVerificationRequiredOverride, s.IsCancelled, s.CancellationReason}
		}
		_, err := tx.CopyFrom(
			ctx,
			pgx.Identifier{"event_sessions"},
			[]string{"id", "event_id", "session_number", "name", "start_time", "end_time", "timezone",
				"location_override", "online_meeting_url_override", "checkin_opens_at", "checkin_closes_at",
				"max_attendees_override", "face_verification_required_override", "is_cancelled", "cancellation_reason"},
			pgx.CopyFromRows(rows),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to bulk insert event sessions: %w", err)
		}
	}

	// 3. Insert host into attendees
	hostAttendeeQuery := `
		INSERT INTO event_attendees (id, event_id, user_id, role, status)
		VALUES (gen_random_uuid(), $1, $2, 'host', 'registered')`
	if _, err := tx.Exec(ctx, hostAttendeeQuery, event.ID, hostID); err != nil {
		return nil, fmt.Errorf("failed to insert host as attendee: %w", err)
	}

	// 4. Insert whitelist
	if len(whitelistUserIDs) > 0 {
		wlRows := make([][]interface{}, len(whitelistUserIDs))
		for i, userID := range whitelistUserIDs {
			wlRows[i] = []interface{}{event.ID, userID, hostID}
		}
		_, err := tx.CopyFrom(
			ctx,
			pgx.Identifier{"event_whitelists"},
			[]string{"event_id", "user_id", "added_by"},
			pgx.CopyFromRows(wlRows),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to bulk insert whitelist: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// event.Sessions = sessions // This is no longer populated in the main event struct for lists
	return event, nil
}

func (r *eventRepository) GetEventByID(ctx context.Context, id string, userID string) (*domain.Event, error) {
	// 1. Try to get from cache
	cacheKey := fmt.Sprintf("event:%s:%s", id, userID) // User-specific key
	val, err := r.redis.Get(ctx, cacheKey).Result()
	var event *domain.Event

	if err == nil {
		if json.Unmarshal([]byte(val), &event) == nil {
			// Manually fetch sessions if we get a cached event
			sessions, err := r.GetEventSessions(ctx, event.ID)
			if err != nil {
				log.Printf("Cache hit but failed to get sessions for event %s: %v", event.ID, err)
			} else {
				event.Sessions = sessions
			}
			return event, nil
		}
	}

	// 2. Cache miss, get from DB
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
			CASE WHEN $2::UUID IS NOT NULL AND ea.user_id IS NOT NULL AND ea.status = 'registered' THEN TRUE ELSE FALSE END AS is_registered
		FROM events e
		JOIN users u ON e.created_by = u.id
		LEFT JOIN communities c ON e.community_id = c.id
		LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.user_id = $2::UUID
		WHERE e.id = $1 AND e.deleted_at IS NULL
	`
	var dbEvent domain.Event
	var userIDArg interface{}
	if userID == "" {
		userIDArg = nil
	} else {
		userIDArg = userID
	}

	err = r.scanEvent(r.db.QueryRow(ctx, query, id, userIDArg), &dbEvent)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrEventNotFound
		}
		return nil, fmt.Errorf("failed to get event by ID: %w", err)
	}

	// Fetch sessions for the event
	sessions, err := r.GetEventSessions(ctx, dbEvent.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get event sessions: %w", err)
	}
	dbEvent.Sessions = sessions

	// 3. Populate cache
	marshaledEvent, err := json.Marshal(dbEvent)
	if err == nil {
		r.redis.Set(ctx, cacheKey, marshaledEvent, 10*time.Minute)
	}

	return &dbEvent, nil
}

func (r *eventRepository) GetEventBySessionID(ctx context.Context, sessionID string) (*domain.Event, error) {
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
			FALSE AS is_registered
		FROM events e
		JOIN users u ON e.created_by = u.id
		LEFT JOIN communities c ON e.community_id = c.id
		JOIN event_sessions es ON e.id = es.event_id
		WHERE es.id = $1 AND e.deleted_at IS NULL
	`
	var event domain.Event
	// We pass "" for userID since we can't determine it here and is_registered is not relevant
	err := r.scanEvent(r.db.QueryRow(ctx, query, sessionID), &event)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrEventNotFound
		}
		return nil, fmt.Errorf("failed to get event by session ID: %w", err)
	}
	return &event, nil
}

// ListEventItemsByCommunity is the new, efficient method for fetching events for a community.
func (r *eventRepository) ListEventItemsByCommunity(ctx context.Context, communityID string, userID string, statusFilter string, page, limit int) ([]*domain.EventItem, error) {
	return r.listEventItems(ctx, communityID, userID, statusFilter, page, limit)
}

// ListEventItemsForUser is the new, efficient method for fetching events for a user.
func (r *eventRepository) ListEventItemsForUser(ctx context.Context, userID string, statusFilter string, page, limit int) ([]*domain.EventItem, error) {
	// Passing an empty communityID tells listEventItems to fetch for the user across their communities.
	return r.listEventItems(ctx, "", userID, statusFilter, page, limit)
}

// listEventItems is the consolidated, efficient implementation for fetching event items.
func (r *eventRepository) listEventItems(ctx context.Context, communityID string, userID string, statusFilter string, page, limit int) ([]*domain.EventItem, error) {
	offset := (page - 1) * limit
	query := `
WITH event_items AS (
    -- Non-recurring events
    SELECT
        e.id AS event_id,
        NULL::uuid AS session_id,
        e.name AS event_name,
        e.cover_image_url,
        e.community_id,
        e.start_time,
        e.end_time,
        e.is_recurring,
        e.location_type,
        e.location_address,
        u.name AS created_by_name,
        u.profile_picture_url AS created_by_avatar,
        CASE
            WHEN NOW() BETWEEN e.start_time AND e.end_time THEN 'ongoing'
            WHEN NOW() < e.start_time THEN 'upcoming'
            ELSE 'past'
        END AS status
    FROM events e
    JOIN users u ON e.created_by = u.id
    WHERE e.is_recurring = FALSE
      AND e.deleted_at IS NULL
      AND e.status = 'published'

    UNION ALL

    -- Sessions of recurring events
    SELECT
        e.id AS event_id,
        es.id AS session_id,
        e.name AS event_name,
        e.cover_image_url,
        e.community_id,
        es.start_time,
        es.end_time,
        e.is_recurring,
        e.location_type,
        COALESCE(es.location_override, e.location_address) AS location_address,
        u.name AS created_by_name,
        u.profile_picture_url AS created_by_avatar,
        CASE
            WHEN NOW() BETWEEN es.start_time AND es.end_time THEN 'ongoing'
            WHEN NOW() < es.start_time THEN 'upcoming'
            ELSE 'past'
        END AS status
    FROM event_sessions es
    JOIN events e ON es.event_id = e.id
    JOIN users u ON e.created_by = u.id
    WHERE e.is_recurring = TRUE
      AND es.is_cancelled = FALSE
      AND e.deleted_at IS NULL
      AND e.status = 'published'
)
SELECT
    ei.event_id,
    ei.session_id,
    ei.event_name,
    ei.cover_image_url,
    ei.community_id,
    ei.start_time,
    ei.end_time,
    ei.is_recurring,
    ei.status,
    CASE WHEN ea.user_id IS NOT NULL AND ea.status = 'registered' THEN TRUE ELSE FALSE END AS is_registered,
    ei.location_type,
    ei.location_address,
    ei.created_by_name,
    ei.created_by_avatar
FROM event_items ei
LEFT JOIN event_attendees ea ON ei.event_id = ea.event_id AND ea.user_id = $1
`
	var args []interface{}
	args = append(args, userID)
	argCount := 2

	var whereClauses []string
	if communityID != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("ei.community_id = $%d", argCount))
		args = append(args, communityID)
		argCount++
	} else {
		// If no community ID, include events from communities the user belongs to,
		// events the user created, or events the user has participated in.
		memberIdx := argCount
		args = append(args, userID)
		argCount++

		creatorIdx := argCount
		args = append(args, userID)
		argCount++

		attendeeIdx := argCount
		args = append(args, userID)
		argCount++

		memberClause := fmt.Sprintf("ei.community_id IN (SELECT cm.community_id FROM community_members cm WHERE cm.user_id = $%d AND cm.status = 'active')", memberIdx)
		creatorClause := fmt.Sprintf("ei.event_id IN (SELECT e.id FROM events e WHERE e.created_by = $%d)", creatorIdx)
		attendeeClause := fmt.Sprintf("EXISTS (SELECT 1 FROM event_attendees ea2 WHERE ea2.event_id = ei.event_id AND ea2.user_id = $%d AND ea2.status IN ('registered','waitlist','attended','no_show'))", attendeeIdx)

		whereClauses = append(whereClauses, fmt.Sprintf("(%s OR %s OR %s)", memberClause, creatorClause, attendeeClause))
	}

	if statusFilter != "" && statusFilter != "all" {
		whereClauses = append(whereClauses, fmt.Sprintf("ei.status = $%d", argCount))
		args = append(args, statusFilter)
		argCount++
	}

	if len(whereClauses) > 0 {
		query += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query += fmt.Sprintf(" ORDER BY ei.start_time ASC OFFSET $%d LIMIT $%d", argCount, argCount+1)
	args = append(args, offset, limit)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		log.Printf("Error executing listEventItems query: %v", err)
		return nil, fmt.Errorf("failed to list event items: %w", err)
	}
	defer rows.Close()

	var items []*domain.EventItem
	for rows.Next() {
		var item domain.EventItem
		err := rows.Scan(
			&item.EventID,
			&item.SessionID,
			&item.EventName,
			&item.CoverImageURL,
			&item.CommunityID,
			&item.StartTime,
			&item.EndTime,
			&item.IsRecurring,
			&item.Status,
			&item.IsRegistered,
			&item.LocationType,
			&item.LocationAddress,
			&item.CreatedByName,
			&item.CreatedByAvatar,
		)
		if err != nil {
			log.Printf("Error scanning event item row: %v", err)
			return nil, fmt.Errorf("failed to scan event item: %w", err)
		}
		items = append(items, &item)
	}

	return items, nil
}

func (r *eventRepository) GetEventAttendee(ctx context.Context, eventID, userID string) (*domain.EventAttendee, error) {
	query := `
		SELECT 
			ea.id, ea.event_id, ea.user_id, ea.role, ea.status, ea.registration_form_data,
			ea.registration_source, ea.payment_status, ea.payment_amount, ea.payment_id,
			ea.face_sample_provided, ea.face_sample_quality_score, ea.qr_code_token, ea.fallback_code,
			ea.qr_device_binding, ea.registered_at, ea.approved_at, ea.approved_by, ea.cancelled_at,
			u.name as user_name, u.email as user_email, u.profile_picture_url as user_profile_picture_url,
			-- Add NULL placeholders for the 6 missing check-in fields, as this is not session-specific
			NULL as checkin_id, NULL as checkin_time, NULL as checkin_method, NULL as is_late, NULL as liveness_score, NULL as failure_reason
		FROM event_attendees ea
		JOIN users u ON ea.user_id = u.id
		WHERE ea.event_id = $1 AND ea.user_id = $2
	`
	var attendee domain.EventAttendee
	err := r.scanEventAttendee(r.db.QueryRow(ctx, query, eventID, userID), &attendee)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAttendeeNotFound
		}
		return nil, fmt.Errorf("failed to get event attendee: %w", err)
	}
	return &attendee, nil
}

func (r *eventRepository) RegisterForEvent(ctx context.Context, eventID, userID, status string, formData json.RawMessage) error {
	// Use ON CONFLICT to handle re-registration attempts gracefully.
	query := `
		INSERT INTO event_attendees (id, event_id, user_id, role, status, registration_form_data)
		VALUES (gen_random_uuid(), $1, $2, 'attendee', $3, $4)
		ON CONFLICT (event_id, user_id) DO UPDATE 
		SET status = EXCLUDED.status, 
		    registration_form_data = EXCLUDED.registration_form_data,
		    registered_at = NOW(), 
		    cancelled_at = NULL
		WHERE event_attendees.status = 'cancelled'
	`
	commandTag, err := r.db.Exec(ctx, query, eventID, userID, status, formData)
	if err != nil {
		// Check for unique violation error to return a friendlier message
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") {
			return domain.ErrAlreadyRegistered
		}
		return fmt.Errorf("failed to register for event: %w", err)
	}
	if commandTag.RowsAffected() == 0 {
		// This can happen if the ON CONFLICT condition isn't met (e.g., user is already 'registered')
		return domain.ErrAlreadyRegistered
	}
	return nil
}

func (r *eventRepository) AddUsersToWhitelist(ctx context.Context, eventID string, userIDs []string, addedBy string) error {
	// Use ON CONFLICT DO NOTHING to avoid errors for duplicate entries.
	insertQuery := `INSERT INTO event_whitelists (event_id, user_id, added_by) VALUES ($1, $2, $3) ON CONFLICT (event_id, user_id) DO NOTHING`

	batch := &pgx.Batch{}
	for _, userID := range userIDs {
		batch.Queue(insertQuery, eventID, userID, addedBy)
	}

	results := r.db.SendBatch(ctx, batch)
	defer results.Close()

	// We can check results for each command if needed, but for now, we assume it works.
	// This is more efficient than sending one query at a time.
	for i := 0; i < len(userIDs); i++ {
		_, err := results.Exec()
		if err != nil {
			// Log the error but don't fail the whole batch.
			log.Printf("Warning: Failed to add a user to whitelist for event %s (part of batch): %v", eventID, err)
		}
	}

	return nil
}

func (r *eventRepository) IsUserInWhitelist(ctx context.Context, eventID, userID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM event_whitelists WHERE event_id = $1 AND user_id = $2)`
	var exists bool
	err := r.db.QueryRow(ctx, query, eventID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check whitelist status: %w", err)
	}
	return exists, nil
}

func (r *eventRepository) GetPendingRegistrations(ctx context.Context, eventID string) ([]*domain.EventAttendee, error) {
	query := `
		SELECT 
			ea.id, ea.event_id, ea.user_id, ea.role, ea.status, ea.registration_form_data,
			ea.registration_source, ea.payment_status, ea.payment_amount, ea.payment_id,
			ea.face_sample_provided, ea.face_sample_quality_score, ea.qr_code_token, ea.fallback_code,
			ea.qr_device_binding, ea.registered_at, ea.approved_at, ea.approved_by, ea.cancelled_at,
			u.name as user_name, u.email as user_email, u.profile_picture_url as user_profile_picture_url,
			-- Add NULL placeholders for the 6 missing check-in fields
			NULL as checkin_id, NULL as checkin_time, NULL as checkin_method, NULL as is_late, NULL as liveness_score, NULL as failure_reason
		FROM event_attendees ea
		JOIN users u ON ea.user_id = u.id
		WHERE ea.event_id = $1 AND ea.status = 'pending'
		ORDER BY ea.registered_at ASC
	`
	rows, err := r.db.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending registrations: %w", err)
	}
	defer rows.Close()

	var attendees []*domain.EventAttendee
	for rows.Next() {
		var attendee domain.EventAttendee
		if err := r.scanEventAttendee(rows, &attendee); err != nil {
			return nil, fmt.Errorf("failed to scan pending attendee: %w", err)
		}
		attendees = append(attendees, &attendee)
	}
	return attendees, nil
}

func (r *eventRepository) UpdateRegistrationStatus(ctx context.Context, registrationID, status string, approverID sql.NullString) error {
	query := `
		UPDATE event_attendees 
		SET status = $2, approved_at = NOW(), approved_by = $3 
		WHERE id = $1 AND status = 'pending'`
	commandTag, err := r.db.Exec(ctx, query, registrationID, status, approverID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return domain.ErrAttendeeNotFound // Or a more specific error like "not in pending state"
	}
	return nil
}

func (r *eventRepository) CancelRegistration(ctx context.Context, registrationID, userID string) error {
	// This query should only allow a user to cancel their own registration if it's currently 'registered' or 'pending'.
	query := `
		UPDATE event_attendees 
		SET status = 'cancelled', cancelled_at = NOW() 
		WHERE id = $1 AND user_id = $2 AND status IN ('registered', 'pending')`
	commandTag, err := r.db.Exec(ctx, query, registrationID, userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return domain.ErrAttendeeNotFound // Or user is not in a cancellable state
	}
	return nil
}

func (r *eventRepository) GetRegistrationsByUserID(ctx context.Context, userID string, status string) ([]*domain.RegistrationWithEvent, error) {
	var queryBuilder strings.Builder
	args := []interface{}{userID}

	queryBuilder.WriteString(`
		SELECT
			-- EventAttendee fields
			ea.id, ea.event_id, ea.user_id, ea.role, ea.status, ea.registration_form_data,
			ea.registration_source, ea.payment_status, ea.payment_amount, ea.payment_id,
			ea.face_sample_provided, ea.face_sample_quality_score, ea.qr_code_token, ea.fallback_code,
			ea.qr_device_binding, ea.registered_at, ea.approved_at, ea.approved_by, ea.cancelled_at,
			-- Enriched user data for attendee
			u.name as user_name, u.email as user_email, u.profile_picture_url as user_profile_picture_url,
			-- EventSummary fields
			e.id as event_id_summary, e.name as event_name_summary, e.start_time as event_start_time_summary, 
			e.end_time as event_end_time_summary, e.cover_image_url as event_cover_image_url_summary, e.status as event_status_summary
		FROM event_attendees ea
		JOIN users u ON ea.user_id = u.id
		JOIN events e ON ea.event_id = e.id
		WHERE ea.user_id = $1
	`)

	if status != "" {
		queryBuilder.WriteString(fmt.Sprintf(" AND ea.status = $%d", len(args)+1))
		args = append(args, status)
	}

	queryBuilder.WriteString(" ORDER BY e.start_time DESC")

	rows, err := r.db.Query(ctx, queryBuilder.String(), args...)
	if err != nil {
		log.Printf("Error querying registrations by user ID: %v", err)
		return nil, fmt.Errorf("failed to get registrations by user ID: %w", err)
	}
	defer rows.Close()

	var registrations []*domain.RegistrationWithEvent
	for rows.Next() {
		var attendee domain.EventAttendee
		var eventSummary domain.EventSummary
		registration := &domain.RegistrationWithEvent{
			EventAttendee: &attendee,
			Event:         &eventSummary,
		}

		// Temporary nullable variables for scanning
		var ( // Attendee fields
			attendeeID, eventID, userID, role, status, regSource, payStatus, payID, qrToken, fallback, qrBinding, approvedBy sql.NullString
			regFormData                                                                                                      sql.RawBytes
			faceProvided                                                                                                     sql.NullBool
			faceScore, payAmount                                                                                             sql.NullFloat64
			regAt, approvedAt, cancelledAt                                                                                   sql.NullTime
			// Enriched user data
			userName, userEmail, userProfilePic sql.NullString
			// EventSummary fields
			eventSummaryID, eventSummaryName, eventSummaryCover, eventSummaryStatus sql.NullString
			eventSummaryStart, eventSummaryEnd                                      sql.NullTime
		)

		if err := rows.Scan(
			&attendeeID, &eventID, &userID, &role, &status, &regFormData,
			&regSource, &payStatus, &payAmount, &payID,
			&faceProvided, &faceScore, &qrToken, &fallback,
			&qrBinding, &regAt, &approvedAt, &approvedBy, &cancelledAt,
			&userName, &userEmail, &userProfilePic,
			&eventSummaryID, &eventSummaryName, &eventSummaryStart, &eventSummaryEnd, &eventSummaryCover, &eventSummaryStatus,
		); err != nil {
			log.Printf("Error scanning registration row: %v", err)
			return nil, fmt.Errorf("failed to scan registration: %w", err)
		}

		// --- Populate EventAttendee ---
		attendee.ID = attendeeID.String
		attendee.EventID = eventID.String
		attendee.UserID = userID.String
		attendee.Role = role.String
		attendee.Status = status.String
		attendee.RegistrationFormData = json.RawMessage(regFormData)
		attendee.RegistrationSource = regSource
		attendee.PaymentStatus = payStatus
		attendee.PaymentAmount = payAmount
		attendee.PaymentID = payID
		attendee.FaceSampleProvided = faceProvided.Bool
		attendee.FaceSampleQualityScore = faceScore
		attendee.QRCodeToken = qrToken
		attendee.FallbackCode = fallback
		attendee.QRDeviceBinding = qrBinding
		attendee.RegisteredAt = regAt.Time
		attendee.ApprovedAt = approvedAt
		attendee.ApprovedBy = approvedBy
		attendee.CancelledAt = cancelledAt
		attendee.UserName = userName.String
		attendee.UserEmail = userEmail.String
		attendee.UserProfilePictureURL = userProfilePic

		// --- Populate EventSummary ---
		eventSummary.ID = eventSummaryID.String
		eventSummary.Name = eventSummaryName.String
		eventSummary.StartTime = eventSummaryStart
		eventSummary.EndTime = eventSummaryEnd
		eventSummary.CoverImageURL = eventSummaryCover
		eventSummary.Status = eventSummaryStatus.String

		registrations = append(registrations, registration)
	}
	return registrations, nil
}

func (r *eventRepository) UpdateEvent(ctx context.Context, event *domain.Event, fieldMask []string) (*domain.Event, error) {
	var setClauses []string
	args := make([]interface{}, 0)
	argCount := 1

	for _, field := range fieldMask {
		switch field {
		case "name":
			setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
			args = append(args, event.Name)
			argCount++
		case "description":
			setClauses = append(setClauses, fmt.Sprintf("description = $%d", argCount))
			args = append(args, event.Description)
			argCount++
		case "cover_image_url":
			setClauses = append(setClauses, fmt.Sprintf("cover_image_url = $%d", argCount))
			args = append(args, event.CoverImageURL)
			argCount++
		case "location_type":
			setClauses = append(setClauses, fmt.Sprintf("location_type = $%d", argCount))
			args = append(args, event.LocationType)
			argCount++
		case "online_meeting_url":
			setClauses = append(setClauses, fmt.Sprintf("online_meeting_url = $%d", argCount))
			args = append(args, event.OnlineMeetingURL)
			argCount++
		case "start_time":
			setClauses = append(setClauses, fmt.Sprintf("start_time = $%d", argCount))
			args = append(args, event.StartTime)
			argCount++
		case "end_time":
			setClauses = append(setClauses, fmt.Sprintf("end_time = $%d", argCount))
			args = append(args, event.EndTime)
			argCount++
		case "timezone":
			setClauses = append(setClauses, fmt.Sprintf("timezone = $%d", argCount))
			args = append(args, event.Timezone)
			argCount++
		case "is_recurring":
			setClauses = append(setClauses, fmt.Sprintf("is_recurring = $%d", argCount))
			args = append(args, event.IsRecurring)
			argCount++
		case "recurrence_pattern":
			setClauses = append(setClauses, fmt.Sprintf("recurrence_pattern = $%d", argCount))
			args = append(args, event.RecurrencePattern)
			argCount++
		case "recurrence_rule":
			setClauses = append(setClauses, fmt.Sprintf("recurrence_rule = $%d", argCount))
			args = append(args, event.RecurrenceRule)
			argCount++
		case "max_attendees":
			setClauses = append(setClauses, fmt.Sprintf("max_attendees = $%d", argCount))
			args = append(args, event.MaxAttendees)
			argCount++
		case "waitlist_enabled":
			setClauses = append(setClauses, fmt.Sprintf("waitlist_enabled = $%d", argCount))
			args = append(args, event.WaitlistEnabled)
			argCount++
		case "max_waitlist":
			setClauses = append(setClauses, fmt.Sprintf("max_waitlist = $%d", argCount))
			args = append(args, event.MaxWaitlist)
			argCount++
		case "registration_required":
			setClauses = append(setClauses, fmt.Sprintf("registration_required = $%d", argCount))
			args = append(args, event.RegistrationRequired)
			argCount++
		case "whitelist_only":
			setClauses = append(setClauses, fmt.Sprintf("whitelist_only = $%d", argCount))
			args = append(args, event.WhitelistOnly)
			argCount++
		case "require_approval":
			setClauses = append(setClauses, fmt.Sprintf("require_approval = $%d", argCount))
			args = append(args, event.RequireApproval)
			argCount++
		case "face_verification_required":
			setClauses = append(setClauses, fmt.Sprintf("face_verification_required = $%d", argCount))
			args = append(args, event.FaceVerificationRequired)
			argCount++
		case "liveness_check_required":
			setClauses = append(setClauses, fmt.Sprintf("liveness_check_required = $%d", argCount))
			args = append(args, event.LivenessCheckRequired)
			argCount++
		case "qr_code_enabled":
			setClauses = append(setClauses, fmt.Sprintf("qr_code_enabled = $%d", argCount))
			args = append(args, event.QRCodeEnabled)
			argCount++
		case "fallback_code_enabled":
			setClauses = append(setClauses, fmt.Sprintf("fallback_code_enabled = $%d", argCount))
			args = append(args, event.FallbackCodeEnabled)
			argCount++
		case "manual_checkin_allowed":
			setClauses = append(setClauses, fmt.Sprintf("manual_checkin_allowed = $%d", argCount))
			args = append(args, event.ManualCheckinAllowed)
			argCount++
		case "is_paid":
			setClauses = append(setClauses, fmt.Sprintf("is_paid = $%d", argCount))
			args = append(args, event.IsPaid)
			argCount++
		case "status":
			setClauses = append(setClauses, fmt.Sprintf("status = $%d", argCount))
			args = append(args, event.Status)
			argCount++
		case "fee":
			setClauses = append(setClauses, fmt.Sprintf("fee = $%d", argCount))
			args = append(args, event.Fee)
			argCount++
		case "currency":
			setClauses = append(setClauses, fmt.Sprintf("currency = $%d", argCount))
			args = append(args, event.Currency)
			argCount++
		case "reminder_schedule":
			setClauses = append(setClauses, fmt.Sprintf("reminder_schedule = $%d", argCount))
			args = append(args, event.ReminderSchedule)
			argCount++
		}
	}

	if len(setClauses) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	query := fmt.Sprintf(`
		UPDATE events 
		SET %s, updated_at = NOW() 
		WHERE id = $%d`, strings.Join(setClauses, ", "), argCount)

	args = append(args, event.ID)

	log.Printf("Update query: %s", query)
	log.Printf("Update args: %+v", args)

	commandTag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update event: %w", err)
	}

	if commandTag.RowsAffected() == 0 {
		return nil, domain.ErrEventNotFound
	}

	// Synchronize the primary session for non-recurring events when core timings change.
	var (
		isRecurring bool
		startTime   sql.NullTime
		endTime     sql.NullTime
		timezone    string
	)
	if err := r.db.QueryRow(ctx, `
		SELECT is_recurring, start_time, end_time, timezone
		FROM events
		WHERE id = $1
	`, event.ID).Scan(&isRecurring, &startTime, &endTime, &timezone); err != nil {
		log.Printf("failed to fetch event timing metadata for %s: %v", event.ID, err)
	} else if !isRecurring && startTime.Valid && endTime.Valid {
		if _, err := r.db.Exec(ctx, `
			UPDATE event_sessions
			SET start_time = $2,
			    end_time = $3,
			    timezone = $4,
			    updated_at = NOW()
			WHERE event_id = $1 AND session_number = 1
		`, event.ID, startTime.Time, endTime.Time, timezone); err != nil {
			log.Printf("failed to sync primary session timing for event %s: %v", event.ID, err)
		}
	}

	// Invalidate cache
	r.InvalidateEventCache(ctx, event.ID, event.CreatedBy)

	// Return the updated event
	return r.GetEventByID(ctx, event.ID, event.CreatedBy) // Pass creator's ID
}

func (r *eventRepository) GetEventAttendanceSummary(ctx context.Context, eventID string) (*domain.AttendanceSummary, error) {
	// This query should probably aggregate over all sessions of an event
	// For now, it's just grabbing the first session's summary
	query := `
		SELECT
			es.id as session_id,
			es.event_id,
			e.name as event_name,
			es.start_time,
			es.end_time,
			COUNT(DISTINCT ea.user_id) FILTER (WHERE ea.status = 'registered') as total_registered,
			COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.status = 'success') as total_checked_in,
			COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.status = 'success' AND esc.is_late = TRUE) as total_late,
			COUNT(DISTINCT ea.user_id) FILTER (WHERE ea.status = 'registered' AND esc.user_id IS NULL) as total_no_show,
			COALESCE(ROUND(
				(COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.status = 'success'))::NUMERIC /
				NULLIF(COUNT(DISTINCT ea.user_id) FILTER (WHERE ea.status = 'registered'), 0) * 100,
				2
			), 0) as attendance_rate
		FROM event_sessions es
		JOIN events e ON es.event_id = e.id
		LEFT JOIN event_attendees ea ON es.event_id = ea.event_id
		LEFT JOIN event_session_checkins esc ON es.id = esc.session_id AND ea.user_id = esc.user_id
		WHERE es.event_id = $1
		GROUP BY es.id, es.event_id, e.name, es.start_time, es.end_time
		ORDER BY es.start_time ASC
	`

	rows, err := r.db.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query event attendance summary: %w", err)
	}
	defer rows.Close()

	// For now, we return a list of summaries per session.
	// The domain.AttendanceSummary struct needs to be adjusted if a single aggregated summary is desired.
	if rows.Next() {
		var summary domain.AttendanceSummary
		if err := rows.Scan(
			&summary.SessionID,
			&summary.EventID,
			&summary.EventName,
			&summary.StartTime,
			&summary.EndTime,
			&summary.TotalRegistered,
			&summary.TotalCheckedIn,
			&summary.TotalLate,
			&summary.TotalNoShow,
			&summary.AttendanceRate,
		); err != nil {
			return nil, fmt.Errorf("failed to scan attendance summary row: %w", err)
		}
		return &summary, nil
	}

	return &domain.AttendanceSummary{}, nil
}

func (r *eventRepository) GetUpcomingSessionsWithAttendees(ctx context.Context, from, to time.Time) ([]*domain.UpcomingSessionInfo, error) {
	query := `
		SELECT
			es.id, es.event_id, e.name, es.start_time,
			ARRAY_AGG(ea.user_id) FILTER (WHERE ea.user_id IS NOT NULL) AS attendee_ids
		FROM event_sessions es
		JOIN events e ON es.event_id = e.id
		LEFT JOIN event_attendees ea ON es.event_id = ea.event_id AND ea.status = 'registered'
		WHERE es.start_time BETWEEN $1 AND $2
		  AND es.is_cancelled = FALSE
		  AND e.status IN ('published', 'ongoing')
		  AND e.deleted_at IS NULL
		GROUP BY es.id, es.event_id, e.name, es.start_time
		ORDER BY es.start_time ASC
	`

	rows, err := r.db.Query(ctx, query, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to query upcoming sessions with attendees: %w", err)
	}
	defer rows.Close()

	var sessions []*domain.UpcomingSessionInfo
	for rows.Next() {
		var session domain.UpcomingSessionInfo
		var attendeeIDs []string
		if err := rows.Scan(
			&session.ID,
			&session.EventID,
			&session.EventName,
			&session.StartTime,
			&attendeeIDs,
		); err != nil {
			return nil, fmt.Errorf("failed to scan upcoming session info: %w", err)
		}
		session.AttendeeIDs = attendeeIDs
		sessions = append(sessions, &session)
	}

	return sessions, nil
}

func (r *eventRepository) GetEventSessions(ctx context.Context, eventID string) ([]domain.EventSession, error) {
	query := `
        SELECT
            id, event_id, session_number, name, start_time, end_time, timezone,
            location_override, online_meeting_url_override, checkin_opens_at, checkin_closes_at,
            max_attendees_override, face_verification_required_override, is_cancelled, cancellation_reason,
            total_checkins, total_no_shows, created_at, updated_at
        FROM event_sessions
        WHERE event_id = $1
        ORDER BY session_number ASC
    `
	rows, err := r.db.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get event sessions: %w", err)
	}
	defer rows.Close()

	var sessions []domain.EventSession
	for rows.Next() {
		var session domain.EventSession
		if err := r.scanEventSession(rows, &session); err != nil {
			return nil, fmt.Errorf("failed to scan event session: %w", err)
		}
		sessions = append(sessions, session)
	}
	return sessions, nil
}

func (r *eventRepository) GetEventSessionByID(ctx context.Context, sessionID string) (*domain.EventSession, error) {
	query := `
        SELECT
            id, event_id, session_number, name, start_time, end_time, timezone,
            location_override, online_meeting_url_override, checkin_opens_at, checkin_closes_at,
            max_attendees_override, face_verification_required_override, is_cancelled, cancellation_reason,
            total_checkins, total_no_shows, created_at, updated_at
        FROM event_sessions
        WHERE id = $1
    `
	var session domain.EventSession
	err := r.scanEventSession(r.db.QueryRow(ctx, query, sessionID), &session)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to get event session by ID: %w", err)
	}
	return &session, nil
}

// Transaction management methods
func (r *eventRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
	return r.db.Begin(ctx)
}

func (r *eventRepository) RollbackTx(ctx context.Context, tx pgx.Tx) error {
	return tx.Rollback(ctx)
}

func (r *eventRepository) CommitTx(ctx context.Context, tx pgx.Tx) error {
	return tx.Commit(ctx)
}

// GetActiveRecurringEvents retrieves all events that are recurring and not yet finished.
func (r *eventRepository) GetActiveRecurringEvents(ctx context.Context) ([]*domain.Event, error) {
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
			'' as community_type, '' as created_by_name, '' as created_by_avatar,
			FALSE AS is_registered
		FROM events e
		WHERE e.is_recurring = TRUE AND e.status NOT IN ('cancelled', 'completed')
		  AND e.deleted_at IS NULL
		  AND (e.recurrence_end_date IS NULL OR e.recurrence_end_date > NOW())
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get active recurring events: %w", err)
	}
	defer rows.Close()

	var events []*domain.Event
	for rows.Next() {
		var event domain.Event
		if err := r.scanEvent(rows, &event); err != nil {
			return nil, fmt.Errorf("failed to scan recurring event: %w", err)
		}
		events = append(events, &event)
	}
	return events, nil
}

// CreateSessions batch-inserts new sessions for a recurring event.
func (r *eventRepository) CreateSessions(ctx context.Context, sessions []domain.EventSession) error {
	if len(sessions) == 0 {
		return nil
	}
	rows := make([][]interface{}, len(sessions))
	for i, s := range sessions {
		rows[i] = []interface{}{s.ID, s.EventID, s.SessionNumber, s.Name, s.StartTime, s.EndTime, s.Timezone}
	}
	_, err := r.db.CopyFrom(
		ctx,
		pgx.Identifier{"event_sessions"},
		[]string{"id", "event_id", "session_number", "name", "start_time", "end_time", "timezone"},
		pgx.CopyFromRows(rows),
	)

	if err != nil {
		return fmt.Errorf("failed to bulk insert event sessions via CopyFrom: %w", err)
	}

	return nil
}

// GetSessionStartTimes returns a map of existing start times for an event's sessions.
func (r *eventRepository) GetSessionStartTimes(ctx context.Context, eventID string) (map[time.Time]bool, error) {
	query := `SELECT start_time FROM event_sessions WHERE event_id = $1`
	rows, err := r.db.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query session start times: %w", err)
	}
	defer rows.Close()

	startTimes := make(map[time.Time]bool)
	for rows.Next() {
		var startTime time.Time
		if err := rows.Scan(&startTime); err != nil {
			return nil, fmt.Errorf("failed to scan start time: %w", err)
		}
		startTimes[startTime] = true
	}
	return startTimes, nil
}

func (r *eventRepository) GetMaxSessionNumber(ctx context.Context, eventID string) (int, error) {
	query := `SELECT COALESCE(MAX(session_number), 0) FROM event_sessions WHERE event_id = $1`
	var maxSessionNumber int
	err := r.db.QueryRow(ctx, query, eventID).Scan(&maxSessionNumber)
	if err != nil {
		return 0, fmt.Errorf("failed to get max session number: %w", err)
	}
	return maxSessionNumber, nil
}

func (r *eventRepository) HardDeleteEvent(ctx context.Context, eventID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// The CASCADE DELETE on the foreign keys should handle this, but explicit deletes are safer.
	if _, err := tx.Exec(ctx, "DELETE FROM event_sessions WHERE event_id = $1", eventID); err != nil {
		return fmt.Errorf("failed to delete event sessions: %w", err)
	}
	if _, err := tx.Exec(ctx, "DELETE FROM event_attendees WHERE event_id = $1", eventID); err != nil {
		return fmt.Errorf("failed to delete event attendees: %w", err)
	}
	if _, err := tx.Exec(ctx, "DELETE FROM event_whitelists WHERE event_id = $1", eventID); err != nil {
		return fmt.Errorf("failed to delete event whitelist: %w", err)
	}

	cmdTag, err := tx.Exec(ctx, "DELETE FROM events WHERE id = $1", eventID)
	if err != nil {
		return fmt.Errorf("failed to delete event: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return domain.ErrEventNotFound
	}

	return tx.Commit(ctx)
}

func (r *eventRepository) DeleteEvent(ctx context.Context, eventID string) error {
	query := `UPDATE events SET status = 'cancelled', deleted_at = NOW() WHERE id = $1`
	cmdTag, err := r.db.Exec(ctx, query, eventID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return domain.ErrEventNotFound
	}
	return nil
}

func (r *eventRepository) IncrementEventAttendeeCount(ctx context.Context, eventID string) error {
	// This logic is handled by a database trigger now. This function can be removed.
	return nil
}

func (r *eventRepository) InvalidateEventCache(ctx context.Context, eventID, userID string) error {
	// Invalidate specific user-event cache
	cacheKey := fmt.Sprintf("event:%s:%s", eventID, userID)
	if err := r.redis.Del(ctx, cacheKey).Err(); err != nil && err != redis.Nil {
		log.Printf("Warning: failed to invalidate event cache for key %s: %v", cacheKey, err)
	}

	// Invalidate list caches
	// This is a simple approach. A more sophisticated approach might involve tags.
	// For now, we'll delete keys based on known patterns. This is not perfect.
	// A better way would be to use Redis hashes or sets to track keys related to a community.
	// Given the current structure, this is a best-effort attempt.
	// Note: This is a placeholder for a more robust cache invalidation strategy.
	// The current implementation doesn't have a good way to find all relevant list caches to invalidate.
	log.Printf("Warning: Event list cache invalidation is not fully implemented for event %s.", eventID)

	return nil
}

func (r *eventRepository) DecrementEventAttendeeCount(ctx context.Context, eventID string) error {
	// This logic is handled by a database trigger now. This function can be removed.
	return nil
}

func (r *eventRepository) GetEventIDByRegistrationID(ctx context.Context, registrationID string) (string, error) {
	query := `SELECT event_id FROM event_attendees WHERE id = $1`
	var eventID string
	err := r.db.QueryRow(ctx, query, registrationID).Scan(&eventID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", domain.ErrAttendeeNotFound
		}
		return "", fmt.Errorf("failed to get event ID by registration ID %s: %w", registrationID, err)
	}
	return eventID, nil
}

func (r *eventRepository) GetUpcomingEventsByCommunityIDs(ctx context.Context, communityIDs []string, limit int) ([]*domain.EventItem, error) {
	query := `
WITH event_items AS (
    -- Non-recurring events
    SELECT
        e.id AS event_id,
        NULL::uuid AS session_id,
        e.name AS event_name,
        e.cover_image_url,
        e.community_id,
        e.start_time,
        e.end_time,
        e.is_recurring,
        e.location_type,
        e.location_address,
        u.name AS created_by_name,
        u.profile_picture_url AS created_by_avatar,
        e.created_at,
        CASE
            WHEN NOW() BETWEEN e.start_time AND e.end_time THEN 'ongoing'
            WHEN NOW() < e.start_time THEN 'upcoming'
            ELSE 'past'
        END AS status
    FROM events e
    JOIN users u ON e.created_by = u.id
    WHERE e.is_recurring = FALSE
      AND e.deleted_at IS NULL
      AND e.status = 'published'
      AND e.community_id = ANY($1)
      AND NOW() < e.end_time -- Only upcoming or ongoing

    UNION ALL

    -- Sessions of recurring events
    SELECT
        e.id AS event_id,
        es.id AS session_id,
        e.name AS event_name,
        e.cover_image_url,
        e.community_id,
        es.start_time,
        es.end_time,
        e.is_recurring,
        e.location_type,
        COALESCE(es.location_override, e.location_address) AS location_address,
        u.name AS created_by_name,
        u.profile_picture_url AS created_by_avatar,
        e.created_at,
        CASE
            WHEN NOW() BETWEEN es.start_time AND es.end_time THEN 'ongoing'
            WHEN NOW() < es.start_time THEN 'upcoming'
            ELSE 'past'
        END AS status
    FROM event_sessions es
    JOIN events e ON es.event_id = e.id
    JOIN users u ON e.created_by = u.id
    WHERE e.is_recurring = TRUE
      AND es.is_cancelled = FALSE
      AND e.deleted_at IS NULL
      AND e.status = 'published'
      AND e.community_id = ANY($1)
      AND NOW() < es.end_time -- Only upcoming or ongoing
)
SELECT
    ei.event_id,
    ei.session_id,
    ei.event_name,
    ei.cover_image_url,
    ei.community_id,
    ei.start_time,
    ei.end_time,
    ei.is_recurring,
    ei.status,
    FALSE AS is_registered, -- We don't know registration status for a generic feed
    ei.location_type,
    ei.location_address,
    ei.created_by_name,
    ei.created_by_avatar,
    ei.created_at
FROM event_items ei
ORDER BY ei.start_time ASC
LIMIT $2
	`

	rows, err := r.db.Query(ctx, query, communityIDs, limit)
	if err != nil {
		log.Printf("Error executing GetUpcomingEventsByCommunityIDs query: %v", err)
		return nil, fmt.Errorf("failed to get upcoming events by community IDs: %w", err)
	}
	defer rows.Close()

	var items []*domain.EventItem
	for rows.Next() {
		var item domain.EventItem
		err := rows.Scan(
			&item.EventID,
			&item.SessionID,
			&item.EventName,
			&item.CoverImageURL,
			&item.CommunityID,
			&item.StartTime,
			&item.EndTime,
			&item.IsRecurring,
			&item.Status,
			&item.IsRegistered,
			&item.LocationType,
			&item.LocationAddress,
			&item.CreatedByName,
			&item.CreatedByAvatar,
			&item.CreatedAt,
		)
		if err != nil {
			log.Printf("Error scanning event item row in GetUpcomingEventsByCommunityIDs: %v", err)
			return nil, fmt.Errorf("failed to scan event item: %w", err)
		}
		items = append(items, &item)
	}

	return items, nil
}

func (r *eventRepository) CancelEventSession(ctx context.Context, sessionID string, reason sql.NullString) error {
	query := `
		UPDATE event_sessions
		SET is_cancelled = TRUE, cancellation_reason = $2
		WHERE id = $1
	`
	commandTag, err := r.db.Exec(ctx, query, sessionID, reason)
	if err != nil {
		return fmt.Errorf("failed to cancel event session: %w", err)
	}
	if commandTag.RowsAffected() == 0 {
		return domain.ErrSessionNotFound
	}
	return nil
}
