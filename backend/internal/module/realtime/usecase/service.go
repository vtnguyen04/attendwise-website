package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"


	messaging_domain "github.com/attendwise/backend/internal/module/messaging/domain"
	"github.com/nats-io/nats.go"
)

// Client represents a single WebSocket client for CHAT.
type Client struct {
	UserID string
	Conn   chan []byte // Channel to send messages to the client
}

// DashboardClient represents a single WebSocket client for a SESSION DASHBOARD.
type DashboardClient struct {
	SessionID string
	Conn      chan []byte
}

// Hub maintains the set of active clients and broadcasts messages to them.
type Hub struct {
	// For Chat
	chatClients      map[*Client]bool
	conversations    map[string]map[*Client]bool
	notificationSubs map[*Client]*nats.Subscription // ADDED: To track user-specific notification subs
	onlineUsers      map[string]bool                // ADDED: To track online status of users
	typingEvents     chan TypingEvent               // ADDED: Channel for typing events
	register         chan *Client
	unregister       chan *Client

	// For Dashboards
	dashboardClients    map[*DashboardClient]bool
	dashboardSubs       map[*DashboardClient]*nats.Subscription
	registerDashboard   chan *DashboardClient
	unregisterDashboard chan *DashboardClient

	// Common
	broadcast     chan *nats.Msg
	mu            sync.RWMutex
	nc            *nats.Conn
	messagingRepo messaging_domain.MessagingRepository
}

type TypingEvent struct {
	ConversationID string `json:"conversation_id"`
	UserID         string `json:"user_id"`
	IsTyping       bool   `json:"is_typing"`
}

func NewHub(nc *nats.Conn, messagingRepo messaging_domain.MessagingRepository) *Hub {
	return &Hub{
		broadcast: make(chan *nats.Msg),
		// Chat
		register:         make(chan *Client),
		unregister:       make(chan *Client),
		conversations:    make(map[string]map[*Client]bool),
		chatClients:      make(map[*Client]bool),
		notificationSubs: make(map[*Client]*nats.Subscription), // ADDED
		onlineUsers:      make(map[string]bool),
		typingEvents:     make(chan TypingEvent),
		// Dashboard
		registerDashboard:   make(chan *DashboardClient),
		unregisterDashboard: make(chan *DashboardClient),
		dashboardClients:    make(map[*DashboardClient]bool),
		dashboardSubs:       make(map[*DashboardClient]*nats.Subscription),
		// Common
		nc:            nc,
		messagingRepo: messagingRepo,
	}
}

func (h *Hub) publishUserStatus(userID string, isOnline bool) {
	status := "offline"
	if isOnline {
		status = "online"
	}

	eventPayload := map[string]interface{}{
		"user_id":   userID,
		"status":    status,
		"timestamp": time.Now(),
	}
	msgData, err := json.Marshal(eventPayload)
	if err != nil {
		log.Printf("Error marshalling user status event for NATS: %v", err)
		return
	}

	subject := fmt.Sprintf("user.status.%s", userID)
	if err := h.nc.Publish(subject, msgData); err != nil {
		log.Printf("Error publishing user status event to NATS: %v", err)
	}
	log.Printf("Published user %s status: %s", userID, status)
}

// Register methods for different client types
func (h *Hub) RegisterChatClient(client *Client) {
	h.register <- client
}
func (h *Hub) RegisterDashboardClient(client *DashboardClient) {
	h.registerDashboard <- client
}

func (h *Hub) SubmitTypingEvent(event TypingEvent) {
	h.typingEvents <- event
}

// Unregister methods
func (h *Hub) UnregisterChatClient(client *Client) {
	h.unregister <- client
}
func (h *Hub) UnregisterDashboardClient(client *DashboardClient) {
	h.unregisterDashboard <- client
}

func (h *Hub) SubscribeToConversations() {
	// Subscribe to a wildcard subject for all CHAT conversations
	_, err := h.nc.Subscribe("chat.*", func(msg *nats.Msg) {
		log.Printf("Received NATS message on subject %s", msg.Subject)
		h.broadcast <- msg
	})
	if err != nil {
		log.Fatalf("Failed to subscribe to NATS subject 'chat.*': %v", err)
	}
	log.Println("Subscribed to NATS subject 'chat.*'")

	// Subscribe to a wildcard subject for message read events
	_, err = h.nc.Subscribe("message.read.*", func(msg *nats.Msg) {
		log.Printf("Received NATS message on subject %s", msg.Subject)
		h.broadcast <- msg
	})
	if err != nil {
		log.Fatalf("Failed to subscribe to NATS subject 'message.read.*': %v", err)
	}
	log.Println("Subscribed to NATS subject 'message.read.*'")

	// Subscribe to comment created events to notify clients about new comments.
	_, err = h.nc.Subscribe("comment.created.*", func(msg *nats.Msg) {
		log.Printf("Received NATS message on subject %s", msg.Subject)
		h.broadcast <- msg
	})
	if err != nil {
		log.Fatalf("Failed to subscribe to NATS subject 'comment.created.*': %v", err)
	}
	log.Printf("Subscribed to NATS subject 'comment.created.*'")

	// Subscribe to a wildcard subject for user status updates
	_, err = h.nc.Subscribe("user.status.*", func(msg *nats.Msg) {
		log.Printf("Received NATS message on subject %s", msg.Subject)
		h.broadcast <- msg
	})
	if err != nil {
		log.Fatalf("Failed to subscribe to NATS subject 'user.status.*': %v", err)
	}
	log.Println("Subscribed to NATS subject 'user.status.*'")
}

func (h *Hub) Run() {
	for {
		select {
		// --- Chat Client Logic ---
		case client := <-h.register:
			h.mu.Lock()
			h.chatClients[client] = true
			// Set user as online and publish status
			if !h.onlineUsers[client.UserID] {
				h.onlineUsers[client.UserID] = true
				h.publishUserStatus(client.UserID, true)
			}

			// Add client to all their conversation rooms
			convos, err := h.messagingRepo.GetConversationsByUserID(context.Background(), client.UserID, 1, 1000)
			if err != nil {
				log.Printf("Error fetching conversations for user %s: %v", client.UserID, err)
			} else {
				for _, convo := range convos {
					if h.conversations[convo.ID] == nil {
						h.conversations[convo.ID] = make(map[*Client]bool)
					}
					h.conversations[convo.ID][client] = true
				}
			}

			// ADDED: Subscribe to user-specific notification events
			notificationSubject := fmt.Sprintf("notifications.%s", client.UserID)
			notiSub, err := h.nc.Subscribe(notificationSubject, func(msg *nats.Msg) {
				log.Printf("Received user notification for %s on subject %s", client.UserID, msg.Subject)
				select {
				case client.Conn <- msg.Data:
				default:
					log.Printf("[WARN] Hub user notification channel for user %s blocked, unregistering.", client.UserID)
					h.unregister <- client
				}
			})
			if err != nil {
				log.Printf("Failed to subscribe to user notifications for %s: %v", client.UserID, err)
			} else {
				h.notificationSubs[client] = notiSub
				log.Printf("Client for user %s subscribed to notifications on %s", client.UserID, notificationSubject)
			}

			h.mu.Unlock()
			log.Printf("Chat client for user %s registered", client.UserID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.chatClients[client]; ok {
				// Unsubscribe from user-specific notifications
				if sub, ok := h.notificationSubs[client]; ok {
					sub.Unsubscribe()
					delete(h.notificationSubs, client)
					log.Printf("Client for user %s unsubscribed from notifications", client.UserID)
				}

				delete(h.chatClients, client)
				for convoID := range h.conversations {
					delete(h.conversations[convoID], client)
				}
				close(client.Conn)

				// Check if user has any other active connections
				stillOnline := false
				for c := range h.chatClients {
					if c.UserID == client.UserID {
						stillOnline = true
						break
					}
				}
				// If no other connections, set user as offline and publish status
				if !stillOnline && h.onlineUsers[client.UserID] {
					delete(h.onlineUsers, client.UserID)
					h.publishUserStatus(client.UserID, false)
				}
			}
			h.mu.Unlock()
			log.Printf("Chat client for user %s unregistered", client.UserID)

		// --- Dashboard Client Logic ---
		case client := <-h.registerDashboard:
			h.mu.Lock()
			h.dashboardClients[client] = true
			subject := fmt.Sprintf("checkin.updates.%s", client.SessionID)
			sub, err := h.nc.Subscribe(subject, func(msg *nats.Msg) {
				log.Printf("[DEBUG] Hub received NATS checkin update for session %s: %s", client.SessionID, string(msg.Data))
				select {
				case client.Conn <- msg.Data:
					log.Printf("[DEBUG] Hub successfully sent checkin update to client for session %s", client.SessionID)
				default:
					log.Printf("[WARN] Hub client channel for session %s blocked, unregistering.", client.SessionID)
					h.unregisterDashboard <- client
				}
			})
			if err != nil {
				log.Printf("Failed to subscribe to dashboard subject %s: %v", subject, err)
				delete(h.dashboardClients, client)
				close(client.Conn)
			} else {
				h.dashboardSubs[client] = sub
				log.Printf("Dashboard client subscribed to %s", subject)
			}
			h.mu.Unlock()

		case client := <-h.unregisterDashboard:
			h.mu.Lock()
			if sub, ok := h.dashboardSubs[client]; ok {
				sub.Unsubscribe()
				delete(h.dashboardSubs, client)
			}
			if _, ok := h.dashboardClients[client]; ok {
				delete(h.dashboardClients, client)
				close(client.Conn)
			}
			h.mu.Unlock()
			log.Printf("Dashboard client for session %s unregistered", client.SessionID)

		// --- Message Broadcasting for Chat and Read Events ---
		case msg := <-h.broadcast:
			log.Printf("[DEBUG] Hub received NATS message on subject: %s", msg.Subject)

			if strings.HasPrefix(msg.Subject, "chat.") {
				conversationID := strings.TrimPrefix(msg.Subject, "chat.")

				conversation, err := h.messagingRepo.GetConversationByID(context.Background(), conversationID)
				if err != nil {
					log.Printf("[WARN] Hub failed to fetch conversation %s for chat broadcast: %v", conversationID, err)
				} else {
					participantLookup := make(map[string]struct{}, len(conversation.Participants))
					for _, participant := range conversation.Participants {
						participantLookup[participant.UserID] = struct{}{}
					}

					h.mu.Lock()
					if h.conversations[conversationID] == nil {
						h.conversations[conversationID] = make(map[*Client]bool)
					}
					for client := range h.chatClients {
						if _, ok := participantLookup[client.UserID]; ok {
							h.conversations[conversationID][client] = true
						}
					}
					h.mu.Unlock()
				}

				h.mu.RLock()
				if clientsInConvo, ok := h.conversations[conversationID]; ok {
					log.Printf("[DEBUG] Hub found %d clients in conversation %s", len(clientsInConvo), conversationID)
					for client := range clientsInConvo {
						select {
						case client.Conn <- msg.Data:
							log.Printf("[DEBUG] Hub successfully sent chat message to user %s", client.UserID)
						default:
							log.Printf("[WARN] Hub chat client channel for user %s blocked, unregistering.", client.UserID)
							h.unregister <- client
						}
					}
				}
				h.mu.RUnlock()
			} else if strings.HasPrefix(msg.Subject, "message.read.") {
				conversationID := strings.TrimPrefix(msg.Subject, "message.read.")
				h.mu.RLock()
				if clientsInConvo, ok := h.conversations[conversationID]; ok {
					log.Printf("[DEBUG] Hub found %d clients in conversation %s for read update", len(clientsInConvo), conversationID)
					for client := range clientsInConvo {
						select {
						case client.Conn <- msg.Data:
							log.Printf("[DEBUG] Hub successfully sent read update to user %s", client.UserID)
						default:
							log.Printf("[WARN] Hub chat client channel for user %s blocked, unregistering.", client.UserID)
							h.unregister <- client
						}
					}
				}
				h.mu.RUnlock()
			} else if strings.HasPrefix(msg.Subject, "comment.created.") {
				// Broadcast comment events to all connected chat clients.
				var payload map[string]interface{}
				if err := json.Unmarshal(msg.Data, &payload); err != nil {
					log.Printf("[ERROR] Hub failed to unmarshal comment event: %v", err)
					continue
				}

				comment, ok := payload["comment"].(map[string]interface{})
				if !ok {
					log.Printf("[ERROR] Hub failed to extract comment from payload: %v", payload)
					continue
				}

				wrappedMsg := map[string]interface{}{
					"type":    "new_comment",
					"comment": comment,
				}

				wrappedData, err := json.Marshal(wrappedMsg)
				if err != nil {
					log.Printf("[ERROR] Hub failed to marshal wrapped comment event: %v", err)
					continue
				}

				h.mu.RLock()
				for client := range h.chatClients {
					select {
					case client.Conn <- wrappedData:
						log.Printf("[DEBUG] Hub sent comment event to user %s", client.UserID)
					default:
						log.Printf("[WARN] Hub chat client channel for user %s blocked during comment broadcast, unregistering.", client.UserID)
						h.unregister <- client
					}
				}
				h.mu.RUnlock()
			} else if strings.HasPrefix(msg.Subject, "user.status.") {
				// Broadcast user status updates to all connected chat clients
				h.mu.RLock()
				for client := range h.chatClients {
					select {
					case client.Conn <- msg.Data:
						log.Printf("[DEBUG] Hub sent user status update to user %s", client.UserID)
					default:
						log.Printf("[WARN] Hub chat client channel for user %s blocked during status broadcast, unregistering.", client.UserID)
						h.unregister <- client
					}
				}
				h.mu.RUnlock()
			}
		case typingEvent := <-h.typingEvents:
			// Marshal the typing event to JSON
			payload := map[string]interface{}{
				"type":            "typing_event",
				"conversation_id": typingEvent.ConversationID,
				"user_id":         typingEvent.UserID,
				"is_typing":       typingEvent.IsTyping,
			}
			msgData, err := json.Marshal(payload)
			if err != nil {
				log.Printf("Error marshalling typing event for broadcast: %v", err)
				continue
			}

			// Broadcast to clients in the conversation
			h.mu.RLock()
			if clientsInConvo, ok := h.conversations[typingEvent.ConversationID]; ok {
				for client := range clientsInConvo {
					// Don't send typing event back to the sender
					if client.UserID == typingEvent.UserID {
						continue
					}
					select {
					case client.Conn <- msgData:
						log.Printf("[DEBUG] Hub sent typing event to user %s for conversation %s", client.UserID, typingEvent.ConversationID)
					default:
						log.Printf("[WARN] Hub chat client channel for user %s blocked during typing broadcast, unregistering.", client.UserID)
						h.unregister <- client
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}
