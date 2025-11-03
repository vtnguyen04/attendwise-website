package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"database/sql"

	community_domain "github.com/attendwise/backend/internal/module/community/domain"
	event_domain "github.com/attendwise/backend/internal/module/event/domain"
	messaging_domain "github.com/attendwise/backend/internal/module/messaging/domain"
	notification_domain "github.com/attendwise/backend/internal/module/notification/domain"
	notification_usecase "github.com/attendwise/backend/internal/module/notification/usecase"
	user_domain "github.com/attendwise/backend/internal/module/user/domain"
	"github.com/nats-io/nats.go"
)

// NotificationWorker handles background jobs related to sending notifications.
type NotificationWorker struct {
	eventRepo           event_domain.EventRepository
	notificationService notification_usecase.NotificationService
	nc                  *nats.Conn
	userRepo            user_domain.UserRepository
	communityRepo       community_domain.CommunityRepository
	messagingRepo       messaging_domain.MessagingRepository
}

// NewNotificationWorker creates a new worker for notifications.
func NewNotificationWorker(eventRepo event_domain.EventRepository, notificationService notification_usecase.NotificationService, nc *nats.Conn, userRepo user_domain.UserRepository, communityRepo community_domain.CommunityRepository, messagingRepo messaging_domain.MessagingRepository) *NotificationWorker {
	return &NotificationWorker{
		eventRepo:           eventRepo,
		notificationService: notificationService,
		nc:                  nc,
		userRepo:            userRepo,
		communityRepo:       communityRepo,
		messagingRepo:       messagingRepo,
	}
}

// Start starts the worker's tickers and subscribers.
func (w *NotificationWorker) Start() {
	log.Println("Starting NotificationWorker...")
	// Run job for event reminders
	go w.startEventReminderScanner()

	// Subscribe to action-based events
	w.subscribeToActionEvents()
}

func (w *NotificationWorker) startEventReminderScanner() {
	// Run once on start, then every minute.
	go w.scanAndNotify()
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		go w.scanAndNotify()
	}
}

func (w *NotificationWorker) subscribeToActionEvents() {
	if w.nc == nil {
		log.Println("Warning: NATS connection is nil. Action-based notifications are disabled.")
		return
	}

	// Subscription for new comments
	_, err := w.nc.Subscribe("comment.created.*", w.handleCommentCreated)
	if err != nil {
		log.Printf("Error subscribing to 'comment.created.*': %v", err)
	}

	// Subscription for new community posts
	_, err = w.nc.Subscribe(community_domain.PostCreatedEventSubject, w.handlePostCreatedEvent)
	if err != nil {
		log.Printf("Error subscribing to '%s': %v", community_domain.PostCreatedEventSubject, err)
	}

	// Subscription for new community comments (from community module)
	_, err = w.nc.Subscribe(community_domain.CommentCreatedEventSubject, w.handleCommunityCommentCreatedEvent)
	if err != nil {
		log.Printf("Error subscribing to '%s': %v", community_domain.CommentCreatedEventSubject, err)
	}

	// Subscription for new reactions
	_, err = w.nc.Subscribe(community_domain.ReactionCreatedEventSubject, w.handleReactionCreatedEvent)
	if err != nil {
		log.Printf("Error subscribing to '%s': %v", community_domain.ReactionCreatedEventSubject, err)
	}

	// Subscription for new messages
	_, err = w.nc.Subscribe("chat.*", w.handleMessageCreated)
	if err != nil {
		log.Printf("Error subscribing to 'chat.*': %v", err)
	}

	log.Println("Subscribed to NATS subjects: comment.created, chat.*, community.post.created, community.comment.created, community.reaction.created")
}

func (w *NotificationWorker) handleMessageCreated(m *nats.Msg) {
	log.Printf("[DEBUG] Worker received message on subject: %s", m.Subject)

	var msg messaging_domain.Message
	if err := json.Unmarshal(m.Data, &msg); err != nil {
		log.Printf("[ERROR] Error unmarshalling chat message payload: %v", err)
		return
	}
	log.Printf("[DEBUG] Worker unmarshalled message payload: %+v", msg)

	// Get all participants in the conversation
	participants, err := w.messagingRepo.GetParticipantIDs(context.Background(), msg.ConversationID)
	if err != nil {
		log.Printf("[ERROR] Worker could not get participants for notification: %v", err)
		return
	}
	log.Printf("[DEBUG] Worker found participants: %v", participants)

	// Get sender details to show their name
	sender, err := w.userRepo.GetUserByID(context.Background(), msg.SenderID)
	if err != nil {
		log.Printf("[ERROR] Worker could not get sender details for notification: %v", err)
		return
	}
	log.Printf("[DEBUG] Worker found sender: %s", sender.Name)

	title := fmt.Sprintf("New message from %s", sender.Name)
	link := fmt.Sprintf("/dashboard/messages?conversationId=%s", msg.ConversationID)

	// Send a notification to each participant except the sender
	for _, userID := range participants {
		if userID == msg.SenderID {
			log.Printf("[DEBUG] Worker skipping notification for sender: %s", userID)
			continue
		}
		log.Printf("[DEBUG] Worker creating notification for user: %s", userID)
		_, err := w.notificationService.CreateNotification(context.Background(), userID, notification_domain.NewMessageNotification, title, msg.Content, link, sql.NullString{String: msg.SenderID, Valid: true}, sql.NullString{}, sql.NullString{}, sql.NullString{}, sql.NullString{String: msg.ConversationID, Valid: true})
		if err != nil {
			log.Printf("[ERROR] Worker failed to create message notification for user %s: %v", userID, err)
		}
	}
}

func (w *NotificationWorker) handleCommentCreated(m *nats.Msg) {
	log.Printf("[DEBUG] Worker received message on subject: %s", m.Subject)
	log.Printf("[DEBUG] Worker raw data: %s", string(m.Data))

	var payload struct {
		Comment           community_domain.Comment `json:"comment"`
		PostAuthorID      string                   `json:"post_author_id"`
		CommentAuthorName string                   `json:"comment_author_name"`
	}

	if err := json.Unmarshal(m.Data, &payload); err != nil {
		log.Printf("[ERROR] Error unmarshalling comment.created payload: %v", err)
		return
	}
	log.Printf("[DEBUG] Worker unmarshalled payload: %+v", payload)

	// Don't notify if someone comments on their own post
	if payload.Comment.AuthorID == payload.PostAuthorID {
		log.Printf("[DEBUG] Skipping self-notification for user: %s", payload.PostAuthorID)
		return
	}

	// Get post details to link back to it
	post, err := w.communityRepo.GetPostByID(context.Background(), payload.Comment.PostID, payload.PostAuthorID)
	if err != nil {
		log.Printf("[ERROR] Worker could not get post details for notification: %v", err)
		return
	}

	title := fmt.Sprintf("%s commented on your post", payload.CommentAuthorName)
	communitySegment := "feed"
	if post.CommunityID.Valid {
		communitySegment = post.CommunityID.String
	}
	link := fmt.Sprintf("/dashboard/communities/%s/posts/%s", communitySegment, post.ID)

	log.Printf("[DEBUG] Worker calling CreateNotification with UserID: %s, Title: %s, Link: %s", payload.PostAuthorID, title, link)
	_, err = w.notificationService.CreateNotification(context.Background(), payload.PostAuthorID, notification_domain.NewCommentNotification, title, payload.Comment.Content, link, sql.NullString{String: payload.Comment.AuthorID, Valid: true}, sql.NullString{String: post.ID, Valid: true}, sql.NullString{String: payload.Comment.ID, Valid: true}, sql.NullString{}, sql.NullString{})
	if err != nil {
		log.Printf("[ERROR] Worker failed to create notification: %v", err)
	}
	log.Printf("[DEBUG] Worker finished processing new comment notification for user: %s", payload.PostAuthorID)
}

func (w *NotificationWorker) handlePostCreatedEvent(m *nats.Msg) {
	log.Printf("[DEBUG] Worker received PostCreatedEvent on subject: %s", m.Subject)

	var event community_domain.PostCreatedEvent
	if err := json.Unmarshal(m.Data, &event); err != nil {
		log.Printf("[ERROR] Error unmarshalling PostCreatedEvent payload: %v", err)
		return
	}
	log.Printf("[DEBUG] Worker unmarshalled PostCreatedEvent payload: %+v", event)

	log.Printf("[DEBUG] handlePostCreatedEvent: Processing post %s by author %s in community %s", event.PostID, event.AuthorID, event.CommunityID)

	// Get all members of the community to send notifications
	members, err := w.communityRepo.GetCommunityMembers(context.Background(), event.CommunityID)
	if err != nil {
		log.Printf("[ERROR] Failed to get community members for PostCreatedEvent notification: %v", err)
		return
	}

	for _, member := range members {
		// Don't send notification to the author of the post
		if member.ID == event.AuthorID {
			continue
		}

		title := fmt.Sprintf("New post in %s", event.CommunityName)
		message := fmt.Sprintf("%s posted: %s", event.AuthorName, event.PostContent)
		link := fmt.Sprintf("/community/%s/post/%s", event.CommunityID, event.PostID)

		_, err := w.notificationService.CreateNotification(
			context.Background(),
			member.ID,
			notification_domain.NewPostNotification,
			title,
			message,
			link,
			sql.NullString{String: event.AuthorID, Valid: true},
			sql.NullString{String: event.PostID, Valid: true},
			sql.NullString{}, // No related comment ID
			sql.NullString{}, // No related event ID
			sql.NullString{}, // No related conversation ID
		)
		if err != nil {
			log.Printf("[ERROR] Failed to create new post notification for user %s: %v", member.ID, err)
		}
	}
	log.Printf("[DEBUG] Worker finished processing PostCreatedEvent for post: %s", event.PostID)
}

func (w *NotificationWorker) handleCommunityCommentCreatedEvent(m *nats.Msg) {
	log.Printf("[DEBUG] Worker received CommentCreatedEvent on subject: %s", m.Subject)

	var event community_domain.CommentCreatedEvent
	if err := json.Unmarshal(m.Data, &event); err != nil {
		log.Printf("[ERROR] Error unmarshalling CommentCreatedEvent payload: %v", err)
		return
	}
	log.Printf("[DEBUG] Worker unmarshalled CommentCreatedEvent payload: %+v", event)

	// Don't notify if someone comments on their own post
	if event.AuthorID == event.PostAuthorID {
		log.Printf("[DEBUG] Skipping self-notification for user: %s", event.PostAuthorID)
		return
	}

	// Notify post author
	var title string
	if event.CommunityName != "" {
		title = fmt.Sprintf("New comment on your post in %s", event.CommunityName)
	} else {
		title = "New comment on your post"
	}
	message := fmt.Sprintf("%s commented: %s", event.AuthorName, event.CommentContent)
	link := fmt.Sprintf("/community/%s/post/%s", event.CommunityID, event.PostID)

	_, err := w.notificationService.CreateNotification(
		context.Background(),
		event.PostAuthorID,
		notification_domain.NewCommentNotification,
		title,
		message,
		link,
		sql.NullString{String: event.AuthorID, Valid: true},
		sql.NullString{String: event.PostID, Valid: true},
		sql.NullString{String: event.CommentID, Valid: true},
		sql.NullString{}, // No related event ID
		sql.NullString{}, // No related conversation ID
	)
	if err != nil {
		log.Printf("[ERROR] Failed to create new comment notification for post author %s: %v", event.PostAuthorID, err)
	}

	// Notify other commenters on the same post
	// First, get all comments for the post to find other commenters
	comments, err := w.communityRepo.GetCommentsByPostID(context.Background(), event.PostID)
	if err != nil {
		log.Printf("[ERROR] Failed to get comments for other commenters notification: %v", err)
		return
	}

	notifiedUsers := make(map[string]bool)
	notifiedUsers[event.PostAuthorID] = true // Post author already notified
	notifiedUsers[event.AuthorID] = true     // Comment author should not be notified

	for _, comment := range comments {
		if _, alreadyNotified := notifiedUsers[comment.AuthorID]; !alreadyNotified {
			title = fmt.Sprintf("New comment on a post you commented on in %s", event.CommunityName)
			message = fmt.Sprintf("%s also commented: %s", event.AuthorName, event.CommentContent)
			link = fmt.Sprintf("/community/%s/post/%s", event.CommunityID, event.PostID)

			_, err := w.notificationService.CreateNotification(
				context.Background(),
				comment.AuthorID,
				notification_domain.NewCommentNotification,
				title,
				message,
				link,
				sql.NullString{String: event.AuthorID, Valid: true},
				sql.NullString{String: event.PostID, Valid: true},
				sql.NullString{String: event.CommentID, Valid: true},
				sql.NullString{}, // No related event ID
				sql.NullString{}, // No related conversation ID
			)
			if err != nil {
				log.Printf("[ERROR] Failed to create new comment notification for commenter %s: %v", comment.AuthorID, err)
			}
			notifiedUsers[comment.AuthorID] = true
		}
	}
	log.Printf("[DEBUG] Worker finished processing CommentCreatedEvent for comment: %s", event.CommentID)
}

func (w *NotificationWorker) handleReactionCreatedEvent(m *nats.Msg) {
	log.Printf("[DEBUG] Worker received ReactionCreatedEvent on subject: %s", m.Subject)

	var event community_domain.ReactionCreatedEvent
	if err := json.Unmarshal(m.Data, &event); err != nil {
		log.Printf("[ERROR] Error unmarshalling ReactionCreatedEvent payload: %v", err)
		return
	}
	log.Printf("[DEBUG] Worker unmarshalled ReactionCreatedEvent payload: %+v", event)

	log.Printf("[DEBUG] handleReactionCreatedEvent: Processing reaction %s by reactor %s on target %s (type %s)", event.ReactionID, event.ReactorID, event.TargetID, event.TargetType)

	// Don't notify if the reactor is the author of the target
	if event.ReactorID == event.TargetAuthorID {
		log.Printf("[DEBUG] Skipping self-notification for reaction by user: %s", event.ReactorID)
		return
	}

	title := fmt.Sprintf("%s reacted to your %s", event.ReactorName, event.TargetType)
	message := fmt.Sprintf("%s reacted %s to your %s", event.ReactorName, event.ReactionType, event.TargetType)
	link := fmt.Sprintf("/community/%s/%s/%s", event.CommunityID, event.TargetType, event.TargetID)

	_, err := w.notificationService.CreateNotification(
		context.Background(),
		event.TargetAuthorID,
		notification_domain.ReactionNotification,
		title,
		message,
		link,
		sql.NullString{String: event.ReactorID, Valid: true},
		sql.NullString{String: event.TargetID, Valid: true},
		sql.NullString{}, // RelatedCommentID (if target is post)
		sql.NullString{}, // No related event ID
		sql.NullString{}, // No related conversation ID
	)
	if err != nil {
		log.Printf("[ERROR] Failed to create reaction notification for user %s: %v", event.TargetAuthorID, err)
	}
	log.Printf("[DEBUG] Worker finished processing ReactionCreatedEvent for target: %s", event.TargetID)
}

func (w *NotificationWorker) scanAndNotify() {
	log.Println("Scanning for upcoming event sessions to send reminders...")
	ctx := context.Background()

	// Define reminder windows (e.g., 15 minutes and 24 hours)
	windows := []time.Duration{15 * time.Minute, 24 * time.Hour}

	for _, window := range windows {
		from := time.Now().Add(window)
		to := from.Add(1 * time.Minute) // Check in a 1-minute slice to avoid duplicate notifications

		sessions, err := w.eventRepo.GetUpcomingSessionsWithAttendees(ctx, from, to)
		if err != nil {
			log.Printf("Error getting upcoming sessions: %v", err)
			continue
		}

		for _, session := range sessions {
			title := fmt.Sprintf("Reminder: %s is starting soon!", session.EventName)
			message := fmt.Sprintf("Your session for '%s' is scheduled to start at %s.", session.EventName, session.StartTime.Format(time.Kitchen))
			link := fmt.Sprintf("/events/%s", session.EventID)

			for _, attendeeID := range session.AttendeeIDs {
				_, err := w.notificationService.CreateNotification(ctx, attendeeID, notification_domain.EventReminderNotification, title, message, link, sql.NullString{}, sql.NullString{}, sql.NullString{}, sql.NullString{String: session.EventID, Valid: true}, sql.NullString{})
				if err != nil {
					log.Printf("Error creating notification for user %s for session %s: %v", attendeeID, session.ID, err)
				}
			}
		}
	}
}
