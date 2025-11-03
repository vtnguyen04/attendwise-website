package database

import (
	"context"
	"fmt"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// NewNeo4jDriver creates and returns a new Neo4j driver instance.
func NewNeo4jDriver(uri, username, password string) (neo4j.DriverWithContext, error) {
	driver, err := neo4j.NewDriverWithContext(
		uri,
		neo4j.BasicAuth(username, password, ""),
		func(cfg *neo4j.Config) {
			// Tune connection pool and retry behaviour to better handle concurrent traffic.
			cfg.MaxConnectionPoolSize = 50
			cfg.MaxConnectionLifetime = 30 * time.Minute
			cfg.MaxTransactionRetryTime = 10 * time.Second
			cfg.ConnectionAcquisitionTimeout = 5 * time.Second
			cfg.TelemetryDisabled = true
		},
	)
	if err != nil {
		return nil, fmt.Errorf("could not create new neo4j driver: %w", err)
	}

	// Verify connectivity
	err = driver.VerifyConnectivity(context.Background())
	if err != nil {
		return nil, fmt.Errorf("could not verify neo4j connectivity: %w", err)
	}

	fmt.Println("Successfully connected to Neo4j")
	return driver, nil
}
