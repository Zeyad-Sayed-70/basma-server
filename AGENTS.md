# Basma (بصمة) — Agent Guide

## Setup flow (order matters)

```bash
docker compose up -d                         # PostgreSQL, Redis, MinIO
npm install
npm run prisma:generate                      # before migrations
npm run prisma:migrate                       # prisma migrate dev
npm run prisma:seed                          # creates demo instance + teacher
npm run start:dev                            # nest start --watch
```

- Prisma client must be regenerated after schema changes (`npm run prisma:generate`)
- Demo seed: teacher `teacher@basma.demo` / `Demo@123`, subdomain `demo`
- `.env` is in `.gitignore` — copy `.env.template`

## CI pipeline (`.github/workflows/ci.yml`)

Order: `npx prisma generate` → `npx prisma db push` → `npm run lint` → `npm run build` → `npm test`

CI spins up a PostgreSQL service container. E2e tests (`npm run test:e2e`) are **not** in CI flow. Tests need `DATABASE_URL` set (uses `basma_test` DB).

## Commands

| Purpose | Command |
|---------|---------|
| Dev server | `npm run start:dev` |
| Lint (with fix) | `npm run lint` |
| Format | `npm run format` (Prettier) |
| Build | `npm run build` |
| Unit tests | `npm test` |
| E2e tests | `npm run test:e2e` (needs DB) |
| Regenerate OpenAPI spec | `npm run gen:api` |
| Prisma Studio | `npm run prisma:studio` |
| Prisma push (no migration) | `npm run prisma:push` |

- Jest config is **in `package.json`** (not `jest.config.ts`): `rootDir: "src"`, test regex `.*\.spec\.ts$`
- E2e jest config at `test/jest-e2e.json`
- E2e test (`test/app.e2e-spec.ts`) **mocks NotificationsModule** — import pattern matters for tests

## Architecture

### Multi-tenancy (critical)

- **Shared DB, shared schema** — all tenant-aware tables have `instanceId`
- `TenantMiddleware` extracts `instanceId` from JWT (or `x-subdomain` header / hostname subdomain) and stores it in `TenantContext` (AsyncLocalStorage)
- `PrismaService` uses `$extends` query middleware that auto-injects `where.instanceId` on all tenant models for `findMany`/`findFirst`/`findUnique`/`count`/`aggregate`/`update`/`updateMany`/`delete`/`deleteMany`
- Tenant models list: `src/prisma/prisma.service.ts:5-27`
- Webhook route `payments/webhook/paymob/:instanceId` is explicitly excluded from tenant middleware

### Module map (all in `src/`)

| Module | Purpose |
|--------|---------|
| `auth/` | JWT auth (teacher + student signup/login/refresh), Passport `jwt` strategy |
| `prisma/` | Global PrismaService with tenant-scoping middleware |
| `common/` | TenantContext, TenantMiddleware, GlobalExceptionFilter, tier limits |
| `groups/` | Group CRUD (scoped to instance) |
| `students/` | Student CRUD (scoped to group + instance) |
| `courses/` | Course CRUD (scoped to group + instance) |
| `sessions/` | Session CRUD (triggers notifications) |
| `quizzes/` | Quiz + auto-grading (MCQ) |
| `assignments/` | Assignment submission + grading |
| `gradebook/` | Aggregated results |
| `brand/` | Per-instance branding (logo, colors, fonts, white-label) |
| `minio/` | S3-compatible file storage |
| `notifications/` | WhatsApp-based (Baileys) notifications |
| `payments/` | Paymob integration |
| `chat/` | Socket.IO live chat (namespace `/chat`, JWT via handshake) |
| `agent-space/` | Agent file space |
| `agent-student-data/` | Agent student notes |
| `ai-agent/` | AI agent integration |
| `health/` | Health check endpoint at `GET /api/health` |

### Notable

- Global prefix: `api` (`main.ts:20`)
- ValidationPipe: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- Swagger: auto-decorated via `@nestjs/swagger` plugin in `nest-cli.json` + manual `@ApiTags`/etc
- OpenAPI spec auto-written to `openapi-spec.json` on startup
- Chat gateway JWT auth via `socket.handshake.auth.token`
- ESLint: `recommendedTypeChecked` ruleset, `no-explicit-any` off, `no-floating-promises` warn, `endOfLine: auto`
- Prettier: `singleQuote: true`, `trailingComma: "all"`
- `sourceType: 'commonjs'` in ESLint (despite NestJS using ES modules internally)

## Key entities (Prisma schema: `prisma/schema.prisma`)

- `Instance` → owns everything. Fields: `subdomain` (unique), `tier` (FREE/MID/BIG/HUGE)
- `Teacher` → one per Instance (1:1)
- `Group` → belongs to Instance, has `registrationMode` (OPEN/CLOSED), optional `invitationCode`
- `Student` → belongs to one Group (strictly 1:1), has `status` (ACTIVE/INACTIVE)
- `Course` → belongs to Group
- `Session` → belongs to Course, has `type` (LOCAL/ONLINE) + platform for online
- `Quiz`/`Assignment` → belongs to Course
- `Brand` → 1:1 with Instance, `whiteLabelEnabled` gated by tier
- `PaymobConfig` → 1:1 with Instance (encrypted credentials)
- `ChatMessage`/`ChatReadMarker` → scoped to Group + Instance
- `AgentSpaceFile`, `AgentStudentNote`, `AgentConversation`, `AgentMessage` → AI agent models
- Tier limits (`src/common/constants/tier-limits.ts`): FREE (1 group, 10 students), MID (5/50), BIG (20/200), HUGE (∞/∞)

## Reference docs in `docs/`

- `DNA.md` — product and domain model overview
- `BRAIN_DUMP.md` — product vision, business rules, tiers
- `baileys.txt` — WhatsApp/Baileys integration deep guide
- `paymob.txt` — Paymob payment integration guide (multi-tenant patterns)
- `opeccodesdk.txt` — OpenCode SDK usage guide (for AI agent module)
- `plan.md` — implementation roadmap by phase

## Prisma schema changes

After editing `prisma/schema.prisma`:
1. `npm run prisma:generate`
2. `npm run prisma:migrate` (creates a new migration)
3. `npm run prisma:seed` (re-seeds if needed)
