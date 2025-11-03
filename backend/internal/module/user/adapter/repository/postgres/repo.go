package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/attendwise/backend/internal/module/user/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const (
	usersEmailKey = "users_email_key"
	usersPhoneKey = "users_phone_key"
)

// userRepository is the Postgres implementation of the domain.UserRepository interface.
type userRepository struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(db *pgxpool.Pool, redis *redis.Client) domain.UserRepository {
	return &userRepository{db: db, redis: redis}
}

func (r *userRepository) CreateUser(ctx context.Context, user *domain.User) (*domain.User, error) {
	query := `
        INSERT INTO users (name, email, phone, password_hash, bio, company, position, location, profile_picture_url, google_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at, updated_at, is_active, is_verified, face_id_enrolled
    `
	err := r.db.QueryRow(ctx, query,
		user.Name, user.Email, user.Phone, user.PasswordHash, user.Bio, user.Company, user.Position, user.Location, user.ProfilePictureURL, user.GoogleID,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt, &user.IsActive, &user.IsVerified, &user.FaceIDEnrolled)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			switch pgErr.ConstraintName {
			case usersEmailKey:
				return nil, domain.ErrEmailExists
			case usersPhoneKey:
				return nil, domain.ErrPhoneExists
			}
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (r *userRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	return r.getUserBy(ctx, "email", email)
}

// GetUserAuthByEmail retrieves a user by email for authentication purposes, bypassing the cache.
func (r *userRepository) GetUserAuthByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, is_active, is_banned, ban_reason, banned_until
		FROM users 
		WHERE email = $1 AND deleted_at IS NULL`

	var user domain.User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.IsActive, &user.IsBanned, &user.BanReason, &user.BannedUntil,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user auth data by email: %w", err)
	}

	return &user, nil
}

func (r *userRepository) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	return r.getUserBy(ctx, "id", id)
}

func (r *userRepository) GetUserByIDWithCache(ctx context.Context, id string) (*domain.User, error) {
	cacheKey := fmt.Sprintf("user:%s", id)
	val, err := r.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var user domain.User
		if json.Unmarshal([]byte(val), &user) == nil {
			return &user, nil
		}
	}

	user, err := r.getUserBy_noCache(ctx, "id", id)
	if err != nil {
		return nil, err
	}

	marshaledUser, err := json.Marshal(user)
	if err == nil {
		r.redis.Set(ctx, cacheKey, marshaledUser, 15*time.Minute)
	}

	return user, nil
}

// GetUserWithPasswordByID bypasses the cache to get the full user object from the DB.
func (r *userRepository) GetUserWithPasswordByID(ctx context.Context, id string) (*domain.User, error) {
	return r.getUserBy_noCache(ctx, "id", id)
}

func (r *userRepository) getUserBy(ctx context.Context, field string, value interface{}) (*domain.User, error) {
	// Only cache lookups by ID for consistency
	if field == "id" {
		cacheKey := fmt.Sprintf("user:%s", value)
		val, err := r.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var user domain.User
			if json.Unmarshal([]byte(val), &user) == nil {
				return &user, nil
			}
		}
	}

	query := fmt.Sprintf(`
        SELECT 
            id, email, phone, password_hash, name, profile_picture_url, bio, company, position, location, 
            google_id, face_id_enrolled, face_id_consent_given, face_id_consent_time, face_samples_count, 
            is_active, is_banned, is_verified, ban_reason, banned_until, profile_visibility, 
            last_login_at, created_at, updated_at, deleted_at
        FROM users
        WHERE %s = $1 AND deleted_at IS NULL
    `, field)

	var user domain.User

	err := r.db.QueryRow(ctx, query, value).Scan(
		&user.ID, &user.Email, &user.Phone, &user.PasswordHash, &user.Name, &user.ProfilePictureURL, &user.Bio, &user.Company, &user.Position, &user.Location,
		&user.GoogleID, &user.FaceIDEnrolled, &user.FaceIDConsentGiven, &user.FaceIDConsentTime, &user.FaceSamplesCount,
		&user.IsActive, &user.IsBanned, &user.IsVerified, &user.BanReason, &user.BannedUntil, &user.ProfileVisibility,
		&user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt, &user.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by %s: %w", field, err)
	}

	// Populate cache if we looked up by ID
	if field == "id" {
		marshaledUser, err := json.Marshal(user)
		if err == nil {
			r.redis.Set(ctx, fmt.Sprintf("user:%s", user.ID), marshaledUser, 15*time.Minute)
		}
	}

	return &user, nil
}

// getUserBy_noCache is the same as getUserBy but explicitly bypasses the Redis cache.
func (r *userRepository) getUserBy_noCache(ctx context.Context, field string, value interface{}) (*domain.User, error) {
	query := fmt.Sprintf(`
        SELECT 
            id, email, phone, password_hash, name, profile_picture_url, bio, company, position, location, 
            google_id, face_id_enrolled, face_id_consent_given, face_id_consent_time, face_samples_count, 
            is_active, is_banned, is_verified, ban_reason, banned_until, profile_visibility, 
            last_login_at, created_at, updated_at, deleted_at
        FROM users
        WHERE %s = $1 AND deleted_at IS NULL
    `, field)

	var user domain.User

	err := r.db.QueryRow(ctx, query, value).Scan(
		&user.ID, &user.Email, &user.Phone, &user.PasswordHash, &user.Name, &user.ProfilePictureURL, &user.Bio, &user.Company, &user.Position, &user.Location,
		&user.GoogleID, &user.FaceIDEnrolled, &user.FaceIDConsentGiven, &user.FaceIDConsentTime, &user.FaceSamplesCount,
		&user.IsActive, &user.IsBanned, &user.IsVerified, &user.BanReason, &user.BannedUntil, &user.ProfileVisibility,
		&user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt, &user.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by %s: %w", field, err)
	}

	return &user, nil
}

func (r *userRepository) UpdateUser(ctx context.Context, user *domain.User, fieldMask []string) (*domain.User, error) {
	var setClauses []string
	var args []interface{}
	argCount := 1

	for _, field := range fieldMask {
		switch field {
		case "name":
			setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
			args = append(args, user.Name)
			argCount++
		case "phone":
			setClauses = append(setClauses, fmt.Sprintf("phone = $%d", argCount))
			args = append(args, user.Phone)
			argCount++
		case "company":
			setClauses = append(setClauses, fmt.Sprintf("company = $%d", argCount))
			args = append(args, user.Company)
			argCount++
		case "position":
			setClauses = append(setClauses, fmt.Sprintf("position = $%d", argCount))
			args = append(args, user.Position)
			argCount++
		case "profile_picture_url":
			setClauses = append(setClauses, fmt.Sprintf("profile_picture_url = $%d", argCount))
			args = append(args, user.ProfilePictureURL)
			argCount++
		case "bio":
			setClauses = append(setClauses, fmt.Sprintf("bio = $%d", argCount))
			args = append(args, user.Bio)
			argCount++
		case "location":
			setClauses = append(setClauses, fmt.Sprintf("location = $%d", argCount))
			args = append(args, user.Location)
			argCount++
		case "profile_visibility":
			setClauses = append(setClauses, fmt.Sprintf("profile_visibility = $%d", argCount))
			args = append(args, user.ProfileVisibility)
			argCount++
		}
	}

	if len(setClauses) == 0 {
		return r.GetUserByID(ctx, user.ID)
	}

	query := fmt.Sprintf(`
		UPDATE users
		SET %s
		WHERE id = $%d
	`, strings.Join(setClauses, ", "), argCount)

	args = append(args, user.ID)

	if _, err := r.db.Exec(ctx, query, args...); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Invalidate cache
	r.redis.Del(ctx, fmt.Sprintf("user:%s", user.ID))

	return r.GetUserByID(ctx, user.ID)
}

func (r *userRepository) UpdateLastLogin(ctx context.Context, userID string) error {
	query := `UPDATE users SET last_login_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return err
	}

	// Invalidate user cache
	r.redis.Del(ctx, fmt.Sprintf("user:%s", userID))

	return nil
}

func (r *userRepository) GetActiveFaceEmbedding(ctx context.Context, userID string) (*domain.UserFaceEmbedding, error) {
	var embedding domain.UserFaceEmbedding
	query := `
        SELECT id, user_id, embedding, embedding_version, quality_score, is_active, created_at 
        FROM user_face_embeddings 
        WHERE user_id = $1 AND is_active = TRUE 
        ORDER BY created_at DESC LIMIT 1`

	err := r.db.QueryRow(ctx, query, userID).Scan(
		&embedding.ID, &embedding.UserID, &embedding.Embedding, &embedding.EmbeddingVersion, &embedding.QualityScore, &embedding.IsActive, &embedding.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrFaceEmbeddingNotFound
		}
		return nil, err
	}
	return &embedding, nil
}

func (r *userRepository) GetActiveFaceEmbeddingWithCache(ctx context.Context, userID string) (*domain.UserFaceEmbedding, error) {
	cacheKey := fmt.Sprintf("user:%s:face_embedding", userID)
	val, err := r.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var embedding domain.UserFaceEmbedding
		if json.Unmarshal([]byte(val), &embedding) == nil {
			return &embedding, nil
		}
	}

	embedding, err := r.GetActiveFaceEmbedding(ctx, userID)
	if err != nil {
		return nil, err
	}

	marshaledEmbedding, err := json.Marshal(embedding)
	if err == nil {
		r.redis.Set(ctx, cacheKey, marshaledEmbedding, 15*time.Minute)
	}

	return embedding, nil
}

func (r *userRepository) SaveFaceEmbedding(ctx context.Context, userID string, embedding []byte, version string, qualityScore float64) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	deactivateQuery := `UPDATE user_face_embeddings SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE`
	if _, err := tx.Exec(ctx, deactivateQuery, userID); err != nil {
		return fmt.Errorf("failed to deactivate old embeddings: %w", err)
	}

	insertQuery := `
        INSERT INTO user_face_embeddings (user_id, embedding, embedding_version, quality_score, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
    `
	if _, err := tx.Exec(ctx, insertQuery, userID, embedding, version, qualityScore); err != nil {
		return fmt.Errorf("failed to save new embedding: %w", err)
	}

	updateUserQuery := `
        UPDATE users 
        SET face_id_enrolled = TRUE, face_id_consent_given = TRUE, face_id_consent_time = NOW(), face_samples_count = face_samples_count + 1 
        WHERE id = $1`
	if _, err := tx.Exec(ctx, updateUserQuery, userID); err != nil {
		return fmt.Errorf("failed to update user enrollment status: %w", err)
	}

	// Invalidate the user cache after updating face_id_enrolled status
	r.redis.Del(ctx, fmt.Sprintf("user:%s", userID))

	return tx.Commit(ctx)
}

func (r *userRepository) ChangePassword(ctx context.Context, userID string, newPasswordHash string) error {
	query := `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(ctx, query, newPasswordHash, userID)
	if err != nil {
		return err
	}

	// Invalidate cache after changing the password
	r.redis.Del(ctx, fmt.Sprintf("user:%s", userID))

	return nil
}

func (r *userRepository) BanUser(ctx context.Context, userID, reason string, until time.Time) error {
	var untilArg interface{} = until
	if until.IsZero() {
		untilArg = nil
	}

	query := `
        UPDATE users
        SET is_banned = TRUE, ban_reason = $1, banned_until = $2
        WHERE id = $3
    `
	_, err := r.db.Exec(ctx, query, reason, untilArg, userID)
	if err != nil {
		return err
	}

	// Invalidate user cache
	r.redis.Del(ctx, fmt.Sprintf("user:%s", userID))

	return nil
}

func (r *userRepository) FlagUsersAsSpam(ctx context.Context, userIDs []string) error {
	query := `UPDATE users SET is_banned = TRUE, banned_until = NOW() + INTERVAL '1 year', ban_reason = 'spam' WHERE id = ANY($1)`
	_, err := r.db.Exec(ctx, query, userIDs)
	if err != nil {
		return err
	}

	// Invalidate cache for each flagged user
	for _, userID := range userIDs {
		r.redis.Del(ctx, fmt.Sprintf("user:%s", userID))
	}

	return nil
}

// ListUsers retrieves a paginated list of users from the database.
func (r *userRepository) ListUsers(ctx context.Context, page, limit int) ([]*domain.User, error) {
	offset := (page - 1) * limit
	query := `
		SELECT id, email, phone, name, profile_picture_url, bio, company, position, location,
		       google_id, face_id_enrolled, face_id_consent_given, face_id_consent_time, face_samples_count,
		       is_active, is_banned, is_verified, ban_reason, banned_until, profile_visibility,
		       last_login_at, created_at, updated_at, deleted_at
		FROM users
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		OFFSET $1
		LIMIT $2
	`
	rows, err := r.db.Query(ctx, query, offset, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		user := &domain.User{}
		err := rows.Scan(
			&user.ID, &user.Email, &user.Phone, &user.Name, &user.ProfilePictureURL, &user.Bio,
			&user.Company, &user.Position, &user.Location, &user.GoogleID, &user.FaceIDEnrolled, &user.FaceIDConsentGiven,
			&user.FaceIDConsentTime, &user.FaceSamplesCount, &user.IsActive, &user.IsBanned,
			&user.IsVerified, &user.BanReason, &user.BannedUntil, &user.ProfileVisibility,
			&user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt, &user.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error after scanning user rows: %w", err)
	}

	return users, nil
}

func (r *userRepository) GetUserByGoogleID(ctx context.Context, googleID string) (*domain.User, error) {
	return r.getUserBy(ctx, "google_id", googleID)
}

func (r *userRepository) UpdateUserGoogleID(ctx context.Context, userID, googleID string) error {
	query := `UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(ctx, query, googleID, userID)
	if err != nil {
		return fmt.Errorf("failed to update user google_id: %w", err)
	}
	// Invalidate cache
	r.redis.Del(ctx, fmt.Sprintf("user:%s", userID))
	return nil
}

// CreateUserExperience creates a new user experience entry.
func (r *userRepository) CreateUserExperience(ctx context.Context, exp *domain.UserExperience) (*domain.UserExperience, error) {
	query := `
		INSERT INTO user_experience (user_id, title, company, location, start_date, end_date, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query,
		exp.UserID, exp.Title, exp.Company, exp.Location, exp.StartDate, exp.EndDate, exp.Description,
	).Scan(&exp.ID, &exp.CreatedAt, &exp.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create user experience: %w", err)
	}

	return exp, nil
}

// UpdateUserExperience updates an existing user experience entry.
func (r *userRepository) UpdateUserExperience(ctx context.Context, exp *domain.UserExperience) (*domain.UserExperience, error) {
	query := `
		UPDATE user_experience
		SET title = $1, company = $2, location = $3, start_date = $4, end_date = $5, description = $6, updated_at = NOW()
		WHERE id = $7 AND user_id = $8
		RETURNING updated_at
	`

	err := r.db.QueryRow(ctx, query,
		exp.Title, exp.Company, exp.Location, exp.StartDate, exp.EndDate, exp.Description, exp.ID, exp.UserID,
	).Scan(&exp.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user experience not found or not owned by user")
		}
		return nil, fmt.Errorf("failed to update user experience: %w", err)
	}

	return exp, nil
}

// DeleteUserExperience deletes a user experience entry.
func (r *userRepository) DeleteUserExperience(ctx context.Context, userID, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `DELETE FROM user_experience WHERE id = $1 AND user_id = $2`
	ct, err := tx.Exec(ctx, query, id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user experience: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return errors.New("user experience not found or not owned by user")
	}

	return tx.Commit(ctx)
}

// ListUserExperience retrieves all user experience entries for a given user ID.
func (r *userRepository) ListUserExperience(ctx context.Context, userID string) ([]domain.UserExperience, error) {
	query := `
		SELECT id, user_id, title, company, location, start_date, end_date, description, created_at, updated_at
		FROM user_experience
		WHERE user_id = $1
		ORDER BY start_date DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user experience: %w", err)
	}
	defer rows.Close()

	var experiences []domain.UserExperience
	for rows.Next() {
		var exp domain.UserExperience
		err := rows.Scan(
			&exp.ID, &exp.UserID, &exp.Title, &exp.Company, &exp.Location, &exp.StartDate, &exp.EndDate, &exp.Description, &exp.CreatedAt, &exp.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user experience row: %w", err)
		}
		experiences = append(experiences, exp)
	}

	return experiences, nil
}

// CreateUserEducation creates a new user education entry.
func (r *userRepository) CreateUserEducation(ctx context.Context, edu *domain.UserEducation) (*domain.UserEducation, error) {
	query := `
		INSERT INTO user_education (user_id, school, degree, field_of_study, start_date, end_date, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query,
		edu.UserID, edu.School, edu.Degree, edu.FieldOfStudy, edu.StartDate, edu.EndDate, edu.Description,
	).Scan(&edu.ID, &edu.CreatedAt, &edu.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create user education: %w", err)
	}

	return edu, nil
}

// UpdateUserEducation updates an existing user education entry.
func (r *userRepository) UpdateUserEducation(ctx context.Context, edu *domain.UserEducation) (*domain.UserEducation, error) {
	query := `
		UPDATE user_education
		SET school = $1, degree = $2, field_of_study = $3, start_date = $4, end_date = $5, description = $6, updated_at = NOW()
		WHERE id = $7 AND user_id = $8
		RETURNING updated_at
	`

	err := r.db.QueryRow(ctx, query,
		edu.School, edu.Degree, edu.FieldOfStudy, edu.StartDate, edu.EndDate, edu.Description, edu.ID, edu.UserID,
	).Scan(&edu.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user education not found or not owned by user")
		}
		return nil, fmt.Errorf("failed to update user education: %w", err)
	}

	return edu, nil
}

// DeleteUserEducation deletes a user education entry.
func (r *userRepository) DeleteUserEducation(ctx context.Context, id string) error {
	query := `DELETE FROM user_education WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user education: %w", err)
	}
	return nil
}

// ListUserEducation retrieves all user education entries for a given user ID.
func (r *userRepository) ListUserEducation(ctx context.Context, userID string) ([]domain.UserEducation, error) {
	query := `
		SELECT id, user_id, school, degree, field_of_study, start_date, end_date, description, created_at, updated_at
		FROM user_education
		WHERE user_id = $1
		ORDER BY start_date DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user education: %w", err)
	}
	defer rows.Close()

	var educations []domain.UserEducation
	for rows.Next() {
		var edu domain.UserEducation
		err := rows.Scan(
			&edu.ID, &edu.UserID, &edu.School, &edu.Degree, &edu.FieldOfStudy, &edu.StartDate, &edu.EndDate, &edu.Description, &edu.CreatedAt, &edu.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user education row: %w", err)
		}
		educations = append(educations, edu)
	}

	return educations, nil
}

// CreateUserSkill creates a new user skill entry.
func (r *userRepository) CreateUserSkill(ctx context.Context, skill *domain.UserSkill) (*domain.UserSkill, error) {
	query := `
		INSERT INTO user_skills (user_id, skill_name)
		VALUES ($1, $2)
		ON CONFLICT (user_id, skill_name) DO UPDATE SET endorsement_count = user_skills.endorsement_count, updated_at = NOW()
		RETURNING id, endorsement_count, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query,
		skill.UserID, skill.SkillName,
	).Scan(&skill.ID, &skill.EndorsementCount, &skill.CreatedAt, &skill.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create user skill: %w", err)
	}

	return skill, nil
}

// DeleteUserSkill deletes a user skill entry.
func (r *userRepository) DeleteUserSkill(ctx context.Context, id string) error {
	query := `DELETE FROM user_skills WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user skill: %w", err)
	}
	return nil
}

// ListUserSkills retrieves all user skills for a given user ID.
func (r *userRepository) ListUserSkills(ctx context.Context, userID string) ([]domain.UserSkill, error) {
	query := `
		SELECT id, user_id, skill_name, endorsement_count, created_at, updated_at
		FROM user_skills
		WHERE user_id = $1
		ORDER BY skill_name ASC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user skills: %w", err)
	}
	defer rows.Close()

	var skills []domain.UserSkill
	for rows.Next() {
		var skill domain.UserSkill
		err := rows.Scan(
			&skill.ID, &skill.UserID, &skill.SkillName, &skill.EndorsementCount, &skill.CreatedAt, &skill.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user skill row: %w", err)
		}
		skills = append(skills, skill)
	}

	return skills, nil
}

// AddSkillEndorsement increments the endorsement count for a skill.
func (r *userRepository) AddSkillEndorsement(ctx context.Context, skillID, endorserID string) error {
	// First, check if the endorser has already endorsed this skill
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM user_skill_endorsements WHERE skill_id = $1 AND endorser_id = $2)`
	err := r.db.QueryRow(ctx, checkQuery, skillID, endorserID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check existing endorsement: %w", err)
	}
	if exists {
		return errors.New("skill already endorsed by this user")
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Add the endorsement record
	insertQuery := `INSERT INTO user_skill_endorsements (skill_id, endorser_id) VALUES ($1, $2)`
	if _, err := tx.Exec(ctx, insertQuery, skillID, endorserID); err != nil {
		return fmt.Errorf("failed to add skill endorsement record: %w", err)
	}

	// Increment the endorsement count in user_skills table
	updateQuery := `UPDATE user_skills SET endorsement_count = endorsement_count + 1, updated_at = NOW() WHERE id = $1`
	if _, err := tx.Exec(ctx, updateQuery, skillID); err != nil {
		return fmt.Errorf("failed to increment skill endorsement count: %w", err)
	}

	return tx.Commit(ctx)
}

// RemoveSkillEndorsement decrements the endorsement count for a skill.
func (r *userRepository) RemoveSkillEndorsement(ctx context.Context, skillID, endorserID string) error {
	// First, check if the endorsement exists
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM user_skill_endorsements WHERE skill_id = $1 AND endorser_id = $2)`
	err := r.db.QueryRow(ctx, checkQuery, skillID, endorserID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check existing endorsement: %w", err)
	}
	if !exists {
		return errors.New("skill not endorsed by this user")
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete the endorsement record
	deleteQuery := `DELETE FROM user_skill_endorsements WHERE skill_id = $1 AND endorser_id = $2`
	if _, err := tx.Exec(ctx, deleteQuery, skillID, endorserID); err != nil {
		return fmt.Errorf("failed to delete skill endorsement record: %w", err)
	}

	// Decrement the endorsement count in user_skills table
	updateQuery := `UPDATE user_skills SET endorsement_count = endorsement_count - 1, updated_at = NOW() WHERE id = $1`
	if _, err := tx.Exec(ctx, updateQuery, skillID); err != nil {
		return fmt.Errorf("failed to decrement skill endorsement count: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *userRepository) IncrementPollVoteCount(ctx context.Context, optionID string) error {
	query := `UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, optionID)
	return err
}

func (r *userRepository) CreateFriendRequest(ctx context.Context, senderID, receiverID string) error {
	query := `INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)`
	_, err := r.db.Exec(ctx, query, senderID, receiverID)
	return err
}

func (r *userRepository) UpdateFriendRequest(ctx context.Context, senderID, receiverID, status string) error {
	query := `UPDATE friend_requests SET status = $3, updated_at = NOW() WHERE sender_id = $1 AND receiver_id = $2`
	_, err := r.db.Exec(ctx, query, senderID, receiverID, status)
	return err
}

func (r *userRepository) GetFriendRequest(ctx context.Context, senderID, receiverID string) (*domain.FriendRequest, error) {
	query := `SELECT sender_id, receiver_id, status, created_at, updated_at FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2`
	var req domain.FriendRequest
	err := r.db.QueryRow(ctx, query, senderID, receiverID).Scan(&req.SenderID, &req.ReceiverID, &req.Status, &req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // No request found is not an error
		}
		return nil, err
	}
	return &req, nil
}

func (r *userRepository) CreateFriend(ctx context.Context, userID1, userID2 string) error {
	query := `INSERT INTO friends (user_id1, user_id2) VALUES ($1, $2)`
	_, err := r.db.Exec(ctx, query, userID1, userID2)
	return err
}

func (r *userRepository) DeleteFriend(ctx context.Context, userID1, userID2 string) error {
	query := `DELETE FROM friends WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1)`
	_, err := r.db.Exec(ctx, query, userID1, userID2)
	return err
}

func (r *userRepository) GetFriends(ctx context.Context, userID string) ([]domain.User, error) {
	query := `
		SELECT u.id, u.name, u.email, u.profile_picture_url
		FROM users u
		JOIN friends f ON (u.id = f.user_id1 OR u.id = f.user_id2)
		WHERE (f.user_id1 = $1 OR f.user_id2 = $1) AND u.id != $1
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friends []domain.User
	for rows.Next() {
		var friend domain.User
		if err := rows.Scan(&friend.ID, &friend.Name, &friend.Email, &friend.ProfilePictureURL); err != nil {
			return nil, err
		}
		friends = append(friends, friend)
	}
	return friends, nil
}