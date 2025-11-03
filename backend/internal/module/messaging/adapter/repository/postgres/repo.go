package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/attendwise/backend/internal/module/messaging/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type MessagingRepository struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

func NewMessagingRepository(db *pgxpool.Pool, redis *redis.Client) domain.MessagingRepository {
	return &MessagingRepository{db: db, redis: redis}
}

func (r *MessagingRepository) CreateConversation(ctx context.Context, conversation *domain.Conversation, participantIDs []string) (*domain.Conversation, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Insert into conversations table
	conversationQuery := `
		INSERT INTO conversations (id, type)
		VALUES ($1, $2)
		RETURNING created_at, updated_at
	`
	err = tx.QueryRow(ctx, conversationQuery, conversation.ID, conversation.Type).Scan(&conversation.CreatedAt, &conversation.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert conversation: %w", err)
	}

	// 2. Insert participants
	for _, userID := range participantIDs {
		participantQuery := `
			INSERT INTO conversation_participants (conversation_id, user_id)
			VALUES ($1, $2)
		`
		_, err := tx.Exec(ctx, participantQuery, conversation.ID, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to insert participant %s: %w", userID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Populate participants for the returned conversation object
	conversation.Participants = make([]domain.Participant, len(participantIDs))
	for i, userID := range participantIDs {
		conversation.Participants[i] = domain.Participant{
			UserID:   userID,
			JoinedAt: conversation.CreatedAt, // Assuming joined at conversation creation time
		}
	}

	// Invalidate cache for each participant
	for _, userID := range participantIDs {
		cacheKey := fmt.Sprintf("user:%s:conversations", userID)
		r.redis.Del(ctx, cacheKey)
	}

	return conversation, nil
}

func (r *MessagingRepository) GetConversationByID(ctx context.Context, conversationID string) (*domain.Conversation, error) {
	// 1. Try to get from cache
	cacheKey := fmt.Sprintf("conversation:%s", conversationID)
	val, err := r.redis.Get(ctx, cacheKey).Result()
	var conversation *domain.Conversation

	if err == nil {
		if json.Unmarshal([]byte(val), &conversation) == nil {
			return conversation, nil
		}
	}

	// 2. Cache miss, get from DB
	query := `
		SELECT c.id, c.type, c.created_at, c.updated_at,
		       ARRAY_AGG(cp.user_id) AS participant_ids,
		       ARRAY_AGG(cp.joined_at) AS joined_ats
		FROM conversations c
		LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
		WHERE c.id = $1
		GROUP BY c.id, c.type, c.created_at, c.updated_at
	`
	row := r.db.QueryRow(ctx, query, conversationID)
	var dbConversation domain.Conversation
	var participantIDs []string
	var joinedAts []time.Time

	err = row.Scan(&dbConversation.ID, &dbConversation.Type, &dbConversation.CreatedAt, &dbConversation.UpdatedAt, &participantIDs, &joinedAts)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("conversation not found")
		}
		return nil, err
	}

	dbConversation.Participants = make([]domain.Participant, len(participantIDs))
	for i := range participantIDs {
		dbConversation.Participants[i] = domain.Participant{
			UserID:   participantIDs[i],
			JoinedAt: joinedAts[i],
		}
	}

	// 3. Populate cache
	marshaledConversation, err := json.Marshal(dbConversation)
	if err == nil {
		r.redis.Set(ctx, cacheKey, marshaledConversation, 10*time.Minute)
	}

	return &dbConversation, nil
}

func (r *MessagingRepository) GetConversationsByUserID(ctx context.Context, userID string, page, limit int) ([]*domain.Conversation, error) {
	// 1. Try to get from cache
	cacheKey := fmt.Sprintf("user:%s:conversations:%d:%d", userID, page, limit)
	val, err := r.redis.Get(ctx, cacheKey).Result()
	var conversations []*domain.Conversation

	if err == nil {
		if json.Unmarshal([]byte(val), &conversations) == nil {
			return conversations, nil
		}
	}

	// 2. Cache miss, get from DB
	offset := (page - 1) * limit
	query := `
		SELECT
			c.id,
			c.type,
			c.updated_at,
			CASE
				WHEN c.type = 'direct' THEN other_user.name
				ELSE NULL
			END AS name,
			CASE
				WHEN c.type = 'direct' THEN other_user.profile_picture_url
				ELSE NULL
			END AS avatar_url,
			last_msg.content AS last_message,
			last_msg.created_at AS last_message_at,
			cp.unread_count,
			COALESCE(json_agg(json_build_object('user_id', p.user_id, 'joined_at', p.joined_at)) FILTER (WHERE p.user_id IS NOT NULL), '[]') AS participants_json
		FROM
			conversations c
		JOIN
			conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1
		LEFT JOIN LATERAL (
			SELECT content, created_at
			FROM messages m
			WHERE m.conversation_id = c.id AND m.is_deleted = FALSE
			ORDER BY m.created_at DESC
			LIMIT 1
		) last_msg ON true
		LEFT JOIN LATERAL (
			SELECT u.name, u.profile_picture_url
			FROM conversation_participants op
			JOIN users u ON u.id = op.user_id
			WHERE op.conversation_id = c.id AND op.user_id != $1
			LIMIT 1
		) other_user ON c.type = 'direct'
		LEFT JOIN conversation_participants p ON c.id = p.conversation_id
		GROUP BY
			c.id, c.type, c.updated_at, other_user.name, other_user.profile_picture_url, last_msg.content, last_msg.created_at, cp.unread_count
		ORDER BY
			last_message_at DESC NULLS LAST, c.updated_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dbConversations []*domain.Conversation
	for rows.Next() {
		var conversation domain.Conversation
		var name, avatarURL, lastMessage sql.NullString
		var lastMessageAt sql.NullTime
		var participantsJSON []byte

		err := rows.Scan(
			&conversation.ID, 
			&conversation.Type, 
			&conversation.UpdatedAt, 
			&name, 
			&avatarURL, 
			&lastMessage, 
			&lastMessageAt,
			&conversation.UnreadCount,
			&participantsJSON,
		)
		if err != nil {
			return nil, err
		}

		if name.Valid {
			conversation.Name = &name.String
		}
		if avatarURL.Valid {
			conversation.AvatarURL = &avatarURL.String
		}
		if lastMessage.Valid {
			conversation.LastMessage = &lastMessage.String
		}
		if lastMessageAt.Valid {
			conversation.LastMessageAt = &lastMessageAt.Time
		}

		// Unmarshal participants
		if len(participantsJSON) > 0 {
			var participants []domain.Participant
			if err := json.Unmarshal(participantsJSON, &participants); err != nil {
				return nil, fmt.Errorf("failed to unmarshal participants: %w", err)
			}
			conversation.Participants = participants
		}

		dbConversations = append(dbConversations, &conversation)
	}

	// 3. Populate cache
	marshaledConversations, err := json.Marshal(dbConversations)
	if err == nil {
		r.redis.Set(ctx, cacheKey, marshaledConversations, 10*time.Minute)
	}

	return dbConversations, nil
}

func (r *MessagingRepository) GetMessagesByConversationID(ctx context.Context, conversationID string, limit, offset int) ([]*domain.Message, error) {
	// 1. Try to get from cache
	cacheKey := fmt.Sprintf("conversation:%s:messages:%d:%d", conversationID, limit, offset)
	val, err := r.redis.Get(ctx, cacheKey).Result()
	var messages []*domain.Message

	if err == nil {
		if json.Unmarshal([]byte(val), &messages) == nil {
			return messages, nil
		}
	}

	// 2. Cache miss, get from DB
	query := `
		SELECT 
			m.id, m.conversation_id, m.sender_id, m.content, m.message_type, m.created_at, 
			m.is_edited, m.edited_at, m.is_deleted, m.deleted_at,
			u.name as author_name, u.profile_picture_url as author_avatar
		FROM messages m
		LEFT JOIN users u ON m.sender_id = u.id
		WHERE m.conversation_id = $1 AND m.is_deleted = FALSE
		ORDER BY m.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, conversationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dbMessages []*domain.Message
	for rows.Next() {
		var message domain.Message
		var author domain.Author
		var authorAvatar sql.NullString

		err := rows.Scan(
			&message.ID, &message.ConversationID, &message.SenderID, &message.Content,
			&message.MessageType, &message.CreatedAt, &message.IsEdited, &message.EditedAt,
			&message.IsDeleted, &message.DeletedAt,
			&author.Name, &authorAvatar,
		)
		if err != nil {
			return nil, err
		}
		author.ID = message.SenderID
		if authorAvatar.Valid {
			author.ProfilePictureURL = authorAvatar.String
		}
		message.Author = &author
		dbMessages = append(dbMessages, &message)
	}

	// 3. Populate cache
	marshaledMessages, err := json.Marshal(dbMessages)
	if err == nil {
		r.redis.Set(ctx, cacheKey, marshaledMessages, 10*time.Minute)
	}

	return dbMessages, nil
}

func (r *MessagingRepository) UpdateMessage(ctx context.Context, message *domain.Message) (*domain.Message, error) {
	query := `
		UPDATE messages
		SET content = $1, is_edited = $2, edited_at = $3
		WHERE id = $4 AND sender_id = $5
		RETURNING conversation_id, created_at, updated_at
	`
	err := r.db.QueryRow(ctx, query, message.Content, message.IsEdited, message.EditedAt, message.ID, message.SenderID).Scan(&message.ConversationID, &message.CreatedAt, &message.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("message not found or user not authorized")
		}
		return nil, fmt.Errorf("failed to update message: %w", err)
	}

	// Invalidate conversation cache
	cacheKey := fmt.Sprintf("conversation:%s", message.ConversationID)
	r.redis.Del(ctx, cacheKey)

	return message, nil
}

func (r *MessagingRepository) DeleteMessage(ctx context.Context, messageID, userID string) error {
	var conversationID string
	query := `
		UPDATE messages
		SET is_deleted = TRUE, deleted_at = NOW()
		WHERE id = $1 AND sender_id = $2
		RETURNING conversation_id
	`
	err := r.db.QueryRow(ctx, query, messageID, userID).Scan(&conversationID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("message not found or user not authorized")
		}
		return fmt.Errorf("failed to delete message: %w", err)
	}

	// Invalidate conversation cache
	cacheKey := fmt.Sprintf("conversation:%s", conversationID)
	r.redis.Del(ctx, cacheKey)

	return nil
}

func (r *MessagingRepository) GetParticipantIDs(ctx context.Context, conversationID string) ([]string, error) {
	query := `
		SELECT user_id FROM conversation_participants WHERE conversation_id = $1
	`
	rows, err := r.db.Query(ctx, query, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, userID)
	}

	return userIDs, nil
}

func (r *MessagingRepository) GetMessageByID(ctx context.Context, messageID string) (*domain.Message, error) {
	query := `
		SELECT id, conversation_id, sender_id, content, message_type, created_at, is_edited, edited_at, is_deleted, deleted_at
		FROM messages
		WHERE id = $1
	`
	row := r.db.QueryRow(ctx, query, messageID)
	var message domain.Message

	err := row.Scan(
		&message.ID, &message.ConversationID, &message.SenderID, &message.Content,
		&message.MessageType, &message.CreatedAt, &message.IsEdited, &message.EditedAt,
		&message.IsDeleted, &message.DeletedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("message not found")
		}
		return nil, err
	}

	return &message, nil
}

func (r *MessagingRepository) GetTotalUnreadMessageCount(ctx context.Context, userID string) (int, error) {
	// 1. Try to get from cache
	cacheKey := fmt.Sprintf("user:%s:unread_count", userID)
	val, err := r.redis.Get(ctx, cacheKey).Result()
	var count int

	if err == nil {
		if _, err := fmt.Sscan(val, &count); err == nil {
			return count, nil
		}
	}

	// 2. Cache miss, get from DB
	query := `
		SELECT COALESCE(SUM(unread_count), 0) FROM conversation_participants WHERE user_id = $1
	`
	var totalUnread int
	err = r.db.QueryRow(ctx, query, userID).Scan(&totalUnread)
	if err != nil {
		return 0, fmt.Errorf("failed to get total unread message count: %w", err)
	}

	// 3. Populate cache
	r.redis.Set(ctx, cacheKey, totalUnread, 10*time.Minute)

	return totalUnread, nil
}

func (r *MessagingRepository) CreateMessage(ctx context.Context, message *domain.Message) (*domain.Message, error) {
	query := `
		INSERT INTO messages (id, conversation_id, sender_id, content, message_type)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`
	err := r.db.QueryRow(ctx, query, message.ID, message.ConversationID, message.SenderID, message.Content, message.MessageType).Scan(&message.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert message: %w", err)
	}

	// Increment unread count for other participants
	updateUnreadCountQuery := `
		UPDATE conversation_participants
		SET unread_count = unread_count + 1
		WHERE conversation_id = $1 AND user_id != $2
	`
	_, err = r.db.Exec(ctx, updateUnreadCountQuery, message.ConversationID, message.SenderID)
	if err != nil {
		// Log this error, but don't fail the message creation
		fmt.Printf("Warning: Failed to update unread count for conversation %s: %v\n", message.ConversationID, err)
	}

	// Update conversation's updated_at timestamp
	updateConversationQuery := `
		UPDATE conversations
		SET updated_at = NOW()
		WHERE id = $1
	`
	_, err = r.db.Exec(ctx, updateConversationQuery, message.ConversationID)
	if err != nil {
		// Log this error, but don't fail the message creation
		fmt.Printf("Warning: Failed to update conversation updated_at for %s: %v\n", message.ConversationID, err)
	}

	// Invalidate unread count cache for each participant
	participantIDs, err := r.GetParticipantIDs(ctx, message.ConversationID)
	if err == nil {
		for _, userID := range participantIDs {
			cacheKey := fmt.Sprintf("user:%s:unread_count", userID)
			r.redis.Del(ctx, cacheKey)

			// Invalidate conversations cache for the user (first page)
			conversationsCacheKey := fmt.Sprintf("user:%s:conversations:1:10", userID) // Assuming page 1 and limit 10
			r.redis.Del(ctx, conversationsCacheKey)
		}
	}

	// Invalidate the specific conversation cache
	conversationCacheKey := fmt.Sprintf("conversation:%s", message.ConversationID)
	r.redis.Del(ctx, conversationCacheKey)

	// Invalidate messages cache for the conversation
	messagesCachePattern := fmt.Sprintf("conversation:%s:messages:*", message.ConversationID)
	keys, err := r.redis.Keys(ctx, messagesCachePattern).Result()
	if err == nil && len(keys) > 0 {
		r.redis.Del(ctx, keys...)
	}

	return message, nil
}

func (r *MessagingRepository) MarkConversationAsRead(ctx context.Context, conversationID, userID string) error {
	query := `
		UPDATE conversation_participants
		SET last_read_at = NOW(), unread_count = 0
		WHERE conversation_id = $1 AND user_id = $2
	`
	_, err := r.db.Exec(ctx, query, conversationID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark conversation as read: %w", err)
	}

	// Invalidate unread count cache for the user
	cacheKey := fmt.Sprintf("user:%s:unread_count", userID)
	r.redis.Del(ctx, cacheKey)

	// Invalidate conversations cache for the user (first page)
	conversationsCacheKey := fmt.Sprintf("user:%s:conversations:1:10", userID) // Assuming page 1 and limit 10
	r.redis.Del(ctx, conversationsCacheKey)

	// Invalidate the specific conversation cache
	conversationCacheKey := fmt.Sprintf("conversation:%s", conversationID)
	r.redis.Del(ctx, conversationCacheKey)

	return nil
}
