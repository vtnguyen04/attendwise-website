package worker

import (
	"context"
	"log"
	"strings"
	"time"

	"encoding/json"

	event_domain "github.com/attendwise/backend/internal/module/event/domain"
	"github.com/google/uuid"
	"github.com/teambition/rrule-go"
)

// RecurringEventWorker is responsible for processing recurring events and creating future sessions.
type RecurringEventWorker struct {
	eventRepo event_domain.EventRepository
}

// NewRecurringEventWorker creates a new instance of RecurringEventWorker.
func NewRecurringEventWorker(eventRepo event_domain.EventRepository) *RecurringEventWorker {
	return &RecurringEventWorker{
		eventRepo: eventRepo,
	}
}

// Start begins the worker's process of periodically checking for recurring events.
func (w *RecurringEventWorker) Start() {
	log.Println("Starting Recurring Event Worker...")
	// Run once on startup, then on a schedule.
	w.ProcessRecurringEvents()

	// Ticker to run the process every hour.
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		log.Println("Recurring Event Worker: processing events...")
		w.ProcessRecurringEvents()
	}
}

// ProcessRecurringEvents fetches all active recurring events and creates future sessions for them.
func (w *RecurringEventWorker) ProcessRecurringEvents() {
	ctx := context.Background()

	// 1. Fetch active recurring events from the repository.
	recurringEvents, err := w.eventRepo.GetActiveRecurringEvents(ctx)
	if err != nil {
		log.Printf("ERROR: RecurringEventWorker could not fetch events: %v", err)
		return
	}

	log.Printf("Found %d active recurring events to process.", len(recurringEvents))

	// 2. For each event, determine if new sessions need to be created.
	for _, event := range recurringEvents {
		log.Printf("Processing recurring event: %s (%s)", event.Name, event.ID)

		// 3. Parse the recurrence rule
		if event.RecurrenceRule == nil || len(event.RecurrenceRule) == 0 || string(event.RecurrenceRule) == "null" {
			log.Printf("INFO: Skipping event %s with empty recurrence rule", event.ID)
			continue
		}
		var rrulePayload struct { RRule string `json:"rrule"` }
		if err := json.Unmarshal(event.RecurrenceRule, &rrulePayload); err != nil {
			log.Printf("ERROR: Could not unmarshal rrule json for event %s: %v", event.ID, err)
			continue
		}
		ruleString := rrulePayload.RRule
		// The library expects the rule properties without the "RRULE:" prefix.
		cleanedRuleString := strings.TrimPrefix(ruleString, "RRULE:")

		rOption, err := rrule.StrToROption(cleanedRuleString)
		if err != nil {
			log.Printf("ERROR: Could not parse rrule for event %s: %v", event.ID, err)
			continue
		}
		rOption.Dtstart = event.StartTime.Time
		rule, err := rrule.NewRRule(*rOption)
		if err != nil {
			log.Printf("ERROR: Could not create rrule instance for event %s: %v", event.ID, err)
			continue
		}

		// 4. Get existing session start times to avoid duplicates
		existingStartTimes, err := w.eventRepo.GetSessionStartTimes(ctx, event.ID)
		if err != nil {
			log.Printf("ERROR: Could not get existing session times for event %s: %v", event.ID, err)
			continue
		}

		        // 5. Calculate future occurrences within a generation window (e.g., next 30 days)
				generationWindowEnd := time.Now().Add(30 * 24 * time.Hour)
				futureOccurrences := rule.Between(time.Now(), generationWindowEnd, true)
				duration := event.EndTime.Time.Sub(event.StartTime.Time)
		
				var sessionsToCreate []event_domain.EventSession
		
				// Get the current max session number to ensure uniqueness
				currentMaxSessionNumber, err := w.eventRepo.GetMaxSessionNumber(ctx, event.ID)
				if err != nil {
					log.Printf("ERROR: Could not get max session number for event %s: %v", event.ID, err)
					continue
				}
		
				for _, occurrence := range futureOccurrences {
					// Round to the nearest second to avoid timezone/millisecond mismatches with DB
					occurrence = occurrence.Truncate(time.Second)
					if !existingStartTimes[occurrence] {
						currentMaxSessionNumber++ // Increment for each new session
						newSession := event_domain.EventSession{
							ID:            uuid.New().String(),
							EventID:       event.ID,
							SessionNumber: currentMaxSessionNumber,
							StartTime:     occurrence,
							EndTime:       occurrence.Add(duration),
							Timezone:      event.Timezone,
						}
						sessionsToCreate = append(sessionsToCreate, newSession)
					}
				}
		// 6. Create the missing sessions in the database
		if len(sessionsToCreate) > 0 {
			log.Printf("Creating %d new sessions for event %s", len(sessionsToCreate), event.Name)
			if err := w.eventRepo.CreateSessions(ctx, sessionsToCreate); err != nil {
				log.Printf("ERROR: Failed to create new sessions for event %s: %v", event.ID, err)
			}
		} else {
			log.Printf("No new sessions needed for event %s at this time.", event.Name)
		}
	}

	log.Println("Recurring Event Worker: processing finished.")
}