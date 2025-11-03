package usecase

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"time"

	permission_domain "github.com/attendwise/backend/internal/module/permission/domain"
	"github.com/attendwise/backend/internal/module/report/domain"
	"github.com/jung-kurt/gofpdf"
)

// ReportService defines the interface for report-related business logic.
type ReportService interface {
	GetSessionAttendanceDetails(ctx context.Context, sessionID string, statusFilter string) ([]*domain.SessionAttendeeDetail, error)
	ExportEventAttendanceCSV(ctx context.Context, eventID string) ([]byte, error)
	GetEventAttendanceReport(ctx context.Context, eventID string) (*domain.EventAttendanceReport, error)
	ExportEventAttendanceReportPDF(ctx context.Context, eventID string) ([]byte, error)
	GetMonthlySummary(ctx context.Context) (*domain.MonthlySummary, error)
	GetCommunityEngagementReport(ctx context.Context, userID, communityID string) (*domain.CommunityEngagementReport, error)
}

// reportService is the implementation of the ReportService interface.
type reportService struct {
	repo            domain.ReportRepository
	permissionService permission_domain.PermissionService
}

// NewReportService creates a new report service.
func NewReportService(repo domain.ReportRepository, permissionService permission_domain.PermissionService) ReportService {
	return &reportService{repo: repo, permissionService: permissionService}
}

// GetSessionAttendanceDetails retrieves detailed attendee info for a session.
func (s *reportService) GetSessionAttendanceDetails(ctx context.Context, sessionID string, statusFilter string) ([]*domain.SessionAttendeeDetail, error) {
	// Additional business logic could be added here in the future (e.g., authorization).
	return s.repo.GetSessionAttendanceDetails(ctx, sessionID, statusFilter)
}

// ExportEventAttendanceCSV exports event attendance data as a CSV.
func (s *reportService) ExportEventAttendanceCSV(ctx context.Context, eventID string) ([]byte, error) {
	details, err := s.repo.GetEventAttendanceDetails(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get event attendance details for CSV export: %w", err)
	}

	if len(details) == 0 {
		return []byte("No attendance data found for this event."), nil
	}

	// Create a CSV writer
	var b bytes.Buffer
	w := csv.NewWriter(&b)

	// Write CSV header
	header := []string{
		"User ID", "User Name", "User Email", "Check-in ID", "Status",
		"Check-in Time", "Is Late", "Liveness Score", "Face Confidence Score", "Failure Reason",
	}
	if err := w.Write(header); err != nil {
		return nil, fmt.Errorf("failed to write CSV header: %w", err)
	}

	// Write data rows
	for _, detail := range details {
		record := []string{
			detail.UserID,
			detail.UserName,
			detail.UserEmail,
			detail.CheckinID,
			detail.Status,
			detail.CheckinTime.Time.Format(time.RFC3339),
			fmt.Sprintf("%t", detail.IsLate.Bool),
			fmt.Sprintf("%.2f", detail.LivenessScore.Float64),
			fmt.Sprintf("%.2f", detail.FaceConfidenceScore.Float64),
			detail.FailureReason.String,
		}
		if err := w.Write(record); err != nil {
			return nil, fmt.Errorf("failed to write CSV record: %w", err)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("error flushing CSV writer: %w", err)
	}

	return b.Bytes(), nil
}

func (s *reportService) GetEventAttendanceReport(ctx context.Context, eventID string) (*domain.EventAttendanceReport, error) {
	return s.repo.GetEventAttendanceReport(ctx, eventID)
}

func (s *reportService) ExportEventAttendanceReportPDF(ctx context.Context, eventID string) ([]byte, error) {
	details, err := s.repo.GetEventAttendanceDetails(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get event attendance details for PDF export: %w", err)
	}

	if len(details) == 0 {
		return []byte("No attendance data found for this event."), nil
	}

	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "Event Attendance Report")
	pdf.Ln(20)

	pdf.SetFont("Arial", "B", 10)
	header := []string{"User ID", "User Name", "Email", "Status", "Check-in Time"}
	for _, h := range header {
		pdf.CellFormat(40, 10, h, "1", 0, "", false, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetFont("Arial", "", 10)
	for _, detail := range details {
		pdf.CellFormat(40, 10, detail.UserID, "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, detail.UserName, "1", 0, "", false, 0, "")
		pdf.CellFormat(60, 10, detail.UserEmail, "1", 0, "", false, 0, "")
		pdf.CellFormat(30, 10, detail.Status, "1", 0, "", false, 0, "")
		pdf.CellFormat(40, 10, detail.CheckinTime.Time.Format("2006-01-02 15:04:05"), "1", 0, "", false, 0, "")
		pdf.Ln(-1)
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func (s *reportService) GetMonthlySummary(ctx context.Context) (*domain.MonthlySummary, error) {
	return s.repo.GetMonthlySummary(ctx)
}

func (s *reportService) GetCommunityEngagementReport(ctx context.Context, userID, communityID string) (*domain.CommunityEngagementReport, error) {
	// Authorize
	isAdmin, err := s.permissionService.IsCommunityAdmin(ctx, communityID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check permissions: %w", err)
	}
	if !isAdmin {
		return nil, fmt.Errorf("user is not a community admin")
	}

	return s.repo.GetCommunityEngagementReport(ctx, communityID)
}
