package main

import (
	"log"
	"os"
	"strings"
	"time"

	permission_domain "github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/attendwise/backend/pkg/config"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// LoggingMiddleware logs requests and responses.
func LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		log.Printf("🔵 [REQUEST] %s %s", method, path)

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		log.Printf("🟢 [RESPONSE] %s %s - Status: %d - Duration: %v", method, path, status, latency)
	}
}

func registerRoutes(r *gin.Engine, userHandler *UserHandler, communityHandler *CommunityHandler, feedHandler *FeedHandler, eventHandler *EventHandler, mediaHandler *MediaHandler, messagingHandler *MessagingHandler, notificationHandler *NotificationHandler, checkinHandler *CheckinHandler, reportHandler *ReportHandler, searchHandler *SearchHandler, permissionService permission_domain.PermissionService, jwtSecret string, dbPool *pgxpool.Pool, cfg config.Config) {
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// CORS Middleware
	allowedOrigins := []string{cfg.FrontendURL} // Always allow the configured frontend URL

	// Add additional origins from environment variable if set
	if os.Getenv("CORS_ALLOWED_ORIGINS") != "" {
		additionalOrigins := strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",")
		allowedOrigins = append(allowedOrigins, additionalOrigins...)
	}

	log.Printf("CORS configured with allowed origins: %v", allowedOrigins)

	corsConfig := cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposeHeaders:    []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}

	router.Use(cors.New(corsConfig))

	r.Use(cors.New(config))
	r.Use(LoggingMiddleware())
	r.SetTrustedProxies(nil)

	apiV1 := r.Group("/api/v1")
	{
		// Public search endpoints
		searchPublic := apiV1.Group("/search")
		{
			searchPublic.GET("", searchHandler.Search)
			searchPublic.GET("/users", searchHandler.SearchUsers)
			searchPublic.GET("/communities", searchHandler.SearchCommunities)
		}

		auth := apiV1.Group("/auth")
		{
			auth.POST("/login", userHandler.Login)
			auth.POST("/register", userHandler.Register)
			auth.GET("/google/login", userHandler.GoogleLogin)
			auth.GET("/google/callback", userHandler.GoogleCallback)
		}

		media := apiV1.Group("/media")
		{
			media.POST("/upload", mediaHandler.UploadFile)
		}

		// Publicly accessible endpoints
		// apiV1.GET("/events", eventHandler.ListEvents) // Moved to authenticated routes
		apiV1.POST("/checkin", checkinHandler.VerifyCheckin)

		// Authenticated routes
		authRequired := apiV1.Group("/")
		authRequired.Use(authMiddleware(jwtSecret))
		{
			authRequired.GET("/feed", feedHandler.GetFeed)                  // News feed route
			authRequired.GET("/feed/activity", feedHandler.GetActivityFeed) // Activity feed route

			authRequired.POST("/checkin/manual-override", checkinHandler.ManualOverride)
			authRequired.POST("/checkin/sync", checkinHandler.SyncOfflineCheckins)

			authRequired.POST("/events/:id/registrations", eventHandler.RegisterForEvent)
			authRequired.DELETE("/events/:id/registrations/:registrationID", eventHandler.CancelRegistration)

			users := authRequired.Group("/users")
			{
				users.GET("", userHandler.GetUsers)           // This will handle GET /api/v1/users
				users.GET("/gds-check", userHandler.CheckGDS) // GDS check route
				users.GET("/suggestions", userHandler.GetUserSuggestions)
				users.GET("/me", userHandler.GetProfile)
				users.PATCH("/me", userHandler.UpdateProfile)
				users.POST("/me/enroll-face", userHandler.EnrollFaceForAuthentication)
				users.GET("/enroll-challenge", userHandler.LivenessChallenge) // Restored route, now points to the real liveness challenge handler
				users.POST("/:id/ban", userHandler.BanUser)
				users.POST("/:id/follow", userHandler.FollowUser)
				users.DELETE("/:id/follow", userHandler.UnfollowUser)
				users.GET("/me/registrations", eventHandler.ListMyRegistrations)
				users.GET("/:id", userHandler.GetUserByID)
				users.GET("/:id/relationship", userHandler.GetUserRelationship) // New route for user relationship
				users.POST("/change-password", userHandler.ChangePassword)

				// User Profile Enhancement Routes
				users.POST("/:id/experience", userHandler.AddExperience)
				users.PUT("/:id/experience/:exp_id", userHandler.UpdateExperience)
				users.DELETE("/:id/experience/:exp_id", userHandler.DeleteExperience)
				users.GET("/:id/experience", userHandler.GetExperience)

				users.POST("/:id/education", userHandler.AddEducation)
				users.PUT("/:id/education/:edu_id", userHandler.UpdateEducation)
				users.DELETE("/:id/education/:edu_id", userHandler.DeleteEducation)
				users.GET("/:id/education", userHandler.GetEducation)

				users.POST("/:id/skills", userHandler.AddSkill)
				users.DELETE("/:id/skills/:skill_id", userHandler.DeleteSkill)
				users.GET("/:id/skills", userHandler.GetSkills)
				users.POST("/:id/skills/:skill_id/endorse", userHandler.EndorseSkill)
				users.DELETE("/:id/skills/:skill_id/endorse", userHandler.RemoveEndorsement)

				// Friend Requests & Friends
				users.POST("/:id/friend-request", userHandler.SendFriendRequest)
				users.POST("/:id/friend-request/accept", userHandler.AcceptFriendRequest)
				users.POST("/:id/friend-request/reject", userHandler.RejectFriendRequest)
				users.DELETE("/:id/friends", userHandler.Unfriend)
				users.GET("/:id/friends", userHandler.ListFriends)
			}

			search := authRequired.Group("/search")
			{
				search.GET("/events", searchHandler.SearchEvents)
			}

			authRequired.GET("/my-communities", communityHandler.ListUserCommunities)

			// Global feed posts
			authRequired.GET("/feed/posts", feedHandler.ListGlobalPosts)
			authRequired.POST("/feed/posts", feedHandler.CreatePost)

			communities := authRequired.Group("/communities")
			communities.GET("/suggestions", communityHandler.SuggestCommunities)
			communities.GET("", communityHandler.ListCommunities)
			communities.POST("", communityHandler.CreateCommunity)
			communities.GET("/:id", communityHandler.GetCommunity)
			communities.GET("/:id/member-previews", communityHandler.ListMemberPreviews)
			communities.PATCH("/:id", communityAdminMiddleware(permissionService), communityHandler.UpdateCommunity)
			communities.DELETE("/:id", communityAdminMiddleware(permissionService), communityHandler.DeleteCommunity)
			communities.POST("/:id/members", communityHandler.JoinCommunity)
			communities.DELETE("/:id/members/me", communityHandler.LeaveCommunity)
			communities.PATCH("/:id/members/:userId", communityHandler.UpdateMemberRole)
			communities.DELETE("/:id/members/:userId", communityHandler.RemoveMember)
			communities.GET("/:id/members", communityHandler.ListMembers)

			communities.GET("/:id/members/pending", communityHandler.ListPendingMembers)
			communities.POST("/:id/members/:userId/approve", communityHandler.ApproveMember)
			communities.POST("/:id/posts", communityHandler.CreatePost)
			communities.GET("/:id/posts", communityHandler.ListPosts)
			communities.GET("/:id/posts/user/:userId", communityHandler.GetUserPostsInCommunity)

			communities.POST("/:id/invites", communityHandler.InviteMember)          // New route for inviting members
			communities.GET("/invites/:token/accept", communityHandler.AcceptInvite) // New public route for accepting invites

			communities.POST("/:id/follow-test", communityHandler.FollowTest) // Debugging route
			communities.POST("/:id/polls", communityHandler.CreatePoll)
		}
		posts := authRequired.Group("/posts")
		{
			posts.GET("/:postID", communityHandler.GetPost)
			posts.PATCH("/:postID", communityHandler.UpdatePost)
			posts.DELETE("/:postID", communityHandler.DeletePost)
			posts.POST("/:postID/comments", communityHandler.CreateComment)
			posts.GET("/:postID/comments", communityHandler.ListComments)
			posts.POST("/:postID/approve", communityHandler.ApprovePost)
			posts.POST("/:postID/reject", communityHandler.RejectPost)
			posts.POST("/:postID/reactions", communityHandler.ReactToPost)
			posts.DELETE("/:postID/reactions", communityHandler.DeleteReaction)
			posts.POST("/:postID/pin", communityHandler.PinPost)
			posts.GET("/:postID/reactions", communityHandler.GetReactions)
			posts.GET("/:postID/recommendations", communityHandler.GetRecommendedPosts)
			posts.POST("/:postID/poll/vote/:optionID", communityHandler.VotePoll)
		}

		comments := authRequired.Group("/comments")
		{
			comments.PATCH("/:commentID", communityHandler.UpdateComment)
			comments.DELETE("/:commentID", communityHandler.DeleteComment)
			comments.POST("/:commentID/approve", communityHandler.ApproveComment)
			comments.POST("/:commentID/reject", communityHandler.RejectComment)
		}

		events := authRequired.Group("/events")
		{
			events.POST("", eventHandler.CreateEvent)
			events.GET("/my-events", eventHandler.ListMyAccessibleEvents) // New restricted endpoint
			events.GET("/by-community/:id", eventHandler.ListEventsByCommunity)
			events.POST("/:id/sessions/:sessionID/ticket", checkinHandler.GenerateTicketAndQR)
			events.GET("/:id/attendance/summary", eventHandler.GetEventAttendanceSummary)
			events.GET("/:id/attendance/attendees", eventHandler.GetEventAttendees)
			events.GET("/:id", eventHandler.GetEvent)
			events.PATCH("/:id", eventHandler.UpdateEvent)
			events.POST("/:id/whitelist", eventHandler.AddUsersToWhitelist)
			events.GET("/:id/sessions", eventHandler.GetEventSessions)
			events.GET("/sessions/:id", eventHandler.GetEventSessionByID)
			events.GET("/:id/registrations/pending", eventHandler.ListPendingRegistrations)
			events.POST("/:id/registrations/:registrationID/approve", eventHandler.ApproveRegistration)
			events.DELETE("/:id", eventHandler.DeleteEvent)
			events.DELETE("/:id/hard", eventHandler.HardDeleteEvent)
			events.POST("/sessions/:id/cancel", eventHandler.CancelEventSession)
		}

		messages := authRequired.Group("/messages")
		{
			messages.PATCH("/:id", messagingHandler.UpdateMessage)
			messages.DELETE("/:id", messagingHandler.DeleteMessage)
		}

		messaging := authRequired.Group("/conversations")
		{
			messaging.POST("", messagingHandler.CreateConversation)
			messaging.GET("", messagingHandler.GetUserConversations)
			messaging.GET("/:id", messagingHandler.GetConversation)
			messaging.POST("/:id/read", messagingHandler.MarkConversationAsRead)
			messaging.POST("/:id/messages", messagingHandler.SendMessage)
			messaging.GET("/:id/messages", messagingHandler.GetMessages)
			messaging.GET("/unread-count", messagingHandler.GetTotalUnreadMessageCount) // New route
		}

		notifications := authRequired.Group("/notifications")
		{
			notifications.GET("", notificationHandler.GetNotifications)
			notifications.POST("/:id/read", notificationHandler.MarkNotificationAsRead)
			notifications.POST("/read-all", notificationHandler.MarkAllNotificationsAsRead)
			notifications.DELETE("/:id", notificationHandler.DeleteNotification)
			notifications.GET("/preferences", notificationHandler.GetNotificationPreferences)
			notifications.PUT("/preferences", notificationHandler.UpdateNotificationPreferences)
		}

		reports := authRequired.Group("/reports")
		{
			reports.GET("/sessions/:sessionId/attendees-details", reportHandler.GetSessionAttendanceDetails) // New route for dashboard
			reports.GET("/events/:id/attendance", reportHandler.GetEventAttendanceReport)
			reports.GET("/events/:id/attendance.csv", reportHandler.ExportEventAttendanceReportCSV)
			reports.GET("/events/:id/attendance.pdf", reportHandler.ExportEventAttendanceReportPDF)
			reports.GET("/summary/monthly", reportHandler.GetMonthlySummary)
			reports.GET("/communities/:id/engagement", reportHandler.GetCommunityEngagementReport)
		}
	}
}
