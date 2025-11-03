package usecase

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	community_domain "github.com/attendwise/backend/internal/module/community/domain"
	"github.com/attendwise/backend/internal/module/event/domain"
	permission_domain "github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/attendwise/backend/internal/platform/pubsub"
	"github.com/google/uuid"
	"github.com/gosimple/slug"
	"github.com/teambition/rrule-go"
)

// EventService defines the interface for event-related business logic.
type EventService interface {
	CreateEvent(ctx context.Context, event *domain.Event, hostID string, whitelistUserIDs []string) (*domain.Event, error)
	RegisterForEvent(ctx context.Context, eventID, userID string, formData json.RawMessage) error
	GetEvent(ctx context.Context, id string, userID string) (*domain.Event, error)
	ListEventItemsByCommunity(ctx context.Context, communityID string, userID string, statusFilter string, page, limit int) ([]*domain.EventItem, error)
	ListMyAccessibleEventItems(ctx context.Context, userID string, statusFilter string, page, limit int) ([]*domain.EventItem, error)
	AddUsersToWhitelist(ctx context.Context, eventID string, userIDs []string, performingUserID string) error
	IsUserInWhitelist(ctx context.Context, eventID, userID string) (bool, error)
	GetEventAttendanceSummary(ctx context.Context, eventID string) (*domain.AttendanceSummary, error)
	GetEventAttendees(ctx context.Context, eventID, sessionID, status, userID string) ([]*domain.EventAttendee, error)
	ListPendingRegistrations(ctx context.Context, eventID, userID string) ([]*domain.EventAttendee, error)
	ApproveRegistration(ctx context.Context, eventID, registrationID, userID string) error
	CancelRegistration(ctx context.Context, registrationID, userID string) error
	ListMyRegistrations(ctx context.Context, userID string, status string) ([]*domain.RegistrationWithEvent, error)
	GetEventSessions(ctx context.Context, eventID string) ([]domain.EventSession, error)
	GetEventSessionByID(ctx context.Context, sessionID string) (*domain.EventSession, error)
	UpdateEvent(ctx context.Context, event *domain.Event, fieldMask []string, userID string) (*domain.Event, error)
	GetUpcomingSessionsWithAttendees(ctx context.Context, from, to time.Time) ([]*domain.UpcomingSessionInfo, error)
	DeleteEvent(ctx context.Context, eventID string, userID string) error
	HardDeleteEvent(ctx context.Context, eventID string, userID string) error
	CancelEventSession(ctx context.Context, sessionID string, userID string, reason string) error
}

// Service is the implementation of the EventService interface.
type Service struct {
	repo        domain.EventRepository
	neo4jRepo   community_domain.Neo4jCommunityRepository // Kept for CreateEventNode
	permService permission_domain.PermissionService
	publisher   pubsub.Publisher
}

// NewService creates a new event service.
func NewService(repo domain.EventRepository, neo4jRepo community_domain.Neo4jCommunityRepository, permService permission_domain.PermissionService, publisher pubsub.Publisher) EventService {
	return &Service{
		repo:        repo,
		neo4jRepo:   neo4jRepo,
		permService: permService,
		publisher:   publisher,
	}
}

// CreateEvent handles the business logic for creating a new event.
func (s *Service) CreateEvent(ctx context.Context, event *domain.Event, hostID string, whitelistUserIDs []string) (*domain.Event, error) {
	// Authorization: Check if the user is a member of the community they are creating an event in.
	isAdmin, err := s.permService.IsCommunityAdmin(ctx, event.CommunityID, hostID)
	if err != nil {
		return nil, fmt.Errorf("could not verify community admin status: %w", err)
	}
	if !isAdmin {
		return nil, permission_domain.ErrPermissionDenied
	}

	// 1. Set default values and generate IDs
	event.ID = uuid.New().String()
	event.Slug = slug.Make(fmt.Sprintf("%s-%s", event.Name, event.ID[:8]))
	if event.Status == "" {
		event.Status = "draft"
	}
	if event.Timezone == "" {
		event.Timezone = "UTC" // Default to UTC if not provided
	}

	if event.IsRecurring && (event.RecurrenceRule == nil || len(event.RecurrenceRule) == 0) {
		return nil, errors.New("recurrence_rule is required for recurring events")
	}

	// Ensure nullable fields are correctly set
	event.Description = sql.NullString{String: event.Description.String, Valid: event.Description.String != ""}
	event.CoverImageURL = sql.NullString{String: event.CoverImageURL.String, Valid: event.CoverImageURL.String != ""}
	event.LocationAddress = sql.NullString{String: event.LocationAddress.String, Valid: event.LocationAddress.String != ""}
		event.OnlineMeetingURL = sql.NullString{String: event.OnlineMeetingURL.String, Valid: event.OnlineMeetingURL.String != ""}
	event.RecurrencePattern = sql.NullString{String: event.RecurrencePattern.String, Valid: event.RecurrencePattern.String != ""}

	// 2. Generate sessions based on recurrence rule
	var sessionsToCreate []domain.EventSession
	duration := event.EndTime.Time.Sub(event.StartTime.Time)

	if event.IsRecurring && len(event.RecurrenceRule) > 0 && string(event.RecurrenceRule) != "null" {
		var rrulePayload struct {
			RRule string `json:"rrule"`
		}
		if err := json.Unmarshal(event.RecurrenceRule, &rrulePayload); err != nil {
			log.Printf("ERROR: Could not unmarshal rrule json for event %s: %v", event.ID, err)
			return nil, fmt.Errorf("invalid recurrence_rule json: %w", err)
		}
		ruleString := rrulePayload.RRule
		log.Printf("Attempting to parse recurrence rule: %s", ruleString)

		if ruleString != "" {
			rOption, err := rrule.StrToROption(ruleString)
			if err != nil {
				return nil, fmt.Errorf("invalid rrule string format: %w", err)
			}
			rOption.Dtstart = event.StartTime.Time

			rule, err := rrule.NewRRule(*rOption)
			if err != nil {
				return nil, fmt.Errorf("failed to create new rrule: %w", err)
			}

			occurrences := rule.All()

			for i, occ := range occurrences {
				sessionsToCreate = append(sessionsToCreate, domain.EventSession{
					ID:            uuid.New().String(),
					EventID:       event.ID,
					SessionNumber: i + 1,
					StartTime:     occ,
					EndTime:       occ.Add(duration),
					Timezone:      event.Timezone,
				})
			}
		}
	} else {
		// If not recurring, create just one session
		sessionsToCreate = append(sessionsToCreate, domain.EventSession{
			ID:            uuid.New().String(),
			EventID:       event.ID,
			SessionNumber: 1,
			StartTime:     event.StartTime.Time,
			EndTime:       event.EndTime.Time,
			Timezone:      event.Timezone,
		})
	}

	// 3. Call repository to save everything in a transaction
	createdEvent, err := s.repo.CreateEvent(ctx, event, sessionsToCreate, hostID, whitelistUserIDs)
	if err != nil {
		return nil, fmt.Errorf("service could not create event: %w", err)
	}

	// 4. Create node in Neo4j Graph
	if err := s.neo4jRepo.CreateEventNode(ctx, createdEvent); err != nil {
		log.Printf("Warning: could not create event node in Neo4j: %v", err)
	}

	// 5. Publish event creation message for async processing
	if s.publisher != nil {
		payload := fmt.Sprintf(`{"event_id": "%s", "name": "%s"}`, createdEvent.ID, createdEvent.Name)
		if err := s.publisher.Publish("events.created", []byte(payload)); err != nil {
			log.Printf("Error publishing event creation message: %v", err)
		}
	}

	return createdEvent, nil
}

// RegisterForEvent handles the logic for a user to register for an event.
func (s *Service) RegisterForEvent(ctx context.Context, eventID, userID string, formData json.RawMessage) error {
	if err := s.repo.CheckRegistrationEligibility(ctx, eventID, userID); err != nil {
		return err
	}

	status := "registered"
	event, err := s.repo.GetEventByID(ctx, eventID, userID)
	if err != nil {
		return err
	}
	if event.RequireApproval {
		status = "pending"
	}

	if err := s.repo.RegisterForEvent(ctx, eventID, userID, status, formData); err != nil {
		return err // Return the error directly, repo handles ErrAlreadyRegistered
	}

	s.repo.InvalidateEventCache(ctx, eventID, userID)
	s.repo.InvalidateEventCache(ctx, eventID, event.CreatedBy)

	if s.publisher != nil {
		payload := fmt.Sprintf(`{"event_id": "%s", "user_id": "%s", "status": "%s"}`, event.ID, userID, status)
		if err := s.publisher.Publish("events.registered", []byte(payload)); err != nil {
			log.Printf("Error publishing event registration message: %v", err)
		}
	}

	return nil
}

// GetEvent retrieves a single event by its ID.
func (s *Service) GetEvent(ctx context.Context, id string, userID string) (*domain.Event, error) {
	event, err := s.repo.GetEventByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	canView, err := s.permService.CanViewCommunityContent(ctx, event.CommunityID, userID)
	if err != nil {
		return nil, err
	}
	if !canView {
		return nil, permission_domain.ErrPermissionDenied
	}

	return event, nil
}

// ListEventItemsByCommunity retrieves all events for a specific community.
func (s *Service) ListEventItemsByCommunity(ctx context.Context, communityID string, userID string, statusFilter string, page, limit int) ([]*domain.EventItem, error) {
	canView, err := s.permService.CanViewCommunityContent(ctx, communityID, userID)
	if err != nil {
		return nil, err
	}
	if !canView {
		return nil, permission_domain.ErrPermissionDenied
	}

	return s.repo.ListEventItemsByCommunity(ctx, communityID, userID, statusFilter, page, limit)
}

// ListMyAccessibleEventItems retrieves all events from all communities the user has joined.
func (s *Service) ListMyAccessibleEventItems(ctx context.Context, userID string, statusFilter string, page, limit int) ([]*domain.EventItem, error) {
	return s.repo.ListEventItemsForUser(ctx, userID, statusFilter, page, limit)
}

// AddUsersToWhitelist adds a list of users to an event's whitelist.
func (s *Service) AddUsersToWhitelist(ctx context.Context, eventID string, userIDs []string, performingUserID string) error {
	isHost, err := s.permService.IsEventHost(ctx, eventID, performingUserID)
	if err != nil {
		return err
	}
	if !isHost {
		return permission_domain.ErrPermissionDenied
	}
	return s.repo.AddUsersToWhitelist(ctx, eventID, userIDs, performingUserID)
}

// GetEventAttendanceSummary retrieves an attendance summary for an event.
func (s *Service) GetEventAttendanceSummary(ctx context.Context, eventID string) (*domain.AttendanceSummary, error) {
	return s.repo.GetEventAttendanceSummary(ctx, eventID)
}

// GetEventAttendees retrieves a list of attendees for an event.
func (s *Service) GetEventAttendees(ctx context.Context, eventID, sessionID, status, userID string) ([]*domain.EventAttendee, error) {
	isHost, err := s.permService.IsEventHost(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if !isHost {
		return nil, permission_domain.ErrPermissionDenied
	}
	return s.repo.GetEventAttendees(ctx, eventID, sessionID, status)
}

func (s *Service) IsUserInWhitelist(ctx context.Context, eventID, userID string) (bool, error) {
	return s.repo.IsUserInWhitelist(ctx, eventID, userID)
}

func (s *Service) GetEventSessions(ctx context.Context, eventID string) ([]domain.EventSession, error) {
	return s.repo.GetEventSessions(ctx, eventID)
}

func (s *Service) GetEventSessionByID(ctx context.Context, sessionID string) (*domain.EventSession, error) {
	return s.repo.GetEventSessionByID(ctx, sessionID)
}

func (s *Service) GetUpcomingSessionsWithAttendees(ctx context.Context, from, to time.Time) ([]*domain.UpcomingSessionInfo, error) {
	return s.repo.GetUpcomingSessionsWithAttendees(ctx, from, to)
}

func (s *Service) UpdateEvent(ctx context.Context, event *domain.Event, fieldMask []string, userID string) (*domain.Event, error) {
	isHost, err := s.permService.IsEventHost(ctx, event.ID, userID)
	if err != nil {
		return nil, err
	}
	if !isHost {
		return nil, permission_domain.ErrPermissionDenied
	}

	return s.repo.UpdateEvent(ctx, event, fieldMask)
}

func (s *Service) ListPendingRegistrations(ctx context.Context, eventID, userID string) ([]*domain.EventAttendee, error) {
	isHost, err := s.permService.IsEventHost(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if !isHost {
		return nil, permission_domain.ErrPermissionDenied
	}
	return s.repo.GetPendingRegistrations(ctx, eventID)
}

func (s *Service) ApproveRegistration(ctx context.Context, eventID, registrationID, userID string) error {
	isHost, err := s.permService.IsEventHost(ctx, eventID, userID)
	if err != nil {
		return err
	}
	if !isHost {
		return permission_domain.ErrPermissionDenied
	}

	return s.repo.UpdateRegistrationStatus(ctx, registrationID, "registered", sql.NullString{String: userID, Valid: true})
}

func (s *Service) CancelRegistration(ctx context.Context, registrationID, userID string) error {
	eventID, err := s.repo.GetEventIDByRegistrationID(ctx, registrationID)
	if err != nil {
		return fmt.Errorf("failed to get event ID for registration %s: %w", registrationID, err)
	}

	if err := s.repo.CancelRegistration(ctx, registrationID, userID); err != nil {
		return fmt.Errorf("could not cancel registration: %w", err)
	}

	// Invalidate caches
	s.repo.InvalidateEventCache(ctx, eventID, userID)
	event, err := s.repo.GetEventByID(ctx, eventID, "") // Fetch event to get CreatedBy
	if err == nil && event != nil {
		s.repo.InvalidateEventCache(ctx, eventID, event.CreatedBy)
	}

	return nil
}

func (s *Service) ListMyRegistrations(ctx context.Context, userID string, status string) ([]*domain.RegistrationWithEvent, error) {
	return s.repo.GetRegistrationsByUserID(ctx, userID, status)
}

func (s *Service) DeleteEvent(ctx context.Context, eventID string, userID string) error {
	event, err := s.repo.GetEventByID(ctx, eventID, userID)
	if err != nil {
		return err
	}

	isHost, err := s.permService.IsEventHost(ctx, eventID, userID)
	if err != nil {
		return err
	}

	if !isHost {
		isAdmin, err := s.permService.IsCommunityAdmin(ctx, event.CommunityID, userID)
		if err != nil {
			return err
		}
		if !isAdmin {
			return permission_domain.ErrPermissionDenied
		}
	}

	if err := s.repo.DeleteEvent(ctx, eventID); err != nil {
		return err
	}

	// Invalidate cache
	s.repo.InvalidateEventCache(ctx, eventID, userID)
	s.repo.InvalidateEventCache(ctx, eventID, event.CreatedBy)

	if s.publisher != nil {
		payload := fmt.Sprintf(`{"event_id": "%s"}`, eventID)
		if err := s.publisher.Publish("events.cancelled", []byte(payload)); err != nil {
			log.Printf("Error publishing event cancellation message: %v", err)
		}
	}

	return nil
}

func (s *Service) CancelEventSession(ctx context.Context, sessionID string, userID string, reason string) error {
	event, err := s.repo.GetEventBySessionID(ctx, sessionID)
	if err != nil {
		return err
	}

	isHost, err := s.permService.IsEventHost(ctx, event.ID, userID)
	if err != nil {
		return err
	}

	if !isHost {
		isAdmin, err := s.permService.IsCommunityAdmin(ctx, event.CommunityID, userID)
		if err != nil {
			return err
		}
		if !isAdmin {
			return permission_domain.ErrPermissionDenied
		}
	}

	if err := s.repo.CancelEventSession(ctx, sessionID, sql.NullString{String: reason, Valid: reason != ""}); err != nil {
		return err
	}

	// Invalidate cache
	s.repo.InvalidateEventCache(ctx, event.ID, userID)
	s.repo.InvalidateEventCache(ctx, event.ID, event.CreatedBy)

	if s.publisher != nil {
		payload := fmt.Sprintf(`{"session_id": "%s", "event_id": "%s"}`, sessionID, event.ID)
		if err := s.publisher.Publish("events.session.cancelled", []byte(payload)); err != nil {
			log.Printf("Error publishing event session cancellation message: %v", err)
		}
	}

	return nil
}

func (s *Service) HardDeleteEvent(ctx context.Context, eventID string, userID string) error {
	isHost, err := s.permService.IsEventHost(ctx, eventID, userID)
	if err != nil {
		return err
	}

	if !isHost {
		event, err := s.repo.GetEventByID(ctx, eventID, userID)
		if err != nil {
			return err
		}
		isAdmin, err := s.permService.IsCommunityAdmin(ctx, event.CommunityID, userID)
		if err != nil {
			return err
		}
		if !isAdmin {
			return permission_domain.ErrPermissionDenied
		}
	}

	if err := s.repo.HardDeleteEvent(ctx, eventID); err != nil {
		return err
	}

	if s.publisher != nil {
		payload := fmt.Sprintf(`{"event_id": "%s"}`, eventID)
		if err := s.publisher.Publish("events.deleted", []byte(payload)); err != nil {
			log.Printf("Error publishing event deletion message: %v", err)
		}
	}

	return nil
}