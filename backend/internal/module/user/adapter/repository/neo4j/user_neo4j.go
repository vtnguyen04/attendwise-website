package neo4j

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/attendwise/backend/internal/module/user/domain"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// UserGraphRepository handles user-related operations in Neo4j.
type UserGraphRepository struct {
	driver neo4j.DriverWithContext
}

// NewUserGraphRepository creates a new UserGraphRepository.
func NewUserGraphRepository(driver neo4j.DriverWithContext) *UserGraphRepository {
	return &UserGraphRepository{driver: driver}
}

// CreateUserNode creates a new user node in Neo4j.
func (r *UserGraphRepository) CreateUserNode(ctx context.Context, user *domain.User) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{
		AccessMode:   neo4j.AccessModeWrite,
		DatabaseName: "neo4j",
	})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MERGE (u:User {id: $id})
			ON CREATE SET
				u.createdAt = COALESCE($createdAt, datetime()),
				u.email = $email
			SET
				u.name = $name,
				u.company = $company,
				u.position = $position,
				u.profilePictureURL = $profilePictureURL,
				u.bio = $bio,
				u.location = $location,
				u.updatedAt = datetime()
		`
		parameters := map[string]interface{}{
			"id":                user.ID,
			"name":              user.Name,
			"email":             user.Email,
			"company":           user.Company.String,
			"position":          user.Position.String,
			"profilePictureURL": user.ProfilePictureURL.String,
			"bio":               user.Bio.String,
			"location":          user.Location.String,
			"createdAt":         user.CreatedAt.UTC(),
		}

		result, err := tx.Run(ctx, query, parameters)
		if err != nil {
			return nil, err
		}
		_, consumeErr := result.Consume(ctx)
		return nil, consumeErr
	})

	if err != nil {
		return fmt.Errorf("could not upsert user node in Neo4j: %w", err)
	}

	return nil
}

// FindSpamAccounts identifies users created recently who have a high number of outgoing follows.
func (r *UserGraphRepository) FindSpamAccounts(ctx context.Context, since time.Time, followThreshold int) ([]string, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (u:User)
		WHERE u.createdAt > $since
		WITH u, size((u)-[:FOLLOWS]->()) as followingCount
		WHERE followingCount > $followThreshold
		RETURN u.id as userID
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{
			"since":           since,
			"followThreshold": followThreshold,
		})
		if err != nil {
			return nil, err
		}

		var userIDs []string
		for queryResult.Next(ctx) {
			record := queryResult.Record()
			userID, _ := record.Get("userID")
			userIDs = append(userIDs, userID.(string))
		}

		return userIDs, queryResult.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("failed to find spam accounts from Neo4j: %w", err)
	}

	return result.([]string), nil
}

func (r *UserGraphRepository) CheckGDS(ctx context.Context) (bool, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `CALL gds.proc.list() YIELD name RETURN name`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, nil)
		if err != nil {
			// If the procedure doesn\'t exist, it will throw a specific error
			return false, err
		}
		// If the query runs without error, GDS is likely installed.
		// We can just consume the result to be sure.
		_, summaryErr := queryResult.Consume(ctx)
		return true, summaryErr
	})

	if err != nil {
		// Check for the specific error indicating the procedure is not found
		if strings.Contains(err.Error(), "Unknown procedure") {
			return false, nil // GDS is not installed, but this is not a fatal error for the check.
		}
		return false, err // Another type of error occurred
	}

	return result.(bool), nil
}

// SuggestUsersToFollow suggests users that the given userID might want to follow,
// based on common event attendance, excluding users already followed.
func (r *UserGraphRepository) SuggestUsersToFollow(ctx context.Context, userID string, limit, offset int) ([]map[string]interface{}, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (u:User {id: $userID})-[:FOLLOWS]->(f:User)
		WITH u, COLLECT(f.id) AS followedUserIDs
		MATCH (u)-[:ATTENDS]->(e:Event)<-[:ATTENDS]-(other:User)
		WHERE NOT (u)-[:FOLLOWS]->(other) AND NOT other.id IN followedUserIDs AND other.id <> u.id
		RETURN DISTINCT other.id AS id, other.name AS name, other.profile_picture_url AS profile_picture_url
		SKIP $offset
		LIMIT $limit
	`

	params := map[string]interface{}{
		"userID": userID,
		"limit":  limit,
		"offset": offset,
	}

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		records, err := tx.Run(ctx, query, params)
		if err != nil {
			return nil, err
		}
		var suggestions []map[string]interface{}
		for records.Next(ctx) {
			record := records.Record()
			suggestion := make(map[string]interface{})
			suggestion["id"] = record.Values[0]
			suggestion["name"] = record.Values[1]
			suggestion["profile_picture_url"] = record.Values[2]
			suggestions = append(suggestions, suggestion)
		}
		return suggestions, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]map[string]interface{}), nil
}
