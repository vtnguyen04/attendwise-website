package main

import (
	"net/http"

	domain "github.com/attendwise/backend/internal/module/report/domain"
	"github.com/gin-gonic/gin"
)

// ReportHandler holds the dependencies for report handlers.
type ReportHandler struct {
	service domain.ReportService
}

// NewReportHandler creates a new ReportHandler.
func NewReportHandler(service domain.ReportService) *ReportHandler {
	return &ReportHandler{service: service}
}

// @Summary Get session attendance details
// @Description Get detailed attendance information for a specific session
// @ID get-session-attendance-details
// @Produce json
// @Param sessionId path string true "Session ID"
// @Param status query string false "Filter by attendance status (e.g., checked_in, registered)"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/reports/sessions/{sessionId}/attendees-details [get]
// @Security ApiKeyAuth
// GetSessionAttendanceDetails handles the request to get detailed attendance for a session.
func (h *ReportHandler) GetSessionAttendanceDetails(c *gin.Context) {
	sessionID := c.Param("sessionId")
	statusFilter := c.Query("status")

	details, err := h.service.GetSessionAttendanceDetails(c.Request.Context(), sessionID, statusFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve attendance details"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"attendees": details})
}

// @Summary Get event attendance report
// @Description Get an attendance report for a specific event
// @ID get-event-attendance-report
// @Produce json
// @Param id path string true "Event ID"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/reports/events/{id}/attendance [get]
// @Security ApiKeyAuth
func (h *ReportHandler) GetEventAttendanceReport(c *gin.Context) {
	eventID := c.Param("id")

	report, err := h.service.GetEventAttendanceReport(c.Request.Context(), eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve event attendance report"})
		return
	}

	c.JSON(http.StatusOK, report)
}

// @Summary Export event attendance report as CSV
// @Description Export the attendance report for a specific event as a CSV file
// @ID export-event-attendance-csv
// @Produce text/csv
// @Param id path string true "Event ID"
// @Success 200 {file} string "CSV file"
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/reports/events/{id}/attendance.csv [get]
// @Security ApiKeyAuth
// ExportEventAttendanceReportCSV is a placeholder.
func (h *ReportHandler) ExportEventAttendanceReportCSV(c *gin.Context) {
	eventID := c.Param("id")

	csvData, err := h.service.ExportEventAttendanceCSV(c.Request.Context(), eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate CSV report"})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment;filename=event_attendance.csv")
	c.Data(http.StatusOK, "text/csv", csvData)
}

// @Summary Export event attendance report as PDF
// @Description Export the attendance report for a specific event as a PDF file
// @ID export-event-attendance-pdf
// @Produce application/pdf
// @Param id path string true "Event ID"
// @Success 200 {file} string "PDF file"
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/reports/events/{id}/attendance.pdf [get]
// @Security ApiKeyAuth
func (h *ReportHandler) ExportEventAttendanceReportPDF(c *gin.Context) {
	eventID := c.Param("id")

	pdfData, err := h.service.ExportEventAttendanceReportPDF(c.Request.Context(), eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF report"})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment;filename=event_attendance.pdf")
	c.Data(http.StatusOK, "application/pdf", pdfData)
}

// @Summary Get monthly summary
// @Description Get a monthly summary report
// @ID get-monthly-summary
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/reports/summary/monthly [get]
// @Security ApiKeyAuth
func (h *ReportHandler) GetMonthlySummary(c *gin.Context) {

	summary, err := h.service.GetMonthlySummary(c.Request.Context())

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve monthly summary"})

		return

	}



	c.JSON(http.StatusOK, summary)

}



// @Summary Get community engagement report
// @Description Get an engagement report for a specific community
// @ID get-community-engagement-report
// @Produce json
// @Param id path string true "Community ID"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/reports/communities/{id}/engagement [get]
// @Security ApiKeyAuth
func (h *ReportHandler) GetCommunityEngagementReport(c *gin.Context) {

	communityID := c.Param("id")

	userID, exists := c.Get("userID")

	if !exists {

		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})

		return

	}



	report, err := h.service.GetCommunityEngagementReport(c.Request.Context(), userID.(string), communityID)

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})

		return

	}



	c.JSON(http.StatusOK, report)

}
