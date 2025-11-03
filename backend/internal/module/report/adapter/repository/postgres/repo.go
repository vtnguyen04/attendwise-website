package postgres

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/attendwise/backend/internal/module/report/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type reportRepository struct {
	db *pgxpool.Pool
}

func NewReportRepository(db *pgxpool.Pool) domain.ReportRepository {
	return &reportRepository{db: db}
}

func (r *reportRepository) GetEventAttendanceDetails(ctx context.Context, eventID string) ([]*domain.SessionAttendeeDetail, error) {
	query := `
        SELECT
            u.id as user_id,
            u.name as user_name,
            u.email as user_email,
            u.profile_picture_url,
            esc.id as checkin_id,
            esc.status,
            esc.checkin_time,
            esc.is_late,
            esc.liveness_score,
            esc.face_confidence_score,
            esc.failure_reason
        FROM event_session_checkins esc
        JOIN event_sessions es ON esc.session_id = es.id
        JOIN users u ON esc.user_id = u.id
        WHERE es.event_id = $1
        ORDER BY esc.checkin_time DESC
    `

	rows, err := r.db.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query event attendance details: %w", err)
	}
	defer rows.Close()

	var details []*domain.SessionAttendeeDetail
	for rows.Next() {
		var detail domain.SessionAttendeeDetail
		if err := rows.Scan(
			&detail.UserID,
			&detail.UserName,
			&detail.UserEmail,
			&detail.UserProfilePictureURL,
			&detail.CheckinID,
			&detail.Status,
			&detail.CheckinTime,
			&detail.IsLate,
			&detail.LivenessScore,
			&detail.FaceConfidenceScore,
			&detail.FailureReason,
		); err != nil {
			return nil, fmt.Errorf("failed to scan event attendee detail: %w", err)
		}
		details = append(details, &detail)
	}

	return details, nil
}

// GetSessionAttendanceDetails retrieves a detailed list of attendees and their check-in status for a specific session.
func (r *reportRepository) GetSessionAttendanceDetails(ctx context.Context, sessionID string, statusFilter string) ([]*domain.SessionAttendeeDetail, error) {
	var eventID string
	if err := r.db.QueryRow(ctx, "SELECT event_id FROM event_sessions WHERE id = $1", sessionID).Scan(&eventID); err != nil {
		return nil, fmt.Errorf("failed to get event_id from session_id: %w", err)
	}

	var queryBuilder strings.Builder
	args := []interface{}{eventID, sessionID}

	queryBuilder.WriteString(`
		SELECT
			ea.user_id,
			u.name as user_name,
			u.email as user_email,
			ea.role,
			u.profile_picture_url,
			esc.id as checkin_id,
			esc.status,
			esc.checkin_time,
			esc.is_late,
			esc.liveness_score,
			esc.face_confidence_score,
			esc.failure_reason
		FROM event_attendees ea
		JOIN users u ON ea.user_id = u.id
		LEFT JOIN event_session_checkins esc ON ea.user_id = esc.user_id AND esc.session_id = $2
		WHERE ea.event_id = $1
	`)

	if statusFilter != "" {
		queryBuilder.WriteString(fmt.Sprintf(" AND ea.status = $%d", len(args)+1))
		args = append(args, statusFilter)
	}

	queryBuilder.WriteString(" ORDER BY ea.registered_at ASC")

	rows, err := r.db.Query(ctx, queryBuilder.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query session attendance details: %w", err)
	}
	defer rows.Close()

	var details []*domain.SessionAttendeeDetail
	for rows.Next() {
		var detail domain.SessionAttendeeDetail
		if err := rows.Scan(
			&detail.UserID,
			&detail.UserName,
			&detail.UserEmail,
			&detail.Role,
			&detail.UserProfilePictureURL,
			&detail.CheckinID,
			&detail.Status,
			&detail.CheckinTime,
			&detail.IsLate,
			&detail.LivenessScore,
			&detail.FaceConfidenceScore,
			&detail.FailureReason,
		); err != nil {
			return nil, fmt.Errorf("failed to scan session attendee detail: %w", err)
		}
		details = append(details, &detail)
	}

	return details, nil
}

func (r *reportRepository) GetEventAttendanceReport(ctx context.Context, eventID string) (*domain.EventAttendanceReport, error) {
	query := `
		SELECT
			COUNT(DISTINCT er.user_id) AS total_registrations,
			COUNT(DISTINCT CASE WHEN c.status = 'success' THEN c.user_id END) AS total_attendees,
			CASE WHEN COUNT(DISTINCT er.user_id) > 0 THEN (COUNT(DISTINCT CASE WHEN c.status = 'success' THEN c.user_id END) * 100.0 / COUNT(DISTINCT er.user_id)) ELSE 0 END AS attendance_rate,
			CASE WHEN COUNT(c.id) > 0 THEN (COUNT(CASE WHEN c.status = 'success' THEN 1 END) * 100.0 / COUNT(c.id)) ELSE 0 END AS checkin_success_rate,
			CASE WHEN COUNT(c.id) > 0 THEN (COUNT(CASE WHEN c.status = 'failed' THEN 1 END) * 100.0 / COUNT(c.id)) ELSE 0 END AS checkin_failure_rate,
			CASE WHEN COUNT(DISTINCT er.user_id) > 0 THEN ((COUNT(DISTINCT er.user_id) - COUNT(DISTINCT CASE WHEN c.status = 'success' THEN c.user_id END)) * 100.0 / COUNT(DISTINCT er.user_id)) ELSE 0 END AS absence_rate
		FROM event_attendees er
		LEFT JOIN event_sessions es ON er.event_id = es.event_id
		LEFT JOIN event_session_checkins c ON es.id = c.session_id AND er.user_id = c.user_id
		WHERE er.event_id = $1
	`

	log.Printf("Executing GetEventAttendanceReport query for eventID %s: %s", eventID, query)
	row := r.db.QueryRow(ctx, query, eventID)

	var report domain.EventAttendanceReport
	if err := row.Scan(
		&report.TotalRegistrations,
		&report.TotalAttendees,
		&report.AttendanceRate,
		&report.CheckinSuccessRate,
		&report.CheckinFailureRate,
		&report.AbsenceRate,
	); err != nil {
		log.Printf("Error scanning GetEventAttendanceReport for eventID %s: %v", eventID, err)
		return nil, fmt.Errorf("failed to scan event attendance report: %w", err)
	}

	return &report, nil
}

func (r *reportRepository) ExportEventAttendanceCSV(ctx context.Context, eventID string) ([]byte, error) {
	// To be implemented
	return nil, nil
}

func (r *reportRepository) ExportEventAttendanceReportPDF(ctx context.Context, eventID string) ([]byte, error) {
	// For PDF, we just need the raw data, the service layer will format it.
	// So, we can reuse GetEventAttendanceDetails and convert it to a suitable format if needed.
	// For simplicity, let's assume the service layer will call GetEventAttendanceDetails.
	// This method will just return an empty byte slice for now, as the actual PDF generation happens in the service.
	return nil, nil
}

func (r *reportRepository) GetMonthlySummary(ctx context.Context) (*domain.MonthlySummary, error) {
	query := `
		SELECT
			TO_CHAR(DATE_TRUNC('month', e.start_time), 'YYYY-MM') AS month,
			COUNT(DISTINCT e.id) AS total_events,
			COUNT(DISTINCT er.user_id) AS total_attendees,
			COALESCE(AVG(CASE WHEN c.status = 'success' THEN 100.0 ELSE 0 END), 0) AS average_attendance_rate
		FROM events e
		LEFT JOIN event_attendees er ON e.id = er.event_id
		LEFT JOIN event_sessions es ON er.event_id = es.event_id
		LEFT JOIN event_session_checkins c ON es.id = c.session_id AND er.user_id = c.user_id
		GROUP BY month
		ORDER BY month
	`

	log.Printf("Executing GetMonthlySummary query: %s", query)
	row := r.db.QueryRow(ctx, query)

	var summary domain.MonthlySummary
	if err := row.Scan(
		&summary.Month,
		&summary.TotalEvents,
		&summary.TotalAttendees,
		&summary.AverageAttendanceRate,
	); err != nil {
		log.Printf("Error scanning GetMonthlySummary: %v", err)
		return nil, fmt.Errorf("failed to scan monthly summary: %w", err)
	}

	return &summary, nil
}

func (r *reportRepository) GetCommunityEngagementReport(ctx context.Context, communityID string) (*domain.CommunityEngagementReport, error) {
	report := &domain.CommunityEngagementReport{
		CommunityID: communityID,
		GeneratedAt: time.Now(),
	}

	// 1. Get Most Active Users
	activeUsersQuery := `
		SELECT
			u.id as user_id,
			u.name as user_name,
			COUNT(DISTINCT p.id) AS post_count,
			COUNT(DISTINCT c.id) AS comment_count,
			(COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id)) as total_activity
		FROM users u
		JOIN community_members cm ON u.id = cm.user_id
		LEFT JOIN posts p ON u.id = p.author_id AND p.community_id = $1
		LEFT JOIN comments c ON u.id = c.author_id AND c.post_id IN (SELECT id FROM posts WHERE community_id = $1)
		WHERE cm.community_id = $1 AND cm.status = 'active'
		GROUP BY u.id, u.name
		ORDER BY total_activity DESC
		LIMIT 10
	`
	rows, err := r.db.Query(ctx, activeUsersQuery, communityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query active users: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var user domain.ActiveUser
		if err := rows.Scan(&user.UserID, &user.UserName, &user.PostCount, &user.CommentCount, &user.TotalActivity); err != nil {
			return nil, fmt.Errorf("failed to scan active user: %w", err)
		}
		report.MostActiveUsers = append(report.MostActiveUsers, &user)
	}

	// 2. Get Popular Posts
	popularPostsQuery := `
		SELECT
			p.id, LEFT(p.content, 50), p.author_id, u.name,
			p.reaction_count, p.comment_count,
			(p.reaction_count + p.comment_count) as total_engagement,
			p.created_at
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.community_id = $1 AND p.deleted_at IS NULL
		ORDER BY total_engagement DESC
		LIMIT 10
	`
	rows, err = r.db.Query(ctx, popularPostsQuery, communityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query popular posts: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var post domain.PopularPost
		if err := rows.Scan(&post.PostID, &post.ContentPreview, &post.AuthorID, &post.AuthorName, &post.ReactionCount, &post.CommentCount, &post.TotalEngagement, &post.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan popular post: %w", err)
		}
		report.PopularPosts = append(report.PopularPosts, &post)
	}

	// 3. Get Activity Over Time (last 30 days)
	activityQuery := `
		WITH days AS (
			SELECT generate_series(NOW() - INTERVAL '29 days', NOW(), '1 day')::date as day
		)
		SELECT
			d.day,
			COALESCE(pc.count, 0) as post_count,
			COALESCE(cc.count, 0) as comment_count
		FROM days d
		LEFT JOIN (
			SELECT created_at::date as day, COUNT(id) as count
			FROM posts
			WHERE community_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
			GROUP BY day
		) pc ON d.day = pc.day
		LEFT JOIN (
			SELECT created_at::date as day, COUNT(id) as count
			FROM comments
			WHERE post_id IN (SELECT id FROM posts WHERE community_id = $1) AND created_at >= NOW() - INTERVAL '30 days'
			GROUP BY day
		) cc ON d.day = cc.day
		ORDER BY d.day ASC
	`
	rows, err = r.db.Query(ctx, activityQuery, communityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query activity over time: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var dataPoint domain.ActivityDataPoint
		if err := rows.Scan(&dataPoint.Date, &dataPoint.PostCount, &dataPoint.CommentCount); err != nil {
			return nil, fmt.Errorf("failed to scan activity data point: %w", err)
		}
		report.ActivityOverTime = append(report.ActivityOverTime, &dataPoint)
	}

	return report, nil
}
