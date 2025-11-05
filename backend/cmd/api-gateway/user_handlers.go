package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json" // Add this line
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/attendwise/backend/internal/module/user/domain"
	"github.com/attendwise/backend/pkg/googleauth"
	"github.com/attendwise/backend/pkg/config"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

// UserHandler will hold our dependencies
type UserHandler struct {
	userService       domain.UserService
	googleOAuthClient *googleauth.GoogleOAuthClient
	redisClient       *redis.Client
	googleRedirectURI string
	cfg               config.Config
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(userService domain.UserService, googleOAuthClient *googleauth.GoogleOAuthClient, googleRedirectURI string, redisClient *redis.Client, cfg config.Config) *UserHandler {
	return &UserHandler{
		userService:       userService,
		googleOAuthClient: googleOAuthClient,
		redisClient:       redisClient,
		googleRedirectURI: googleRedirectURI,
		cfg:               cfg,
	}
}

// LivenessChallenge starts the liveness check process and returns a session ID and challenges.
// @Summary Start liveness challenge
// @Description Initiates a liveness challenge for face verification, returning a session ID and challenge details.
// @Success 200 {object} ai.StartLivenessChallengeResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/liveness-challenge [get]
// @Security ApiKeyAuth
func (h *UserHandler) LivenessChallenge(c *gin.Context) {
	resp, err := h.userService.GetLivenessChallenge(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start liveness challenge"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// EnrollFaceForAuthentication handles the face enrollment process with a liveness check.
// @Summary Enroll face for authentication
// @Description Submits liveness video data to enroll face for authentication.
// @ID enroll-face
// @Accept json
// @Produce json
// @Param enrollment_data body EnrollFaceRequest true "Liveness session ID, video data, and consent"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/enroll-face [post]
// @Security ApiKeyAuth
func (h *UserHandler) EnrollFaceForAuthentication(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		SessionID    string `json:"session_id" binding:"required"`
		VideoData    []byte `json:"video_data" binding:"required"`
		ConsentGiven bool   `json:"consent_given" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	success, message, err := h.userService.SubmitLivenessVideo(c.Request.Context(), userID.(string), req.SessionID, req.VideoData, req.ConsentGiven)
	log.Printf("UserService response: success=%v, message='%s', err=%v", success, message, err)

	// Case 1: Final success. The service layer indicates success and err is nil.
	if err == nil && success {
		c.JSON(http.StatusOK, gin.H{
			"status":           "success",
			"message":          message,
			"face_id_enrolled": success,
		})
		return
	}

	// Case 2: Intermediate, non-fatal states. The service layer may return an error,
	// but the message contains specific signals the client can handle.
	// We return 200 OK so the client doesn't see a transport error, but include the 'error' field for client logic.
	if strings.Contains(message, "CHALLENGE_PASSED_CONTINUE") || strings.Contains(message, "CHALLENGE_FAILED_RETRY") {
		// Return a 400 Bad Request for intermediate steps. This signals an "error" to the frontend's try/catch
		// block, but we send the specific message so the frontend knows how to proceed.
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return
	}

	// Case 3: Any other genuine error.
	c.JSON(http.StatusBadRequest, gin.H{"error": message})
}

// @Summary Register a new user
// @Description Register a new user
// @ID register-user
// @Accept json
// @Produce json
// @Param user body RegisterRequest true "User object"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/auth/register [post]
// Register handles user registration.
func (h *UserHandler) Register(c *gin.Context) {
	var req struct {
		Name              string `json:"name" binding:"required"`
		Email             string `json:"email" binding:"required,email"`
		Password          string `json:"password" binding:"required,min=8"`
		Phone             string `json:"phone"`
		Company           string `json:"company"`
		Position          string `json:"position"`
		ProfilePictureURL string `json:"profile_picture_url"`
		Bio               string `json:"bio"`
		Location          string `json:"location"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	createdUser, err := h.userService.Register(c.Request.Context(), req.Name, req.Email, req.Password, req.Phone, req.Company, req.Position, req.ProfilePictureURL, req.Bio, req.Location)
	if err != nil {
		if errors.Is(err, domain.ErrEmailExists) || errors.Is(err, domain.ErrPhoneExists) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"user": createdUser})
}

// @Summary Login a user
// @Description Login a user
// @ID login-user
// @Accept json
// @Produce json
// @Param credentials body LoginRequest true "User credentials"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Router /api/v1/auth/login [post]
// Login handles user authentication.
func (h *UserHandler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	user, accessToken, refreshToken, err := h.userService.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) || err.Error() == "invalid credentials" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

const defaultFrontendRedirect = "http://localhost:3000/dashboard"

// @Summary Login with Google
// @Description Redirects to Google for authentication
// @ID google-login
// @Router /api/v1/auth/google/login [get]
// GoogleLogin initiates the Google OAuth2 login process.
func (h *UserHandler) GoogleLogin(c *gin.Context) {
	if h.googleOAuthClient == nil || h.googleRedirectURI == "" {
		log.Println("[WARN] Google login attempted but OAuth credentials are not configured")
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google login is not available"})
		return
	}

	callbackURL := c.Query("callback_url")
	if callbackURL == "" {
		// Fallback to a default URL if not provided, though the frontend should always provide it.
		// Consider logging a warning if it's missing.
				callbackURL = h.cfg.FrontendURL + "/dashboard"	} else {
		if parsed, err := url.Parse(callbackURL); err != nil || parsed.Scheme == "" || parsed.Host == "" {
			log.Printf("[WARN] Invalid callback_url provided (%s). Falling back to default.", callbackURL)
			                callbackURL = h.cfg.FrontendURL + "/dashboard"		}
	}

	state, err := h.generateStateOauthCookie(c, callbackURL)
	if err != nil {
		log.Printf("Error generating OAuth state: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate Google login"})
		return
	}

	// Pass the dynamic redirect URI to the GetAuthCodeURL function
	c.Redirect(http.StatusTemporaryRedirect, h.googleOAuthClient.GetAuthCodeURL(state, h.googleRedirectURI))
}

// GoogleCallback handles the redirect from Google OAuth2.
// @Summary Google OAuth callback
// @Description Handles the redirect from Google OAuth2 after successful authentication.
// @ID google-oauth-callback
// @Param state query string true "OAuth state parameter"
// @Param code query string true "Authorization code from Google"
// @Success 302 "Redirect to frontend with user data and token"
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/auth/google/callback [get]
func (h *UserHandler) GoogleCallback(c *gin.Context) {
	if h.googleOAuthClient == nil || h.googleRedirectURI == "" {
		log.Println("[WARN] Google callback invoked but OAuth credentials are not configured")
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google login is not available"})
		return
	}

	// Retrieve state from cookie
	cookieState, err := c.Cookie("oauthstate")
	if err != nil {
		log.Printf("Google OAuth: State cookie not found: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "State cookie not found or invalid"})
		return
	}

	// Retrieve state from query parameter
	queryState := c.Query("state")

	// Verify state from Redis and get the callback URL
	callbackURL, err := h.redisClient.Get(c.Request.Context(), "oauthstate:"+cookieState).Result()
	if err != nil {
		log.Printf("Google OAuth: State not found in Redis or expired: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired state parameter"})
		return
	}

	// Compare query state with cookie state
	if queryState != cookieState {
		log.Printf("Google OAuth state mismatch: expected %s, got %s", cookieState, queryState)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid state parameter"})
		return
	}

	// Delete the state from Redis after successful verification
	err = h.redisClient.Del(c.Request.Context(), "oauthstate:"+cookieState).Err()
	if err != nil {
		log.Printf("Failed to delete state from Redis: %v", err)
		// Continue processing, as this is not a critical failure for the login flow
	}

	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Authorization code not found"})
		return
	}

	googleUser, err := h.googleOAuthClient.ExchangeCode(c.Request.Context(), code, h.googleRedirectURI)
	if err != nil {
		log.Printf("Google OAuth code exchange failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange Google code"})
		return
	}

	user, accessToken, _, err := h.userService.GoogleLoginOrRegister(c.Request.Context(), googleUser)
	if err != nil {
		log.Printf("Google login/registration failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to login/register with Google"})
		return
	}

	userJSONBytes, err := json.Marshal(user)
	if err != nil {
		log.Printf("Failed to serialize user to JSON: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process user data"})
		return
	}
	userJSON := string(userJSONBytes)
	// Redirect to the frontend with the user data and token in the query parameters
	redirectURL := fmt.Sprintf("%s?user=%s&token=%s", callbackURL, url.QueryEscape(userJSON), accessToken)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func (h *UserHandler) generateStateOauthCookie(c *gin.Context, callbackURL string) (string, error) {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return "", fmt.Errorf("failed to generate random state: %w", err)
	}
	state := base64.URLEncoding.EncodeToString(b)

	expiration := 10 * time.Minute // State valid for 10 minutes

	// Store the callbackURL in Redis with the state as the key
	err = h.redisClient.Set(c.Request.Context(), "oauthstate:"+state, callbackURL, expiration).Err()
	if err != nil {
		return "", fmt.Errorf("failed to save state to redis: %w", err)
	}

	host := "localhost"
	if h, _, found := strings.Cut(host, ":"); found {
		host = h
	}
if host == "" {
		host = "localhost"
	}
	secureCookie := c.Request.TLS != nil
	if !secureCookie && strings.EqualFold(c.Request.Header.Get("X-Forwarded-Proto"), "https") {
		secureCookie = true
	}
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	if cookieDomain == "" {
		cookieDomain = host // Default to current host for local development if not set
	}

	c.SetCookie("oauthstate", state, int(expiration.Seconds()), "/", cookieDomain, secureCookie, true) // Secure and HttpOnly in production
	return state, nil
}

// @Summary Get user profile
// @Success 200 {object} UserResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/v1/users/me [get]
// @Security ApiKeyAuth
// GetProfile retrieves the current user's profile.
func (h *UserHandler) GetProfile(c *gin.Context) {
	log.Println("GetProfile: Received request")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	user, err := h.userService.GetProfile(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// @Summary Get user by ID
// @Description Get a user's public profile by their ID
// @ID get-user-by-id
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} UserResponse
// @Failure 404 {object} map[string]interface{}
// @Router /api/v1/users/{id} [get]
// GetUserByID retrieves a user's public profile by their ID.
func (h *UserHandler) GetUserByID(c *gin.Context) {
	userID := c.Param("id")

	user, err := h.userService.GetProfile(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// We might want to return a subset of data for public profiles in the future,
	// but for now, we return the same full user object, excluding sensitive fields.
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// @Summary Get user relationship
// @Description Get the relationship status between the authenticated user and another user
// @ID get-user-relationship
// @Produce json
// @Param id path string true "User ID of the profile owner"
// @Success 200 {object} UserRelationshipResponse
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/relationship [get]
// @Security ApiKeyAuth
func (h *UserHandler) GetUserRelationship(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileUserID := c.Param("id")

	isFollowing, err := h.userService.CheckFollowStatus(c.Request.Context(), authenticatedUserID.(string), profileUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user relationship"})
		return	}

	c.JSON(http.StatusOK, gin.H{"relationship": gin.H{"is_following": isFollowing}})
}

// @Summary Get all users
// @Description Get all users
// @ID get-all-users
// @Produce json
// @Success 200 {array} UserResponse
// @Router /api/v1/users [get]
// @Param page query int false "Page number"
// @Param limit query int false "Number of items per page"
// GetUsers retrieves a paginated list of users.
func (h *UserHandler) GetUsers(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	pageInt := 1
	limitInt := 10
	fmt.Sscanf(page, "%d", &pageInt)
	fmt.Sscanf(limit, "%d", &limitInt)

	users, err := h.userService.ListUsers(c.Request.Context(), pageInt, limitInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

// @Summary Update user profile
// @Description Partially update the authenticated user's profile
// @ID update-profile
// @Accept json
// @Produce json
// @Param profile body UpdateProfileRequest true "Profile data to update"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/me [patch]
// @Security ApiKeyAuth
// UpdateProfile handles partial updates to a user's profile.
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var reqBody map[string]interface{}
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var fieldMaskPaths []string
	userToUpdate := &domain.User{
		ID: userID.(string),
	}

	for key, value := range reqBody {
		switch key {
		case "name":
			if v, ok := value.(string); ok {
				userToUpdate.Name = v
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "phone":
			if v, ok := value.(string); ok {
				userToUpdate.Phone = sql.NullString{String: v, Valid: true}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "company":
			if v, ok := value.(string); ok {
				userToUpdate.Company = sql.NullString{String: v, Valid: true}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "position":
			if v, ok := value.(string); ok {
				userToUpdate.Position = sql.NullString{String: v, Valid: true}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "profile_picture_url":
			if v, ok := value.(string); ok {
				userToUpdate.ProfilePictureURL = sql.NullString{String: v, Valid: true}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "bio":
			if v, ok := value.(string); ok {
				userToUpdate.Bio = sql.NullString{String: v, Valid: true}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "location":
			if v, ok := value.(string); ok {
				userToUpdate.Location = sql.NullString{String: v, Valid: true}
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		case "profile_visibility":
			if v, ok := value.(string); ok {
				userToUpdate.ProfileVisibility = v
				fieldMaskPaths = append(fieldMaskPaths, key)
			}
		}
	}

	if len(fieldMaskPaths) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
		return
	}

	updatedUser, err := h.userService.UpdateProfile(c.Request.Context(), userToUpdate, fieldMaskPaths)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": updatedUser})
}

// @Summary Change user password
// @Description Change the authenticated user's password
// @ID change-password
// @Accept json
// @Produce json
// @Param passwords body ChangePasswordRequest true "Old and new passwords"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/change-password [post]
// @Security ApiKeyAuth
// ChangePassword allows a user to change their password.
func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	err := h.userService.ChangePassword(c.Request.Context(), userID.(string), req.OldPassword, req.NewPassword)
	if err != nil {
		if err.Error() == "incorrect old password" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to change password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// @Summary Ban a user
// @Description Ban a user (admin only)
// @ID ban-user
// @Accept json
// @Produce json
// @Param id path string true "User ID to ban"
// @Param ban_reason body BanRequest true "Ban reason and duration"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/ban [post]
// @Security ApiKeyAuth
// BanUser allows an admin to ban a user.
func (h *UserHandler) BanUser(c *gin.Context) {
	// TODO: Add authorization check to ensure only admins can perform this action.
	userIDToBan := c.Param("id")

	var req struct {
		BanReason   string `json:"ban_reason"`
		BannedUntil string `json:"banned_until"` // e.g., "2025-12-31T23:59:59Z"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	var bannedUntil time.Time
	var err error
	if req.BannedUntil != "" {
		bannedUntil, err = time.Parse(time.RFC3339, req.BannedUntil)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid banned_until format. Use RFC3339 format."})
			return
		}
	}

	if err := h.userService.BanUser(c.Request.Context(), userIDToBan, req.BanReason, bannedUntil); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to ban user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User has been banned successfully"})
}

// @Summary Follow a user
// @Description Follow another user
// @ID follow-user
// @Produce json
// @Param id path string true "User ID to follow"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/follow [post]
// @Security ApiKeyAuth
func (h *UserHandler) FollowUser(c *gin.Context) {
	followerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	followeeID := c.Param("id")

	if err := h.userService.FollowUser(c.Request.Context(), followerID.(string), followeeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to follow user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully followed user"})
}

// @Summary Unfollow a user
// @Description Unfollow a user
// @ID unfollow-user
// @Produce json
// @Param id path string true "User ID to unfollow"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/follow [delete]
// @Security ApiKeyAuth
func (h *UserHandler) UnfollowUser(c *gin.Context) {
	followerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	followeeID := c.Param("id")

	if err := h.userService.UnfollowUser(c.Request.Context(), followerID.(string), followeeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unfollow user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully unfollowed user"})
}

// @Summary Get user suggestions
// @Description Get suggestions of users to follow
// @ID get-user-suggestions
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Number of items per page"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/suggestions [get]
// @Security ApiKeyAuth
func (h *UserHandler) GetUserSuggestions(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	pageInt := 1
	limitInt := 10
	fmt.Sscanf(page, "%d", &pageInt)
	fmt.Sscanf(limit, "%d", &limitInt)

	suggestions, err := h.userService.SuggestUsersToFollow(c.Request.Context(), userID.(string), pageInt, limitInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user suggestions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"suggestions": suggestions})
}

// @Summary Check GDS
// @Description Check if GDS is installed
// @ID check-gds
// @Produce json
// @Success 200 {object} CheckGDSResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/gds-check [get]
// @Security ApiKeyAuth
func (h *UserHandler) CheckGDS(c *gin.Context) {
	installed, err := h.userService.CheckGDS(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "An error occurred while checking for GDS",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"gds_installed": installed,
	})
}

// @Summary Add user experience
// @Description Add a new work experience to the user's profile
// @ID add-experience
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param experience body domain.UserExperience true "Experience object"
// @Success 201 {object} UserExperienceResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/experience [post]
// @Security ApiKeyAuth
// AddExperience adds a new work experience entry for a user.
func (h *UserHandler) AddExperience(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// Ensure authenticated user is modifying their own profile
	if authenticatedUserID.(string) != profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only add experience to your own profile"})
		return
	}

	var req struct {
		Title       string `json:"title"`
		Company     string `json:"company"`
		Location    string `json:"location"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD."})
		return
	}

	var endDate sql.NullTime
	if req.EndDate != "" {
		parsedEndDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format. Use YYYY-MM-DD."})
			return
		}
		endDate = sql.NullTime{Time: parsedEndDate, Valid: true}
	}

	experience := &domain.UserExperience{
		UserID:      profileOwnerID,
		Title:       req.Title,
		Company:     req.Company,
		Location:    sql.NullString{String: req.Location, Valid: req.Location != ""},
		StartDate:   startDate,
		EndDate:     endDate,
		Description: sql.NullString{String: req.Description, Valid: req.Description != ""},
	}

	exp, err := h.userService.AddExperience(c.Request.Context(), profileOwnerID, experience)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add experience"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"experience": exp})
}

// @Summary Update user experience
// @Description Update an existing work experience on the user's profile
// @Success 200 {object} UserExperienceResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/experience/{exp_id} [put]
// @Security ApiKeyAuth
// UpdateExperience updates an existing work experience entry for a user.
func (h *UserHandler) UpdateExperience(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// Ensure authenticated user is modifying their own profile
	if authenticatedUserID.(string) != profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own experience"})
		return
	}

	var req struct {
		ID          string `json:"id"`
		Title       string `json:"title"`
		Company     string `json:"company"`
		Location    string `json:"location"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD."})
		return
	}

	var endDate sql.NullTime
	if req.EndDate != "" {
		parsedEndDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format. Use YYYY-MM-DD."})
			return
		}
		endDate = sql.NullTime{Time: parsedEndDate, Valid: true}
	}

	experience := &domain.UserExperience{
		ID:          req.ID,
		UserID:      profileOwnerID,
		Title:       req.Title,
		Company:     req.Company,
		Location:    sql.NullString{String: req.Location, Valid: req.Location != ""},
		StartDate:   startDate,
		EndDate:     endDate,
		Description: sql.NullString{String: req.Description, Valid: req.Description != ""},
	}

	exp, err := h.userService.UpdateExperience(c.Request.Context(), profileOwnerID, experience)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update experience"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"experience": exp})
}

// @Summary Delete user experience
// @Description Delete a work experience from the user's profile
// @ID delete-experience
// @Param id path string true "User ID"
// @Param exp_id path string true "Experience ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/experience/{exp_id} [delete]
// @Security ApiKeyAuth
// DeleteExperience deletes a work experience entry for a user.
func (h *UserHandler) DeleteExperience(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// Ensure authenticated user is modifying their own profile
	if authenticatedUserID.(string) != profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own experience"})
		return
	}

	experienceID := c.Param("exp_id")

	err := h.userService.DeleteExperience(c.Request.Context(), profileOwnerID, experienceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete experience"})
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Get user experience
// @Description Get all work experience for a user
// @Param id path string true "User ID"
// @Success 200 {array} domain.UserExperience
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/experience [get]
// GetExperience retrieves all work experience entries for a user.
func (h *UserHandler) GetExperience(c *gin.Context) {
	userID := c.Param("id")

	exp, err := h.userService.GetExperience(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get experience"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"experience": exp})
}

// @Summary Add user education
// @Description Add a new education entry to the user's profile
// @ID add-education
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param education body domain.UserEducation true "Education object"
// @Success 201 {object} UserEducationResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/education [post]
// @Security ApiKeyAuth
// AddEducation adds a new education entry for a user.
func (h *UserHandler) AddEducation(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// Ensure authenticated user is modifying their own profile
	if authenticatedUserID.(string) != profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only add education to your own profile"})
		return
	}

	var req struct {
		School      string `json:"school"`
		Degree      string `json:"degree"`
		Field       string `json:"field_of_study"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD."})
		return
	}

	var endDate sql.NullTime
	if req.EndDate != "" {
		parsedEndDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format. Use YYYY-MM-DD."})
			return
		}
		endDate = sql.NullTime{Time: parsedEndDate, Valid: true}
	}

	education := &domain.UserEducation{
		UserID:       profileOwnerID,
		School:       req.School,
		Degree:       sql.NullString{String: req.Degree, Valid: req.Degree != ""},
		FieldOfStudy: sql.NullString{String: req.Field, Valid: req.Field != ""},
		StartDate:    sql.NullTime{Time: startDate, Valid: !startDate.IsZero()},
		EndDate:      endDate,
		Description:  sql.NullString{String: req.Description, Valid: req.Description != ""},
	}

	edu, err := h.userService.AddEducation(c.Request.Context(), profileOwnerID, education)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add education"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"education": edu})
}

// @Summary Update user education
// @Description Update an existing education entry on the user's profile
// @ID update-education
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param edu_id path string true "Education ID"
// @Param education body domain.UserEducation true "Education object"
// @Success 200 {object} UserEducationResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/education/{edu_id} [put]
// @Security ApiKeyAuth
// UpdateEducation updates an existing education entry for a user.
func (h *UserHandler) UpdateEducation(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// Ensure authenticated user is modifying their own profile
	if authenticatedUserID.(string) != profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own education"})
		return
	}

	var req struct {
		ID          string `json:"id"`
		School      string `json:"school"`
		Degree      string `json:"degree"`
		Field       string `json:"field_of_study"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD."})
		return
	}

	var endDate sql.NullTime
	if req.EndDate != "" {
		parsedEndDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format. Use YYYY-MM-DD."})
			return
		}
		endDate = sql.NullTime{Time: parsedEndDate, Valid: true}
	}

	education := &domain.UserEducation{
		ID:           req.ID,
		UserID:       profileOwnerID,
		School:       req.School,
		Degree:       sql.NullString{String: req.Degree, Valid: req.Degree != ""},
		FieldOfStudy: sql.NullString{String: req.Field, Valid: req.Field != ""},
		StartDate:    sql.NullTime{Time: startDate, Valid: !startDate.IsZero()},
		EndDate:      endDate,
		Description:  sql.NullString{String: req.Description, Valid: req.Description != ""},
	}

	edu, err := h.userService.UpdateEducation(c.Request.Context(), profileOwnerID, education)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update education"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"education": edu})
}

// @Summary Delete user education
// @Description Delete an education entry from the user's profile
// @ID delete-education
// @Param id path string true "User ID"
// @Param edu_id path string true "Education ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/education/{edu_id} [delete]
// @Security ApiKeyAuth
// DeleteEducation deletes an education entry for a user.
func (h *UserHandler) DeleteEducation(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// Ensure authenticated user is modifying their own profile
	if authenticatedUserID.(string) != profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own education"})
		return
	}

	educationID := c.Param("edu_id")

	err := h.userService.DeleteEducation(c.Request.Context(), profileOwnerID, educationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete education"})
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Get user education
// @Description Get all education entries for a user
// @Param id path string true "User ID"
// @Success 200 {array} domain.UserEducation
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/education [get]
// GetEducation retrieves all education entries for a user.
func (h *UserHandler) GetEducation(c *gin.Context) {
	userID := c.Param("id")

	edu, err := h.userService.GetEducation(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get education"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"education": edu})
}

// @Summary Add user skill
// @Description Add a new skill to the user's profile
// @ID add-skill
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param skill body AddSkillRequest true "Skill object"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/skills [post]
// @Security ApiKeyAuth
// AddSkill adds a new skill for a user.
func (h *UserHandler) AddSkill(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// Ensure authenticated user is modifying their own profile
	if authenticatedUserID.(string) != profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only add skills to your own profile"})
		return
	}

	var req struct {
		SkillName string `json:"skill_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	skill, err := h.userService.AddSkill(c.Request.Context(), profileOwnerID, req.SkillName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add skill"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"skill": skill})
}

// @Summary Delete user skill
// @Description Delete a skill from the user's profile
// @ID delete-skill
// @Param id path string true "User ID"
// @Param skill_id path string true "Skill ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/skills/{skill_id} [delete]
// @Security ApiKeyAuth
// DeleteSkill deletes a skill for a user.
func (h *UserHandler) DeleteSkill(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// Ensure authenticated user is modifying their own profile
	if authenticatedUserID.(string) != profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete skills from your own profile"})
		return
	}

	skillID := c.Param("skill_id")

	err := h.userService.DeleteSkill(c.Request.Context(), profileOwnerID, skillID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete skill"})
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Get user skills
// @Description Get all skills for a user
// @ID get-skills
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {array} domain.UserSkill
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/skills [get]
// GetSkills retrieves all skills for a user.
func (h *UserHandler) GetSkills(c *gin.Context) {
	userID := c.Param("id")

	skills, err := h.userService.GetSkills(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get skills"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"skills": skills})
}

// @Summary Endorse a skill
// @Description Endorse a skill for another user
// @ID endorse-skill
// @Param id path string true "User ID of the user whose skill is being endorsed"
// @Param skill_id path string true "Skill ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/skills/{skill_id}/endorse [post]
// @Security ApiKeyAuth
// EndorseSkill endorses a skill for a user.
func (h *UserHandler) EndorseSkill(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// A user cannot endorse their own skills
	if authenticatedUserID.(string) == profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot endorse your own skills"})
		return
	}

	skillID := c.Param("skill_id")

	err := h.userService.EndorseSkill(c.Request.Context(), authenticatedUserID.(string), skillID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to endorse skill"})
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Remove endorsement
// @Description Remove an endorsement for a skill
// @ID remove-endorsement
// @Param id path string true "User ID of the user whose skill endorsement is being removed"
// @Param skill_id path string true "Skill ID"
// @Success 204
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/skills/{skill_id}/endorse [delete]
// @Security ApiKeyAuth
// RemoveEndorsement removes an endorsement for a skill.
func (h *UserHandler) RemoveEndorsement(c *gin.Context) {
	authenticatedUserID, exists := c.Get("userID") // Authenticated user ID from token
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profileOwnerID := c.Param("id") // User ID from URL path

	// A user cannot remove an endorsement from their own skills
	if authenticatedUserID.(string) == profileOwnerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot remove an endorsement from your own skills"})
		return
	}

	skillID := c.Param("skill_id")

	err := h.userService.RemoveEndorsement(c.Request.Context(), authenticatedUserID.(string), skillID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove endorsement"})
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Send friend request
// @Description Send a friend request to another user
// @ID send-friend-request
// @Produce json
// @Param id path string true "User ID to send friend request to"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/friend-request [post]
// @Security ApiKeyAuth
// SendFriendRequest sends a friend request to another user.
func (h *UserHandler) SendFriendRequest(c *gin.Context) {
	senderID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	receiverID := c.Param("id")

	if senderID.(string) == receiverID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot send friend request to yourself"})
		return
	}

	err := h.userService.SendFriendRequest(c.Request.Context(), senderID.(string), receiverID)
	if err != nil {
		if err.Error() == "friend request already sent" || err.Error() == "users are already friends" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send friend request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend request sent"})
}

// @Summary Accept friend request
// @Description Accept a pending friend request
// @ID accept-friend-request
// @Produce json
// @Param id path string true "User ID of the sender"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/friend-request/accept [post]
// @Security ApiKeyAuth
// AcceptFriendRequest accepts a pending friend request.
func (h *UserHandler) AcceptFriendRequest(c *gin.Context) {
	receiverID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	senderID := c.Param("id")

	err := h.userService.AcceptFriendRequest(c.Request.Context(), senderID, receiverID.(string))
	if err != nil {
		if err.Error() == "friend request not found" || err.Error() == "friend request is not pending" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept friend request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend request accepted"})
}

// @Summary Reject friend request
// @Description Reject a pending friend request
// @ID reject-friend-request
// @Produce json
// @Param id path string true "User ID of the sender"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/friend-request/reject [post]
// @Security ApiKeyAuth
// RejectFriendRequest rejects a pending friend request.
func (h *UserHandler) RejectFriendRequest(c *gin.Context) {
	receiverID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	senderID := c.Param("id")

	err := h.userService.RejectFriendRequest(c.Request.Context(), senderID, receiverID.(string))
	if err != nil {
		if err.Error() == "friend request not found" || err.Error() == "friend request is not pending" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject friend request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend request rejected"})
}

// @Summary Unfriend a user
// @Description Unfriend a user
// @ID unfriend-user
// @Produce json
// @Param id path string true "User ID to unfriend"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/friends [delete]
// @Security ApiKeyAuth
// Unfriend removes a friendship.
func (h *UserHandler) Unfriend(c *gin.Context) {
	userID1, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userID2 := c.Param("id")

	err := h.userService.Unfriend(c.Request.Context(), userID1.(string), userID2)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unfriend user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User unfriended"})
}

// @Summary List friends
// @Description List all friends of a user
// @ID list-friends
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {array} UserResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/{id}/friends [get]
// ListFriends retrieves a list of friends for a user.
func (h *UserHandler) ListFriends(c *gin.Context) {
	userID := c.Param("id")

	friends, err := h.userService.ListFriends(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve friends"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"friends": friends})
}

// authMiddleware validates the JWT token from the Authorization header.
func authMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("AuthMiddleware: Processing request for %s %s", c.Request.Method, c.Request.URL.Path)
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			return
		}

		tokenString := parts[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if sub, ok := claims["sub"].(string); ok {
				c.Set("userID", sub)
			} else {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
				return
			}
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		c.Next()
	}
}
