# Basma (بصمة) - Backend Implementation Plan

---

## Technical Stack

| Layer | Choice |
|-------|--------|
| **Framework** | NestJS (Node.js + TypeScript, strict mode) |
| **Database** | PostgreSQL 16 via Docker |
| **ORM** | Prisma (type-safe migrations, middleware for multi-tenancy) |
| **Real-time** | Socket.IO via `@nestjs/websockets` (Live Chat) |
| **Caching** | Redis via Docker (sessions, rate limiting, cache) |
| **File Storage** | MinIO via Docker (S3-compatible, self-hosted) |
| **Notifications** | WhatsApp Business API |
| **API Docs** | `@nestjs/swagger` → OpenAPI spec → auto-generate TypeScript client for frontend |
| **Validation** | `class-validator` + `class-transformer` via global `ValidationPipe` |
| **Auth** | JWT (`@nestjs/jwt`, `@nestjs/passport`) |
| **CI/CD** | GitHub Actions |
| **Linting** | ESLint + Prettier + Husky + lint-staged |

---

## Multi-Tenancy Strategy

- **Shared database, shared schema** — each tenant-aware table has an `instanceId` column.
- `REQUEST`-scoped NestJS providers extract the instance context from subdomain / header / JWT.
- Prisma middleware automatically scopes **every query** to the current instance — leak-proof by default.
- **Student-to-Group**: strictly one-to-one (enforced at DB constraint level).
- **Instance isolation**: a student in Teacher A's platform cannot exist in Teacher B's platform.

---

## Phase 0: Project Initialization & DevOps Foundation

**Goal:** A running NestJS app connected to PostgreSQL with Swagger working and CI ready.

- [ ] Scaffold NestJS project with TypeScript strict mode
- [ ] Docker Compose file — PostgreSQL 16, Redis, MinIO
- [ ] Environment configuration via `@nestjs/config` + `.env.template`
- [ ] Prisma schema design (entities, relations, multi-tenancy scaffold)
- [ ] Prisma migrations + seed script with test data
- [ ] Swagger / OpenAPI setup (`@nestjs/swagger`)
- [ ] Auto-generation script: `npm run gen:api` — reads OpenAPI spec → writes `api-client.ts`
- [ ] Global `ValidationPipe` with `class-validator` + `class-transformer`
- [ ] Health check endpoint (`/health`)
- [ ] Global exception filter + structured logging (Pino)
- [ ] ESLint, Prettier, Husky, lint-staged
- [ ] GitHub Actions CI — lint → test → build
- [ ] `README.md` with setup instructions

---

## Phase 1: Multi-Tenancy & Authentication

**Goal:** Teachers can sign up, log in, and every subsequent request is scoped to their instance.

- [ ] Instance entity (`id`, `name`, `subdomain`, `tier`, `settings`, timestamps)
- [ ] Teacher entity (`id`, `email`, `passwordHash`, `name`, `lang`, `instanceId`, timestamps)
- [ ] JWT authentication module (sign-up, login, refresh token)
- [ ] Multi-tenancy middleware: extract `instanceId` from subdomain / JWT claim and inject into context
- [ ] Instance-aware Prisma middleware: auto-append `where: { instanceId }` to all queries
- [ ] Role-based access control — `@Roles('teacher', 'student')` guard
- [ ] Password hashing with bcrypt
- [ ] Swagger decorators on all auth endpoints

---

## Phase 2: Groups & Students

**Goal:** Teachers create groups and manage students within them, with tier enforcement.

- [ ] Group entity (`id`, `name`, `description`, `instanceId`, timestamps)
- [ ] Student entity (`id`, `name`, `email`, `phone`, `status: active/inactive`, `groupId`, `instanceId`, timestamps)
- [ ] Group CRUD (create, read, update, delete — scoped to instance)
- [ ] Student CRUD (scoped to group, scoped to instance)
- [ ] Tier enforcement — group limit per plan, student limit (excess → inactive)
- [ ] Bulk import students via CSV
- [ ] Export students to CSV
- [ ] Student registration modes: open (public sign-up) / closed (invitation only)
- [ ] Invitation link generation + redemption

---

## Phase 3: Courses & Sessions

**Goal:** Teachers create courses inside groups, schedule sessions, and get auto-notifications.

- [ ] Course entity (`id`, `title`, `description`, `price`, `groupId`, `instanceId`, timestamps)
- [ ] Session entity (`id`, `title`, `startTime`, `endTime`, `location`, `notes`, `courseId`, `instanceId`, timestamps)
- [ ] Course CRUD
- [ ] Session CRUD
- [ ] Student enrollment in courses (many-to-many within same group)
- [ ] Session creation triggers notification event (picked up in Phase 6)

---

## Phase 4: Quizzes & Assignments

**Goal:** Create quizzes and assignments, students submit, teacher grades.

- [ ] Quiz entity (`id`, `title`, `totalMarks`, `courseId`, `instanceId`, timestamps)
- [ ] Question entity within quiz (`text`, `type: mcq/theory`, `options`, `correctAnswer`, `marks`)
- [ ] StudentQuizAttempt entity (`studentId`, `quizId`, `score`, `answers`, `submittedAt`)
- [ ] Auto-grading for MCQ questions
- [ ] Assignment entity (`id`, `title`, `description`, `dueDate`, `courseId`, `instanceId`, timestamps)
- [ ] StudentAssignmentSubmission entity (`studentId`, `assignmentId`, `content`, `fileUrl`, `grade`, `feedback`, timestamps)
- [ ] Student submission (text + file upload to MinIO)
- [ ] Teacher grading + feedback workflow
- [ ] Gradebook endpoint — results per student, per course, per group

---

## Phase 5: Brand Management

**Goal:** Each teacher customizes their platform's look and feel; free tier shows Basma branding.

- [ ] Brand entity (`id`, `logoUrl`, `primaryColor`, `secondaryColor`, `fontFamily`, `customDomain`, `whiteLabelEnabled`, `instanceId`, timestamps)
- [ ] Brand CRUD
- [ ] Logo file upload to MinIO
- [ ] Custom domain mapping
- [ ] White-label toggle: `whiteLabelEnabled = false` → "Powered by Basma" footer forced
- [ ] Tier gating: free tier cannot disable Basma branding

---

## Phase 6: Notifications

**Goal:** Auto-notify students via WhatsApp when sessions are created or other events happen.

- [ ] Notification entity (`id`, `type`, `title`, `body`, `recipientPhone`, `status: pending/sent/failed`, `instanceId`, timestamps)
- [ ] WhatsApp Business API integration client
- [ ] Notification templates (session reminder, quiz graded, assignment due, custom)
- [ ] Teacher notification preferences per instance (toggle per event type)
- [ ] Auto-send on session creation (if enabled)
- [ ] Manual teacher announcements to group(s)
- [ ] Notification delivery logs + retry mechanism

---

## Phase 7: Payments

**Goal:** Track student payments for paid courses (manual entry by teacher, no gateway yet).

- [ ] Payment entity (`id`, `studentId`, `courseId`, `amount`, `currency`, `status: paid/pending/refunded`, `notes`, `instanceId`, timestamps)
- [ ] Payment CRUD (teacher-managed)
- [ ] Payment reports (per course, per student, per period)
- [ ] Tier gating: payment management hidden on free tier

---

## Phase 8: Questions Bank

**Goal:** Instance-level question pool that can be reused across quizzes in any group.

- [ ] QuestionBank entity (`id`, `text`, `type: mcq/theory`, `options`, `correctAnswer`, `category`, `difficulty`, `instanceId`, timestamps)
- [ ] Question Bank CRUD (instance-level, cross-group)
- [ ] Categories + tags for organization
- [ ] Import questions from existing quizzes and vice versa
- [ ] Search / filter by category, difficulty, type

---

## Phase 9: Live Chat

**Goal:** Real-time group chat for teacher + students within the same group.

- [ ] Message entity (`id`, `senderId`, `senderRole: teacher/student`, `groupId`, `content`, `type: text/file`, `fileUrl`, `instanceId`, timestamps)
- [ ] Socket.IO gateway — group-scoped rooms
- [ ] Real-time messaging (send / receive within group)
- [ ] Message persistence and pagination (load history)
- [ ] Typing indicators
- [ ] File sharing in chat (upload to MinIO)
- [ ] Unread counts

---

## Phase 10: Analytics & AI

**Goal:** Aggregate data for teacher dashboards and generate AI-powered insights.

- [ ] Student performance analytics (quiz scores, assignment grades, attendance trends)
- [ ] Course analytics (avg score, completion rate, student count)
- [ ] Group analytics (overview + compare groups)
- [ ] Dashboard aggregation endpoints (stats per instance)
- [ ] AI insights engine:
  - Collect relevant student/course data
  - Send to LLM (OpenAI / Azure OpenAI)
  - Return actionable tips for the teacher
- [ ] Export reports (PDF / CSV)

---

## Phase 11: Hardening & Production Readiness

**Goal:** Secure, stable, observable production deployment.

- [ ] Rate limiting (`@nestjs/throttler`)
- [ ] CORS configuration, Helmet, CSRF protection
- [ ] File upload size limits + type validation + virus scanning (ClamAV)
- [ ] Input sanitization + XSS protection
- [ ] Security audit — auth flows, data isolation edge cases, injection vectors
- [ ] Prisma query performance — N+1 prevention, index audit
- [ ] Database indexes for all frequent query patterns
- [ ] Database backup & restore scripts (automated)
- [ ] Multi-stage Docker build for production
- [ ] Monitoring — health checks, request logging, error tracking (Sentry)

---

## Swagger → Frontend Workflow

Auto-generating a fully typed API client keeps frontend and backend in perfect sync.

1. **Every endpoint** decorated with `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBody`, `@ApiParam`
2. **DTO classes** annotated with `@ApiProperty` so the generated spec includes full request/response shapes
3. On server start (or via `npm run gen:api`):
   - `@nestjs/swagger` writes `openapi-spec.json`
   - A codegen tool (e.g. `@rtk-query/codegen-openapi` or `openapi-typescript`) consumes the spec
   - Produces a single `api-client.ts` with typed request functions + DTO types + React hooks (if using RTK Query)
4. Frontend imports the file — **zero manual API typing, always up-to-date**

This workflow eliminates endpoint drift between backend and frontend, and makes it trivial for the frontend team to consume any new endpoint immediately.

---

## Entity Relationship Overview

```
Instance (1) ────────── Brand (1)
     │
     ├── Questions Bank (many)
     ├── Notifications (many)
     ├── Payments (many)
     │
     └── Group (many)
           │
           ├── Student (many)  ← one-to-one with Group
           ├── Course (many)
           │     ├── Session (many)
           │     ├── Quiz (many)
           │     └── Assignment (many)
           │
           └── Live Chat Messages (many)
```

Every entity above Instance level has `instanceId` — Prisma middleware ensures all queries are automatically filtered by the current tenant.
