package cache

import (
	"context"
	"fmt"
	"net/url" // Import net/url

	"github.com/redis/go-redis/v9"
)

// NewRedisClient creates and returns a new Redis client.
func NewRedisClient(ctx context.Context, redisURL string) (*redis.Client, error) {
	parsedURL, err := url.Parse(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	password, _ := parsedURL.User.Password() // Extract password

	client := redis.NewClient(&redis.Options{
		Addr:     parsedURL.Host, // Use only host:port for Addr
		Username: parsedURL.User.Username(), // Extract username
		Password: password,                 // Use extracted password
		DB:       0,                        // Use default DB
	})

	// Ping the server to check the connection.
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return client, nil
}
