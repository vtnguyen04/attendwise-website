package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/attendwise/backend/internal/module/event/domain"
	"github.com/attendwise/backend/internal/module/event/usecase"
	permission_domain "github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/gin-gonic/gin"
)

// EventHander holds the dependencies for event handlers
type EventHandler struct {
	service usecase.EventService
}

// NewEventHandler creates a new EventHandler
func NewEventHandler(service usecase.EventService) *EventHandler {
	return &EventHandler{service: service}
}

// @Summary Create an event
// @Description Create a new event
// @ID create-event
// @Accept json
// @Produce json
// @Param event_data body main.CreateEventRequest true "Event data"
// @Success 201 {object} EventResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events [post]
// @Security ApiKeyAuth
func (h *EventHandler) CreateEvent(c *gin.Context) {
	var req struct {
		Event     *domain.Event `json:"event" binding:"required"`
		Whitelist []string      `json:"whitelist"`
	}

	body, _ := c.GetRawData()
	log.Printf("Request Body: %s", string(body))
	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}
	log.Printf("Parsed Request: %+v", req)

	hostID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	createdEvent, err := h.service.CreateEvent(c.Request.Context(), req.Event, hostID.(string), req.Whitelist)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"event": createdEvent})
}

// @Summary Get event details
// @Description Get details of a specific event by ID.
// @ID get-event
// @Produce json
// @Param id path string true "Event ID"
// @Success 200 {object} EventResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id} [get]
// @Security ApiKeyAuth
func (h *EventHandler) GetEvent(c *gin.Context) {
	eventID := c.Param("id")
	userID, _ := c.Get("userID") // userID can be nil if not logged in

	var userIDStr string
	if userID != nil {
		userIDStr = userID.(string)
	}

	event, err := h.service.GetEvent(c.Request.Context(), eventID, userIDStr)
	if err != nil {
		log.Printf("Error getting event: %v", err)
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to view this event."})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": event})
}

// @Summary List events by community
// @Description List events belonging to a specific community.
// @ID list-events-by-community
// @Produce json
// @Param id path string true "Community ID"
// @Param status query string false "Filter events by status (e.g., all, upcoming, past)"
// @Param page query int false "Page number"
// @Param limit query int false "Number of items per page"
// @Success 200 {array} EventItemResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/events [get]
// @Security ApiKeyAuth
func (h *EventHandler) ListEventsByCommunity(c *gin.Context) {
	communityID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	statusFilter := c.DefaultQuery("status", "all")

	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	pageInt := 1
	limitInt := 10
	fmt.Sscanf(page, "%d", &pageInt)
	fmt.Sscanf(limit, "%d", &limitInt)

	eventItems, err := h.service.ListEventItemsByCommunity(c.Request.Context(), communityID, userID.(string), statusFilter, pageInt, limitInt)
	if err != nil {
		if errors.Is(err, permission_domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to view events in this community."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events for community", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": eventItems})
}

// @Summary List my accessible events
// @Description List events that the authenticated user has access to.
// @ID list-my-accessible-events
// @Produce json
// @Param status query string false "Filter events by status (e.g., all, upcoming, past)"
// @Param page query int false "Page number"
// @Param limit query int false "Number of items per page"
// @Success 200 {array} EventItemResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/me [get]
// @Security ApiKeyAuth
func (h *EventHandler) ListMyAccessibleEvents(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userIDStr := userID.(string)
	statusFilter := c.DefaultQuery("status", "all")

	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	pageInt := 1
	limitInt := 10
	fmt.Sscanf(page, "%d", &pageInt)
	fmt.Sscanf(limit, "%d", &limitInt)

	eventItems, err := h.service.ListMyAccessibleEventItems(c.Request.Context(), userIDStr, statusFilter, pageInt, limitInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": eventItems})
}

// @Summary Register for an event
// @Description Register the authenticated user for a specific event
// @ID register-for-event
// @Accept json
// @Produce json
// @Param id path string true "Event ID"
// @Param registration_data body main.RegisterForEventRequest false "Registration form data (optional)"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id}/registrations [post]
// @Security ApiKeyAuth
func (h *EventHandler) RegisterForEvent(c *gin.Context) {
	eventID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		RegistrationFormData json.RawMessage `json:"registration_form_data"`
	}

	_ = c.ShouldBindJSON(&req)

	err := h.service.RegisterForEvent(c.Request.Context(), eventID, userID.(string), req.RegistrationFormData)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrEventNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, domain.ErrRegistrationClosed), errors.Is(err, domain.ErrWhitelistOnly), errors.Is(err, domain.ErrEventFull), errors.Is(err, domain.ErrAlreadyRegistered):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register for event", "details": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully submitted registration request"})
}

// @Summary Get event attendance summary
// @Description Get a summary of attendance for a specific event
// @Param id path string true "Event ID"
// @Success 200 {object} AttendanceSummaryResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id}/attendance/summary [get]
// @Security ApiKeyAuth
func (h *EventHandler) GetEventAttendanceSummary(c *gin.Context) {
	eventID := c.Param("id")

	summary, err := h.service.GetEventAttendanceSummary(c.Request.Context(), eventID)
	if err != nil {
		log.Printf("Error getting event attendance summary: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get attendance summary"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

// @Summary Get event attendees
// @Description Get a list of attendees for a specific event, with optional session and status filters
// @ID get-event-attendees
// @Produce json
// @Param id path string true "Event ID"
// @Param sessionID query string false "Session ID to filter attendees"
// @Param status query string false "Attendee status (e.g., checked_in, registered)"
// @Success 200 {array} EventAttendeeResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id}/attendance/attendees [get]
// @Security ApiKeyAuth
func (h *EventHandler) GetEventAttendees(c *gin.Context) {
	eventID := c.Param("id")
	sessionID := c.Query("sessionID")
	status := c.Query("status")

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	attendees, err := h.service.GetEventAttendees(c.Request.Context(), eventID, sessionID, status, userID.(string))
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to view attendees for this event."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get event attendees", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"attendees": attendees})
}

// @Summary Add users to event whitelist
// @Description Add a list of user IDs to an event's whitelist
// @ID add-users-to-whitelist
// @Accept json
// @Produce json
// @Param id path string true "Event ID"
// @Param whitelist_data body main.AddUsersToWhitelistRequest true "User IDs to add to whitelist"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id}/whitelist [post]
// @Security ApiKeyAuth
func (h *EventHandler) AddUsersToWhitelist(c *gin.Context) {
	eventID := c.Param("id")
	userID, _ := c.Get("userID")

	var req struct {
		UserIDs []string `json:"user_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.service.AddUsersToWhitelist(c.Request.Context(), eventID, req.UserIDs, userID.(string)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Users added to whitelist successfully"})
}

// @Summary Get event sessions
// @Description Get all sessions for a specific event
// @ID get-event-sessions
// @Produce json
// @Param id path string true "Event ID"
// @Success 200 {array} EventSessionResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id}/sessions [get]
// @Security ApiKeyAuth
func (h *EventHandler) GetEventSessions(c *gin.Context) {
	eventID := c.Param("id")

	sessions, err := h.service.GetEventSessions(c.Request.Context(), eventID)
	if err != nil {
		log.Printf("Error getting event sessions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve event sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// @Summary Get event session by ID
// @Description Get details of a specific event session by its ID
// @ID get-event-session-by-id
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} EventSessionResponse
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/sessions/{id} [get]
// @Security ApiKeyAuth
func (h *EventHandler) GetEventSessionByID(c *gin.Context) {
	sessionId := c.Param("id")

	session, err := h.service.GetEventSessionByID(c.Request.Context(), sessionId)
	if err != nil {
		log.Printf("Error getting event session: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Event session not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"session": session})
}

// @Summary List pending registrations
// @Description List pending registrations for a specific event
// @ID list-pending-registrations
// @Produce json
// @Param id path string true "Event ID"
// @Success 200 {array} EventAttendeeResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id}/registrations/pending [get]
// @Security ApiKeyAuth
func (h *EventHandler) ListPendingRegistrations(c *gin.Context) {
	eventID := c.Param("id")
	userID, _ := c.Get("userID")

	attendees, err := h.service.ListPendingRegistrations(c.Request.Context(), eventID, userID.(string))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"pending_registrations": attendees})
}

// @Summary Approve registration
// @Description Approve a pending registration for an event
// @ID approve-registration
// @Produce json
// @Param id path string true "Event ID"
// @Param registrationID path string true "Registration ID"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id}/registrations/{registrationID}/approve [post]
// @Security ApiKeyAuth
func (h *EventHandler) ApproveRegistration(c *gin.Context) {
	eventID := c.Param("id")
	registrationID := c.Param("registrationID")
	userID, _ := c.Get("userID")

	err := h.service.ApproveRegistration(c.Request.Context(), eventID, registrationID, userID.(string))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registration approved successfully"})
}

// @Summary Cancel registration
// @Description Cancel a registration for an event
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id}/registrations/{registrationID} [delete]
// @Security ApiKeyAuth
func (h *EventHandler) CancelRegistration(c *gin.Context) {
	registrationID := c.Param("registrationID")
	userID, _ := c.Get("userID")

	err := h.service.CancelRegistration(c.Request.Context(), registrationID, userID.(string))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registration cancelled successfully"})
}

// @Summary Update an event
// @Description Update details of an existing event
// @ID update-event
// @Accept json
// @Produce json
// @Param id path string true "Event ID"
// @Param event_data body main.UpdateEventRequest true "Event data to update"
// @Success 200 {object} EventResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id} [patch]
// @Security ApiKeyAuth
func (h *EventHandler) UpdateEvent(c *gin.Context) {
	userID, _ := c.Get("userID")
	eventID := c.Param("id")

	var reqBody map[string]interface{}
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	var fieldMaskPaths []string
	eventToUpdate := &domain.Event{
		ID:        eventID,
		CreatedBy: userID.(string),
	}

	for key, value := range reqBody {
		switch key {
		case "name", "location_type", "timezone", "currency", "status":
			if v, ok := value.(string); ok {
				switch key {
				case "name":
					eventToUpdate.Name = v
				case "location_type":
					eventToUpdate.LocationType = v
				case "timezone":
					eventToUpdate.Timezone = v
				case "currency":
					eventToUpdate.Currency = v
				case "status":
					eventToUpdate.Status = v
				}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "description", "cover_image_url", "online_meeting_url":
			if vMap, ok := value.(map[string]interface{}); ok {
				strVal, _ := vMap["String"].(string)
				validVal, _ := vMap["Valid"].(bool)
				nullString := sql.NullString{String: strVal, Valid: validVal}
				switch key {
				case "description":
					eventToUpdate.Description = nullString
				case "cover_image_url":
					eventToUpdate.CoverImageURL = nullString
				case "online_meeting_url":
					eventToUpdate.OnlineMeetingURL = nullString
				}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "is_recurring", "waitlist_enabled", "registration_required", "whitelist_only", "require_approval", "face_verification_required", "liveness_check_required", "qr_code_enabled", "fallback_code_enabled", "manual_checkin_allowed", "is_paid":
			if v, ok := value.(bool); ok {
				switch key {
				case "is_recurring":
					eventToUpdate.IsRecurring = v
				case "waitlist_enabled":
					eventToUpdate.WaitlistEnabled = v
				case "registration_required":
					eventToUpdate.RegistrationRequired = v
				case "whitelist_only":
					eventToUpdate.WhitelistOnly = v
				case "require_approval":
					eventToUpdate.RequireApproval = v
				case "face_verification_required":
					eventToUpdate.FaceVerificationRequired = v
				case "liveness_check_required":
					eventToUpdate.LivenessCheckRequired = v
				case "qr_code_enabled":
					eventToUpdate.QRCodeEnabled = v
				case "fallback_code_enabled":
					eventToUpdate.FallbackCodeEnabled = v
				case "manual_checkin_allowed":
					eventToUpdate.ManualCheckinAllowed = v
				case "is_paid":
					eventToUpdate.IsPaid = v
				}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "start_time", "end_time":
			if vMap, ok := value.(map[string]interface{}); ok {
				timeStr, _ := vMap["Time"].(string)
				validVal, _ := vMap["Valid"].(bool)
				parsedTime, err := time.Parse(time.RFC3339, timeStr)
				if err == nil {
					nullTime := sql.NullTime{Time: parsedTime, Valid: validVal}
					if key == "start_time" {
						eventToUpdate.StartTime = nullTime
					} else {
						eventToUpdate.EndTime = nullTime
					}
					fieldMaskPaths = append(fieldMaskPaths, key)
				}
			}
		case "max_attendees", "max_waitlist":
			if v, ok := value.(map[string]interface{}); ok {
				intVal, _ := v["Int32"].(float64)
				validVal, _ := v["Valid"].(bool)
				nullInt := sql.NullInt32{Int32: int32(intVal), Valid: validVal}
				if key == "max_attendees" {
					eventToUpdate.MaxAttendees = nullInt
				} else {
					eventToUpdate.MaxWaitlist = nullInt
				}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "fee":
			if v, ok := value.(float64); ok {
				eventToUpdate.Fee = sql.NullFloat64{Float64: v, Valid: true}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "recurrence_pattern":
			if vMap, ok := value.(map[string]interface{}); ok {
				strVal, _ := vMap["String"].(string)
				validVal, _ := vMap["Valid"].(bool)
				nullString := sql.NullString{String: strVal, Valid: validVal}
				eventToUpdate.RecurrencePattern = nullString
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "recurrence_rule", "reminder_schedule":
			if v, ok := value.(map[string]interface{}); ok {
				jsonVal, err := json.Marshal(v)
				if err == nil {
					if key == "recurrence_rule" {
						eventToUpdate.RecurrenceRule = jsonVal
					} else {
						eventToUpdate.ReminderSchedule = jsonVal
					}
					fieldMaskPaths = append(fieldMaskPaths, key)
				}
			}
		}
	}

	if len(fieldMaskPaths) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
		return
	}

	updatedEvent, err := h.service.UpdateEvent(c.Request.Context(), eventToUpdate, fieldMaskPaths, userID.(string))
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": updatedEvent})
}

// @Summary Hard delete an event
// @Description Permanently delete an event
// @ID hard-delete-event
// @Param id path string true "Event ID"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id}/hard [delete]
// @Security ApiKeyAuth
func (h *EventHandler) HardDeleteEvent(c *gin.Context) {
	eventID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.service.HardDeleteEvent(c.Request.Context(), eventID, userID.(string))
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to delete this event."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}

// @Summary List my registrations
// @Description List events the authenticated user is registered for
// @Success 200 {array} RegistrationWithEventResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/me/registrations [get]
// @Security ApiKeyAuth
func (h *EventHandler) ListMyRegistrations(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	registrations, err := h.service.ListMyRegistrations(c.Request.Context(), userID.(string), "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch registrations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"registrations": registrations})
}

// @Summary Delete an event
// @Description Soft delete an event (mark as cancelled)
// @ID delete-event
// @Param id path string true "Event ID"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/{id} [delete]
// @Security ApiKeyAuth
func (h *EventHandler) DeleteEvent(c *gin.Context) {
	eventID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.service.DeleteEvent(c.Request.Context(), eventID, userID.(string))
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to cancel this event."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel event"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event cancelled successfully"})
}

// @Summary Cancel event session
// @Description Cancel a specific event session
// @ID cancel-event-session
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Param cancel_data body main.CancelEventSessionRequest false "Cancellation reason (optional)"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/events/sessions/{id}/cancel [post]
// @Security ApiKeyAuth
func (h *EventHandler) CancelEventSession(c *gin.Context) {
	sessionId := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)

	err := h.service.CancelEventSession(c.Request.Context(), sessionId, userID.(string), req.Reason)
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to cancel this session."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel event session"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event session cancelled successfully"})
}
