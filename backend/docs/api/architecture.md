
# System Architecture Overview

This document provides a high-level overview of the AttendWise system architecture, its components, and the communication patterns between them.

## 1. Core Principles

The system is designed as a **Microservices Architecture**. This approach offers several advantages:
- **Scalability**: Each service can be scaled independently based on its specific load.
- **Resilience**: Failure in one service is less likely to bring down the entire system.
- **Technology Flexibility**: Each service can be built with the best technology for its purpose (e.g., Go for high-concurrency networking, Python for AI/ML).
- **Maintainability**: Smaller, focused services are easier to understand, develop, and maintain.

## 2. System Components

The architecture consists of several key services that work together.

```mermaid
graph TD
    subgraph User Interaction
        Client[Client App (Web/Mobile)];
    end

    subgraph Backend Services
        Gateway[API Gateway (Go)];
        subgraph Core Services
            UserService[UserService (Go, PostgreSQL)];
            CommunityService[CommunityService (Go, PostgreSQL + Neo4j)];
            SchedulingService[SchedulingService (Go, PostgreSQL)];
            CheckinService[CheckinService (Go, PostgreSQL)];
        end
        subgraph AI Services
            AIService[AIService (Python, PyTorch/TensorFlow)];
        end
        subgraph Real-time & Async
            RealtimeSvc[RealtimeService (Go, WebSockets)];
            NATS[NATS JetStream];
            NotificationService[NotificationService (Go)];
        end
    end

    subgraph Data Stores
        Postgres[(PostgreSQL)];
        Neo4j[(Neo4j)];
        MinIO[(MinIO for Media)];
    end

    Client -- HTTP/GraphQL --> Gateway;
    Gateway -- gRPC --> UserService;
    Gateway -- gRPC --> CommunityService;
    Gateway -- gRPC --> SchedulingService;
    Gateway -- gRPC --> CheckinService;
    
    CheckinService -- gRPC --> AIService;

    Client -- WebSocket --> RealtimeSvc;
    
    CommunityService -- Publishes Event --> NATS;
    CheckinService -- Publishes Event --> NATS;
    
    RealtimeSvc -- Subscribes to --> NATS;
    NotificationService -- Subscribes to --> NATS;

    UserService -- CRUD --> Postgres;
    CommunityService -- CRUD --> Postgres;
    CommunityService -- Graph Ops --> Neo4j;
    SchedulingService -- CRUD --> Postgres;
    CheckinService -- CRUD --> Postgres;

    %% Media uploads would go to a service that returns a presigned URL for MinIO
    Gateway -- Generates Presigned URL --> MinIO;

```

### Component Descriptions

- **API Gateway (Go)**: The single entry point for all client requests. It handles Authentication, Rate Limiting, Request Validation, and routing requests to the appropriate internal microservice via gRPC.

- **UserService (Go)**: Manages user profiles, registration, login, and authentication logic. It is the source of truth for user data, stored in PostgreSQL.

- **CommunityService (Go)**: Manages communities, posts, comments, and social graph interactions (likes, follows). It uses PostgreSQL for transactional data and **Neo4j** for efficiently querying social relationships (e.g., generating a news feed).

- **SchedulingService (Go)**: Handles the creation and management of events, especially complex recurring events (e.g., "every Tuesday for 4 weeks"). It generates individual `event_sessions` based on recurrence rules.

- **CheckinService (Go)**: Orchestrates the entire check-in process. It generates tickets (QR codes), validates them, consumes nonces to prevent replay attacks, and calls the `AIService` for verification.

- **AIService (Python)**: A dedicated service for all Machine Learning tasks. It exposes gRPC endpoints for:
    - **Liveness Detection**: Verifying that a user is a live person during enrollment.
    - **Face Recognition**: Matching a user's face at check-in with their enrolled template.

- **NATS JetStream**: A high-performance messaging system used as an event bus. Services publish events (e.g., `checkin.successful`, `post.created`) to NATS. Other services can subscribe to these events to perform asynchronous tasks, decoupling the services from each other.

- **RealtimeService (Go)**: Manages persistent WebSocket connections with clients. It subscribes to NATS events to push live updates to the appropriate users (e.g., updating a host's dashboard in real-time when a user checks in).

- **NotificationService (Go)**: A background service that subscribes to NATS events to send notifications (Email, Push, SMS) to users (e.g., event reminders, new message alerts).

## 3. Communication Patterns

- **Client to Gateway (HTTP/GraphQL)**: Clients communicate with the backend via standard HTTP or GraphQL requests to the API Gateway. This is ideal for web and mobile applications.

- **Internal Services (gRPC)**: Communication between the Gateway and internal Go services, and between Go services and the Python AI service, is done via **gRPC**. This offers high performance, low latency, and strongly-typed API contracts defined in `.proto` files.

- **Asynchronous Events (NATS)**: For tasks that don't need to be synchronous (like sending notifications or updating dashboards), services publish events to NATS. This makes the system more resilient and responsive.

## 4. Key Workflows

### User Enrollment Flow (with Liveness)

1.  **Client -> Gateway**: `GET /users/enroll-challenge`
2.  **Gateway -> UserService -> AIService**: `StartLivenessChallenge()` gRPC call.
3.  **AIService**: Generates a session ID and a list of challenges (e.g., `["front", "smile"]`).
4.  **Client**: Receives challenges, opens the camera, and instructs the user.
5.  **Client -> Gateway**: For each challenge, sends a frame via `POST /users/me/enroll-face`.
6.  **Gateway -> UserService -> AIService**: `SubmitLivenessVideo()` gRPC call with the frame.
7.  **AIService**: Validates the frame against the current challenge.
    - If incorrect, returns `CHALLENGE_FAILED_RETRY`.
    - If correct but not the last, returns `CHALLENGE_PASSED_CONTINUE`.
    - If correct and the last, it generates the face embedding from the frontal frame and returns `success: true`.
8.  **UserService**: Saves the final embedding to the PostgreSQL database.

### AI Check-in Flow

1.  **Client -> Gateway**: `POST /checkin` with QR payload and a new face picture (`image_data`).
2.  **Gateway -> CheckinService**: `VerifyCheckinFromQR()` gRPC call.
3.  **CheckinService**:
    a. Parses the JWT from the QR payload to get `userID`, `sessionID`, and `nonce`.
    b. Atomically consumes the `nonce` in the database to prevent reuse.
    c. Retrieves the user's stored face embedding from the database.
    d. Makes a gRPC call to `AIService.RecognizeFace()` with the new picture and the stored embedding.
4.  **AIService**: Compares the faces and returns a `verified: true/false` result.
5.  **CheckinService**:
    a. Based on the AI result, updates the `event_session_checkins` table in PostgreSQL with the final status (`success`/`failed`) and the confidence score.
    b. Publishes a `checkin.successful` event to NATS.
6.  **RealtimeService & NotificationService**: Receive the NATS event and act accordingly (update dashboard, send confirmation).
7.  **CheckinService -> Gateway -> Client**: Returns the final success/failure response.
