package main

import (
	"log"
	"net/http"
	"strconv"

	notification_domain "github.com/attendwise/backend/internal/module/notification/domain"
	notification_usecase "github.com/attendwise/backend/internal/module/notification/usecase"
	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	notificationService notification_usecase.NotificationService
}

func NewNotificationHandler(notificationService notification_usecase.NotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: notificationService}
}

// @Summary Get notifications
// @Description Get a paginated list of notifications for the authenticated user
// @ID get-notifications
// @Produce json
// @Param limit query int false "Number of notifications to return"
// @Param offset query int false "Offset for pagination"
// @Success 200 {object} NotificationResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/notifications [get]
// @Security ApiKeyAuth
func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	userID := c.GetString("userID") // Assuming userID is set by auth middleware
	log.Printf("[DEBUG] GetNotifications handler called for userID: %s", userID)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit parameter"})
		return
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid offset parameter"})
		return
	}

	notifications, err := h.notificationService.GetNotifications(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"notifications": notifications})
}

// @Summary Mark notification as read
// @Description Mark a specific notification as read
// @ID mark-notification-as-read
// @Param id path string true "Notification ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/notifications/{id}/read [post]
// @Security ApiKeyAuth
func (h *NotificationHandler) MarkNotificationAsRead(c *gin.Context) {
	notificationID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.notificationService.MarkAsRead(c.Request.Context(), notificationID, userID.(string))
	if err != nil {
		if err.Error() == "notification not found or not owned by user" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Get notification preferences
// @Description Get the notification preferences for the authenticated user
// @ID get-notification-preferences
// @Success 200 {object} NotificationPreferencesResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/notifications/preferences [get]
// @Security ApiKeyAuth
func (h *NotificationHandler) GetNotificationPreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	preferences, err := h.notificationService.GetPreferences(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notification preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"preferences": preferences})
}

// @Summary Update notification preferences
// @Description Update notification preferences for the authenticated user
// @ID update-notification-preferences
// @Accept json
// @Produce json
// @Param preferences body main.UpdateNotificationPreferencesRequest true "Notification preferences"
// @Success 200 {object} NotificationPreferencesResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/notifications/preferences [put]
// @Security ApiKeyAuth
func (h *NotificationHandler) UpdateNotificationPreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Channels notification_domain.NotificationChannels `json:"channels"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	preferences := &notification_domain.NotificationPreferences{
		UserID:   userID.(string),
		Channels: req.Channels,
	}

	updatedPreferences, err := h.notificationService.UpdatePreferences(c.Request.Context(), userID.(string), preferences)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification preferences", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"preferences": updatedPreferences})
}

// @Summary Mark all notifications as read
// @Description Mark all notifications as read for the authenticated user
// @ID mark-all-notifications-as-read
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/notifications/read-all [post]
// @Security ApiKeyAuth
func (h *NotificationHandler) MarkAllNotificationsAsRead(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := h.notificationService.MarkAllAsRead(c.Request.Context(), userID.(string)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all notifications as read"})
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Delete a notification
// @Description Delete a specific notification
// @ID delete-notification
// @Param id path string true "Notification ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/notifications/{id} [delete]
// @Security ApiKeyAuth
func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	notificationID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := h.notificationService.DeleteNotification(c.Request.Context(), userID.(string), notificationID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	c.Status(http.StatusNoContent)
}
