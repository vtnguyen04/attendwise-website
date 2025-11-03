
# Project Specification: Community Platform and Smart Event Management System

## I. Project Goal

The objective is to build an integrated social networking and event management platform. It will enable user interaction through news feeds and messaging while providing comprehensive tools for creating and managing classes/events. A core feature is the **Smart Attendance System**, which uses a highly secure combination of QR code scanning, facial recognition (FaceID), and liveness detection to prevent fraud.

## II. User Roles and Permissions

| Role | Responsibilities |
| :--- | :--- |
| **System Admin** | Top-level administration, overall system management, security setup, and global limits configuration. |
| **Community Admin (Host/Instructor)** | Create and manage communities, events, and classes. Approve members, manage attendees. View and export attendance and interaction reports. |
| **User (Member)** | Join communities, register for events/classes. Interact on the news feed and chat. Perform check-in for attendance. |
| **Moderator** | Moderate post content and comments. Handle violation reports within the community. |

## III. Core Functional Requirements

### 3.1. News Feed and Discussion
*   **Multi-Format Posts:** Support text, photos, videos, and file attachments.
*   **Interactions:** Threaded comments, mention functionality (`@`), and hashtags.
*   **Smart Filtering:** Filter content by specific community, event, or class.
*   **Post Privacy:** Set posts as Public, Community-only, or Class-member-only.

### 3.2. Messaging (Chat)
*   **Types:** 1-to-1 private chat and Group chat (tied to a community/class).
*   **Media Support:** Send photos, files, and voice messages.
*   **Group Management:** Add/remove members, mute notifications, pin messages.
*   **Moderation:** Report violations and block users.

### 3.3. Event & Class Management
*   **Flexible Event Creation:** Set up essential information (name, description, location [offline/online], time).
*   **Recurring Schedule:** Configure events to repeat daily, weekly, or via custom sessions. Each recurrence is treated as a distinct "session" sub-event.
*   **Attendee Management:**
    *   Set registration mode to Open or Whitelist-only (registration by invitation/list).
    *   Set maximum attendance limits.
*   **Ticketing and Reminders:**
    *   Automatically issue a QR code ticket (including a fallback code) via email upon successful registration.
    *   Send automated reminders (default: 1 day and 15 minutes prior), with customizable timing options.

### 3.4. Smart Attendance Process (Check-in)
*   **Step 1: Code Scan:** User scans the QR code on their ticket (or enters the fallback code).
*   **Step 2: Facial Verification:** The system requires FaceID authentication and performs a random liveness challenge (e.g., blink, turn head) to prevent spoofing.
*   **Step 3: Recording:** If valid, the system records the attendance for the specific session/event and immediately invalidates the QR code for future use.

### 3.5. Management Dashboard & Reporting (for Host/Instructor)
*   **Real-time Monitoring:** Track the number of users who have checked in, are waiting, or are late.
*   **Detailed Reporting:**
    *   Statistics on attendance rates, no-show rates, and check-in success/failure rates.
    *   Performance analysis per session or for the entire event series.
    *   Export reports in CSV or PDF formats.

## IV. Data Structure and Access Logic

### 4.1. Data Relationship Constraint
*   **Community > Event:** An `Event` **must** belong to one `Community`. Orphaned events (events without a linked community) are not permitted.
*   Update the database schema and data models to enforce this one-to-many relationship (one Community can have many Events).

### 4.2. Access and Display Logic
*   **Community Visibility:** Users are allowed to browse and view (explore) a list of **all** `Communities` available on the platform.
*   **Event Visibility:** Users are **strictly prohibited** from viewing a list of all `Events` across the entire system. Users are **only permitted** to view `Events` that belong to the `Communities` they have **already joined**.
*   **Permissioning:** User access rights to an `Event` must be derived from two sources: their established role within the containing `Community` (e.g., admin, member) and their registration status for the specific `Event` (`registered`).
