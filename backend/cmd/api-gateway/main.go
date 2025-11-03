package main

// @title Attendwise API
// @version 1.0
// @description This is the API documentation for the Attendwise application.
// @host {{.Host}}
// @BasePath /api/v1
// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization
import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/attendwise/backend/docs"
	checkin_postgres "github.com/attendwise/backend/internal/module/checkin/adapter/repository/postgres"
	checkin_usecase "github.com/attendwise/backend/internal/module/checkin/usecase"
	community_neo4j "github.com/attendwise/backend/internal/module/community/adapter/repository/neo4j"
	community_postgres "github.com/attendwise/backend/internal/module/community/adapter/repository/postgres"
	"github.com/attendwise/backend/internal/module/community/domain"
	community_usecase "github.com/attendwise/backend/internal/module/community/usecase"
	event_postgres "github.com/attendwise/backend/internal/module/event/adapter/repository/postgres"
	event_usecase "github.com/attendwise/backend/internal/module/event/usecase"
	feed_postgres "github.com/attendwise/backend/internal/module/feed/adapter/repository/postgres"
	feed_usecase "github.com/attendwise/backend/internal/module/feed/usecase"
	"github.com/attendwise/backend/internal/module/media/adapter/storage"
	media_usecase "github.com/attendwise/backend/internal/module/media/usecase"
	messaging_postgres "github.com/attendwise/backend/internal/module/messaging/adapter/repository/postgres"
	messaging_usecase "github.com/attendwise/backend/internal/module/messaging/usecase"
	notification_postgres "github.com/attendwise/backend/internal/module/notification/adapter/repository/postgres"
	notification_usecase "github.com/attendwise/backend/internal/module/notification/usecase"
	permission_postgres "github.com/attendwise/backend/internal/module/permission/adapter/repository/postgres"
	permission_usecase "github.com/attendwise/backend/internal/module/permission/usecase"
	realtime_usecase "github.com/attendwise/backend/internal/module/realtime/usecase"
	report_postgres "github.com/attendwise/backend/internal/module/report/adapter/repository/postgres"
	report_domain "github.com/attendwise/backend/internal/module/report/domain"
	report_usecase "github.com/attendwise/backend/internal/module/report/usecase"
	search_postgres "github.com/attendwise/backend/internal/module/search/adapter/repository/postgres"
	search_usecase "github.com/attendwise/backend/internal/module/search/usecase"
	user_neo4j "github.com/attendwise/backend/internal/module/user/adapter/repository/neo4j"
	user_postgres "github.com/attendwise/backend/internal/module/user/adapter/repository/postgres"
	user_usecase "github.com/attendwise/backend/internal/module/user/usecase"
	"github.com/attendwise/backend/internal/platform"
	"github.com/attendwise/backend/internal/platform/pubsub"
	"github.com/attendwise/backend/internal/worker"
	"github.com/attendwise/backend/pkg/cache"
	"github.com/attendwise/backend/pkg/config"
	"github.com/attendwise/backend/pkg/database"
	googleauth "github.com/attendwise/backend/pkg/googleauth"
	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/nats-io/nats.go"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("Application failed to start: %v", err)
	}
}

func run() error {
	log.Println("Starting the application...")
	f, err := os.OpenFile("backend_log.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("error opening file: %v", err)
	}
	defer f.Close()

	// log.SetOutput(f)
	// --- 1. Load Configuration ---
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("could not load config: %w", err)
	}

	if cfg.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is not set")
	}
	log.Printf("[config] JWT Secret: %s", cfg.JWTSecret)
	if cfg.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is not set")
	}
	var googleOAuthClient *googleauth.GoogleOAuthClient
	if cfg.GoogleClientID == "" || cfg.GoogleClientSecret == "" || cfg.GoogleRedirectURI == "" {
		log.Println("[WARN] Google OAuth is not fully configured. Google login will be disabled.")
	} else {
		googleOAuthClient = googleauth.NewGoogleOAuthClient(cfg.GoogleClientID, cfg.GoogleClientSecret)
	}
	grpcAIServiceAddr := cfg.GRPC_AI_SERVICE_ADDR

	// --- 2. Initialize Dependencies (Dependency Injection) ---
	ctx := context.Background()

	// --- Connections ---
	dbPool, err := database.NewPostgresPool(cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("unable to connect to database: %v", err)
	}

	// --- Run Migrations ---
	log.Println("Running database migrations...")
	migrationsPath := os.Getenv("MIGRATIONS_PATH")
	if migrationsPath == "" {
		migrationsPath = "file://migrations"
	}
	m, err := migrate.New(
		migrationsPath,
		cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("could not create migrate instance: %w", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("could not run migrations: %w", err)
	}
	log.Println("Database migrations completed.")

	nc, err := nats.Connect(cfg.NatsURL)
	if err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}

	neo4jDriver, err := database.NewNeo4jDriver(cfg.Neo4jURI, cfg.Neo4jUsername, cfg.Neo4jPassword)
	if err != nil {
		return fmt.Errorf("failed to connect to Neo4j: %w", err)
	}

	aiClient, err := platform.NewAIClient(grpcAIServiceAddr)
	if err != nil {
		return fmt.Errorf("failed to create AI client: %w", err)
	}

	redisClient, err := cache.NewRedisClient(ctx, cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("failed to connect to redis: %w", err)
	}
	log.Println("Successfully connected to Redis.")

	// --- Repositories ---
	userRepo := user_postgres.NewUserRepository(dbPool, redisClient)
	userGraphRepo := user_neo4j.NewUserGraphRepository(neo4jDriver)
	eventRepo := event_postgres.NewEventRepository(dbPool, redisClient) // Moved up
	communityRepo := community_postgres.NewCommunityRepository(dbPool, redisClient, eventRepo)
	activityRepo := community_postgres.NewActivityRepository(dbPool)
	feedRepo := feed_postgres.NewRepository(dbPool)
	neo4jRepo := community_neo4j.NewNeo4jCommunityRepository(neo4jDriver)
	messagingRepo := messaging_postgres.NewMessagingRepository(dbPool, redisClient)
	notificationRepo := notification_postgres.NewNotificationRepository(dbPool)
	checkinRepo := checkin_postgres.NewCheckinRepository(dbPool)
	reportRepo := report_postgres.NewReportRepository(dbPool)
	searchRepo := search_postgres.NewSearchRepository(dbPool)
	permissionRepo := permission_postgres.NewPermissionRepository(dbPool)

	// --- Services & Handlers ---

	// Realtime Hub (used by other services)
	hub := realtime_usecase.NewHub(nc, messagingRepo)
	go hub.Run()
	go hub.SubscribeToConversations()

	// Permission Module
	permissionService := permission_usecase.NewService(permissionRepo)

	// User Module
	userService := user_usecase.NewUserService(userRepo, userGraphRepo, neo4jRepo, aiClient, cfg.JWTSecret)
	userHandler := NewUserHandler(userService, googleOAuthClient, cfg.GoogleRedirectURI, redisClient, cfg)

	// Event Module
	natsPublisher := pubsub.NewNatsPublisher(nc)
	eventService := event_usecase.NewService(eventRepo, neo4jRepo, permissionService, natsPublisher)
	eventHandler := NewEventHandler(eventService)

	// Community Module
	var communityService domain.CommunityService = community_usecase.NewService(communityRepo, neo4jRepo, activityRepo, permissionService, eventService, nc)
	communityHandler := NewCommunityHandler(communityService)
	feedService := feed_usecase.NewService(communityRepo, eventRepo, feedRepo)
	feedHandler := NewFeedHandler(communityService, feedService)

	// Media Module
	var mediaStorage media_usecase.StorageProvider
	var mediaBaseURL string
	var mediaBucketName string // This might not be used by imgbb, but keep for interface compatibility

	// Temporarily disable MinIO and use Imgbb for media storage
	if cfg.ImgbbAPIKey == "" {
		return fmt.Errorf("IMGBB_API_KEY is not set. Cannot use Imgbb for media storage.")
	}
	log.Println("Using Imgbb for media storage.")
	imgbbStorage := storage.NewImgbbStorage(cfg.ImgbbAPIKey)
	mediaStorage = imgbbStorage
	mediaBaseURL = "https://i.ibb.co" // Base URL for imgbb images
	mediaBucketName = "" // Not applicable for imgbb

	// MinIO initialization (commented out)
	/*
		log.Println("Using MinIO for media storage.")
		minioStorage, err := storage.NewMinioStorage(cfg.MinioEndpoint, cfg.MinioAccessKeyID, cfg.MinioSecretAccessKey, cfg.MinioBaseURL, cfg.MinioUseSSL)
		if err != nil {
			return fmt.Errorf("failed to connect to minio: %w", err)
		}
		if err := minioStorage.EnsureBucketExists(ctx, cfg.MinioBucketName, ""); err != nil {
			return fmt.Errorf("failed to ensure minio bucket exists: %w", err)
		}
		mediaStorage = minioStorage
		mediaBaseURL = cfg.MinioBaseURL
		mediaBucketName = cfg.MinioBucketName
	*/

	mediaService := media_usecase.NewService(mediaStorage, mediaBucketName, mediaBaseURL)
	mediaHandler := NewMediaHandler(mediaService)

	// Messaging Module
	messagingService := messaging_usecase.NewService(messagingRepo, nc)
	messagingHandler := NewMessagingHandler(messagingService)

	// Notification Module
	notificationService := notification_usecase.NewService(notificationRepo, nc, userRepo)
	notificationHandler := NewNotificationHandler(notificationService)

	// Checkin Module
	checkinService := checkin_usecase.NewService(checkinRepo, eventRepo, userRepo, cfg.JWTSecret, aiClient, nc)
	checkinHandler := NewCheckinHandler(checkinService, cfg.JWTSecret)

	// Report Module
	var reportService report_domain.ReportService = report_usecase.NewReportService(reportRepo, permissionService)
	reportHandler := NewReportHandler(reportService)

	// Search Module
	searchService := search_usecase.NewSearchService(searchRepo)
	searchHandler := NewSearchHandler(searchService)

	// --- Background Workers ---
	notificationWorker := worker.NewNotificationWorker(eventRepo, notificationService, nc, userRepo, communityRepo, messagingRepo)
	go notificationWorker.Start()

	reportWorker := worker.NewReportWorker(dbPool)
	go reportWorker.Start()

	recurringEventWorker := worker.NewRecurringEventWorker(eventRepo)
	go recurringEventWorker.Start()

	spamWorker := worker.NewSpamDetectionWorker(userRepo, userGraphRepo)
	go spamWorker.Start()

	// --- 3. Setup Server & Routes ---
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// WebSocket routes must be handled before the main router group
	r.GET("/ws", func(c *gin.Context) {
		serveWs(hub, c, cfg.JWTSecret, messagingService)
	})
	r.GET("/ws/dashboard/:sessionID", func(c *gin.Context) {
		serveDashboardWs(hub, c, cfg.JWTSecret)
	})

	registerRoutes(r, userHandler, communityHandler, feedHandler, eventHandler, mediaHandler, messagingHandler, notificationHandler, checkinHandler, reportHandler, searchHandler, permissionService, cfg.JWTSecret, dbPool, cfg)

	// --- 4. Start Server ---
	apiPort := cfg.APIGatewayPort
	if apiPort == "" {
		apiPort = "8080"
	}
	log.Printf("API Gateway listening on port %s", apiPort)

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", apiPort),
		Handler: r,
	}

	// --- 5. Graceful Shutdown ---
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	// the requests it is currently handling
	ctx, _ = context.WithTimeout(context.Background(), 5*time.Second)

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")

	// Close database connections
	dbPool.Close()
	neo4jDriver.Close(ctx)
	nc.Close()

	log.Println("Application finished.")
	return nil
}
