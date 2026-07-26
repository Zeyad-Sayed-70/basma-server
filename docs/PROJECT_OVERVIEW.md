# بصمة (Basma) — Educational Platform Server

## What Is Basma?

Basma (بصمة, meaning "fingerprint") is a multi-tenant, white-labeled educational platform backend that gives every Arabic-speaking teacher their own branded online school. Teachers get a fully isolated instance with their own groups, courses, students, brand, and payment system — free when small, paid when they grow.

The platform is built with **NestJS 11 + TypeScript**, uses **PostgreSQL 16** via **Prisma ORM**, **Redis** for BullMQ job queues, **MinIO** for S3-compatible file storage, and **Socket.IO** for real-time chat.

---

## Architecture

### Multi-Tenancy (Critical)

- **Shared DB, shared schema** — all tenant-aware tables have an `instanceId` column.
- `TenantMiddleware` extracts `instanceId` from the JWT (or `x-subdomain` header / hostname subdomain) and stores it in `TenantContext` (AsyncLocalStorage).
- `PrismaService` uses `$extends` query middleware that auto-injects `where.instanceId` on all tenant models for CRUD operations.
- Webhook route `payments/webhook/paymob/:instanceId` is explicitly excluded from tenant middleware.

### Tier System

Four tiers with Arabic-inspired names:

| Tier | Groups | Students | Courses | Sessions/mo | Price (monthly) |
|------|--------|----------|---------|-------------|-----------------|
| MUBTADI (مبتدئ / Beginner) | 1 | 20 | 3 | 10 | FREE |
| MUHTARIF (محترف / Professional) | 3 | 300 | 10 | 100 | 350 EGP |
| KHEBIR (خبير / Expert) | 10 | 1000 | 30 | 500 | 550 EGP |
| HOUT (حوت / Whale) | ∞ | ∞ | ∞ | ∞ | 950 EGP |

Feature gating includes: white-label, custom domain, payment management, AI agent, bulk import, curriculum, live chat, and WhatsApp session notifications.

When a tier limit is reached, new students join as **INACTIVE** (soft-gated, never hard-blocked). Upgrading the plan auto-activates them.

---

## Complete Module Inventory & Features

### 1. Authentication (`auth/`)
**Endpoints:** `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `PATCH /auth/profile`, `POST /auth/student/signup`, `POST /auth/student/login`, `GET /auth/student/me`

- Teacher signup creates a new instance (tenant) with auto-generated subdomain, brand, and teacher profile
- JWT-based authentication with access tokens (configurable expiry) and refresh tokens (30 days)
- Student signup via open group (by group ID) or invitation code (for CLOSED groups)
- Student login with email+password (if password was set during signup)
- Idempotent re-auth for returning students
- Passport.js `jwt` strategy + custom `RolesGuard`
- Profile updates (phone number)
- `Roles` decorator for `teacher`/`student`/`admin` role-based access

### 2. Groups (`groups/`)
**Endpoints:** `POST /groups`, `GET /groups`, `GET /groups/:id`, `PATCH /groups/:id`, `DELETE /groups/:id`, `POST /groups/:id/invitation-code`, `DELETE /groups/:id/invitation-code`

- CRUD for student groups, scoped to instance
- Two registration modes: OPEN (anyone can join) and CLOSED (invitation code required)
- Auto-generated 12-char hex invitation codes
- Tier-enforced group limits
- Group names must be unique within an instance
- Cascade-deletes students, courses, sessions, quizzes, assignments, and chat messages

### 3. Students (`students/`)
**Endpoints:** `POST /students`, `GET /students`, `GET /students/export`, `POST /students/import`, `POST /students/redeem-invitation`, `GET /students/:id`, `PATCH /students/:id`, `DELETE /students/:id`

- CRUD with instance-scoped email uniqueness
- Auto-enrolls into free courses (price = 0) within the same group on creation
- CSV export of student lists (filterable by group)
- Bulk import students from JSON array (gated by tier)
- Tier limit enforcement — students beyond limit created as INACTIVE
- Students strictly belong to one group (1:1, not many-to-many)
- Public invitation code redemption endpoint (no auth required)

### 4. Courses (`courses/`)
**Endpoints:** `POST /courses`, `GET /courses`, `GET /courses/:id`, `PATCH /courses/:id`, `DELETE /courses/:id`, `POST /courses/:id/image`, `DELETE /courses/:id/image`, `POST /courses/:id/enrollments`, `POST /courses/:id/enroll` (self-enroll), `DELETE /courses/:courseId/enrollments/:studentId`, `GET /courses/:id/enrollments`

- CRUD with optional pricing (free or paid), description, and image
- Image upload/delete via MinIO storage
- Teacher-managed enrollment (bulk enroll students)
- Student self-enrollment for free courses (price = 0)
- Auto-enrolls all group students when a free course is created or price changes to 0
- Enrollment verification/assertion for access control
- Scoped to group + instance

### 5. Sessions (`sessions/`)
**Endpoints:** `POST /sessions`, `GET /sessions`, `GET /sessions/:id`, `PATCH /sessions/:id`, `DELETE /sessions/:id`

- Two types: LOCAL (in-person, with location) and ONLINE (virtual, with platform + meeting URL)
- Supports Zoom, Google Meet, Microsoft Teams, and Other platforms
- Date range filtering and course filtering
- Session creation emits `session.created` event → triggers WhatsApp notifications
- Students see only sessions for courses they are enrolled in
- Monthly session limit enforced per tier

### 6. Quizzes (`quizzes/`)
**Endpoints:** `POST /quizzes`, `GET /quizzes`, `GET /quizzes/:id`, `PATCH /quizzes/:id`, `DELETE /quizzes/:id`, `POST /quizzes/:id/questions`, `GET /quizzes/:id/questions`, `PATCH /quizzes/:quizId/questions/:questionId`, `DELETE /quizzes/:quizId/questions/:questionId`, `POST /quizzes/:id/submit`, `GET /quizzes/:id/attempts`, `GET /quizzes/:id/attempts/:studentId`, `PATCH /quizzes/:id/attempts/:studentId/grade`

- Two question types: MCQ (Multiple Choice) and THEORY (written answer)
- MCQ questions are auto-graded immediately on submission
- THEORY questions require teacher manual grading
- One attempt per student per quiz (unique constraint enforced)
- Hidden correct answers from students (omitted in student responses)
- Quiz submission emits `quiz.graded` event when fully graded → triggers student notification
- Teachers can view all attempts and grade theory answers
- Question bank shared across the instance (instance-level)

### 7. Assignments (`assignments/`)
**Endpoints:** `POST /assignments`, `GET /assignments`, `GET /assignments/:id`, `PATCH /assignments/:id`, `DELETE /assignments/:id`, `POST /assignments/:id/submissions`, `GET /assignments/:id/submissions`, `GET /assignments/:id/submissions/:studentId`, `PATCH /assignments/:assignmentId/submissions/:studentId/grade`

- Text and/or file submission support (files stored in MinIO)
- Optional due date
- One submission per student per assignment
- Teacher grading with score and feedback
- Grading emits `assignment.graded` event → triggers student notification
- Students see only assignments for courses they are enrolled in

### 8. Gradebook (`gradebook/`)
**Endpoints:** `GET /gradebook/courses/:courseId`, `GET /gradebook/groups/:groupId`, `GET /gradebook/students/:studentId`

- Aggregated view of all quiz scores and assignment grades
- Course-level gradebook: all enrolled students with per-quiz and per-assignment scores
- Group-level gradebook: cross-course aggregation for an entire group
- Student-level gradebook: individual performance across all enrolled courses
- Calculates percentages and overall averages

### 9. Curriculum (`curriculum/`)
**Endpoints:**
- `POST /courses/:courseId/curriculum`, `GET /courses/:courseId/curriculum`, `PATCH /curriculum/:id`, `DELETE /curriculum/:id`
- `POST /curriculum/:id/elements/video`, `POST /curriculum/:id/elements/file`, `POST /curriculum/:id/elements/rich-content`
- `POST /curriculum/:id/elements/quiz/:quizId`, `POST /curriculum/:id/elements/assignment/:assignmentId`, `POST /curriculum/:id/elements/session/:sessionId`
- `POST /curriculum/:id/elements/upload-image`, `POST /curriculum/:id/reorder`
- `PATCH /elements/:id`, `PATCH /elements/:id/replace-video`, `PATCH /elements/:id/replace-file`, `DELETE /elements/:id`
- `GET /elements/:id/job`, `POST /elements/:id/job/retry`, `GET /elements/:id/stream`, `GET /elements/:id/stream/:quality/:track`
- Progress: `GET /courses/:courseId/progress`, `GET /curriculum/:id/progress`, `POST /elements/:id/progress/start`, `PATCH /elements/:id/progress`, `POST /elements/:id/progress/complete`, `GET /courses/:courseId/students/:studentId/progress`

A structured, ordered course outline with mixed media types:

- **Video elements:** Upload video → async processing → YouTube upload via yt-dlp → multi-quality streaming bundle
- **File elements:** Upload PDF, DOCX, etc. stored in MinIO
- **Rich content elements:** Tiptap-compatible JSON content with allowlisted node types
- **Quiz/Assignment/Session attachments:** Link existing assessments and sessions into the curriculum
- **Reorder:** Drag-and-drop ordering of elements
- **Streaming:** Proxied video/audio streaming with Range header support (CDN URL never exposed)
- **Student progress tracking:** Per-element (NOT_STARTED / IN_PROGRESS / COMPLETED) and course-level aggregated progress (percentage)
- Video processing pipeline with yt-dlp for bundle generation, YouTube upload, and playlists

### 10. Brand (`brand/`)
**Endpoints:** `GET /brand`, `PATCH /brand`, `POST /brand/logo`, `DELETE /brand/logo`, `POST /brand/domain/verify`, `GET /brand/domain/status`, `DELETE /brand/domain`, `GET /brand/public/:subdomain`

- Per-instance brand customization: logo, primary/secondary colors, font family (defaults to Cairo)
- White-label toggle (gated by tier)
- Custom domain management with DNS TXT record verification
- Verification via `_basma.<domain>` TXT record lookup against Google/Cloudflare DNS
- Public brand info endpoint for anonymous visitors (by subdomain)
- Logo upload/delete via MinIO

### 11. Landing Page (`landing/`)
**Endpoints:** `GET /landing`, `PUT /landing`, `POST /landing/publish`, `POST /landing/unpublish`, `POST /landing/reset`, `POST /landing/media`, `GET /landing/public/by-subdomain/:subdomain`, `GET /landing/public/by-domain/:domain`

- Teacher's public-facing website with sections, SEO fields, and OG image
- DRAFT/PUBLISHED status management
- Publish validation for required fields
- AI-generated content from onboarding answers
- Media uploads for landing page images
- Public resolution by subdomain or custom domain (for frontend rendering)

### 12. Payments (`payments/`)
**Endpoints:**
- `POST /payments/paymob/configure`, `GET /payments/paymob/config`, `DELETE /payments/paymob/config`
- `POST /payments/methods`, `GET /payments/methods`, `GET /payments/methods/active`, `GET /payments/methods/:id`, `PATCH /payments/methods/:id`, `DELETE /payments/methods/:id`
- `POST /payments/pay`, `POST /payments/alternative/initiate`
- `POST /payments`, `GET /payments`, `GET /payments/stats`, `GET /payments/:id`
- `PATCH /payments/:id/student-confirm`, `PATCH /payments/:id/teacher-approve`, `PATCH /payments/:id/teacher-reject`
- `POST /payments/:id/cancel`, `POST /payments/:id/refund`
- **Public:** `POST /payments/webhook/paymob/:instanceId`, `GET /payments/return`

Multi-method payment system:
- **Paymob integration:** Full integration with Paymob payment gateway — intention creation, HMAC-verified webhooks, refunds, partial refunds, voids
- **Alternative payments:** Wallet (Vodafone Cash, Orange Cash, Etisalat Flous, We Pay) and Instapay — student transfers to teacher, confirms, teacher approves
- **Manual payments:** Offline/cash payments recorded directly as PAID
- Teacher payment methods: CRUD for wallet/Instapay accounts
- Paymob credentials: AES-256-GCM encrypted at rest; secret keys masked in API responses
- Webhook security: HMAC-SHA512 verification using per-instance HMAC secret
- Transaction lifecycle: PENDING → PROCESSING → PAID/FAILED → REFUNDED/VOIDED/CANCELLED
- Student confirmation + teacher approval workflow for alternative payments

### 13. WhatsApp Notifications (`notifications/`)
**Endpoints:** `POST /notifications`, `GET /notifications`, `GET /notifications/stats`, `GET /notifications/preferences`, `PATCH /notifications/preferences/:type`, `POST /notifications/announce`, `GET /notifications/:id`
- WhatsApp: `POST /notifications/whatsapp/connect`, `GET /notifications/whatsapp/status`, `GET /notifications/whatsapp/qr`, `DELETE /notifications/whatsapp/disconnect`

- WhatsApp-based notification system using **Baileys** (WhatsApp WebJS library)
- Notification types: SESSION_REMINDER, QUIZ_GRADED, ASSIGNMENT_DUE, CUSTOM
- Per-type enable/disable preferences
- QR code or pairing code connection flow
- Delivery tracking with logs (SENT/FAILED/PENDING, attempt count, error messages)
- Monthly notification limits per tier
- Announcements: send bulk messages to entire groups (active students with phone numbers)
- Stats dashboard: total/sent/failed/pending counts, breakdown by type
- Auto-sends notifications on session creation, quiz grading, and assignment grading via event listeners

### 14. Real-Time Chat (`chat/`)
**Endpoints:** `GET /chat/groups/:groupId/messages`, `POST /chat/groups/:groupId/files`, `DELETE /chat/messages/:id`, `GET /chat/unread`, `PATCH /chat/groups/:groupId/read`
**WebSocket (Socket.IO namespace `/chat`):** `joinGroup`, `leaveGroup`, `sendMessage`, `typing`

- Real-time group chat via Socket.IO with JWT authentication (via handshake token)
- Events: `newMessage` (broadcast), `typingIndicator`, `error`
- File uploads (max 10MB) to chat, stored in MinIO
- Paginated message history with cursor-based pagination
- Unread message counts per group
- Read markers with last-read timestamp
- Teachers can delete any message; students can delete their own
- Group membership validation for WebSocket connections

### 15. AI Agent (`ai-agent/`)
**Endpoints:** `GET /ai-agent/conversations`, `POST /ai-agent/conversations`, `GET /ai-agent/conversations/:id`, `GET /ai-agent/conversations/:id/messages`, `PATCH /ai-agent/conversations/:id`, `DELETE /ai-agent/conversations/:id`, `POST /ai-agent/conversations/:id/messages`, `GET /ai-agent/agent.md`, `PUT /ai-agent/agent.md`, `GET /ai-agent/teacher/conversations`

- AI-powered student tutoring assistant using the **OpenCode SDK**
- Server-Sent Events (SSE) streaming for real-time chat responses
- Per-teacher `agent.md` configuration file for customizing AI behavior
- Conversation management: create, list, get messages, archive
- Teacher can view all student conversations
- Context-aware AI that references student profile, performance, and notes

### 16. Agent Space (`agent-space/`)
**Endpoints:** `GET /agent-space/files`, `GET /agent-space/files/:id`, `POST /agent-space/files`, `PATCH /agent-space/files/:id`, `DELETE /agent-space/files/:id`, `GET /agent-space/search`

- Teacher's file space for the AI agent — `.md` and `.txt` files
- Full-text search across files
- Provides reference material for the AI agent to use during conversations

### 17. Agent Student Data (`agent-student-data/`)
**Endpoints:** `GET /agent-student-data/:studentId/notes`, `POST /agent-student-data/notes`, `GET /agent-student-data/:studentId/profile`, `PATCH /agent-student-data/:studentId/profile`, `GET /agent-student-data/:studentId/memory`

- AI agent's knowledge base about each student
- Structured notes per student with categories (general, academic, behavioral, etc.)
- Synthesized student profiles (JSON) with custom fields
- "Student Memory" endpoint combines profile + recent notes for AI context
- Notes can be tagged with source (agent, teacher, session)

### 18. Admin Panel (`admin/`)
**Endpoints:** `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`, `GET /api/admin/instances`, `GET /api/admin/instances/:id`, `GET /api/admin/instances/:id/usage`, `GET /api/admin/instances/:id/logs`, `PATCH /api/admin/instances/:id/tier`, `POST /api/admin/instances/:id/renew`, `GET /api/admin/feedbacks`, `GET /api/admin/stats`
**Server-rendered pages:** `GET /admin/login`, `GET /admin`, `GET /admin/instances`, `GET /admin/instances/:id`, `GET /admin/feedbacks`

- Full admin dashboard with EJS server-rendered views and static assets
- Instance management: list/search, detail view, usage statistics, and tier change logs
- Tier management: upgrade/downgrade/renew plans with billing history
- Usage tracking per instance: groups, students, courses, sessions, quizzes, assignments, notifications, file storage
- Platform-wide statistics: total instances, teachers, students, groups, tier breakdown
- Feedback management with instance context
- Admin JWT with 8-hour expiry stored in httpOnly cookie
- Separate Passport strategy (`admin-jwt`)

### 19. Feedback (`feedback/`)
**Endpoints:** `POST /feedback`

- Users (teachers and students) can submit product feedback
- Categories: BUG, FEATURE_REQUEST, GENERAL
- Automatically captures sender role and name from JWT
- Admin dashboard for viewing all feedback

### 20. Onboarding (`onboarding/`)
**Endpoints:** `GET /onboarding`, `PUT /onboarding/answers`, `POST /onboarding/generate`, `POST /onboarding/publish`, `POST /onboarding/skip`

- Guided onboarding flow for new teachers
- Save answers to structured onboarding questions
- AI-powered landing page content generation from onboarding answers
- Publish landing page and mark onboarding as complete
- Skip option to bypass onboarding

### 21. Meetings (`meetings/`)
**Endpoints:** `POST /meetings`, `GET /meetings`, `GET /meetings/admin`, `PATCH /meetings/:id`, `DELETE /meetings/:id`

- Teachers can request meetings with the Basma team
- Admin manages requests: confirm, add notes, complete
- Teachers can cancel their own requests
- Conflict detection for overlapping requests

### 22. YouTube Integration (`youtube/`)
**Endpoints:** `GET /youtube/channel`, `GET /youtube/cookies/status`

- YouTube channel OAuth2 authentication
- Uploads processed videos to YouTube via yt-dlp
- Channel info retrieval and cookie file status monitoring

### 23. Tasks (`tasks/`)
**Endpoints:** `GET /tasks`

- Getting-started checklist for teachers
- Tasks auto-complete based on live data (e.g., "Create your first group" checks if any groups exist)
- Guide for new teachers through initial setup

### 24. Health (`health/`)
**Endpoints:** `GET /api/health`

- Server and database health check
- Runs `SELECT 1` query against PostgreSQL to verify DB connectivity

### 25. Domain Check (`domain-check/`)
**Endpoints:** `GET /domain-check?domain=...`

- Returns 204 if domain is verified (for Caddy `on_demand_tls`)
- Returns 404 if domain not found or unverified
- Used by the reverse proxy for automatic TLS certificate issuance

### 26. File Storage (`minio/`)
- S3-compatible file storage via MinIO client
- Automatic bucket creation with public-read policy on startup
- File upload, delete, and URL generation
- Tier-based storage limit enforcement (checks total storage across all file types)
- Used by: brand logos, course images, curriculum files/videos/images, chat files, assignment submissions

### 27. Common / Shared (`common/`)
- `TenantContext`: AsyncLocalStorage-based tenant context with instance ID and subdomain
- `TenantMiddleware`: Extracts tenant from JWT, `x-subdomain` header, or hostname subdomain
- `TierFeatureService`: Resource limit checking and feature flag evaluation
- `TierExpiryGuard`: Global guard that checks tier expiry with 7-day grace period
- `GlobalExceptionFilter`: Standardized error responses
- `Tier-limits` constants: Comprehensive tier configuration with limits, features, pricing, and display names

---

## Infrastructure

### Docker Services (from `docker-compose.yml`)
- **PostgreSQL 16** — primary database
- **Redis** — BullMQ job queues and caching
- **MinIO** — S3-compatible file storage

### CI Pipeline (GitHub Actions)
Order: `npx prisma generate` → `npx prisma db push` → `npm run lint` → `npm run build` → `npm test`

### Deployment
- `Caddyfile` — reverse proxy with automatic TLS via Caddy
- `ecosystem.config.js` — PM2 process manager configuration
- `Dockerfile` / `deploy/` — deployment configuration

---

## API Specifications

- Global prefix: `/api` (except admin routes)
- Validation: `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- OpenAPI spec auto-generated at `openapi-spec.json` on startup
- Swagger UI at `/api/docs`
- Security: Helmet middleware, CORS with subdomain support, cookie-parser

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| API Docs | Swagger / OpenAPI |
| Caching/Queues | Redis + BullMQ |
| File Storage | MinIO (S3-compatible) |
| Real-time | Socket.IO |
| Auth | JWT (Passport) |
| Notifications | Baileys (WhatsApp WebJS) |
| Payments | Paymob |
| AI | OpenCode SDK |
| Video Processing | yt-dlp, FFmpeg |
| Admin UI | EJS templates |
