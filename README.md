# بصمة (Basma)

Give every Arabic-speaking teacher their own white-labeled educational platform — for free when small, paid when they grow.

## Tech Stack

| Layer | |
|-------|-|
| Framework | NestJS 11 + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| API Docs | Swagger / OpenAPI |
| Caching | Redis |
| File Storage | MinIO (S3-compatible) |
| Real-time | Socket.IO |
| Auth | JWT |

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL, Redis, MinIO)

## Setup

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run database migrations
npm run prisma:migrate

# 5. Seed demo data
npm run prisma:seed

# 6. Start dev server
npm run start:dev
```

The API will be available at `http://localhost:3000/api` and Swagger docs at `http://localhost:3000/api/docs`.

## Generating the API client for Frontend

The OpenAPI spec is automatically written to `openapi-spec.json` when the server starts. To regenerate it manually:

```bash
npm run gen:api
```

This file can be consumed by tools like `openapi-typescript` or `@rtk-query/codegen-openapi` to produce a fully typed TypeScript client.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start with watch mode |
| `npm run build` | Compile to dist/ |
| `npm run lint` | ESLint + fix |
| `npm run test` | Unit tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run migrations |
| `npm run prisma:seed` | Seed demo data |
| `npm run prisma:studio` | Prisma Studio GUI |
| `npm run gen:api` | Generate OpenAPI spec |

## Architecture

Multi-tenant from day one. Each teacher gets an isolated instance with their own brand, groups, courses, and students. See `plan.md` for the full implementation roadmap.
