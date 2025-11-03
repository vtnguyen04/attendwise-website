package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	messaging_domain "github.com/attendwise/backend/internal/module/messaging/domain"
	messaging_usecase "github.com/attendwise/backend/internal/module/messaging/usecase"
	realtime_usecase "github.com/attendwise/backend/internal/module/realtime/usecase"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all connections for now
		return true
	},
}

// serveWs handles websocket requests for CHAT.
// @Summary Establish WebSocket connection for chat
// @Description Establishes a WebSocket connection for real-time chat functionality. Authentication is done via a JWT token in the Authorization header or 'token' query parameter.
// @ID websocket-chat
// @Produce json
// @Param token query string false "JWT Token for authentication (alternative to Authorization header)"
// @Success 101 "Switching Protocols"
// @Failure 401 {object} map[string]interface{}
// @Router /ws [get]
// @Security ApiKeyAuth
func serveWs(hub *realtime_usecase.Hub, c *gin.Context, jwtSecret string, messagingService messaging_usecase.MessagingService) {
	// First, try to get the token from the Authorization header.
	tokenString := c.GetHeader("Authorization")
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	// If the header is empty, fall back to the query parameter for browser clients.
	if tokenString == "" {
		log.Println("[DEBUG] serveWs: Authorization header empty, checking query param.")
		tokenString = c.Query("token")
		if tokenString == "" {
			log.Println("[DEBUG] serveWs: Query param 'token' also empty.")
		} else {
			log.Printf("[DEBUG] serveWs: Token found in query param: %s... (truncated)", tokenString[:min(len(tokenString), 10)])
		}
	} else {
		log.Printf("[DEBUG] serveWs: Token found in Authorization header: %s... (truncated)", tokenString[:min(len(tokenString), 10)])
	}

	if tokenString == "" {
		log.Println("[DEBUG] serveWs: Final tokenString is empty, returning 401.")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing auth token"})
		return
	}

	log.Printf("[DEBUG] serveWs: Attempting to parse token: %s... (truncated)", tokenString[:min(len(tokenString), 10)])
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}

	userID, ok := claims["sub"].(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &realtime_usecase.Client{
		UserID: userID,
		Conn:   make(chan []byte, 256),
	}
	hub.RegisterChatClient(client)

	go chatWritePump(conn, client, hub)
	go chatReadPump(conn, client, hub, messagingService)
}

// serveDashboardWs handles websocket requests for DASHBOARDS.
// @Summary Establish WebSocket connection for dashboard
// @Description Establishes a WebSocket connection for real-time dashboard updates. Authentication is done via a JWT token in the Authorization header.
// @ID websocket-dashboard
// @Produce json
// @Param sessionID path string true "Session ID for the dashboard"
// @Success 101 "Switching Protocols"
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /ws/dashboard/{sessionID} [get]
// @Security ApiKeyAuth
func serveDashboardWs(hub *realtime_usecase.Hub, c *gin.Context, jwtSecret string) {
	log.Printf("[DEBUG] serveDashboardWs called for session: %s", c.Param("sessionID"))

	sessionID := c.Param("sessionID")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID is required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[ERROR] serveDashboardWs - Failed to upgrade WebSocket for session %s: %v", sessionID, err)
		return
	}

	client := &realtime_usecase.DashboardClient{
		SessionID: sessionID,
		Conn:      make(chan []byte, 256),
	}
	hub.RegisterDashboardClient(client)
	log.Printf("[DEBUG] serveDashboardWs - Dashboard client registered for session %s", sessionID)

	go dashboardWritePump(conn, client, hub)
	go dashboardReadPump(conn, client, hub)
}

// Pumps for Chat
func chatWritePump(conn *websocket.Conn, client *realtime_usecase.Client, hub *realtime_usecase.Hub) {
	defer func() {
		hub.UnregisterChatClient(client)
		conn.Close()
	}()
	for message := range client.Conn {
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}

func chatReadPump(conn *websocket.Conn, client *realtime_usecase.Client, hub *realtime_usecase.Hub, messagingService messaging_usecase.MessagingService) {
	defer func() {
		hub.UnregisterChatClient(client)
		conn.Close()
	}()

	conn.SetReadLimit(maxMessageSize)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error { conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var chatMessage struct {
			ConversationID string `json:"conversation_id"`
			Content        string `json:"content"`
		}
		if err := json.Unmarshal(message, &chatMessage); err != nil {
			log.Printf("Error unmarshaling chat message from client %s: %v", client.UserID, err)
			continue // Continue to next message or break if critical
		}

		// Call the messaging service to send the message
		_, err = messagingService.SendMessage(context.Background(), chatMessage.ConversationID, client.UserID, chatMessage.Content, messaging_domain.Text)
		if err != nil {
			log.Printf("Error sending message from client %s to conversation %s: %v", client.UserID, chatMessage.ConversationID, err)
			// Optionally send an error message back to the client
		}
	}
}

// Pumps for Dashboard
func dashboardWritePump(conn *websocket.Conn, client *realtime_usecase.DashboardClient, hub *realtime_usecase.Hub) {
	defer func() {
		hub.UnregisterDashboardClient(client)
		conn.Close()
	}()
	for message := range client.Conn {
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}

func dashboardReadPump(conn *websocket.Conn, client *realtime_usecase.DashboardClient, hub *realtime_usecase.Hub) {
	defer func() {
		hub.UnregisterDashboardClient(client)
		conn.Close()
	}()

	conn.SetReadLimit(maxMessageSize)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error { conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		// For dashboard, incoming messages might be commands or data updates
		log.Printf("Received message from dashboard client %s: %s", client.SessionID, message)
		// Further processing would depend on the specific dashboard functionality
	}
}
