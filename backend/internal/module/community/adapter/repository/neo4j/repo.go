package neo4j

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/attendwise/backend/internal/module/community/domain"
	event_domain "github.com/attendwise/backend/internal/module/event/domain"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// ============================================================================
// HELPER FUNCTIONS - Type-safe extraction from Neo4j records
// ============================================================================

func safeGetString(record *neo4j.Record, key string) string {
	if val, ok := record.Get(key); ok && val != nil {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func safeGetNullString(record *neo4j.Record, key string) sql.NullString {
	if value, ok := record.Get(key); ok && value != nil {
		if str, ok := value.(string); ok && str != "" {
			return sql.NullString{String: str, Valid: true}
		}
	}
	return sql.NullString{Valid: false}
}

func safeGetBool(record *neo4j.Record, key string) bool {
	if value, ok := record.Get(key); ok && value != nil {
		if b, ok := value.(bool); ok {
			return b
		}
	}
	return false
}

func safeGetInt(record *neo4j.Record, key string) int {
	if value, ok := record.Get(key); ok && value != nil {
		switch v := value.(type) {
		case int64:
			return int(v)
		case int:
			return v
		}
	}
	return 0
}

func safeGetInt64(record *neo4j.Record, key string) int64 {
	if value, ok := record.Get(key); ok && value != nil {
		if i64, ok := value.(int64); ok {
			return i64
		}
	}
	return 0
}

func safeGetTime(record *neo4j.Record, key string) time.Time {
	if value, ok := record.Get(key); ok && value != nil {
		switch v := value.(type) {
		case time.Time:
			return v
		case neo4j.Time:
			return time.Time(v)
		}
	}
	return time.Time{}
}

func safeGetNullTime(record *neo4j.Record, key string) sql.NullTime {
	if value, ok := record.Get(key); ok && value != nil {
		switch v := value.(type) {
		case time.Time:
			if !v.IsZero() {
				return sql.NullTime{Time: v, Valid: true}
			}
		case neo4j.Time:
			t := time.Time(v)
			if !t.IsZero() {
				return sql.NullTime{Time: t, Valid: true}
			}
		}
	}
	return sql.NullTime{Valid: false}
}

// ============================================================================
// REPOSITORY
// ============================================================================

type Neo4jCommunityRepository struct {
	driver neo4j.DriverWithContext
}

func NewNeo4jCommunityRepository(driver neo4j.DriverWithContext) *Neo4jCommunityRepository {
	return &Neo4jCommunityRepository{driver: driver}
}

// ============================================================================
// MEMBER RELATIONSHIPS
// ============================================================================

func (r *Neo4jCommunityRepository) AddMemberRelationship(ctx context.Context, userID, communityID, role string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MERGE (u:User {id: $userID})
		MERGE (c:Community {id: $communityID})
		MERGE (u)-[rel:MEMBER_OF]->(c)
		SET rel.role = $role, rel.status = 'active', rel.joined_at = datetime()
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, query, map[string]any{
			"userID":      userID,
			"communityID": communityID,
			"role":        role,
		})
		return nil, err
	})

	if err != nil {
		return fmt.Errorf("failed to create MEMBER_OF relationship: %w", err)
	}
	return nil
}

func (r *Neo4jCommunityRepository) RemoveMemberRelationship(ctx context.Context, userID, communityID string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MATCH (u:User {id: $userID})-[rel:MEMBER_OF]->(c:Community {id: $communityID})
		DELETE rel
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, query, map[string]any{
			"userID":      userID,
			"communityID": communityID,
		})
		return nil, err
	})

	if err != nil {
		return fmt.Errorf("failed to remove MEMBER_OF relationship: %w", err)
	}
	return nil
}

func (r *Neo4jCommunityRepository) IsMember(ctx context.Context, userID, communityID string) (bool, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (u:User {id: $userID})-[r:MEMBER_OF]->(c:Community {id: $communityID})
		WHERE r.status = 'active'
		RETURN count(r) > 0 AS isMember
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{
			"userID":      userID,
			"communityID": communityID,
		})
		if err != nil {
			return false, err
		}

		if queryResult.Next(ctx) {
			return queryResult.Record().Values[0].(bool), nil
		}
		return false, queryResult.Err()
	})

	if err != nil {
		return false, fmt.Errorf("failed to check membership: %w", err)
	}
	return result.(bool), nil
}

// ============================================================================
// COMMUNITY NODES
// ============================================================================

func (r *Neo4jCommunityRepository) CreateCommunityNode(ctx context.Context, community *domain.Community) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MERGE (c:Community {id: $id})
		SET c.name = $name,
			c.owner_id = $owner_id,
			c.slug = $slug,
			c.description = $description,
			c.cover_image_url = $cover_image_url,
			c.type = $type,
			c.require_approval = $require_approval,
			c.allow_member_posts = $allow_member_posts,
			c.auto_approve_posts = $auto_approve_posts,
			c.allow_member_invites = $allow_member_invites,
			c.member_count = $member_count,
			c.post_count = $post_count,
			c.event_count = $event_count,
			c.created_at = $created_at,
			c.updated_at = $updated_at
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		params := map[string]any{
			"id":                   community.ID,
			"name":                 community.Name,
			"owner_id":             community.OwnerID,
			"slug":                 community.Slug,
			"description":          community.Description.String,
			"cover_image_url":      community.CoverImageURL.String,
			"type":                 community.Type,
			"require_approval":     community.RequireApproval,
			"allow_member_posts":   community.AllowMemberPosts,
			"auto_approve_posts":   community.AutoApprovePosts,
			"allow_member_invites": community.AllowMemberInvites,
			"member_count":         community.MemberCount,
			"post_count":           community.PostCount,
			"event_count":          community.EventCount,
			"created_at":           community.CreatedAt,
			"updated_at":           community.UpdatedAt,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	return err
}

func (r *Neo4jCommunityRepository) UpdateCommunityNode(ctx context.Context, community *domain.Community) error {
	return r.CreateCommunityNode(ctx, community) // MERGE handles both create and update
}

func (r *Neo4jCommunityRepository) BulkDeleteCommunityNodes(ctx context.Context, communityIDs []string) error {
	if len(communityIDs) == 0 {
		return nil
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MATCH (c:Community)
		WHERE c.id IN $communityIDs
		DETACH DELETE c
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, query, map[string]any{"communityIDs": communityIDs})
		return nil, err
	})

	if err != nil {
		return fmt.Errorf("failed to bulk delete community nodes: %w", err)
	}
	return nil
}

// ============================================================================
// POST & COMMENT NODES
// ============================================================================

func (r *Neo4jCommunityRepository) CreatePostNode(ctx context.Context, post *domain.Post, communityName, authorName string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MERGE (p:Post {id: $postID})
		SET p.content = $content,
			p.visibility = $visibility,
			p.status = $status,
			p.created_at = $createdAt,
			p.updated_at = $updatedAt
		WITH p
		MERGE (u:User {id: $authorID})
		ON CREATE SET u.name = $authorName
		
		// Conditionally merge community relationship
		FOREACH (ignore_this IN CASE WHEN $communityID IS NOT NULL THEN [1] ELSE [] END |
			MERGE (c:Community {id: $communityID})
			ON CREATE SET c.name = $communityName
			MERGE (p)-[:IN_COMMUNITY]->(c)
		)
		MERGE (u)-[:AUTHORED]->(p)
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		params := map[string]any{
			"postID":     post.ID,
			"authorID":   post.AuthorID,
			"authorName": authorName,
			"communityID": func() interface{} {
				if post.CommunityID.Valid {
					return post.CommunityID.String
				}
				return nil
			}(),
			"communityName": communityName,
			"content":       post.Content,
			"visibility":    post.Visibility,
			"status":        post.Status,
			"createdAt":     post.CreatedAt.In(time.UTC),
			"updatedAt":     post.UpdatedAt.In(time.UTC),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *Neo4jCommunityRepository) CreateCommentNode(ctx context.Context, comment *domain.Comment) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MERGE (c:Comment {id: $commentID})
		SET c.content = $content,
			c.status = $status,
			c.created_at = $createdAt,
			c.updated_at = $updatedAt
		WITH c
		MERGE (u:User {id: $authorID})
		MERGE (p:Post {id: $postID})
		MERGE (u)-[:AUTHORED]->(c)
		MERGE (c)-[:REPLY_TO]->(p)
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		params := map[string]any{
			"commentID": comment.ID,
			"content":   comment.Content,
			"status":    comment.Status,
			"createdAt": comment.CreatedAt.In(time.UTC),
			"updatedAt": comment.UpdatedAt.In(time.UTC),
			"authorID":  comment.AuthorID,
			"postID":    comment.PostID,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *Neo4jCommunityRepository) AddCommentRelationship(ctx context.Context, commentID, parentCommentID string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MERGE (c1:Comment {id: $commentID})
		MERGE (c2:Comment {id: $parentCommentID})
		MERGE (c1)-[:REPLY_TO]->(c2)
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, query, map[string]any{
			"commentID":       commentID,
			"parentCommentID": parentCommentID,
		})
		return nil, err
	})
	return err
}

// ============================================================================
// EVENT NODES
// ============================================================================

func (r *Neo4jCommunityRepository) CreateEventNode(ctx context.Context, event *event_domain.Event) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MERGE (e:Event {id: $eventID})
		SET e.name = $name,
			e.created_at = $createdAt
		WITH e
		MERGE (c:Community {id: $communityID})
		MERGE (e)-[:HOSTED_IN]->(c)
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		params := map[string]any{
			"eventID":     event.ID,
			"name":        event.Name,
			"createdAt":   event.CreatedAt.UTC(),
			"communityID": event.CommunityID,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

// ============================================================================
// USER NODES
// ============================================================================

func (r *Neo4jCommunityRepository) CreateUserNode(ctx context.Context, userID, username string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `MERGE (u:User {id: $userID}) SET u.name = $username`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, query, map[string]any{
			"userID":   userID,
			"username": username,
		})
		return nil, err
	})
	return err
}

// ============================================================================
// FOLLOW RELATIONSHIPS
// ============================================================================

func (r *Neo4jCommunityRepository) AddFollowRelationship(ctx context.Context, followerID, followeeID string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MERGE (follower:User {id: $followerID})
		MERGE (followee:User {id: $followeeID})
		MERGE (follower)-[r:FOLLOWS]->(followee)
		SET r.created_at = datetime()
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, query, map[string]any{
			"followerID": followerID,
			"followeeID": followeeID,
		})
		return nil, err
	})
	return err
}

func (r *Neo4jCommunityRepository) RemoveFollowRelationship(ctx context.Context, followerID, followeeID string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MATCH (follower:User {id: $followerID})-[rel:FOLLOWS]->(followee:User {id: $followeeID})
		DELETE rel
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, query, map[string]any{
			"followerID": followerID,
			"followeeID": followeeID,
		})
		return nil, err
	})
	return err
}

func (r *Neo4jCommunityRepository) CheckFollowRelationship(ctx context.Context, followerID, followeeID string) (bool, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (follower:User {id: $followerID})-[r:FOLLOWS]->(followee:User {id: $followeeID})
		RETURN count(r) > 0 AS isFollowing
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{
			"followerID": followerID,
			"followeeID": followeeID,
		})
		if err != nil {
			return false, err
		}

		if queryResult.Next(ctx) {
			return queryResult.Record().Values[0].(bool), nil
		}
		return false, queryResult.Err()
	})

	if err != nil {
		return false, fmt.Errorf("failed to check FOLLOWS relationship: %w", err)
	}
	return result.(bool), nil
}

func (r *Neo4jCommunityRepository) GetFollowers(ctx context.Context, userID string) ([]string, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (follower:User)-[:FOLLOWS]->(u:User {id: $userID})
		RETURN follower.id AS followerId
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{"userID": userID})
		if err != nil {
			return nil, err
		}

		var followers []string
		for queryResult.Next(ctx) {
			if id := safeGetString(queryResult.Record(), "followerId"); id != "" {
				followers = append(followers, id)
			}
		}
		return followers, queryResult.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get followers: %w", err)
	}
	return result.([]string), nil
}

// ============================================================================
// REACTION RELATIONSHIPS
// ============================================================================

func (r *Neo4jCommunityRepository) CreateReactionRelationship(ctx context.Context, userID, targetID, targetType, reactionType string) error {
	// Only track 'like' reactions on 'post' for recommendations
	if targetType != "post" || reactionType != "like" {
		return nil
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		MERGE (u:User {id: $userID})
		MERGE (p:Post {id: $targetID})
		MERGE (u)-[r:LIKED]->(p)
		SET r.created_at = datetime()
	`

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, query, map[string]any{
			"userID":   userID,
			"targetID": targetID,
		})
		return nil, err
	})
	return err
}

// ============================================================================
// RECOMMENDATIONS & SUGGESTIONS
// ============================================================================

func (r *Neo4jCommunityRepository) SuggestCommunities(ctx context.Context, userID string, limit int) ([]map[string]interface{}, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (u:User {id: $userID})-[:MEMBER_OF]->()<-[:MEMBER_OF]-(friend:User)-[:MEMBER_OF]->(suggestion:Community)
		WHERE NOT (u)-[:MEMBER_OF]->(suggestion)
		WITH suggestion, count(DISTINCT friend) AS commonMembers
		RETURN suggestion.id AS id, 
		       COALESCE(suggestion.name, '') AS name, 
		       commonMembers
		ORDER BY commonMembers DESC
		LIMIT $limit
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{
			"userID": userID,
			"limit":  limit,
		})
		if err != nil {
			return nil, err
		}

		var suggestions []map[string]interface{}
		for queryResult.Next(ctx) {
			record := queryResult.Record()
			id := safeGetString(record, "id")
			name := safeGetString(record, "name")
			commonMembers := safeGetInt64(record, "commonMembers")

			if id != "" && name != "" {
				suggestions = append(suggestions, map[string]interface{}{
					"id":             id,
					"name":           name,
					"common_members": commonMembers,
				})
			}
		}
		return suggestions, queryResult.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("failed to suggest communities: %w", err)
	}
	return result.([]map[string]interface{}), nil
}

func (r *Neo4jCommunityRepository) SuggestUsersToFollow(ctx context.Context, userID string, limit int) ([]map[string]interface{}, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (currentUser:User {id: $userID})-[:MEMBER_OF]->(c:Community)<-[:MEMBER_OF]-(suggestion:User)
		WHERE currentUser <> suggestion 
		  AND NOT (currentUser)-[:FOLLOWS]->(suggestion)
		WITH suggestion, count(DISTINCT c) AS mutualCommunities
		RETURN suggestion.id AS id, 
		       suggestion.name AS name, 
		       mutualCommunities
		ORDER BY mutualCommunities DESC
		LIMIT $limit
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{
			"userID": userID,
			"limit":  limit,
		})
		if err != nil {
			return nil, err
		}

		var suggestions []map[string]interface{}
		for queryResult.Next(ctx) {
			record := queryResult.Record()
			id := safeGetString(record, "id")
			name := safeGetString(record, "name")
			mutualCommunities := safeGetInt64(record, "mutualCommunities")

			if id != "" {
				suggestions = append(suggestions, map[string]interface{}{
					"id":                 id,
					"name":               name,
					"mutual_communities": mutualCommunities,
				})
			}
		}
		return suggestions, queryResult.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("failed to suggest users: %w", err)
	}
	return result.([]map[string]interface{}), nil
}

func (r *Neo4jCommunityRepository) GetRecommendedPosts(ctx context.Context, userID, postID string, limit int) ([]map[string]interface{}, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (target:Post {id: $postID})<-[:LIKED]-(similarUser:User)-[:LIKED]->(rec:Post)
		WHERE rec.id <> $postID 
		  AND NOT EXISTS((:User {id: $userID})-[:LIKED]->(rec))
		WITH rec, count(DISTINCT similarUser) AS commonLikers
		ORDER BY commonLikers DESC
		LIMIT $limit
		MATCH (author:User)-[:AUTHORED]->(rec)
		RETURN rec.id AS id, 
		       rec.content AS content, 
		       rec.created_at AS createdAt, 
		       author.id AS authorId, 
		       author.name AS authorName, 
		       commonLikers
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{
			"postID": postID,
			"userID": userID,
			"limit":  limit,
		})
		if err != nil {
			return nil, err
		}

		var recommendations []map[string]interface{}
		for queryResult.Next(ctx) {
			record := queryResult.Record()
			recMap := make(map[string]interface{})
			for _, key := range record.Keys {
				if value, ok := record.Get(key); ok {
					recMap[key] = value
				}
			}
			recommendations = append(recommendations, recMap)
		}
		return recommendations, queryResult.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get recommended posts: %w", err)
	}
	return result.([]map[string]interface{}), nil
}

// ============================================================================
// FEED
// ============================================================================

func (r *Neo4jCommunityRepository) GetFeedForUser(ctx context.Context, userID string, limit int) ([]map[string]interface{}, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (u:User {id: $userID})-[:MEMBER_OF]->(c:Community)<-[:IN_COMMUNITY]-(p:Post)<-[:AUTHORED]-(author:User)
		WHERE p.status = 'published'
		RETURN p.id AS id, 
		       p.content AS content, 
		       p.created_at AS createdAt, 
		       author.id AS authorId, 
		       author.name AS authorName
		ORDER BY p.created_at DESC
		LIMIT $limit
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{
			"userID": userID,
			"limit":  limit,
		})
		if err != nil {
			return nil, err
		}

		var feed []map[string]interface{}
		for queryResult.Next(ctx) {
			record := queryResult.Record()
			recMap := make(map[string]interface{})
			for _, key := range record.Keys {
				if value, ok := record.Get(key); ok {
					recMap[key] = value
				}
			}
			feed = append(feed, recMap)
		}
		return feed, queryResult.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get feed: %w", err)
	}
	return result.([]map[string]interface{}), nil
}

// ============================================================================
// LIST OPERATIONS
// ============================================================================

func (r *Neo4jCommunityRepository) ListUserCommunities(ctx context.Context, userID string) ([]*domain.Community, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (u:User {id: $userID})-[r:MEMBER_OF]->(c:Community)
		WHERE r.status = 'active'
		OPTIONAL MATCH (owner:User {id: c.owner_id})
		RETURN c.id, c.owner_id, c.name, c.slug, c.description, c.cover_image_url, 
		       c.type, c.require_approval, c.allow_member_posts, c.auto_approve_posts, 
		       c.allow_member_invites, c.member_count, c.post_count, c.event_count, 
		       c.created_at, c.updated_at, c.deleted_at,
		       owner.name AS admin_name, 
		       owner.profilePictureURL AS admin_avatar_url,
		       r.role, 
		       COALESCE(r.status, 'not_joined') AS status
		ORDER BY c.name ASC
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{"userID": userID})
		if err != nil {
			return nil, err
		}

		var communities []*domain.Community
		for queryResult.Next(ctx) {
			record := queryResult.Record()
			community := &domain.Community{
				ID:                 safeGetString(record, "c.id"),
				OwnerID:            safeGetString(record, "c.owner_id"),
				Name:               safeGetString(record, "c.name"),
				Slug:               safeGetString(record, "c.slug"),
				Description:        safeGetNullString(record, "c.description"),
				CoverImageURL:      safeGetNullString(record, "c.cover_image_url"),
				Type:               safeGetString(record, "c.type"),
				RequireApproval:    safeGetBool(record, "c.require_approval"),
				AllowMemberPosts:   safeGetBool(record, "c.allow_member_posts"),
				AutoApprovePosts:   safeGetBool(record, "c.auto_approve_posts"),
				AllowMemberInvites: safeGetBool(record, "c.allow_member_invites"),
				MemberCount:        safeGetInt(record, "c.member_count"),
				PostCount:          safeGetInt(record, "c.post_count"),
				EventCount:         safeGetInt(record, "c.event_count"),
				CreatedAt:          safeGetTime(record, "c.created_at"),
				UpdatedAt:          safeGetTime(record, "c.updated_at"),
				DeletedAt:          safeGetNullTime(record, "c.deleted_at"),
				AdminName:          safeGetString(record, "admin_name"),
				AdminAvatarURL:     safeGetString(record, "admin_avatar_url"),
				Role:               safeGetString(record, "r.role"),
				Status:             safeGetString(record, "status"),
			}
			communities = append(communities, community)
		}
		return communities, queryResult.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("failed to list user communities: %w", err)
	}
	return result.([]*domain.Community), nil
}

func (r *Neo4jCommunityRepository) ListCommunities(ctx context.Context, userID string, limit, offset int) ([]*domain.Community, int, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	// Count query - optimized with index hints
	countQuery := `
		MATCH (c:Community)
		WHERE c.type IN ['public', 'private']
		WITH c
		OPTIONAL MATCH (u:User {id: $userID})-[r:MEMBER_OF]->(c)
		WHERE c.type <> 'secret' OR (c.type = 'secret' AND r IS NOT NULL AND r.status = 'active')
		RETURN count(DISTINCT c) AS total
	`

	total, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, countQuery, map[string]any{"userID": userID})
		if err != nil {
			return 0, err
		}
		if queryResult.Next(ctx) {
			return safeGetInt64(queryResult.Record(), "total"), nil
		}
		return int64(0), queryResult.Err()
	})

	if err != nil {
		return nil, 0, fmt.Errorf("failed to count communities: %w", err)
	}

	// Main query - optimized
	query := `
		MATCH (c:Community)
		WHERE c.type IN ['public', 'private']
		WITH c
		OPTIONAL MATCH (u:User {id: $userID})-[r:MEMBER_OF]->(c)
		OPTIONAL MATCH (owner:User {id: c.owner_id})
		WHERE c.type <> 'secret' OR (c.type = 'secret' AND r IS NOT NULL AND r.status = 'active')
		RETURN c.id, c.owner_id, c.name, c.slug, c.description, c.cover_image_url,
		       c.type, c.require_approval, c.allow_member_posts, c.auto_approve_posts,
		       c.allow_member_invites, c.member_count, c.post_count, c.event_count,
		       c.created_at, c.updated_at, c.deleted_at,
		       owner.name AS admin_name,
		       owner.profilePictureURL AS admin_avatar_url,
		       r.role,
		       COALESCE(r.status, 'not_joined') AS status
		ORDER BY c.member_count DESC, c.created_at DESC
		SKIP $offset
		LIMIT $limit
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		queryResult, err := tx.Run(ctx, query, map[string]any{
			"userID": userID,
			"offset": offset,
			"limit":  limit,
		})
		if err != nil {
			return nil, err
		}

		var communities []*domain.Community
		for queryResult.Next(ctx) {
			record := queryResult.Record()
			community := &domain.Community{
				ID:                 safeGetString(record, "c.id"),
				OwnerID:            safeGetString(record, "c.owner_id"),
				Name:               safeGetString(record, "c.name"),
				Slug:               safeGetString(record, "c.slug"),
				Description:        safeGetNullString(record, "c.description"),
				CoverImageURL:      safeGetNullString(record, "c.cover_image_url"),
				Type:               safeGetString(record, "c.type"),
				RequireApproval:    safeGetBool(record, "c.require_approval"),
				AllowMemberPosts:   safeGetBool(record, "c.allow_member_posts"),
				AutoApprovePosts:   safeGetBool(record, "c.auto_approve_posts"),
				AllowMemberInvites: safeGetBool(record, "c.allow_member_invites"),
				MemberCount:        safeGetInt(record, "c.member_count"),
				PostCount:          safeGetInt(record, "c.post_count"),
				EventCount:         safeGetInt(record, "c.event_count"),
				CreatedAt:          safeGetTime(record, "c.created_at"),
				UpdatedAt:          safeGetTime(record, "c.updated_at"),
				DeletedAt:          safeGetNullTime(record, "c.deleted_at"),
				AdminName:          safeGetString(record, "admin_name"),
				AdminAvatarURL:     safeGetString(record, "admin_avatar_url"),
				Role:               safeGetString(record, "r.role"),
				Status:             safeGetString(record, "status"),
			}
			communities = append(communities, community)
		}
		return communities, queryResult.Err()
	})

	if err != nil {
		return nil, 0, fmt.Errorf("failed to list communities: %w", err)
	}
	return result.([]*domain.Community), int(total.(int64)), nil
}

// ============================================================================
// CLEANUP
// ============================================================================

func (r *Neo4jCommunityRepository) Close() error {
	if r.driver != nil {
		return r.driver.Close(context.Background())
	}
	return nil
}
