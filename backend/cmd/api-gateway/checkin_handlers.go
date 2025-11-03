package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/attendwise/backend/internal/module/checkin/usecase"
	event_domain "github.com/attendwise/backend/internal/module/event/domain"
	"github.com/gin-gonic/gin"
)

// CheckinHandler holds the dependencies for check-in handlers.
type CheckinHandler struct {
	service   usecase.CheckinService
	jwtSecret string
}

// NewCheckinHandler creates a new CheckinHandler.
func NewCheckinHandler(service usecase.CheckinService, jwtSecret string) *CheckinHandler {
	return &CheckinHandler{
		service:   service,
		jwtSecret: jwtSecret,
	}
}

// GenerateTicketAndQR handles the request to generate a JWT and QR code for check-in.
func (h *CheckinHandler) GenerateTicketAndQR(c *gin.Context) {
	sessionID := c.Param("sessionID")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		DeviceFingerprint string `json:"device_fingerprint"`
	}
	// We use BindJSON, but don't fail if it's empty, for backward compatibility.
	_ = c.ShouldBindJSON(&req)

	signedToken, fallbackCode, err := h.service.GenerateTicket(c.Request.Context(), sessionID, userID.(string), req.DeviceFingerprint)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error_details": err.Error(), "error": "Failed to generate ticket"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"qr_payload":    signedToken,
		"fallback_code": fallbackCode,
	})
}

func (h *CheckinHandler) VerifyCheckin(c *gin.Context) {
	var req struct {
		QRPayload                string `json:"qr_payload"`
		FallbackCode             string `json:"fallback_code"`
		ImageData                string `json:"image_data"`                 // Changed to string
		LivenessStream           string `json:"liveness_video_stream_data"` // Changed to string
		ChallengeType            string `json:"liveness_challenge_type"`
		ScannerDeviceFingerprint string `json:"scanner_device_fingerprint"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Error binding JSON in VerifyCheckin: %v", err) // Added logging
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	var decodedImageData []byte
	if req.ImageData != "" {
		var err error
		// Remove data URI prefix if present
		imageDataStr := req.ImageData
		if strings.HasPrefix(imageDataStr, "data:") {
			parts := strings.SplitN(imageDataStr, ";base64,", 2)
			if len(parts) == 2 {
				imageDataStr = parts[1]
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image_data data URI format"})
				return
			}
		}
		decodedImageData, err = base64.StdEncoding.DecodeString(imageDataStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image_data base64 format"})
			return
		}
	}

	var decodedLivenessStream []byte
	if req.LivenessStream != "" {
		var err error
		// Remove data URI prefix if present
		livenessStreamStr := req.LivenessStream
		if strings.HasPrefix(livenessStreamStr, "data:") {
			parts := strings.SplitN(livenessStreamStr, ";base64,", 2)
			if len(parts) == 2 {
				livenessStreamStr = parts[1]
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid liveness_video_stream_data data URI format"})
				return
			}
		}
		decodedLivenessStream, err = base64.StdEncoding.DecodeString(livenessStreamStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid liveness_video_stream_data base64 format"})
			return
		}
	}

	var attendee *event_domain.EventAttendee // Changed type
	var success bool
	var message string
	var err error

	if req.QRPayload != "" {
		attendee, success, message, err = h.service.VerifyCheckinFromQR(c.Request.Context(), req.QRPayload, decodedImageData, decodedLivenessStream, req.ChallengeType, req.ScannerDeviceFingerprint)
	} else if req.FallbackCode != "" {
		attendee, success, message, err = h.service.VerifyCheckinFromFallback(c.Request.Context(), req.FallbackCode, decodedImageData)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Either qr_payload or fallback_code must be provided"})
		return
	}

	if err != nil {
		log.Printf("Check-in verification error: %v", err)
		c.JSON(http.StatusConflict, gin.H{"status": false, "message": message, "error_details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": success, "message": message, "attendee": attendee}) // Changed key to "attendee"
}

// ManualOverride handles manual check-in by an event host.
func (h *CheckinHandler) ManualOverride(c *gin.Context) {
	var req struct {
		SessionID string `json:"session_id" binding:"required"`
		UserID    string `json:"user_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	hostID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	attendee, err := h.service.ManualOverrideCheckin(c.Request.Context(), req.SessionID, req.UserID, hostID.(string))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Successfully checked in user", "attendee": attendee}) // Changed key to "attendee"
}

// SyncOfflineCheckins handles a batch of check-ins collected while offline.
func (h *CheckinHandler) SyncOfflineCheckins(c *gin.Context) {
	var req struct {
		DeviceID string                          `json:"device_id" binding:"required"`
		Attempts []usecase.OfflineCheckinAttempt `json:"attempts" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	results, err := h.service.ProcessOfflineBatch(c.Request.Context(), req.DeviceID, req.Attempts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process offline batch"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Processed %d check-in attempts.", len(results)),
		"results": results,
	})
}
