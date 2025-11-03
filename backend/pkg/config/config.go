package config

import (
	"fmt"
	"log"
	"path/filepath"
	"runtime"
	"strings"

	// Import strconv for boolean to string conversion
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type Config struct {
	// API Gateway
	APIGatewayPort string

	// gRPC Ports
	UserGRPC_Port        string
	UploadGRPC_Port      string
	GRPC_AI_SERVICE_ADDR string

	// Database
	DatabaseURL string

	// Neo4j
	Neo4jURI      string
	Neo4jUsername string
	Neo4jPassword string

	// NATS
	NatsURL string

	// Redis
	RedisURL string

	// JWT
	JWTSecret string

	// MinIO
	// MinioEndpoint        string
	// MinioAccessKeyID     string
	// MinioSecretAccessKey string
	// MinioBucketName      string
	// MinioUseSSL          bool
	// MinioBaseURL         string

	// Imgbb
	ImgbbAPIKey string

	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURI  string
	FrontendURL        string
}

func mask(key, val string) string {
	// Don't mask empty values - show them as they are
	if val == "" {
		return "<EMPTY>"
	}

	sensitive := []string{"PASSWORD", "SECRET", "KEY", "TOKEN"}
	for _, s := range sensitive {
		if strings.Contains(strings.ToUpper(key), s) {
			if len(val) > 4 {
				return val[:2] + strings.Repeat("*", len(val)-4) + val[len(val)-2:]
			}
			return "***"
		}
	}
	// Don't mask URLs - they're useful for debugging
	if strings.Contains(strings.ToUpper(key), "URL") ||
		strings.Contains(strings.ToUpper(key), "URI") ||
		strings.Contains(strings.ToUpper(key), "ENDPOINT") ||
		strings.Contains(strings.ToUpper(key), "ADDR") {
		return val
	}
	return val
}

// LoadConfig automatically locates .env file from the project root (two levels above)
// LoadConfig automatically locates .env file from the project root (two levels above)
func LoadConfig() (Config, error) {
	var cfg Config

	// Xác định đường dẫn .env tuyệt đối (như bạn đang làm)
	_, thisFile, _, _ := runtime.Caller(0)
	cfgDir := filepath.Dir(thisFile)
	pkgDir := filepath.Dir(cfgDir)
	backendDir := filepath.Dir(pkgDir)
	projectRoot := filepath.Dir(backendDir)
	envPath := filepath.Join(projectRoot, ".env")

	log.Printf("[config] 🔍 Project root: %s", projectRoot)
	log.Printf("[config] 🔍 Looking for .env at: %s", envPath)

	// 1) Nạp .env vào biến môi trường
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("[config] ⚠️  Could not read .env file: %v", err)
		// Không return; cho phép chạy tiếp nếu biến đã có sẵn trong môi trường
	}

	// 2) Cho phép viper lấy từ ENV
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// --- Bind all env vars ---
	bindings := map[string]string{
		"APIGatewayPort":       "API_GATEWAY_PORT",
		"UserGRPC_Port":        "USER_GRPC_PORT",
		"UploadGRPC_Port":      "UPLOAD_GRPC_PORT",
		"GRPC_AI_SERVICE_ADDR": "GRPC_AI_SERVICE_ADDR",
		"DatabaseURL":          "DATABASE_URL",
		"Neo4jURI":             "NEO4J_URI",
		"Neo4jUsername":        "NEO4J_USERNAME",
		"Neo4jPassword":        "NEO4J_PASSWORD",
		"NatsURL":              "NATS_URL",
		"RedisURL":             "REDIS_URL",
		"JWTSecret":            "JWT_SECRET",
		// "MinioEndpoint":        "MINIO_ENDPOINT",
		// "MinioAccessKeyID":     "MINIO_ACCESS_KEY_ID",
		// "MinioSecretAccessKey": "MINIO_SECRET_ACCESS_KEY",
		// "MinioBucketName":      "MINIO_BUCKET_NAME",
		// "MinioUseSSL":          "MINIO_USE_SSL",
		// "MinioBaseURL":         "MINIO_BASE_URL",
		"ImgbbAPIKey":        "IMGBB_API_KEY",
		"GoogleClientID":     "GOOGLE_CLIENT_ID",
		"GoogleRedirectURI":  "GOOGLE_REDIRECT_URI",
		"GoogleClientSecret": "GOOGLE_CLIENT_SECRET",
		"FrontendURL":        "FRONTEND_URL",
	}

	for key, envVar := range bindings {
		if err := viper.BindEnv(key, envVar); err != nil {
			log.Printf("[config] ⚠️  Failed to bind %s: %v", key, err)
		}
	}

	// viper.SetDefault("MinioBaseURL", os.Getenv("MINIO_BASE_URL"))
	// // For boolean, viper.GetBool is needed, but for logging, we convert to string
	// viper.SetDefault("MinioUseSSL", os.Getenv("MINIO_USE_SSL") == "true")

	// Debug: Check what viper can see
	log.Printf("[config] 🔍 DEBUG - Raw viper values:")
	for key := range bindings {
		val := viper.GetString(key)
		if val != "" {
			log.Printf("[config]   %s = %s", key, mask(key, val))
		} else {
			log.Printf("[config]   %s = <NOT FOUND IN VIPER>", key)
		}
	}

	if err := viper.Unmarshal(&cfg); err != nil {
		return cfg, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// --- Log summary ---
	log.Printf("[config] === Effective configuration (masked) ===")
	vals := map[string]string{
		"APIGatewayPort":       cfg.APIGatewayPort,
		"UserGRPC_Port":        cfg.UserGRPC_Port,
		"UploadGRPC_Port":      cfg.UploadGRPC_Port,
		"GRPC_AI_SERVICE_ADDR": cfg.GRPC_AI_SERVICE_ADDR,
		"DatabaseURL":          cfg.DatabaseURL,
		"Neo4jURI":             cfg.Neo4jURI,
		"Neo4jUsername":        cfg.Neo4jUsername,
		"Neo4jPassword":        cfg.Neo4jPassword,
		"NatsURL":              cfg.NatsURL,
		"RedisURL":             cfg.RedisURL,
		"JWTSecret":            cfg.JWTSecret,
		// "MinioEndpoint":        cfg.MinioEndpoint,
		// "MinioAccessKeyID":     cfg.MinioAccessKeyID,
		// "MinioSecretAccessKey": cfg.MinioSecretAccessKey,
		// "MinioBucketName":      cfg.MinioBucketName,
		// "MinioUseSSL":          strconv.FormatBool(cfg.MinioUseSSL), // Convert bool to string
		// "MinioBaseURL":         cfg.MinioBaseURL,
		"ImgbbAPIKey":        cfg.ImgbbAPIKey,
		"GoogleClientID":     cfg.GoogleClientID,
		"GoogleClientSecret": cfg.GoogleClientSecret,
		"GoogleRedirectURI":  cfg.GoogleRedirectURI,
		"FrontendURL":        cfg.FrontendURL,
	}
	for k, v := range vals {
		log.Printf("[config] %s: %s", k, mask(k, v))
	}

	// --- Warn if missing (check struct fields, not viper) ---
	requiredFields := map[string]string{
		"APIGatewayPort":       cfg.APIGatewayPort,
		"GRPC_AI_SERVICE_ADDR": cfg.GRPC_AI_SERVICE_ADDR,
		"DatabaseURL":          cfg.DatabaseURL,
		"Neo4jURI":             cfg.Neo4jURI,
		"Neo4jUsername":        cfg.Neo4jUsername,
		"Neo4jPassword":        cfg.Neo4jPassword,
		"NatsURL":              cfg.NatsURL,
		"RedisURL":             cfg.RedisURL,
		"JWTSecret":            cfg.JWTSecret,
		// "MinioEndpoint":        cfg.MinioEndpoint,
		// "MinioAccessKeyID":     cfg.MinioAccessKeyID,
		// "MinioSecretAccessKey": cfg.MinioSecretAccessKey,
		// "MinioBucketName":      cfg.MinioBucketName,
		"ImgbbAPIKey":        cfg.ImgbbAPIKey,
		"GoogleClientID":     cfg.GoogleClientID,
		"GoogleRedirectURI":  cfg.GoogleRedirectURI,
		"GoogleClientSecret": cfg.GoogleClientSecret,
	}

	hasErrors := false
	for key, value := range requiredFields {
		if value == "" {
			log.Printf("[config][ERROR] ❌ Required field %q is EMPTY", key)
			hasErrors = true
		}
	}

	if hasErrors {
		log.Printf("[config][ERROR] ⚠️  Some required fields are missing. Please check your .env file")
		log.Printf("[config] Looking for .env at: %s", envPath)
	} else {
		log.Printf("[config] ✅ All required fields are present")
	}

	return cfg, nil
}
