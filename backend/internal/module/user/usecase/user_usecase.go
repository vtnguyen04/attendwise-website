package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	pb "github.com/attendwise/backend/generated/go/ai"
	community_domain "github.com/attendwise/backend/internal/module/community/domain"
	"github.com/attendwise/backend/internal/module/user/domain"
	"github.com/attendwise/backend/internal/platform"
	"github.com/attendwise/backend/pkg/googleauth"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// userService implements the domain.UserService interface.
type userService struct {
	userRepo      domain.UserRepository
	userGraphRepo domain.UserGraphRepository
	neo4jRepo     community_domain.Neo4jCommunityRepository
	aiClient      *platform.AIClient
	jwtSecret     string
}

// NewUserService creates a new userService instance.
func NewUserService(userRepo domain.UserRepository, userGraphRepo domain.UserGraphRepository, neo4jRepo community_domain.Neo4jCommunityRepository, aiClient *platform.AIClient, jwtSecret string) domain.UserService {
	return &userService{
		userRepo:      userRepo,
		userGraphRepo: userGraphRepo,
		neo4jRepo:     neo4jRepo,
		aiClient:      aiClient,
		jwtSecret:     jwtSecret,
	}
}

// GetLivenessChallenge calls the AI service to start a liveness session.
func (s *userService) GetLivenessChallenge(ctx context.Context) (*pb.StartLivenessChallengeResponse, error) {
	return s.aiClient.StartLivenessChallenge(ctx)
}

// SubmitLivenessVideo acts as a proxy to the AI service, handling the final success case.
func (s *userService) SubmitLivenessVideo(ctx context.Context, userID, sessionID string, videoData []byte, consentGiven bool) (bool, string, error) {
	if !consentGiven {
		return false, "Consent for storing face data is required.", domain.ErrConsentNotGiven
	}

	// Call the gRPC endpoint.
	resp, err := s.aiClient.SubmitLivenessVideo(ctx, sessionID, videoData)
	if err != nil {
		log.Printf("SubmitLivenessVideo gRPC call failed for user %s: %v", userID, err)
		return false, "AI service connection error.", err
	}

	// If the call was a final success, save the embedding.
	if resp.Success {
		if len(resp.FaceEmbedding) == 0 {
			return false, "AI service did not return a face embedding on success.", errors.New("empty face embedding")
		}
		// Save the embedding
		if err := s.userRepo.SaveFaceEmbedding(ctx, userID, resp.FaceEmbedding, "v2.0", 0.99); err != nil {
			log.Printf("Failed to save face embedding for user %s: %v", userID, err)
			return false, "Failed to save enrollment data.", err
		}
		// Return final success to the handler.
	log.Printf("Successfully saved face embedding for user %s", userID)

	return true, "Face successfully enrolled for authentication.", nil
	}

	// If not a final success, it's an intermediate step or a failure.
	// We wrap the FailureReason in the expected format for the handler.
	message := fmt.Sprintf("Face enrollment failed: %s", resp.FailureReason)
	return false, message, errors.New(resp.FailureReason)
}

// The rest of the file remains unchanged...

func (s *userService) Register(ctx context.Context, name, email, password, phone, company, position, profilePictureURL, bio, location string) (*domain.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &domain.User{
		Name:              name,
		Email:             email,
		PasswordHash:      string(hashedPassword),
		Phone:             sql.NullString{String: phone, Valid: phone != ""},
		Company:           sql.NullString{String: company, Valid: company != ""},
		Position:          sql.NullString{String: position, Valid: position != ""},
		ProfilePictureURL: sql.NullString{String: profilePictureURL, Valid: profilePictureURL != ""},
		Bio:               sql.NullString{String: bio, Valid: bio != ""},
		Location:          sql.NullString{String: location, Valid: location != ""},
	}

	createdUser, err := s.userRepo.CreateUser(ctx, user)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := s.userGraphRepo.CreateUserNode(context.Background(), createdUser); err != nil {
			log.Printf("ERROR: Failed to create user node in graph database for user ID %s: %v", createdUser.ID, err)
		}
	}()

	return createdUser, nil
}

func (s *userService) Login(ctx context.Context, email, password string) (*domain.User, string, string, error) {
	user, err := s.userRepo.GetUserAuthByEmail(ctx, email)
	if err != nil {
		return nil, "", "", err
	}

	if !user.IsActive {
		return nil, "", "", errors.New("user account is inactive")
	}
	if user.IsBanned {
		if !user.BannedUntil.Valid || user.BannedUntil.Time.After(time.Now()) {
			return nil, "", "", fmt.Errorf("user is banned. Reason: %s", user.BanReason.String)
		}
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", "", domain.ErrIncorrectPassword
	}

	accessToken, err := s.generateJWT(user.ID, 24*time.Hour)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to generate access token: %w", err)
	}
	refreshToken, err := s.generateJWT(user.ID, 7*24*time.Hour)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to generate refresh token: %w", err)
	}

	go s.userRepo.UpdateLastLogin(context.Background(), user.ID)

	user.PasswordHash = ""

	return user, accessToken, refreshToken, nil
}

func (s *userService) GetProfile(ctx context.Context, id string) (*domain.User, error) {
	return s.userRepo.GetUserByIDWithCache(ctx, id)
}

func (s *userService) UpdateProfile(ctx context.Context, user *domain.User, fieldMask []string) (*domain.User, error) {
	return s.userRepo.UpdateUser(ctx, user, fieldMask)
}

func (s *userService) ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error {
	user, err := s.userRepo.GetUserWithPasswordByID(ctx, userID)
	if err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return domain.ErrIncorrectPassword
	}

	newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	return s.userRepo.ChangePassword(ctx, userID, string(newPasswordHash))
}

func (s *userService) BanUser(ctx context.Context, userID, reason string, until time.Time) error {
	return s.userRepo.BanUser(ctx, userID, reason, until)
}

func (s *userService) GetUserFaceEmbedding(ctx context.Context, userID string) (*domain.UserFaceEmbedding, error) {
	return s.userRepo.GetActiveFaceEmbeddingWithCache(ctx, userID)
}

func (s *userService) generateJWT(userID string, ttl time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(ttl).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *userService) FollowUser(ctx context.Context, followerID, followeeID string) error {
	return s.neo4jRepo.AddFollowRelationship(ctx, followerID, followeeID)
}

func (s *userService) UnfollowUser(ctx context.Context, followerID, followeeID string) error {
	return s.neo4jRepo.RemoveFollowRelationship(ctx, followerID, followeeID)
}

func (s *userService) CheckFollowStatus(ctx context.Context, followerID, followeeID string) (bool, error) {
	return s.neo4jRepo.CheckFollowRelationship(ctx, followerID, followeeID)
}

func (s *userService) SuggestUsersToFollow(ctx context.Context, userID string, page, limit int) ([]map[string]interface{}, error) {
	// For now, a simple implementation: suggest users not followed by the current user.
	// In a real-world scenario, this would involve more complex graph algorithms or ML.

	// Offset calculation for pagination
	offset := (page - 1) * limit

	suggestions, err := s.userGraphRepo.SuggestUsersToFollow(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to suggest users from graph: %w", err)
	}

	return suggestions, nil
}

func (s *userService) ListUsers(ctx context.Context, page, limit int) ([]*domain.User, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	return s.userRepo.ListUsers(ctx, page, limit)
}

func (s *userService) CheckGDS(ctx context.Context) (bool, error) {
	return s.userGraphRepo.CheckGDS(ctx)
}

// GoogleLoginOrRegister handles user login or registration via Google OAuth.
func (s *userService) GoogleLoginOrRegister(ctx context.Context, googleUser *googleauth.GoogleUser) (*domain.User, string, string, error) {
	// 1. Try to find user by Google ID
	user, err := s.userRepo.GetUserByGoogleID(ctx, googleUser.ID)
	if err != nil && !errors.Is(err, domain.ErrUserNotFound) {
		return nil, "", "", fmt.Errorf("failed to get user by Google ID: %w", err)
	}

	if user != nil {
		// User found by Google ID, log them in
		log.Printf("User %s logged in via Google.", user.ID)
	} else {
		// 2. User not found by Google ID, try to find by email
		user, err = s.userRepo.GetUserByEmail(ctx, googleUser.Email)
		if err != nil && !errors.Is(err, domain.ErrUserNotFound) {
			return nil, "", "", fmt.Errorf("failed to get user by email for Google login: %w", err)
		}

		if user != nil {
			// User found by email, link Google ID to existing account
			log.Printf("Linking Google ID %s to existing user %s (%s).", googleUser.ID, user.ID, user.Email)
			if err := s.userRepo.UpdateUserGoogleID(ctx, user.ID, googleUser.ID); err != nil {
				return nil, "", "", fmt.Errorf("failed to link Google ID to existing user: %w", err)
			}
			user.GoogleID = sql.NullString{String: googleUser.ID, Valid: true} // Update in memory
		} else {
			// 3. No existing user found, create a new one
			log.Printf("Creating new user for Google ID %s (%s).", googleUser.ID, googleUser.Email)
			newUser := &domain.User{
				Name:              googleUser.Name,
				Email:             googleUser.Email,
				GoogleID:          sql.NullString{String: googleUser.ID, Valid: true},
				ProfilePictureURL: sql.NullString{String: googleUser.Picture, Valid: googleUser.Picture != ""},
				IsActive:          true,
				IsVerified:        googleUser.VerifiedEmail,
			}
			createdUser, err := s.userRepo.CreateUser(ctx, newUser)
			if err != nil {
				return nil, "", "", fmt.Errorf("failed to create new user from Google info: %w", err)
			}
			user = createdUser

			go func() {
				if err := s.userGraphRepo.CreateUserNode(context.Background(), user); err != nil {
					log.Printf("ERROR: Failed to create user node in graph database for Google user ID %s: %v", user.ID, err)
				}
			}()
		}
	}

	// Generate JWT tokens
	accessToken, err := s.generateJWT(user.ID, 24*time.Hour)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to generate access token for Google login: %w", err)
	}
	refreshToken, err := s.generateJWT(user.ID, 7*24*time.Hour)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to generate refresh token for Google login: %w", err)
	}

	go s.userRepo.UpdateLastLogin(context.Background(), user.ID)

	user.PasswordHash = "" // Clear sensitive info

	return user, accessToken, refreshToken, nil
}

// AddExperience adds a new work experience entry for a user.
func (s *userService) AddExperience(ctx context.Context, userID string, exp *domain.UserExperience) (*domain.UserExperience, error) {
	exp.UserID = userID
	return s.userRepo.CreateUserExperience(ctx, exp)
}

// UpdateExperience updates an existing work experience entry for a user.
func (s *userService) UpdateExperience(ctx context.Context, userID string, exp *domain.UserExperience) (*domain.UserExperience, error) {
	exp.UserID = userID // Ensure the user ID is correctly set for ownership check in repo
	return s.userRepo.UpdateUserExperience(ctx, exp)
}

// DeleteExperience deletes a work experience entry for a user.
func (s *userService) DeleteExperience(ctx context.Context, userID, experienceID string) error {
	return s.userRepo.DeleteUserExperience(ctx, userID, experienceID)
}

// GetExperience retrieves all work experience entries for a user.
func (s *userService) GetExperience(ctx context.Context, userID string) ([]domain.UserExperience, error) {
	return s.userRepo.ListUserExperience(ctx, userID)
}

// AddEducation adds a new education entry for a user.
func (s *userService) AddEducation(ctx context.Context, userID string, edu *domain.UserEducation) (*domain.UserEducation, error) {
	edu.UserID = userID
	return s.userRepo.CreateUserEducation(ctx, edu)
}

// UpdateEducation updates an existing education entry for a user.
func (s *userService) UpdateEducation(ctx context.Context, userID string, edu *domain.UserEducation) (*domain.UserEducation, error) {
	edu.UserID = userID // Ensure the user ID is correctly set for ownership check in repo
	return s.userRepo.UpdateUserEducation(ctx, edu)
}

// DeleteEducation deletes an education entry for a user.
func (s *userService) DeleteEducation(ctx context.Context, userID, educationID string) error {
	// Optionally, add a check here to ensure the education belongs to the userID
	return s.userRepo.DeleteUserEducation(ctx, educationID)
}

// GetEducation retrieves all education entries for a user.
func (s *userService) GetEducation(ctx context.Context, userID string) ([]domain.UserEducation, error) {
	return s.userRepo.ListUserEducation(ctx, userID)
}

// AddSkill adds a new skill for a user.
func (s *userService) AddSkill(ctx context.Context, userID string, skillName string) (*domain.UserSkill, error) {
	skill := &domain.UserSkill{
		UserID:    userID,
		SkillName: skillName,
	}
	return s.userRepo.CreateUserSkill(ctx, skill)
}

// DeleteSkill deletes a skill for a user.
func (s *userService) DeleteSkill(ctx context.Context, userID, skillID string) error {
	// Optionally, add a check here to ensure the skill belongs to the userID
	return s.userRepo.DeleteUserSkill(ctx, skillID)
}

// GetSkills retrieves all skills for a user.
func (s *userService) GetSkills(ctx context.Context, userID string) ([]domain.UserSkill, error) {
	return s.userRepo.ListUserSkills(ctx, userID)
}

// EndorseSkill endorses a skill for a user.
func (s *userService) EndorseSkill(ctx context.Context, userID, skillID string) error {
	return s.userRepo.AddSkillEndorsement(ctx, skillID, userID)
}

// RemoveEndorsement removes an endorsement for a skill.
func (s *userService) RemoveEndorsement(ctx context.Context, userID, skillID string) error {
	return s.userRepo.RemoveSkillEndorsement(ctx, skillID, userID)
}

func (s *userService) SendFriendRequest(ctx context.Context, senderID, receiverID string) error {
	// Check if a friend request already exists
	existingRequest, err := s.userRepo.GetFriendRequest(ctx, senderID, receiverID)
	if err != nil {
		return err
	}
	if existingRequest != nil {
		return errors.New("friend request already sent")
	}

	// Check if they are already friends
	// This check is not perfect, as it only checks one direction.
	// A better approach would be to have a separate method to check for friendship.
	existingFriend, err := s.userRepo.GetFriendRequest(ctx, receiverID, senderID)
	if err != nil {
		return err
	}
	if existingFriend != nil && existingFriend.Status == "accepted" {
		return errors.New("users are already friends")
	}

	return s.userRepo.CreateFriendRequest(ctx, senderID, receiverID)
}

func (s *userService) AcceptFriendRequest(ctx context.Context, senderID, receiverID string) error {
	// Check if the friend request exists
	friendRequest, err := s.userRepo.GetFriendRequest(ctx, senderID, receiverID)
	if err != nil {
		return err
	}
	if friendRequest == nil {
		return errors.New("friend request not found")
	}

	if friendRequest.Status != "pending" {
		return errors.New("friend request is not pending")
	}

	if err := s.userRepo.UpdateFriendRequest(ctx, senderID, receiverID, "accepted"); err != nil {
		return err
	}

	return s.userRepo.CreateFriend(ctx, senderID, receiverID)
}

func (s *userService) RejectFriendRequest(ctx context.Context, senderID, receiverID string) error {
	// Check if the friend request exists
	friendRequest, err := s.userRepo.GetFriendRequest(ctx, senderID, receiverID)
	if err != nil {
		return err
	}
	if friendRequest == nil {
		return errors.New("friend request not found")
	}

	if friendRequest.Status != "pending" {
		return errors.New("friend request is not pending")
	}

	return s.userRepo.UpdateFriendRequest(ctx, senderID, receiverID, "rejected")
}

func (s *userService) Unfriend(ctx context.Context, userID1, userID2 string) error {
	return s.userRepo.DeleteFriend(ctx, userID1, userID2)
}

func (s *userService) ListFriends(ctx context.Context, userID string) ([]domain.User, error) {
	return s.userRepo.GetFriends(ctx, userID)
}
