package main

import (
	"net/http"
	"strconv"

	"log"

	"github.com/attendwise/backend/internal/module/messaging/domain"
	"github.com/attendwise/backend/internal/module/messaging/usecase"
	"github.com/gin-gonic/gin"
)

type MessagingHandler struct {
	messagingService usecase.MessagingService
}

func NewMessagingHandler(messagingService usecase.MessagingService) *MessagingHandler {
	return &MessagingHandler{messagingService: messagingService}
}

// @Summary Create a new conversation
// @Description Create a new conversation with specified type and participants.
// @ID create-conversation
// @Accept json
// @Produce json
// @Param conversation_data body main.CreateConversationRequest true "Conversation data"
// @Success 201 {object} ConversationResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/conversations [post]
// @Security ApiKeyAuth
func (h *MessagingHandler) CreateConversation(c *gin.Context) {
	var req struct {
		Type           string   `json:"type" binding:"required"`
		ParticipantIDs []string `json:"participant_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	creatorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	conversation, err := h.messagingService.CreateConversation(c.Request.Context(), domain.ConversationType(req.Type), creatorID.(string), req.ParticipantIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"conversation": conversation})
}

// @Summary Get conversation details
// @Description Get details of a specific conversation by ID.
// @ID get-conversation
// @Produce json
// @Success 200 {object} ConversationResponse
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/conversations/{id} [get]
// @Security ApiKeyAuth
func (h *MessagingHandler) GetConversation(c *gin.Context) {
	conversationID := c.Param("id")

	conversation, err := h.messagingService.GetConversation(c.Request.Context(), conversationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"conversation": conversation})
}

// @Summary Get user conversations
// @Description Get a list of conversations for the authenticated user.
// @ID get-user-conversations
// @Produce json
// @Param page query int false "Page number"
// @Success 200 {array} ConversationResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/conversations [get]
// @Security ApiKeyAuth
func (h *MessagingHandler) GetUserConversations(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid page parameter"})
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit parameter"})
		return
	}

	conversations, err := h.messagingService.GetUserConversations(c.Request.Context(), userID.(string), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch conversations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"conversations": conversations})
}

// @Summary Send a message
// @Description Send a message within a conversation
// @ID send-message
// @Accept json
// @Produce json
// @Param id path string true "Conversation ID"
// @Param message_data body main.SendMessageRequest true "Message content and type"
// @Success 201 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/conversations/{id}/messages [post]
// @Security ApiKeyAuth
func (h *MessagingHandler) SendMessage(c *gin.Context) {
	conversationID := c.Param("id")
	senderID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
		Type    string `json:"type"` // e.g., "text", "image", "file"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	message, err := h.messagingService.SendMessage(c.Request.Context(), conversationID, senderID.(string), req.Content, domain.MessageType(req.Type))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": message})
}

// @Summary Get messages
// @Description Get messages from a conversation with pagination
// @Success 200 {array} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/conversations/{id}/messages [get]
// @Security ApiKeyAuth
func (h *MessagingHandler) GetMessages(c *gin.Context) {
	conversationID := c.Param("id")

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit parameter"})
		return
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid offset parameter"})
		return
	}

	messages, err := h.messagingService.GetMessages(c.Request.Context(), conversationID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	log.Printf("Fetched messages: %+v", messages)

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

// @Summary Get total unread message count
// @Description Get the total number of unread messages for the authenticated user
// @ID get-total-unread-message-count
// @Produce json
// @Success 200 {object} UnreadMessageCountResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/conversations/unread-count [get]
// @Security ApiKeyAuth
func (h *MessagingHandler) GetTotalUnreadMessageCount(c *gin.Context) {

	userID, exists := c.Get("userID")

	if !exists {

		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})

		return

	}

	count, err := h.messagingService.GetTotalUnreadMessageCount(c.Request.Context(), userID.(string))

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get unread message count"})

		return

	}

	c.JSON(http.StatusOK, gin.H{"count": count})

}

// @Summary Update a message
// @Description Update an existing message
// @ID update-message
// @Accept json
// @Produce json
// @Param id path string true "Message ID"
// @Param message_data body main.UpdateMessageRequest true "Message content"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/messages/{id} [patch]
// @Security ApiKeyAuth
func (h *MessagingHandler) UpdateMessage(c *gin.Context) {

	messageID := c.Param("id")

	userID, exists := c.Get("userID")

	if !exists {

		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})

		return

	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {

		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})

		return

	}

	updatedMessage, err := h.messagingService.UpdateMessage(c.Request.Context(), messageID, userID.(string), req.Content)

	if err != nil {

		// Handle specific errors like not found or not authorized

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})

		return

	}

	c.JSON(http.StatusOK, gin.H{"message": updatedMessage})

}

// @Summary Delete a message
// @Description Delete a message
// @ID delete-message
// @Param id path string true "Message ID"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/messages/{id} [delete]
// @Security ApiKeyAuth
func (h *MessagingHandler) DeleteMessage(c *gin.Context) {

	messageID := c.Param("id")

	userID, exists := c.Get("userID")

	if !exists {

		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})

		return

	}

	err := h.messagingService.DeleteMessage(c.Request.Context(), messageID, userID.(string))

	if err != nil {

		// Handle specific errors like not found or not authorized

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})

		return

	}

	c.JSON(http.StatusOK, gin.H{"message": "Message deleted successfully"})

}

// @Summary Mark conversation as read
// @Description Mark a conversation as read for the authenticated user
// @ID mark-conversation-as-read
// @Param id path string true "Conversation ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/conversations/{id}/read [post]
// @Security ApiKeyAuth
func (h *MessagingHandler) MarkConversationAsRead(c *gin.Context) {
	conversationID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := h.messagingService.MarkConversationAsRead(c.Request.Context(), conversationID, userID.(string)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark conversation as read"})
		return
	}

	c.Status(http.StatusNoContent)
}
