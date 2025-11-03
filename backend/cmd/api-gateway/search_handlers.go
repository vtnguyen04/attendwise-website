package main

import (
	"log"
	"net/http"
	"strconv"

	"github.com/attendwise/backend/internal/module/search/domain"
	"github.com/gin-gonic/gin"
)

type SearchHandler struct {
	service domain.SearchService
}

func NewSearchHandler(service domain.SearchService) *SearchHandler {
	return &SearchHandler{service: service}
}

// @Summary Perform a general search
// @Description Search across different types of entities (users, communities, events)
// @ID search-all
// @Produce json
// @Param q query string true "Search query string"
// @Param type query string false "Filter search results by type (e.g., user, community, event)"
// @Param limit query int false "Number of items to return"
// @Param offset query int false "Offset for pagination"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/search [get]
func (h *SearchHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query 'q' is required"})
		return
	}

	typeFilter := c.Query("type")

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	results, err := h.service.Search(c.Request.Context(), query, typeFilter, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to perform search"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// @Summary Search users
// @Description Search for users by name or other criteria
// @ID search-users
// @Produce json
// @Param q query string true "Search query string"
// @Param limit query int false "Number of items to return"
// @Param offset query int false "Offset for pagination"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/search/users [get]
func (h *SearchHandler) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query 'q' is required"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	results, err := h.service.SearchUsers(c.Request.Context(), query, limit, offset)
	if err != nil {
		log.Printf("Failed to search users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// @Summary Search communities
// @Description Search for communities by name or other criteria
// @ID search-communities
// @Produce json
// @Param q query string true "Search query string"
// @Param limit query int false "Number of items to return"
// @Param offset query int false "Offset for pagination"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/search/communities [get]
func (h *SearchHandler) SearchCommunities(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query 'q' is required"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	results, err := h.service.SearchCommunities(c.Request.Context(), query, limit, offset)
	if err != nil {
		log.Printf("Failed to search communities: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search communities"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// @Summary Search events
// @Description Search for events by name or other criteria
// @ID search-events
// @Produce json
// @Param q query string true "Search query string"
// @Param limit query int false "Number of items to return"
// @Param offset query int false "Offset for pagination"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/search/events [get]
// @Security ApiKeyAuth
func (h *SearchHandler) SearchEvents(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query 'q' is required"})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	results, err := h.service.SearchEvents(c.Request.Context(), userID.(string), query, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}
