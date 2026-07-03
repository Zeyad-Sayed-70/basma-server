# Teacher Landing Page: Brandable CMS Plan

## Goal

Build a public, elegant teacher landing page that students see when visiting a teacher's subdomain or custom domain. The page must be:

- **Tenant-aware**: resolved by subdomain or custom domain and isolated by instance.
- **Brandable**: controlled by the teacher's brand settings, including logo, colors, font, theme, and white-label behavior.
- **CMS-based**: editable by the teacher without code changes, including hero content, sections, social links, visible courses, registration CTAs, SEO metadata, and publish state.
- **Fast and SEO-friendly**: rendered through Next.js App Router server components, with public data fetched server-side.

This document is intended for delegation to backend and frontend agents.

## Current State

Frontend:

- Next.js `16.2.9` with App Router and `src/proxy.ts`.
- Next 16 uses **Proxy** instead of Middleware. Local docs state Proxy should be used for request-level rewrites/redirects/header changes and should not perform slow data fetching.
- Root `/` currently renders the Basma platform marketing page in [src/app/page.tsx](/mnt/c/heavy/basma-all/basma.edu.platform.client/src/app/page.tsx).
- Existing brand dashboard lives in [src/app/dashboard/brand/page.tsx](/mnt/c/heavy/basma-all/basma.edu.platform.client/src/app/dashboard/brand/page.tsx).
- Dynamic brand colors are already CSS variables in [src/app/globals.css](/mnt/c/heavy/basma-all/basma.edu.platform.client/src/app/globals.css).
- Auth redirects and subdomain header logic already exist in [src/proxy.ts](/mnt/c/heavy/basma-all/basma.edu.platform.client/src/proxy.ts).
- Generated API client already includes `BrandPublicService` with `GET /brand/public/{subdomain}`.

Backend/API:

- Existing public brand endpoint returns logo, colors, font, white-label status, and instance name.
- Existing `Brand` supports primary color, secondary color, font family, custom domain, logo, and white-label.
- No CMS-backed landing content endpoint currently exists in the generated frontend client.
- Existing student signup accepts `StudentSignupDto.code`, documented as invitation code for closed groups or group ID for open registration.

## Product Scope

### Visitor Experience

The public teacher landing page should support:

- Hero section with teacher/academy name, headline, subtitle, image/media, and primary/secondary CTA.
- Course or group highlights selected by the teacher.
- About teacher/academy section.
- Features or benefits section.
- Testimonials or student results section.
- FAQ section.
- Social/contact links.
- Open registration entry points.
- Footer with optional Basma attribution depending on white-label/tier.
- Arabic-first layout with RTL support and English-ready content.

### Teacher CMS Experience

The teacher should be able to:

- Edit landing page content from the dashboard.
- Preview before publishing.
- Publish/unpublish the page.
- Choose which courses/groups appear publicly.
- Reorder repeatable sections.
- Add/update/delete social links, testimonials, FAQs, and feature cards.
- Set SEO title, SEO description, and OG image.
- Reset to sensible starter content.

### Out of Scope For First Version

- Full drag-and-drop page builder.
- Arbitrary custom HTML/CSS.
- Multiple page templates beyond one high-quality default template.
- Blog/articles.
- Parent accounts.
- Lead CRM beyond student signup/contact CTA tracking.
- Public payments checkout from landing page unless an existing course payment flow is already available.

## Key Technical Decisions

| Topic | Decision |
| --- | --- |
| Route resolution | Use `src/proxy.ts` only to classify host/subdomain and pass request context. Do not fetch CMS data in Proxy. |
| Public rendering | Render teacher landing in App Router server components from public API data. |
| Main app homepage | Keep Basma marketing page available on root apex/app domains. Teacher landing appears only for tenant subdomains/custom domains. |
| CMS model | Store structured JSON sections plus normalized selected course/group references. Validate with DTOs/Zod schemas. |
| Brand theme | Continue using CSS variables, extended with landing-specific theme tokens if needed. |
| Images | Reuse MinIO/S3-compatible upload path. Add remote image patterns for production storage hosts. |
| Publishing | Public endpoint returns only `PUBLISHED` content. Authenticated teacher endpoint can return drafts. |
| API generation | Backend agent updates OpenAPI; frontend agent runs `npm run generate:api` after backend spec is refreshed. |

## Recommended Routes

Frontend public routes:

```txt
/                       Basma marketing page on apex/app/www/localhost
/                       Teacher landing page on teacher subdomain or custom domain
/courses/[courseId]     Optional public course detail page for tenant host
/register               Optional tenant registration chooser
```

Frontend dashboard routes:

```txt
/dashboard/brand        Existing brand settings
/dashboard/landing      Landing CMS editor, preview, publish controls
```

Backend routes:

```txt
GET    /landing/public/by-subdomain/:subdomain
GET    /landing/public/by-domain/:domain
GET    /landing
PUT    /landing
POST   /landing/publish
POST   /landing/unpublish
POST   /landing/reset
POST   /landing/media
```

Optional backend public route for direct registration context:

```txt
GET /landing/public/registration-options/:tenantKey
```

## Backend Plan

### 1. Data Model

Add a tenant-scoped landing page model. Suggested Prisma shape:

```prisma
model LandingPage {
  id             String            @id @default(uuid())
  instanceId     String            @unique
  instance       Instance          @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  status         LandingPageStatus @default(DRAFT)
  slug           String            @default("home")
  locale         String            @default("ar")
  seoTitle       String?
  seoDescription String?
  ogImageUrl     String?
  content        Json
  publishedAt    DateTime?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
}

enum LandingPageStatus {
  DRAFT
  PUBLISHED
}
```

Use `instanceId @unique` for v1 because each teacher has one landing page. If multiple pages/templates are expected soon, change to `@@unique([instanceId, slug])`.

### 2. CMS Content Schema

Store structured JSON, not arbitrary HTML. Recommended initial content shape:

```ts
type LandingContent = {
  template: "classic-academy";
  hero: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    primaryCta: LandingCta;
    secondaryCta?: LandingCta;
  };
  about?: {
    title: string;
    body: string;
    imageUrl?: string;
    stats?: Array<{ label: string; value: string }>;
  };
  featuredCourses: {
    title?: string;
    description?: string;
    mode: "MANUAL" | "LATEST" | "NONE";
    courseIds: string[];
  };
  features?: Array<{
    title: string;
    description: string;
    icon?: "book" | "calendar" | "chat" | "certificate" | "target" | "video";
  }>;
  testimonials?: Array<{
    name: string;
    quote: string;
    role?: string;
    avatarUrl?: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  socialLinks?: Array<{
    platform: "facebook" | "instagram" | "youtube" | "tiktok" | "whatsapp" | "telegram" | "website";
    label?: string;
    url: string;
  }>;
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
  };
};

type LandingCta = {
  label: string;
  type: "REGISTER" | "COURSES" | "WHATSAPP" | "CUSTOM_URL";
  href?: string;
  groupId?: string;
  courseId?: string;
};
```

Validation rules:

- Limit hero title, subtitles, FAQ answers, and testimonial quotes to reasonable lengths.
- Validate URLs and image URLs.
- Validate referenced `courseIds`, `groupId`, and `courseId` belong to the current instance.
- Only expose courses/groups intended for public display.
- Sanitize any rich text if supported later.

### 3. Public Response DTO

Public landing response should be one request for the frontend:

```ts
type LandingPublicResponseDto = {
  instance: {
    id: string;
    name: string;
    subdomain: string;
    customDomain?: string | null;
  };
  brand: {
    logoUrl?: string | null;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    whiteLabelEnabled: boolean;
  };
  landing: {
    status: "PUBLISHED";
    seoTitle?: string | null;
    seoDescription?: string | null;
    ogImageUrl?: string | null;
    content: LandingContent;
    updatedAt: string;
    publishedAt: string;
  };
  courses: Array<{
    id: string;
    title: string;
    description?: string | null;
    price: number;
    groupId: string;
    groupName: string;
    registrationMode: "OPEN" | "CLOSED";
    studentCount?: number;
  }>;
};
```

Return `404` if:

- Tenant does not exist.
- Landing page is not published.
- Custom domain is not verified, if domain verification is implemented.

### 4. Authenticated CMS DTOs

Add:

- `LandingPageResponseDto`
- `UpdateLandingPageDto`
- `LandingContentDto`
- `LandingMediaUploadResponseDto`
- `LandingPublishResponseDto`

Authenticated response should include draft state and validation warnings:

```ts
type LandingPageResponseDto = {
  id: string;
  status: "DRAFT" | "PUBLISHED";
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  content: LandingContent;
  validation: {
    canPublish: boolean;
    warnings: string[];
    errors: string[];
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
};
```

### 5. Service Behavior

Implement `LandingService`:

- `getOrCreateForCurrentInstance()`
- `updateForCurrentInstance(dto)`
- `publishForCurrentInstance()`
- `unpublishForCurrentInstance()`
- `resetForCurrentInstance()`
- `findPublicBySubdomain(subdomain)`
- `findPublicByDomain(domain)`
- `uploadMedia(file)`

Default content should be generated from:

- Instance/teacher name.
- Existing brand logo/colors.
- Latest courses, if any.
- Existing open groups for registration CTAs.

### 6. Tenant and Domain Resolution

Backend should support both:

- Subdomain lookup through `Instance.subdomain`.
- Custom domain lookup through `Brand.customDomain`.

If custom domain verification is not yet implemented, add a field or plan a follow-up:

```prisma
customDomainVerifiedAt DateTime?
```

Until verification exists, public domain lookup should either:

- Only work for trusted development domains, or
- Return an explicit `DOMAIN_NOT_VERIFIED` error for production custom domains.

### 7. Course Visibility

Current courses are internal tenant resources. Add a public visibility flag if needed:

```prisma
model Course {
  publicVisible Boolean @default(false)
  publicOrder   Int?
}
```

Alternative for v1: only show courses selected in `LandingContent.featuredCourses.courseIds`, and validate selection through the authenticated teacher CMS. This avoids changing `Course` immediately.

### 8. Security Requirements

- Public endpoint must not leak private student data.
- Public endpoint must not return unpublished drafts.
- Authenticated CMS endpoints must use the existing teacher guard and tenant scoping.
- Validate all referenced entities against current `instanceId`.
- Reject unknown social platforms and unsafe URL schemes.
- Rate limit public landing endpoints if global rate limiting exists.
- Media upload must restrict MIME type and size.

### 9. Backend Tests

Add tests for:

- Teacher can get/create/update draft landing content.
- Teacher cannot reference courses/groups from another instance.
- Publish fails when required hero title/CTA is missing.
- Public endpoint returns published landing page by subdomain.
- Public endpoint returns `404` for unpublished pages.
- Public endpoint returns no private fields.
- Custom domain lookup works or returns expected verification error.

### 10. Backend Deliverables

- Prisma migration for `LandingPage`.
- Landing module/controller/service/DTOs.
- Public landing endpoints.
- Media upload endpoint.
- OpenAPI spec regenerated.
- Seed/default landing content behavior.
- Unit/integration tests.

## Frontend Plan

### 1. API Regeneration

After backend lands:

```bash
npm run generate:api
```

Then add typed hooks around generated services:

```txt
src/lib/hooks/use-landing.ts
src/lib/validators/landing.ts
```

Expected hooks:

- `useLanding()`
- `useUpdateLanding()`
- `usePublishLanding()`
- `useUnpublishLanding()`
- `useResetLanding()`
- `useUploadLandingMedia()`

Public server fetching should not depend on React Query. Use server-side `fetch` helpers or generated client only if it is safe in server components.

### 2. Proxy and Host Resolution

Update [src/proxy.ts](/mnt/c/heavy/basma-all/basma.edu.platform.client/src/proxy.ts):

- Keep auth redirects for dashboard/student portal.
- Detect tenant host:
  - Subdomain: `teacher.basma.app`.
  - Custom domain: host not in known app/apex domains.
- Set request headers such as:
  - `x-tenant-subdomain`
  - `x-tenant-domain`
- Do not call landing/brand APIs inside Proxy.
- Do not redirect authenticated users away from public tenant root unless the path is an auth/dashboard/student path.

Known app hosts should be configured through env:

```txt
NEXT_PUBLIC_APP_DOMAIN=basma.app
NEXT_PUBLIC_APP_HOSTS=basma.app,www.basma.app,app.basma.app,localhost:3001
```

### 3. Public Route Strategy

Keep [src/app/page.tsx](/mnt/c/heavy/basma-all/basma.edu.platform.client/src/app/page.tsx) as the single root page, but branch server-side by host:

- If app/apex/localhost host: render Basma marketing homepage.
- If tenant subdomain/custom domain: fetch and render teacher landing page.

Suggested files:

```txt
src/app/page.tsx
src/components/public/basma-home.tsx
src/components/public/teacher-landing-page.tsx
src/components/public/landing-sections/hero-section.tsx
src/components/public/landing-sections/about-section.tsx
src/components/public/landing-sections/course-grid-section.tsx
src/components/public/landing-sections/features-section.tsx
src/components/public/landing-sections/testimonials-section.tsx
src/components/public/landing-sections/faq-section.tsx
src/components/public/landing-sections/footer-section.tsx
src/lib/public/tenant-host.ts
src/lib/public/landing-api.ts
```

Use `headers()` in the server page or helper to read host/proxy headers. Per Next 16 docs, runtime APIs should stay close to the route and not be buried in cached layout work.

### 4. Public Landing Design Direction

Build one polished default template:

- Arabic-first RTL layout.
- Strong hero with layered background, brand-color gradients, and logo lockup.
- Large expressive heading using selected brand font where possible.
- Course cards with clear registration CTAs.
- Visual sections that still work when optional content is missing.
- Mobile-first layout and strong desktop composition.
- No generic purple SaaS look.

Use existing brand CSS variables:

```css
--brand-primary
--brand-primary-foreground
--brand-secondary
--brand-secondary-foreground
--brand-font
```

For public SSR, inject a scoped style block or wrapper style attributes from the public landing response:

```tsx
<main
  style={{
    "--brand-primary": brand.primaryColor,
    "--brand-secondary": brand.secondaryColor,
    "--brand-font": brand.fontFamily,
  } as React.CSSProperties}
>
```

### 5. CTAs and Registration

CTA behavior:

- `REGISTER` with `groupId`: link to `/auth/student/signup?code={groupId}`.
- `REGISTER` with `courseId`: link to `/auth/student/signup?courseId={courseId}` only if backend/frontend support course-level preselection; otherwise link to the course card's group ID.
- `COURSES`: scroll/link to `#courses`.
- `WHATSAPP`: open WhatsApp URL from contact/social settings.
- `CUSTOM_URL`: validate and open configured URL.

Update student signup page to read query params:

- `code`
- `groupId`
- `courseId`, if supported later

Prefill the existing `code` field when `code` or `groupId` exists.

### 6. Dashboard CMS Route

Add:

```txt
src/app/dashboard/landing/page.tsx
```

Main editor structure:

- Header with status badge, preview link, publish/unpublish buttons.
- Left editor column with tabs:
  - Hero
  - About
  - Courses
  - Features
  - Testimonials
  - FAQ
  - Social/contact
  - SEO
- Right sticky preview panel using the same public renderer with draft data.

Suggested components:

```txt
src/components/teacher/landing/landing-editor.tsx
src/components/teacher/landing/hero-editor.tsx
src/components/teacher/landing/about-editor.tsx
src/components/teacher/landing/course-picker.tsx
src/components/teacher/landing/repeater-field.tsx
src/components/teacher/landing/social-links-editor.tsx
src/components/teacher/landing/seo-editor.tsx
src/components/teacher/landing/publish-bar.tsx
src/components/teacher/landing/landing-preview.tsx
```

### 7. Sidebar and i18n

Update [src/components/teacher/sidebar.tsx](/mnt/c/heavy/basma-all/basma.edu.platform.client/src/components/teacher/sidebar.tsx):

- Add `/dashboard/landing`.
- Suggested icon: `PanelsTopLeft`, `Globe`, or `LayoutTemplate`.

Update:

- [src/i18n/messages/en.json](/mnt/c/heavy/basma-all/basma.edu.platform.client/src/i18n/messages/en.json)
- [src/i18n/messages/ar.json](/mnt/c/heavy/basma-all/basma.edu.platform.client/src/i18n/messages/ar.json)

Translation namespace:

```json
{
  "landing": {
    "title": "...",
    "description": "...",
    "status": {
      "draft": "...",
      "published": "..."
    },
    "sections": {
      "hero": "...",
      "about": "...",
      "courses": "...",
      "features": "...",
      "testimonials": "...",
      "faq": "...",
      "social": "...",
      "seo": "..."
    }
  }
}
```

### 8. Metadata and SEO

Implement `generateMetadata` for tenant landing:

- Use `landing.seoTitle || hero.title || instance.name`.
- Use `landing.seoDescription || hero.subtitle`.
- Use `landing.ogImageUrl || brand.logoUrl`.
- Add canonical URL based on host.

If the host is not tenant host, keep existing Basma metadata.

### 9. Loading and Error States

Add:

```txt
src/app/loading.tsx
src/app/not-found.tsx
```

Public tenant failures:

- `404`: teacher page not found or unpublished.
- Backend unavailable: show a small branded fallback only if brand data is available, otherwise standard error.

Dashboard CMS:

- Skeleton editor while loading.
- Inline validation messages from backend.
- Toasts for save/publish/unpublish/reset.

### 10. Frontend Tests

Add tests for:

- Tenant host renders teacher landing instead of Basma homepage.
- App/apex/localhost host renders Basma homepage.
- Brand colors are applied to public landing wrapper.
- Missing optional sections do not break the page.
- Course CTA points to existing student signup route with correct code/group.
- Dashboard editor saves draft payload.
- Publish button handles validation errors.

Use Vitest for components/helpers. Add Playwright later for full subdomain/custom-domain E2E if the test setup supports host routing.

### 11. Frontend Deliverables

- Public teacher landing renderer.
- Dashboard CMS editor route.
- Public/server landing API helpers.
- React Query hooks for authenticated CMS endpoints.
- Landing validators.
- Sidebar/i18n updates.
- Student signup query prefill.
- Public metadata.
- Tests.

## Cross-Agent Work Sequence

1. **Backend agent** creates `LandingPage` model, DTOs, service, controllers, media upload, tests, and regenerates `openapi-spec.json`.
2. **Frontend agent** runs `npm run generate:api` after backend spec is updated.
3. **Frontend agent** implements public host resolution and landing renderer.
4. **Frontend agent** implements dashboard CMS editor.
5. **Backend + frontend agents** align on validation errors, media upload shape, and publish response.
6. **QA agent or final pass** tests subdomain, custom domain, draft/publish, and registration CTA flows.

## Acceptance Criteria

Backend:

- A teacher can create/update a draft landing page.
- A teacher can publish/unpublish the landing page.
- Public endpoint returns combined brand, CMS content, and selected public courses.
- Public endpoint never returns unpublished draft content.
- Tenant isolation is enforced for all references.
- OpenAPI includes all new landing DTOs/services.

Frontend:

- Visiting `teacher.basma.app` renders the teacher landing page.
- Visiting app/apex/localhost root still renders Basma platform homepage.
- Landing page uses teacher logo, colors, font, and white-label behavior.
- Teacher can edit hero, about, courses, social/contact, FAQ, testimonials, and SEO.
- Teacher can preview draft changes before publishing.
- Published changes appear publicly after save/publish.
- Course/register CTAs route into the existing student signup flow with prefilled context.

## Risks and Notes

- **Custom domains need verification**: do not trust arbitrary Host headers for public tenant routing without backend domain verification before production.
- **Proxy should stay lightweight**: Next 16 docs explicitly warn against slow data fetching in Proxy.
- **Generated API files are currently modified in the worktree**: frontend agent should avoid overwriting unrelated generated changes unless intentionally regenerating after backend OpenAPI changes.
- **Font customization is limited by available loaded fonts**: current app loads Cairo and IBM Plex Sans Arabic. Additional brand font choices may require expanding root font imports or using a controlled font list.
- **Public course visibility needs a policy**: decide whether selected CMS course IDs are enough for v1 or whether `Course.publicVisible` is required.
- **CMS JSON versioning**: include `template` and consider adding `schemaVersion` if future migrations are likely.

## Suggested Milestones

### Milestone 1: Backend CMS Contract

- Landing model and endpoints.
- Public response includes brand/content/courses.
- OpenAPI regenerated.

### Milestone 2: Public Rendering

- Host resolution.
- Teacher landing SSR.
- Brand CSS variable injection.
- Metadata.

### Milestone 3: CMS Editor

- Dashboard route.
- Forms for all core sections.
- Draft preview.
- Publish/unpublish.

### Milestone 4: Polish and QA

- Responsive audit.
- Arabic copy polish.
- Empty-state handling.
- Tests and subdomain/custom-domain verification.
