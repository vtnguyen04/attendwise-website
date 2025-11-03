package main

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/attendwise/backend/internal/module/community/domain"
	permission_domain "github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/gin-gonic/gin"
)

// CommunityHandler holds the dependencies for community handlers
type CommunityHandler struct {
	service domain.CommunityService
}

// NewCommunityHandler creates a new CommunityHandler
func NewCommunityHandler(service domain.CommunityService) *CommunityHandler {
	return &CommunityHandler{service: service}
}

// @Summary Create a new community
// @Description Create a new community
// @ID create-community
// @Accept json
// @Produce json
// @Param community_data body main.CreateCommunityRequest true "Community data"
// @Success 201 {object} CommunityResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) CreateCommunity(c *gin.Context) {
	var req CreateCommunityRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	community, err := h.service.CreateCommunity(c.Request.Context(), req.Name, req.Description, userID.(string), req.CoverImageURL, req.Type, req.AllowMemberPosts, req.AutoApprovePosts, req.AllowMemberInvites)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create community"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"community": community})
}

// @Summary Get a community
// @Description Get a community by ID
// @ID get-community
// @Produce json
// @Param id path string true "Community ID"
// @Success 200 {object} CommunityResponse
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id} [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) GetCommunity(c *gin.Context) {
	communityID := c.Param("id")
	var userID string
	if id, exists := c.Get("userID"); exists {
		userID = id.(string)
	}

	community, err := h.service.GetCommunity(c.Request.Context(), communityID, userID)
	if err != nil {
		if errors.Is(err, domain.ErrCommunityNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Community not found"})
		} else if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to view this community."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve community data"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"community": community})
}

// @Summary List communities
// @Description List communities with pagination
// @Success 200 {object} ListCommunitiesResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) ListCommunities(c *gin.Context) {
	log.Printf("[DEBUG] Handler ListCommunities - Entered function")
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID, ok := userIDVal.(string)
	if !ok {
		log.Printf("[ERROR] Handler ListCommunities - userID is not a string: %T, value: %v", userIDVal, userIDVal)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error: invalid user ID type"})
		return
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 12
	}
	offset := (page - 1) * limit

	log.Printf("[DEBUG] Handler ListCommunities - userID type: %T, value: %v", userID, userID)
	log.Printf("[DEBUG] Handler ListCommunities - Calling service with userID: %s, limit: %d, offset: %d", userID, limit, offset)

	communities, total, err := h.service.ListCommunities(c.Request.Context(), userID, limit, offset)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch communities"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"communities": communities,
		"pagination": gin.H{
			"total":    total,
			"page":     page,
			"limit":    limit,
			"has_more": (page*limit < int(total)),
		},
	})
}

// @Summary List user communities
// @Description List communities for the authenticated user
// @ID list-user-communities
// @Produce json
// @Success 200 {array} CommunityResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/my-communities [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) ListUserCommunities(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	communities, err := h.service.ListUserCommunities(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user communities"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"communities": communities})
}

// @Summary Update a community
// @Description Update a community's details
// @ID update-community
// @Accept json
// @Produce json
// @Param id path string true "Community ID"
// @Param community_data body main.UpdateCommunityRequest true "Community data to update"
// @Success 200 {object} CommunityResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id} [patch]
// @Security ApiKeyAuth
func (h *CommunityHandler) UpdateCommunity(c *gin.Context) {
	communityID := c.Param("id")

	var reqBody map[string]interface{}
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var fieldMask []string
	communityToUpdate := &domain.Community{
		ID: communityID,
	}

	userID, _ := c.Get("userID")

	if name, ok := reqBody["name"].(string); ok {
		communityToUpdate.Name = name
		fieldMask = append(fieldMask, "name")
	}
	if description, ok := reqBody["description"].(string); ok {
		communityToUpdate.Description = sql.NullString{String: description, Valid: true}
		fieldMask = append(fieldMask, "description")
	}
	if coverURL, ok := reqBody["cover_image_url"].(string); ok {
		communityToUpdate.CoverImageURL = sql.NullString{String: coverURL, Valid: true}
		fieldMask = append(fieldMask, "cover_image_url")
	}
	if communityType, ok := reqBody["type"].(string); ok {
		communityToUpdate.Type = communityType
		fieldMask = append(fieldMask, "type")
	}
	if allowMemberPosts, ok := reqBody["allow_member_posts"].(bool); ok {
		communityToUpdate.AllowMemberPosts = allowMemberPosts
		fieldMask = append(fieldMask, "allow_member_posts")
	}
	if autoApprovePosts, ok := reqBody["auto_approve_posts"].(bool); ok {
		communityToUpdate.AutoApprovePosts = autoApprovePosts
		fieldMask = append(fieldMask, "auto_approve_posts")
	}
	if allowInvites, ok := reqBody["allow_member_invites"].(bool); ok {
		communityToUpdate.AllowMemberInvites = allowInvites
		fieldMask = append(fieldMask, "allow_member_invites")
	}

	if len(fieldMask) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	updatedCommunity, err := h.service.UpdateCommunity(c.Request.Context(), userID.(string), communityToUpdate, fieldMask)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update community"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"community": updatedCommunity})
}

// @Summary Delete a community
// @Description Delete a community
// @ID delete-community
// @Param id path string true "Community ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id} [delete]
// @Security ApiKeyAuth
func (h *CommunityHandler) DeleteCommunity(c *gin.Context) {
	communityID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.service.DeleteCommunity(c.Request.Context(), communityID, userID.(string))
	if err != nil {
		if errors.Is(err, domain.ErrCommunityNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Community not found"})
		} else if errors.Is(err, permission_domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to delete this community."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete community"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Join a community
// @Description Join a community
// @ID join-community
// @Produce json
// @Param id path string true "Community ID"
// @Success 200 {object} JoinCommunityResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/members [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) JoinCommunity(c *gin.Context) {
	communityID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	updatedCommunity, err := h.service.JoinCommunity(c.Request.Context(), communityID, userID.(string))
	if err != nil {
		if errors.Is(err, domain.ErrCannotJoinSecretCommunity) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else if errors.Is(err, domain.ErrPermissionDenied) && updatedCommunity != nil && updatedCommunity.Status == "pending" {
			// If the error is permission denied but the community status is pending, it means the join request was submitted successfully.
			c.JSON(http.StatusOK, gin.H{"message": "Join request submitted successfully, awaiting approval", "community": updatedCommunity})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process join request", "details": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully processed join request", "community": updatedCommunity})
}

// @Summary Leave a community
// @Description Leave a community
// @ID leave-community
// @Produce json
// @Param id path string true "Community ID"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/members/me [delete]
// @Security ApiKeyAuth
func (h *CommunityHandler) LeaveCommunity(c *gin.Context) {
	communityID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.service.LeaveCommunity(c.Request.Context(), communityID, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave community"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully left community"})
}

// @Summary Update member role
// @Description Update a member's role in a community
// @ID update-member-role
// @Accept json
// @Produce json
// @Param id path string true "Community ID"
// @Param userId path string true "User ID of the member to update"
// @Param role_data body main.UpdateMemberRoleRequest true "Role data"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/members/{userId} [patch]
// @Security ApiKeyAuth
func (h *CommunityHandler) UpdateMemberRole(c *gin.Context) {
	communityID := c.Param("id")
	targetUserID := c.Param("userId")
	performingUserID, _ := c.Get("userID")

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	err := h.service.UpdateMemberRole(c.Request.Context(), communityID, performingUserID.(string), targetUserID, req.Role)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member role updated"})
}

// @Summary Remove a member
// @Description Remove a member from a community
// @ID remove-member
// @Produce json
// @Param id path string true "Community ID"
// @Param userId path string true "User ID of the member to remove"
// @Success 200 {object} MessageResponse
// @Failure 403 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/members/{userId} [delete]
// @Security ApiKeyAuth
func (h *CommunityHandler) RemoveMember(c *gin.Context) {
	communityID := c.Param("id")
	targetUserID := c.Param("userId")
	performingUserID, _ := c.Get("userID")

	err := h.service.RemoveMember(c.Request.Context(), communityID, performingUserID.(string), targetUserID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed"})
}

// @Summary Create a post in a community
// @Description Create a new post in a specific community
// @ID create-community-post
// @Accept json
// @Produce json
// @Param id path string true "Community ID"
// @Param post_data body main.CreatePostRequest true "Post data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/posts [post]
// @Security ApiKeyAuth

// @Summary Create a post in the global feed
// @Description Create a new post in the global feed
// @ID create-feed-post
// @Accept json
// @Produce json
// @Param post_data body main.CreatePostRequest true "Post data"
// @Success 201 {object} PostResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/feed/posts [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) CreatePost(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	communityID := c.Param("id")
	if communityID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing community ID"})
		return
	}

	var req CreatePostRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Basic validation: a post must have content.
	if req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Post must have content."})
		return
	}

	post := &domain.Post{
		AuthorID:    userID.(string),
		Title:       sql.NullString{String: req.Title, Valid: req.Title != ""},
		Content:     req.Content,
		Visibility:  req.Visibility,
		Hashtags:    req.Hashtags,
		EventID:     sql.NullString{String: req.EventID, Valid: req.EventID != ""},
		CommunityID: sql.NullString{String: communityID, Valid: true},
		PostType:    req.PostType,
	}

	if len(req.FileAttachments) > 0 {
		fileAttachments := make([]domain.Attachment, 0, len(req.FileAttachments))
		derivedMedia := make([]string, 0, len(req.FileAttachments))
		imageSeen := make(map[string]struct{})

		for _, att := range req.FileAttachments {
			url := strings.TrimSpace(att.Url)
			if url == "" {
				continue
			}

			fileAttachments = append(fileAttachments, domain.Attachment{
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
		post.PostType = "community"
	}

	createdPost, err := h.service.CreatePost(c.Request.Context(), post)
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You must be an active member to post."})
			return
		}
		log.Printf("[ERROR] CreatePost handler failed: %v", err) // More detailed server log
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create post"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"post": createdPost})
}

// @Summary List posts
// @Description List posts in a community with pagination and filters
// @ID list-posts
// @Produce json
// @Param id path string true "Community ID"
// @Param status query string false "Post status (e.g., approved, pending)"
// @Param event_id query string false "Event ID"
// @Param page query int false "Page number"
// @Param limit query int false "Number of items per page"
// @Success 200 {object} ListPostsResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/posts [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) ListPosts(c *gin.Context) {
	communityID := c.Param("id")
	userID, _ := c.Get("userID")

	// Filters
	status := c.Query("status")
	eventID := c.Query("event_id")

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	posts, total, err := h.service.GetPosts(c.Request.Context(), communityID, eventID, userID.(string), status, limit, offset, "")
	if err != nil {
		log.Printf("[ERROR] Handler ListPosts: Failed to get posts from service for community %s: %v", communityID, err)
		if errors.Is(err, domain.ErrNotMember) || errors.Is(err, permission_domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to view posts in this community."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"posts": posts,
		"pagination": gin.H{
			"total":    total,
			"page":     page,
			"limit":    limit,
			"has_more": (page*limit < total),
		},
	})
}

// @Summary Create a comment
// @Description Create a new comment on a post
// @ID create-comment
// @Accept json
// @Produce json
// @Param postID path string true "Post ID"
// @Param comment_data body main.CreateCommentRequest true "Comment data"
// @Success 201 {object} CommentResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/comments [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) CreateComment(c *gin.Context) {
	postID := c.Param("postID")
	authorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Content         string `json:"content" binding:"required"`
		ParentCommentID string `json:"parent_comment_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	comment := &domain.Comment{
		PostID:          postID,
		AuthorID:        authorID.(string),
		ParentCommentID: sql.NullString{String: req.ParentCommentID, Valid: req.ParentCommentID != ""},
		Content:         req.Content,
	}

	createdComment, err := h.service.CreateComment(c.Request.Context(), comment)
	if err != nil {
		if errors.Is(err, domain.ErrNotMember) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You must be a member of the community to comment."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"comment": createdComment})
}

// @Summary List comments
// @Description List comments for a post
// @ID list-comments
// @Produce json
// @Param postID path string true "Post ID"
// @Success 200 {array} CommentResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/comments [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) ListComments(c *gin.Context) {
	postID := c.Param("postID")

	comments, err := h.service.GetComments(c.Request.Context(), postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"comments": comments})
}

// @Summary Approve a post
// @Description Approve a pending post
// @ID approve-post
// @Produce json
// @Param postID path string true "Post ID"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/approve [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) ApprovePost(c *gin.Context) {
	postID := c.Param("postID")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := h.service.ApprovePost(c.Request.Context(), postID, userID.(string)); err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve post"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Post approved successfully"})
}

// @Summary Reject a post
// @Description Reject a pending post
// @ID reject-post
// @Produce json
// @Param postID path string true "Post ID"
// @Success 200 {object} MessageResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/reject [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) RejectPost(c *gin.Context) {
	postID := c.Param("postID")

	err := h.service.RejectPost(c.Request.Context(), postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject post"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Post rejected successfully"})
}

// @Summary React to a post
// @Description Add or update a reaction to a post
// @ID react-to-post
// @Accept json
// @Produce json
// @Param postID path string true "Post ID"
// @Param reaction_data body main.ReactToPostRequest true "Reaction data"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/reactions [post]
// @Security ApiKeyAuth
// ReactToPost handles adding or updating a reaction to a post.
func (h *CommunityHandler) ReactToPost(c *gin.Context) {
	postID := c.Param("postID")
	if postID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "postID cannot be empty"})
		return
	}
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		ReactionType string `json:"reaction_type" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	err := h.service.ReactToTarget(c.Request.Context(), userID.(string), "post", postID, req.ReactionType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply reaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reaction saved"})
}

// @Summary Delete a reaction
// @Description Remove a reaction from a post
// @ID delete-reaction
// @Produce json
// @Param postID path string true "Post ID"
// @Success 200 {object} MessageResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/reactions [delete]
// @Security ApiKeyAuth
// DeleteReaction handles removing a reaction from a post.
func (h *CommunityHandler) DeleteReaction(c *gin.Context) {
	postID := c.Param("postID")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.service.DeleteReaction(c.Request.Context(), userID.(string), "post", postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove reaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reaction removed"})
}

// @Summary Pin/unpin a post
// @Description Pin or unpin a post in a community
// @ID pin-post
// @Accept json
// @Produce json
// @Param postID path string true "Post ID"
// @Param pin_data body main.PinPostRequest true "Pin data"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/pin [post]
// @Security ApiKeyAuth
// PinPost handles pinning or unpinning a post.
func (h *CommunityHandler) PinPost(c *gin.Context) {
	postID := c.Param("postID")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		IsPinned bool `json:"is_pinned"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.service.PinPost(c.Request.Context(), postID, userID.(string), req.IsPinned); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update pin status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Post pin status updated"})
}

// @Summary Get reactions
// @Description Retrieve reactions for a post or comment
// @Success 200 {array} ReactionResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/reactions [get]
// @Security ApiKeyAuth
// GetReactions handles retrieving reactions for a post or comment.
func (h *CommunityHandler) GetReactions(c *gin.Context) {
	postID := c.Param("postID")
	// For now, we only support posts. Extend targetType as needed.
	targetType := "post"

	reactions, err := h.service.GetReactions(c.Request.Context(), targetType, postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve reactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reactions": reactions})
}

// @Summary Approve a comment
// @Description Approve a pending comment
// @ID approve-comment
// @Produce json
// @Param commentID path string true "Comment ID"
// @Success 200 {object} MessageResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/comments/{commentID}/approve [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) ApproveComment(c *gin.Context) {
	commentID := c.Param("commentID")

	err := h.service.ApproveComment(c.Request.Context(), commentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve comment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment approved successfully"})
}

// @Summary Reject a comment
// @Description Reject a pending comment
// @ID reject-comment
// @Produce json
// @Param commentID path string true "Comment ID"
// @Success 200 {object} MessageResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/comments/{commentID}/reject [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) RejectComment(c *gin.Context) {
	commentID := c.Param("commentID")

	err := h.service.RejectComment(c.Request.Context(), commentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject comment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment rejected successfully"})
}

// @Summary Suggest communities
// @Description Get suggestions for communities to join
// @ID suggest-communities
// @Produce json
// @Success 200 {array} CommunityResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/suggestions [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) SuggestCommunities(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	suggestions, err := h.service.SuggestCommunities(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get community suggestions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"suggestions": suggestions})
}

// @Summary List community members
// @Description List all members of a community
// @ID list-community-members
// @Produce json
// @Param id path string true "Community ID"
// @Success 200 {array} CommunityMemberResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/members [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) ListMembers(c *gin.Context) {
	communityID := c.Param("id")

	members, err := h.service.ListMembers(c.Request.Context(), communityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch community members"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"members": members})
}

// @Summary List member previews
// @Description List a preview of members for a community
// @ID list-member-previews
// @Produce json
// @Param id path string true "Community ID"
// @Success 200 {array} CommunityMemberResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/member-previews [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) ListMemberPreviews(c *gin.Context) {
	communityID := c.Param("id")

	memberPreviews, err := h.service.ListMemberPreviews(c.Request.Context(), communityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch member previews"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"member_previews": memberPreviews})
}

// @Summary List pending members
// @Description List members whose join requests are pending for a community
// @ID list-pending-members
// @Produce json
// @Param id path string true "Community ID"
// @Success 200 {array} CommunityMemberResponse
// @Failure 403 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/members/pending [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) ListPendingMembers(c *gin.Context) {
	communityID := c.Param("id")
	userID, _ := c.Get("userID")

	members, err := h.service.ListPendingMembers(c.Request.Context(), communityID, userID.(string))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"members": members})
}

// @Summary Approve a member
// @Description Approve a pending member's join request to a community
// @Success 200 {object} MessageResponse
// @Failure 403 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/members/{userId}/approve [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) ApproveMember(c *gin.Context) {
	communityID := c.Param("id")
	targetUserID := c.Param("userId")
	performingUserID, _ := c.Get("userID")

	err := h.service.ApproveMember(c.Request.Context(), communityID, performingUserID.(string), targetUserID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member approved successfully"})
}

// @Summary Get recommended posts
// @Description Get recommended posts based on a given post
// @ID get-recommended-posts
// @Produce json
// @Param postID path string true "Post ID"
// @Param limit query int false "Number of recommended posts to return"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/recommendations [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) GetRecommendedPosts(c *gin.Context) {
	postID := c.Param("postID")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit < 1 || limit > 50 {
		limit = 10
	}

	recommendations, err := h.service.GetRecommendedPosts(c.Request.Context(), postID, userID.(string), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get post recommendations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"recommendations": recommendations})
}

// @Summary Follow test
// @Description Temporary handler for debugging routing issues
// @ID follow-test
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/follow-test [post]
// @Security ApiKeyAuth
// FollowTest is a temporary handler for debugging routing issues.
func (h *CommunityHandler) FollowTest(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Follow test successful!"})
}

// @Summary Get user posts in community
// @Description Get posts by a specific user within a community
// @ID get-user-posts-in-community
// @Produce json
// @Param id path string true "Community ID"
// @Param userId path string true "User ID"
// @Param page query int false "Page number"
// @Param limit query int false "Number of items per page"
// @Success 200 {object} ListPostsResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/posts/user/{userId} [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) GetUserPostsInCommunity(c *gin.Context) {
	communityID := c.Param("id")
	userID := c.Param("userId")
	requestingUserID, _ := c.Get("userID")

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	posts, total, err := h.service.GetPosts(c.Request.Context(), communityID, "", requestingUserID.(string), "approved", limit, offset, userID)
	if err != nil {
		log.Printf("[ERROR] Handler GetUserPostsInCommunity: Failed to get posts from service for community %s and user %s: %v", communityID, userID, err)
		if errors.Is(err, domain.ErrNotMember) || errors.Is(err, permission_domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to view posts in this community."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"posts": posts,
		"pagination": gin.H{
			"total":    total,
			"page":     page,
			"limit":    limit,
			"has_more": (page*limit < total),
		},
	})
}

// @Summary Invite a member
// @Description Invite a user to a community
// @Success 200 {object} MessageResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/invites [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) InviteMember(c *gin.Context) {
	communityID := c.Param("id")
	inviterID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		InviteeEmail string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	err := h.service.InviteMember(c.Request.Context(), communityID, inviterID.(string), req.InviteeEmail)
	if err != nil {
		if errors.Is(err, domain.ErrCommunityNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Community not found"})
		} else if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to invite members to this community."})
		} else if errors.Is(err, domain.ErrUserAlreadyMember) {
			c.JSON(http.StatusConflict, gin.H{"error": "User is already a member of this community."})
		} else if errors.Is(err, domain.ErrUserAlreadyInvited) {
			c.JSON(http.StatusConflict, gin.H{"error": "User has already been invited to this community."})
		} else {
			log.Printf("[ERROR] InviteMember handler failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send invitation"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invitation sent successfully"})
}

// @Summary Get a post
// @Description Get a post by ID
// @ID get-post
// @Produce json
// @Param postID path string true "Post ID"
// @Success 200 {object} PostResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID} [get]
// @Security ApiKeyAuth
func (h *CommunityHandler) GetPost(c *gin.Context) {
	postID := c.Param("postID")
	userID, _ := c.Get("userID")

	post, err := h.service.GetPost(c.Request.Context(), postID, userID.(string))
	if err != nil {
		if errors.Is(err, domain.ErrPostNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		} else if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to view this post."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve post data"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"post": post})
}

// @Summary Update a post
// @Description Update an existing post
// @ID update-post
// @Accept json
// @Produce json
// @Param postID path string true "Post ID"
// @Param post_data body main.UpdatePostRequest true "Post data to update"
// @Success 200 {object} PostResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID} [patch]
// @Security ApiKeyAuth
func (h *CommunityHandler) UpdatePost(c *gin.Context) {
	postID := c.Param("postID")
	authorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Content    string `json:"content"`
		Visibility string `json:"visibility"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	post := &domain.Post{
		ID:         postID,
		AuthorID:   authorID.(string),
		Content:    req.Content,
		Visibility: req.Visibility,
	}

	updatedPost, err := h.service.UpdatePost(c.Request.Context(), post)
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to edit this post."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update post"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"post": updatedPost})
}

// @Summary Delete a post
// @Description Delete a post
// @ID delete-post
// @Param postID path string true "Post ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID} [delete]
// @Security ApiKeyAuth
func (h *CommunityHandler) DeletePost(c *gin.Context) {
	postID := c.Param("postID")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.service.DeletePost(c.Request.Context(), postID, userID.(string))
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to delete this post."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete post"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Update a comment
// @Description Update an existing comment
// @Success 200 {object} CommentResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/comments/{commentID} [patch]
// @Security ApiKeyAuth
func (h *CommunityHandler) UpdateComment(c *gin.Context) {
	commentID := c.Param("commentID")
	authorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	comment := &domain.Comment{
		ID:       commentID,
		AuthorID: authorID.(string),
		Content:  req.Content,
	}

	updatedComment, err := h.service.UpdateComment(c.Request.Context(), comment)
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to edit this comment."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update comment"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"comment": updatedComment})
}

// @Summary Delete a comment
// @Description Delete a comment
// @ID delete-comment
// @Param commentID path string true "Comment ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/comments/{commentID} [delete]
// @Security ApiKeyAuth
func (h *CommunityHandler) DeleteComment(c *gin.Context) {
	commentID := c.Param("commentID")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.service.DeleteComment(c.Request.Context(), commentID, userID.(string))
	if err != nil {
		if errors.Is(err, domain.ErrPermissionDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to delete this comment."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Accept community invite
// @Description Accept an invitation to a community
// @ID accept-community-invite
// @Produce json
// @Param token path string true "Invitation token"
// @Success 200 {object} AcceptInviteResponse
// @Failure 404 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/invites/{token}/accept [get]
func (h *CommunityHandler) AcceptInvite(c *gin.Context) {
	token := c.Param("token")

	// For accepting an invite, the user might not be authenticated yet.
	// The service layer will handle the logic of adding the user as a member.
	// If the user is logged in, we can get their ID, otherwise it's an anonymous acceptance.
	var userID string
	if id, exists := c.Get("userID"); exists {
		userID = id.(string)
	}

	communityID, err := h.service.AcceptInvite(c.Request.Context(), token, userID)
	if err != nil {
		if errors.Is(err, domain.ErrInviteNotFound) || errors.Is(err, domain.ErrInviteExpired) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if errors.Is(err, domain.ErrUserAlreadyMember) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		} else {
			log.Printf("[ERROR] AcceptInvite handler failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept invitation"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invitation accepted successfully", "community_id": communityID})
}

// @Summary Create a poll
// @Description Create a new poll in a community
// @ID create-poll
// @Accept json
// @Produce json
// @Param id path string true "Community ID"
// @Success 201 {object} PostResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/communities/{id}/polls [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) CreatePoll(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	communityID := c.Param("id")
	if communityID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing community ID"})
		return
	}

	var req struct {
		Title      string   `json:"title"`
		Content    string   `json:"content"`
		Visibility string   `json:"visibility"`
		Options    []string `json:"options"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if len(req.Options) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A poll must have at least two options."})
		return
	}

	post := &domain.Post{
		AuthorID:    userID.(string),
		Title:       sql.NullString{String: req.Title, Valid: req.Title != ""},
		Content:     req.Content,
		Visibility:  req.Visibility,
		CommunityID: sql.NullString{String: communityID, Valid: true},
	}

	createdPost, err := h.service.CreatePoll(c.Request.Context(), post, req.Options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create poll"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"post": createdPost})
}

// @Summary Vote on a poll
// @Description Vote on a poll option
// @ID vote-poll
// @Param postID path string true "Post ID (Poll ID)"
// @Param optionID path string true "Option ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/posts/{postID}/poll/vote/{optionID} [post]
// @Security ApiKeyAuth
func (h *CommunityHandler) VotePoll(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	postID := c.Param("postID")
	optionID := c.Param("optionID")

	if err := h.service.VotePoll(c.Request.Context(), userID.(string), postID, optionID); err != nil {
		if err.Error() == "user has already voted on this poll" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to vote on poll"})
		return
	}

	c.Status(http.StatusNoContent)
}
