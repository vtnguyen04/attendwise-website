package worker

import (
	"context"
	"log"
	"time"

	user_domain "github.com/attendwise/backend/internal/module/user/domain"
)

const (
	SpamFollowThreshold = 100
	SpamCheckInterval   = 1 * time.Hour
	SpamAccountAge      = 24 * time.Hour
)

// SpamDetectionWorker handles background jobs for detecting potential spam accounts.
type SpamDetectionWorker struct {
	userRepo      user_domain.UserRepository
	userGraphRepo user_domain.UserGraphRepository
	ticker        *time.Ticker
	quit          chan struct{}
}

// NewSpamDetectionWorker creates a new worker for spam detection.
func NewSpamDetectionWorker(userRepo user_domain.UserRepository, userGraphRepo user_domain.UserGraphRepository) *SpamDetectionWorker {
	return &SpamDetectionWorker{
		userRepo:      userRepo,
		userGraphRepo: userGraphRepo,
		ticker:        time.NewTicker(SpamCheckInterval),
		quit:          make(chan struct{}),
	}
}

// Start begins the worker's ticking process.
func (w *SpamDetectionWorker) Start() {
	log.Println("Starting SpamDetectionWorker...")
	go func() {
		for {
			select {
			case <-w.ticker.C:
				log.Println("Running spam detection job...")
				if err := w.detectSpam(context.Background()); err != nil {
					log.Printf("Error running spam detection job: %v", err)
				}
			case <-w.quit:
				w.ticker.Stop()
				return
			}
		}
	}()
}

// Stop terminates the worker's ticking process.
func (w *SpamDetectionWorker) Stop() {
	log.Println("Stopping SpamDetectionWorker...")
	close(w.quit)
}

func (w *SpamDetectionWorker) detectSpam(ctx context.Context) error {
	// 1. Find potential spam accounts from the graph database
	since := time.Now().Add(-SpamAccountAge)
	spammerIDs, err := w.userGraphRepo.FindSpamAccounts(ctx, since, SpamFollowThreshold)
	if err != nil {
		return err
	}

	if len(spammerIDs) == 0 {
		log.Println("No potential spam accounts found.")
		return nil
	}

	log.Printf("Found %d potential spam account(s): %v", len(spammerIDs), spammerIDs)

	// 2. Flag these users in the primary database (PostgreSQL)
	if err := w.userRepo.FlagUsersAsSpam(ctx, spammerIDs); err != nil {
		return err
	}

	log.Printf("Successfully flagged %d account(s) as spam.", len(spammerIDs))
	return nil
}
