# Reports

This module provides endpoints for retrieving various reports and analytics.

## Event Attendance Report (JSON)

Retrieves a detailed attendance summary for each session within a specific event. 

**Note:** This endpoint provides a **summary** view (total counts). It does **not** contain a detailed list of every individual user who checked in. A separate endpoint would be needed to retrieve per-user check-in details such as individual FaceID scores and exact check-in times.

- **Endpoint**: `GET /api/v1/reports/events/:id/attendance`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `id`: The UUID of the event.

### Response Body (200 OK)

Returns a single event attendance report object.

```json
{
  "total_registrations": 100,
  "total_attendees": 80,
  "attendance_rate": 80.0,
  "checkin_success_rate": 95.0,
  "checkin_failure_rate": 5.0,
  "absence_rate": 20.0
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/reports/events/<event_id>/attendance \
  -H "Authorization: Bearer <your_access_token>"
```

## Community Engagement Report (JSON)

Retrieves a detailed engagement report for a specific community, including most active users, popular posts, and activity trends. 

- **Endpoint**: `GET /api/v1/reports/communities/:id/engagement`
- **Authentication**: Required (Bearer Token, requires `community_admin` role)

### Path Parameters

- `id`: The UUID of the community.

### Response Body (200 OK)

Returns a single community engagement report object.

```json
{
  "community_id": "uuid",
  "generated_at": "timestamp",
  "most_active_users": [
    {
      "user_id": "uuid",
      "user_name": "string",
      "post_count": number,
      "comment_count": number,
      "total_activity": number
    }
  ],
  "popular_posts": [
    {
      "post_id": "uuid",
      "content_preview": "string",
      "author_id": "uuid",
      "author_name": "string",
      "reaction_count": number,
      "comment_count": number,
      "total_engagement": number,
      "created_at": "timestamp"
    }
  ],
  "activity_over_time": [
    {
      "date": "timestamp",
      "post_count": number,
      "comment_count": number
    }
  ]
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/reports/communities/<community_id>/engagement \
  -H "Authorization: Bearer <your_access_token>"
```

## Event Attendance Report (CSV)

Retrieves a detailed attendance report for a specific event in CSV format. Requires event creator privileges.

- **Endpoint**: `GET /api/v1/reports/events/:id/attendance.csv`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `id`: The UUID of the event.

### Response Body (200 OK)

```csv
User ID,User Name,User Email,Check-in ID,Status,Check-in Time,Is Late,Liveness Score,Face Confidence Score,Failure Reason
<user_id_1>,<user_name_1>,<user_email_1>,<checkin_id_1>,<status_1>,<checkin_time_1>,<is_late_1>,<liveness_score_1>,<face_confidence_score_1>,<failure_reason_1>
<user_id_2>,<user_name_2>,<user_email_2>,<checkin_id_2>,<status_2>,<checkin_time_2>,<is_late_2>,<liveness_score_2>,<face_confidence_score_2>,<failure_reason_2>
...
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/reports/events/<event_id>/attendance.csv \
  -H "Authorization: Bearer <your_access_token>" \
  --output event_attendance.csv # Saves the CSV output to a file named event_attendance.csv
```

---

## Monthly Attendance Summary (JSON)

Retrieves a summary of attendance across all events, aggregated by month.

- **Endpoint**: `GET /api/v1/reports/summary/monthly`
- **Authentication**: Required (Bearer Token, requires admin role)

### Response Body (200 OK)

Returns a single monthly summary object.

```json
{
  "month": "2025-10",
  "total_events": 10,
  "total_attendees": 500,
  "average_attendance_rate": 75.5
}
```

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/reports/summary/monthly \
  -H "Authorization: Bearer <admin_access_token>"
```

---

## Event Attendance Report (PDF)

Retrieves a detailed attendance report for a specific event in PDF format. Requires event creator privileges.

- **Endpoint**: `GET /api/v1/reports/events/:id/attendance.pdf`
- **Authentication**: Required (Bearer Token, requires event creator role)

### Path Parameters

- `id`: The UUID of the event.

### Response Body (200 OK)

The response body will be the binary data of the PDF file. The browser will automatically trigger a download based on the following headers:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename=attendance_report_<event_id>.pdf`

### Example `curl`

```bash
curl -X GET http://localhost:8080/api/v1/reports/events/<event_id>/attendance.pdf \
  -H "Authorization: Bearer <your_access_token>" \
  --output report.pdf # Save the output to a file named report.pdf
```
