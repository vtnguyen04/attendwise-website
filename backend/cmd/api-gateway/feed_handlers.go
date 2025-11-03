package main

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	community_domain "github.com/attendwise/backend/internal/module/community/domain"
	feed_domain "github.com/attendwise/backend/internal/module/feed/domain"
	permission_domain "github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/gin-gonic/gin"
)

// FeedHandler encapsulates endpoints related to feed experiences.
type FeedHandler struct {
	communityService community_domain.CommunityService
	feedService      feed_domain.Service
}

// NewFeedHandler wires feed routes to their services.
func NewFeedHandler(communityService community_domain.CommunityService, feedService feed_domain.Service) *FeedHandler {
	return &FeedHandler{
		communityService: communityService,
		feedService:      feedService,
	}
}

// @Summary Create a global post
// @Description Create a new post in the global feed
// @ID create-global-post
// @Accept json
// @Produce json
// @Param post_data body main.CreatePostRequest true "Post data"
// @Success 201 {object} PostResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}

// @Security ApiKeyAuth
func (h *FeedHandler) CreatePost(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req CreatePostRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Post must have content."})
		return
	}

	post := &community_domain.Post{
		AuthorID:   userID.(string),
		Title:      sql.NullString{String: req.Title, Valid: req.Title != ""},
		Content:    req.Content,
		Visibility: req.Visibility,
		Hashtags:   req.Hashtags,
		EventID:    sql.NullString{String: req.EventID, Valid: req.EventID != ""},
		PostType:   req.PostType,
	}

	// Normalize file attachments and derive image URLs if media_urls not provided
	if len(req.FileAttachments) > 0 {
		fileAttachments := make([]community_domain.Attachment, 0, len(req.FileAttachments))
		derivedMedia := make([]string, 0, len(req.FileAttachments))
		imageSeen := make(map[string]struct{})

		for _, att := range req.FileAttachments {
			url := strings.TrimSpace(att.Url)
			if url == "" {
				continue
			}

			fileAttachments = append(fileAttachments, community_domain.Attachment{
				Name: att.Name,
				Url:  url,
				Type: att.Type,
			})

			attType := strings.ToLower(strings.TrimSpace(att.Type))
			if strings.HasPrefix(attType, "image/") {
				if _, exists := imageSeen[url]; !exists {
					imageSeen[url] = struct{}{}
					derivedMedia = append(derivedMedia, url)
				}
			}
		}

		post.FileAttachments = fileAttachments

		if len(derivedMedia) > 0 {
			req.MediaURLs = append(req.MediaURLs, derivedMedia...)
		}
	}

	if len(req.MediaURLs) > 0 {
		mediaSeen := make(map[string]struct{})
		post.MediaURLs = make([]string, 0, len(req.MediaURLs))
		for _, mediaURL := range req.MediaURLs {
			normalized := strings.TrimSpace(mediaURL)
			if normalized == "" {
				continue
			}
			if _, exists := mediaSeen[normalized]; exists {
				continue
			}
			mediaSeen[normalized] = struct{}{}
			post.MediaURLs = append(post.MediaURLs, normalized)
		}
	}

	// Default post type if not provided
	if post.PostType == "" {
		if post.EventID.Valid {
			post.PostType = "event"
		} else {
			post.PostType = "general"
		}
	}

	if post.EventID.Valid {
		// If it's an event post, ensure community ID is null
		post.CommunityID = sql.NullString{Valid: false}
	} else if post.PostType == "general" {
		// If it's a general post, ensure community ID is null
		post.CommunityID = sql.NullString{Valid: false}
	}

	createdPost, err := h.communityService.CreatePost(c.Request.Context(), post)
	if err != nil {
		if errors.Is(err, community_domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You must be an active member to post."})
			return
		}

		log.Printf("[ERROR] Feed CreatePost handler failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create post"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"post": createdPost})
}

// @Summary List global posts
// @Description List global posts with pagination and author filter
// @ID list-global-posts
// @Produce json
// @Param limit query int false "Number of items per page"
// @Param offset query int false "Offset for pagination"
// @Param author_id query string false "Filter posts by author ID"
// @Success 200 {object} ListPostsResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}

// @Security ApiKeyAuth
func (h *FeedHandler) ListGlobalPosts(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	authorID := c.Query("author_id")

	posts, total, err := h.feedService.ListGlobalPosts(c.Request.Context(), userID.(string), limit, offset, authorID)
	if err != nil {
		log.Printf("[ERROR] Feed ListGlobalPosts handler failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"posts": posts,
		"pagination": gin.H{
			"total":    total,
			"limit":    limit,
			"offset":   offset,
			"has_more": offset+len(posts) < total,
		},
	})
}

// @Summary Get user feed
// @Description Get the personalized feed for the authenticated user
// @ID get-user-feed
// @Produce json
// @Param limit query int false "Number of items to return"
// @Param scope query string false "Feed scope (all, community, global)"
// @Success 200 {array} FeedItemResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}

// @Security ApiKeyAuth
func (h *FeedHandler) GetFeed(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	scopeParam := strings.ToLower(strings.TrimSpace(c.DefaultQuery("scope", string(feed_domain.ScopeAll))))

	var scope feed_domain.Scope
	switch scopeParam {
	case "", string(feed_domain.ScopeAll):
		scope = feed_domain.ScopeAll
	case string(feed_domain.ScopeCommunity):
		scope = feed_domain.ScopeCommunity
	case string(feed_domain.ScopeGlobal):
		scope = feed_domain.ScopeGlobal
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scope parameter"})
		return
	}

	feed, err := h.feedService.GetFeed(c.Request.Context(), userID.(string), limit, scope)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"feed": feed})
}

// @Summary Get activity feed
// @Description Get the activity feed for the authenticated user
// @ID get-activity-feed
// @Produce json
// @Param limit query int false "Number of items to return"
// @Param offset query int false "Offset for pagination"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}

// @Security ApiKeyAuth
func (h *FeedHandler) GetActivityFeed(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	activities, total, err := h.communityService.GetActivityFeed(c.Request.Context(), userID.(string), limit, offset)
	if err != nil {
		if errors.Is(err, permission_domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to view the activity feed."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activity feed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": activities,
		"pagination": gin.H{
			"limit":    limit,
			"offset":   offset,
			"total":    total,
			"has_more": offset+len(activities) < total,
		},
	})
}
