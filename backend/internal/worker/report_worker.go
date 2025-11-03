package worker

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ReportWorker is responsible for periodically generating attendance reports.
type ReportWorker struct {
	db      *pgxpool.Pool
	ticker  *time.Ticker
	quit    chan struct{}
}

// NewReportWorker creates a new ReportWorker.
func NewReportWorker(db *pgxpool.Pool) *ReportWorker {
	return &ReportWorker{
		db:      db,
		ticker:  time.NewTicker(15 * time.Minute), // Run every 15 minutes
		quit:    make(chan struct{}),
	}
}

// Start begins the worker's ticking process.
func (w *ReportWorker) Start() {
	log.Println("Starting ReportWorker...")
	go func() {
		for {
			select {
			case <-w.ticker.C:
				log.Println("Generating attendance reports...")
				if err := w.generateReports(context.Background()); err != nil {
					log.Printf("Error generating attendance reports: %v", err)
				}
			case <-w.quit:
				w.ticker.Stop()
				return
			}
		}
	}()
}

// Stop terminates the worker's ticking process.
func (w *ReportWorker) Stop() {
	log.Println("Stopping ReportWorker...")
	close(w.quit)
}

// generateReports performs the aggregation and updates the attendance_reports table.
func (w *ReportWorker) generateReports(ctx context.Context) error {
	// This query is the heart of the worker. It calculates all metrics and inserts/updates the report table.
	query := `
		INSERT INTO attendance_reports (
			event_id, session_id, report_date, report_type,
			total_registered, total_attended, total_no_show, total_late,
			face_verification_failed, liveness_check_failed,
			attendance_rate, no_show_rate, late_rate
		)
		SELECT 
			es.event_id,
			es.id AS session_id,
			NOW()::date AS report_date,
			'session' AS report_type,
			COUNT(DISTINCT ea.user_id) AS total_registered,
			COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.status = 'success') AS total_attended,
			COUNT(DISTINCT ea.user_id) FILTER (WHERE ea.status = 'registered' AND esc.id IS NULL) AS total_no_show,
			COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.is_late = TRUE) AS total_late,
			COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.face_verification_passed = FALSE) AS face_verification_failed,
			COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.liveness_check_passed = FALSE) AS liveness_check_failed,
			COALESCE(ROUND(
				COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.status = 'success')::NUMERIC / 
				NULLIF(COUNT(DISTINCT ea.user_id), 0) * 100, 2
			), 0.0) AS attendance_rate,
			COALESCE(ROUND(
				COUNT(DISTINCT ea.user_id) FILTER (WHERE ea.status = 'registered' AND esc.id IS NULL)::NUMERIC / 
				NULLIF(COUNT(DISTINCT ea.user_id), 0) * 100, 2
			), 0.0) AS no_show_rate,
			COALESCE(ROUND(
				COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.is_late = TRUE)::NUMERIC / 
				NULLIF(COUNT(DISTINCT esc.user_id) FILTER (WHERE esc.status = 'success'), 0) * 100, 2
			), 0.0) AS late_rate
		FROM event_sessions es
		JOIN events e ON es.event_id = e.id
		LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.status = 'registered'
		LEFT JOIN event_session_checkins esc ON es.id = esc.session_id
		-- We only need to generate reports for recent/ongoing sessions
		WHERE es.start_time > (NOW() - INTERVAL '30 days')
		GROUP BY es.id, es.event_id
		ON CONFLICT (event_id, session_id, report_date, report_type) DO UPDATE
		SET
			total_registered = EXCLUDED.total_registered,
			total_attended = EXCLUDED.total_attended,
			total_no_show = EXCLUDED.total_no_show,
			total_late = EXCLUDED.total_late,
			face_verification_failed = EXCLUDED.face_verification_failed,
			liveness_check_failed = EXCLUDED.liveness_check_failed,
			attendance_rate = EXCLUDED.attendance_rate,
			no_show_rate = EXCLUDED.no_show_rate,
			late_rate = EXCLUDED.late_rate,
			generated_at = NOW();
	`

	_, err := w.db.Exec(ctx, query)
	return err
}
