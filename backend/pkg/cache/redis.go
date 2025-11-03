package cache

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient creates and returns a new Redis client.
func NewRedisClient(ctx context.Context, redisURL string) (*redis.Client, error) {
	// ParseURL is causing issues with IPv6 resolution in Docker.
	// Explicitly set the address to force IPv4 connection to the service name.
	// client := redis.NewClient(&redis.Options{
	// 	Addr: "redis:6379", // Use the service name and port directly
	// })

	client := redis.NewClient(&redis.Options{
		Addr: redisURL, // lấy từ env (ví dụ: localhost:6379)
	})

	// Ping the server to check the connection.
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return client, nil
}
