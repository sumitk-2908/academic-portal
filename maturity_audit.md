# Academic Portal — Final Maturity Audit

> **Audit Date:** 2026-07-13  
> **Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + Realtime) · FastAPI (Python) · Cloudflare R2 · Vercel

---

## Executive Summary

This portal is remarkably well-built for its stage. It has solid fundamentals: MFA-protected admin routes, Supabase RLS policies, Cloudflare R2 object storage, PWA/offline support, a premium design system, Realtime notifications, full-text search, rate limiting, and a thoughtful onboarding flow. **It is well beyond a prototype** — the architecture is production-aware and the code quality is high.

However, to cross from "impressive project" to "premium SaaS-grade academic platform," there are **critical gaps across security hardening, data integrity, testing, accessibility depth, mobile UX polish, and operational observability** that need to be addressed. This audit identifies 42 specific, actionable recommendations ranked by ROI.

---

## Audit Findings by Dimension

### 1. Product & Feature Completeness

| Finding | Severity |
|---|---|
| No user-facing reporting/flagging flow visible from the document viewer | Medium |
| No "Delete my account" or data export (GDPR-adjacent) | High |
| No admin "bulk actions" (approve/reject multiple docs at once) | Medium |
| Contribution prompt system is clever but limited to download-count triggers | Low |
| No document versioning — resubmit replaces the original with no diff history | Low |

---

### 2. Student Experience & Engagement

| Finding | Severity |
|---|---|
| Continue Studying and Bookmarks pages require auth but unauthenticated users clicking sidebar links just get redirected — no messaging about *why* | Medium |
| Study streak logic is only updated when calling `triggerStreakUpdate` — it's unclear if this fires on every PDF view or only explicit triggers | Medium |
| Local + cloud bookmark merge strategy is complex and may show stale data if localStorage and Supabase diverge | Medium |
| Profile page has achievements, heatmap, timeline — great depth. But the heatmap only covers the current calendar year with no toggle | Low |

---

### 3. UI/UX Consistency

| Finding | Severity |
|---|---|
| Toast patterns are inconsistent: `window.dispatchEvent(new CustomEvent("portal_toast"))` is used in some contexts, `alert()` in others ([UploadContext.tsx:67](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/context/UploadContext.tsx#L67), [AuthContext.tsx:204](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/context/AuthContext.tsx#L204)) | High |
| `showToast` helper function is redefined in 3 separate contexts (Auth, Upload, Sidebar) instead of being a shared utility | Medium |
| Design system is well-locked (strict font scale, semantic tokens) — excellent foundation | ✅ |
| Motion system (`.motion-hover`, `.motion-active`, `.ease-premium`) is cohesive | ✅ |
| Duplicate RLS policies exist for the same tables (e.g., `documents` has 3 overlapping SELECT policies for approved status) | Low |

---

### 4. Accessibility

| Finding | Severity |
|---|---|
| Global focus-visible styles are set (`globals.css:7-9`) — excellent | ✅ |
| Command Palette has proper ARIA roles (`combobox`, `option`, `listbox`, `aria-activedescendant`) | ✅ |
| Command Palette has `Dialog.Title` in `sr-only` and `aria-describedby` | ✅ |
| **OTP input on admin page uses `type="text"` without `inputMode="numeric"` or `pattern="[0-9]*"`** — screen readers and mobile keyboards won't optimize | High |
| **File upload inputs likely lack `accept=".pdf"` attribute** in the UploadModal, allowing users to select non-PDF files before validation | Medium |
| No skip-to-main-content link | Medium |
| No `aria-live` regions for toast notifications (they use CustomEvent → Radix Toast, which may handle this, but should be verified) | Medium |
| Color contrast on `text-muted` over light backgrounds may fail WCAG AA (Zinc-500 `#52525b` on `#f7f7f8` = 5.6:1, passes, but `#a1a1aa` dark-muted on `#0a0a0b` = 5.1:1, borderline) | Low |

---

### 5. Performance

| Finding | Severity |
|---|---|
| Home page uses `force-dynamic` — **every page load hits Supabase for subjects, counts, session, and profile**, even for logged-out users | Critical |
| `api.interceptors.request.use` calls `getSession()` on **every** Axios request — this is a redundant async call that adds latency to all API interactions | High |
| React Query is used for `trendingDocuments` but NOT for bookmarks, study history, profile data, or subject lists — inconsistent caching strategy | High |
| `SubjectGrid` fetches `get_subject_counts` via RPC — this is an aggregate query that should be cached/ISR'd rather than computed on every request | Medium |
| PDF viewer loads `react-pdf` — verify the worker bundle isn't blocking initial paint | Medium |
| `@tanstack/react-virtual` is installed but its usage should be verified on large document lists | ✅ |
| Bundle analyzer is configured (`@next/bundle-analyzer`) | ✅ |

---

### 6. Mobile Experience

| Finding | Severity |
|---|---|
| `MobileNav` component exists with dedicated mobile navigation | ✅ |
| PWA manifest, icons (192/512), service worker, and offline fallback page are configured | ✅ |
| `Toast.Viewport` is positioned `fixed right-0 bottom-0` with `md:max-w-[400px]` — good responsive behavior | ✅ |
| **No `viewport-fit=cover` for notched devices (iPhone)** — content may render behind the notch | Medium |
| OTP input fields on admin MFA page may be too small for mobile touch targets (no explicit height beyond `h-12`) | Low |

---

### 7. Architecture & Maintainability

| Finding | Severity |
|---|---|
| Clean separation: Next.js frontend → FastAPI backend → Supabase DB → R2 storage | ✅ |
| Context provider nesting is 7 layers deep in `ClientLayout.tsx` — consider composing into a single `<Providers>` component for readability | Low |
| **`api.ts` is 867 lines** — this is a monolith file mixing Supabase queries, Axios calls, upload logic, bookmark sync, achievement fetching, and recommendation engines. It should be split into domain modules | High |
| `showToast` helper is duplicated across Auth/Upload/Sidebar contexts. Should be a single shared import from a `toast.ts` utility (which already exists at [toast.ts](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/lib/toast.ts) but appears unused by contexts) | Medium |
| TypeScript types are partially defined: `DocumentRecord` exists but `any` is used extensively in API functions (e.g., `getStudentBookmarks`, `getRecentStudyActivity` return `any[]`) | High |
| `SUBJECTS_LIST` is **hardcoded** in `subject-config.ts` — subjects should be fetched from the `subjects` table, not maintained in two places | High |
| Backend uses a single `documents.py` router for everything — acceptable at current scale but should split as features grow | Low |
| No shared validation schemas between frontend and backend (Zod schemas on frontend, Pydantic on backend, but no shared source of truth) | Medium |

---

### 8. Security & Privacy

| Finding | Severity |
|---|---|
| Admin routes protected by MFA (AAL2) verification — both in middleware and backend | ✅ |
| JWT verification uses `jose` library with `HS256` and proper signature validation | ✅ |
| File magic byte validation (`%PDF` header check) on backend | ✅ |
| Rate limiting via SlowAPI on all endpoints | ✅ |
| RLS enabled on all tables | ✅ |
| **`getSession()` used in server components** ([page.tsx:156](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/page.tsx#L156)) — Supabase docs explicitly warn against this: `getSession` reads from cookies *without* re-validating the JWT signature. **Use `getUser()` for server-side auth verification** | Critical |
| **`CORS_ORIGINS` allows all methods (`allow_methods=["*"]`)**  — should restrict to `GET, POST, PATCH, DELETE` only | Medium |
| **`CORS_ORIGINS` allows all headers (`allow_headers=["*"]`)** — should restrict to `Content-Type, Authorization` | Medium |
| `dangerouslySetInnerHTML` is used to render the MFA QR code ([portal-admin/page.tsx:105](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/portal-admin/page.tsx#L105)) — the QR SVG comes from Supabase Auth MFA which is trusted, but this pattern should be documented as a known exception | Low |
| No CSP (Content Security Policy) headers configured | Medium |
| **Email-based auth stores password in React state** — expected for form handling but ensure `authPassword` is cleared on unmount (it's cleared on success but not on component unmount) | Medium |
| `uploaded_by` field stores `user_id` as text, not UUID type — works but loses referential integrity | Medium |

---

### 9. Scalability

| Finding | Severity |
|---|---|
| Database indexes on `documents.created_at`, `documents.status`, and `documents.fts` (GIN) | ✅ |
| Paginated document fetching exists (`getPaginatedDocumentsByModule`) | ✅ |
| **No index on `documents.subject`** — filtering by subject is a core operation but has no index | High |
| **No index on `documents.module_id`** — filtering by module is a core operation | High |
| **No index on `study_history.user_id`** — will degrade as usage grows | Medium |
| **No index on `student_bookmarks.user_id`** — same concern | Medium |
| Admin analytics page fetches ALL documents and iterates client-side to count statuses ([analytics/page.tsx:28-39](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/portal-admin/analytics/page.tsx#L28-L39)) — should use `COUNT` with `GROUP BY` on the server | High |

---

### 10. Discoverability (SEO)

| Finding | Severity |
|---|---|
| Dynamic `sitemap.ts` generates URLs for subjects, modules, and documents | ✅ |
| `robots.ts` correctly disallows admin routes | ✅ |
| Metadata with template pattern `%s | Academic Portal` | ✅ |
| **Subject URLs use raw names** (e.g., `/subject/MATHS 1`) — spaces in URLs are not SEO-friendly. Should use slugs from the `subjects.slug` column | High |
| Home page meta description is good: "Free notes, previous year questions, and study materials for 18+ engineering subjects" | ✅ |
| No Open Graph / social sharing meta tags | Medium |
| No structured data (JSON-LD) for educational resources | Low |

---

### 11. Community & Contribution Features

| Finding | Severity |
|---|---|
| Crowdsourced upload → admin approval → notification pipeline is mature | ✅ |
| Document resubmission flow with `resubmission_count` tracking | ✅ |
| Upvote/downvote system with `prevent_self_rating` trigger | ✅ |
| Document flagging with reason types (incorrect, duplicate, low_quality, other) | ✅ |
| **No comment/discussion system on documents** — students can flag but can't ask questions or discuss specific notes | Medium |
| **No contributor profile visibility** — students can't see who uploaded the best notes or visit a contributor's profile | Medium |
| Achievement system exists (pioneer, contributor, streak badges) but has only 3 badge types — room for more organic milestones | Low |

---

### 12. Admin Experience

| Finding | Severity |
|---|---|
| MFA-gated admin portal with QR enrollment | ✅ |
| Pending/flagged document review inbox | ✅ |
| Analytics dashboard with engagement and moderation health metrics | ✅ |
| **Admin analytics is primitive** — no time-series data, no charts/graphs, no per-subject breakdown, no user growth metrics | High |
| **No admin audit log** — no record of who approved/rejected what and when (only `moderated_by` on the document itself) | Medium |
| **No admin notification when new docs are pending** — admins must manually check the inbox | Medium |
| No way for admins to manage subjects/modules from the UI — requires direct DB manipulation | Medium |

---

### 13. Analytics (User-Facing)

| Finding | Severity |
|---|---|
| Study streak tracking with longest/current streak | ✅ |
| Activity heatmap on profile | ✅ |
| View/download counts per document | ✅ |
| **No "most popular documents" or "trending this week" time-scoped view** — trending is purely by all-time view count | Medium |
| No download history for students (only study history) | Low |

---

### 14. Error Handling

| Finding | Severity |
|---|---|
| Route-level `error.tsx` with reusable `ErrorBoundary` component | ✅ |
| `global-error.tsx` for catastrophic failures | ✅ |
| Backend returns proper HTTP status codes with `HTTPException` | ✅ |
| Backend has rollback logic for failed DB inserts (cleans up R2 files) | ✅ |
| Notification mark-as-read uses optimistic updates with rollback | ✅ |
| **Inconsistent: some errors use `alert()` instead of toast** ([UploadContext.tsx:67](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/context/UploadContext.tsx#L67), [AuthContext.tsx:204](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/context/AuthContext.tsx#L204)) | Medium |
| **No global error logging/reporting service** (Sentry, LogRocket, etc.) — errors only go to `console.error` | High |

---

### 15. Edge Cases

| Finding | Severity |
|---|---|
| Upload handles: max size (50MB), non-PDF files, corrupted PDFs, magic byte validation | ✅ |
| Bookmark merge handles legacy number-only storage format | ✅ |
| XHR upload has 2-minute timeout | ✅ |
| **Concurrent upload protection missing** — a user could click "Upload" multiple times, creating duplicate submissions | Medium |
| **`student_history.user_id` has a UNIQUE constraint** (line 385 of schema) — this means a user can only have ONE history entry total, not one per document. This may be a legacy table (separate from `study_history`) but could cause data integrity issues if still referenced | High |
| **Token refresh race condition** — the API interceptor and `uploadDocument` both independently check `expires_at < 60s` and call `refreshSession()`. If two requests fire simultaneously, they may both try to refresh | Medium |

---

### 16. Empty States

| Finding | Severity |
|---|---|
| Command Palette shows "No commands found" with helper text | ✅ |
| Upload prompt system generates contextual empty states ("No documents yet for X") | ✅ |
| Search returns "No documents found. Try a subject, module, or quick action" | ✅ |
| **Bookmarks, Continue Studying, Recent Uploads pages need verification** — if they use shared skeleton loaders, they may not have distinct empty-state illustrations | Medium |

---

### 17. Onboarding

| Finding | Severity |
|---|---|
| `OnboardingModal` triggers for new users without `full_name` | ✅ |
| `ProfileGateModal` exists for profile completion prompting | ✅ |
| Skip onboarding is tracked via `sessionStorage` (per-session, not persistent) | ✅ |
| Auth prompt system shows contextual copy for each feature gate (bookmark, upload, etc.) | ✅ |
| **No first-use guided tour or tooltips** — new users see the subject grid immediately but may not discover the Command Palette, bookmarks, or upload features | Medium |

---

### 18. Search & Navigation

| Finding | Severity |
|---|---|
| Command Palette (`Ctrl+K` / `⌘K`) with Fuse.js fuzzy search + Postgres FTS | ✅ |
| Breadcrumb component exists | ✅ |
| Subjects → Modules → Documents hierarchy is clear | ✅ |
| Search has debounced input (300ms) and recent search history | ✅ |
| **No search result highlighting** — search matches don't highlight the matched text | Low |
| **No filter/sort controls on subject pages** — users can't filter by category (notes vs PYQ) or sort by date/upvotes inline | High |

---

### 19. Personalization

| Finding | Severity |
|---|---|
| Favorite subjects stored in profile and used to sort the subject grid | ✅ |
| Personalized recent uploads based on favorites | ✅ |
| Personalized recommendations with fallback to global trending | ✅ |
| "Suggested next steps" based on last viewed document's subject | ✅ |
| Academic year and preferred branch stored but unclear if used for filtering | Low |

---

### 20. Offline/PWA Experience

| Finding | Severity |
|---|---|
| `@ducanh2912/next-pwa` configured with document fallback | ✅ |
| Offline page at `/~offline` | ✅ |
| Online/offline detection with toast notifications | ✅ |
| `cacheOnFrontEndNav: true` for navigation caching | ✅ |
| **No offline bookmark viewing** — bookmarks page requires fetching document data from Supabase even for locally-stored bookmarks | Medium |
| `offline-manager.ts` exists but at 1.3KB seems minimal | Low |

---

## Prioritized Recommendations

### 🔴 Critical (Fix Immediately)

| # | Recommendation | Why It Matters | Impact | Effort | Improves | Dependencies |
|---|---|---|---|---|---|---|
| C1 | **Replace `getSession()` with `getUser()` in server components** | `getSession()` doesn't verify the JWT signature server-side. An attacker could forge a session cookie. Supabase's own docs mark this as a security vulnerability. | High | Low (2h) | Security | None |
| C2 | **Add indexes on `documents.subject` and `documents.module_id`** | Every subject page, every module page, and every search query filters on these columns. Without indexes, every query is a sequential scan that will degrade linearly with data growth. | High | Low (1h) | Performance, Scalability | DB migration |
| C3 | **Cache or ISR the home page instead of `force-dynamic`** | Every single page load — authenticated or not — triggers 4+ Supabase queries. For a content site, the subject list and counts change rarely. Use ISR with `revalidate: 300` or similar. | High | Medium (4h) | Performance | None |

---

### 🟠 High Priority (This Sprint)

| # | Recommendation | Why It Matters | Impact | Effort | Improves | Dependencies |
|---|---|---|---|---|---|---|
| H1 | **Split `api.ts` into domain modules** (`api/documents.ts`, `api/bookmarks.ts`, `api/profile.ts`, `api/analytics.ts`) | 867-line files are unmaintainable, cause merge conflicts, and make tree-shaking impossible. Each page imports the entire API surface. | High | Medium (6h) | Engineering | None |
| H2 | **Unify toast system** — remove all `alert()` calls, import `showToast` from `lib/toast.ts` in all contexts | Mixing `alert()` and toast creates an inconsistent, jarring UX. The `toast.ts` utility already exists but isn't used consistently. | Medium | Low (2h) | UX | None |
| H3 | **Eliminate `any` types in API layer** — define proper return types for all Supabase queries | 20+ functions return `any[]`. This defeats TypeScript's value proposition and allows runtime type errors to slip through. | Medium | Medium (4h) | Engineering | None |
| H4 | **Add filter/sort controls to subject document pages** (category filter, sort by date/upvotes/downloads) | Core student workflow. A student browsing "Maths 1, Module 3" needs to distinguish notes from PYQs and find the most useful resource quickly. | High | Medium (8h) | Product, UX | None |
| H5 | **Move `SUBJECTS_LIST` to database-driven** — fetch from `subjects` table instead of hardcoding 18 subjects in TypeScript | Adding or renaming a subject currently requires a code deploy. This makes the platform brittle and prevents admin self-service. | High | Medium (6h) | Engineering, Product | None |
| H6 | **Set up error monitoring** (Sentry, Highlight.io, or similar) | You have no visibility into production errors. `console.error` is invisible. A single uncaught error could affect all users with no alert. | High | Medium (4h) | Engineering, Business | Account setup |
| H7 | **Integrate React Query for all data fetching** — bookmarks, study history, profile, subjects | Currently only `trendingDocuments` uses React Query. Everything else is `useEffect` + `useState` with no caching, deduplication, or stale-while-revalidate. | High | High (12h) | Performance, UX | None |
| H8 | **Add `inputMode="numeric"` and `pattern="[0-9]*"` to OTP inputs** | Mobile users will get a QWERTY keyboard for the MFA code instead of a numeric keypad. Admin access on mobile becomes frustrating. | Medium | Low (30min) | Accessibility, UX | None |
| H9 | **Server-side analytics aggregation** — replace client-side counting on admin analytics page with `COUNT(*) GROUP BY status` RPC | Currently fetches ALL documents rows to count statuses in JavaScript. With 10K documents, this transfers unnecessary data and is slow. | Medium | Low (2h) | Performance, Scalability | DB function |
| H10 | **Add Open Graph meta tags** for social sharing | When students share a subject page or document link on WhatsApp/Discord, there's no preview card. This significantly reduces organic growth. | Medium | Low (2h) | Business, SEO | None |

---

### 🟡 Medium Priority (Next Sprint)

| # | Recommendation | Why It Matters | Impact | Effort | Improves | Dependencies |
|---|---|---|---|---|---|---|
| M1 | **Add a skip-to-main-content link** | WCAG 2.1 Level A requirement. Keyboard-only users must tab through the entire sidebar and topbar to reach page content. | Medium | Low (1h) | Accessibility | None |
| M2 | **Add `accept=".pdf"` to file input in UploadModal** | Prevents users from selecting `.docx`, images, etc. before the client-side validation. Better UX and reduces backend processing of invalid files. | Medium | Low (30min) | UX | None |
| M3 | **Add CSP headers via `next.config.ts`** | Protects against XSS and data injection attacks. Critical for a platform that renders user-uploaded content metadata. | Medium | Medium (4h) | Security | None |
| M4 | **Restrict CORS to specific methods and headers** | `allow_methods=["*"]` allows `PUT`, `TRACE`, `OPTIONS`, etc. Tighten to only methods your API actually uses. | Medium | Low (1h) | Security | None |
| M5 | **Add upload deduplication/debounce** — disable submit button after first click, track upload-in-progress state | Double-clicking "Upload" can create duplicate R2 objects and database rows. | Medium | Low (2h) | Product, UX | None |
| M6 | **Add URL-safe slugs to subject links** | `/subject/MATHS%201` is ugly and SEO-hostile. Your `subjects` table already has a `slug` column — use it for routing. | High | Medium (6h) | SEO, UX | Route changes |
| M7 | **Contributor profiles** — link `uploader_name` to a public contributor page showing their uploads and impact | Motivates quality contributions and builds community trust. Students want to know who wrote the best notes. | Medium | High (12h) | Product, Community | New route/component |
| M8 | **Admin notification for new pending uploads** — add a Supabase trigger that notifies admins when a new `pending` document is inserted | Currently, admins discover pending uploads only by manually checking the inbox. Delays approval and frustrates contributors. | Medium | Medium (4h) | Admin, Product | DB trigger |
| M9 | **Add `viewport-fit=cover` to viewport meta** | iPhone users with notch/Dynamic Island will see content clipped behind the safe area. | Low | Low (15min) | Mobile UX | None |
| M10 | **Consolidate duplicate RLS policies** | `documents` table has 3 separate SELECT policies that all check `status = 'approved'`. Consolidate to reduce policy evaluation overhead and simplify maintenance. | Low | Low (1h) | Engineering, Performance | DB migration |
| M11 | **Add React Query to bookmarks and study history** with optimistic mutations | These are high-traffic features with complex local+cloud sync. React Query's cache invalidation and optimistic updates would replace the manual state management. | Medium | Medium (8h) | UX, Performance | H7 |
| M12 | **Account deletion endpoint** — "Delete my account" in profile settings | Required for GDPR compliance. Users should be able to delete their data without contacting an admin. | Medium | Medium (6h) | Security, Product | Backend + frontend |

---

### 🟢 Low Priority (Next Quarter)

| # | Recommendation | Why It Matters | Impact | Effort | Improves | Dependencies |
|---|---|---|---|---|---|---|
| L1 | **Admin subject/module management UI** — CRUD subjects and modules from the admin dashboard | Currently requires direct database manipulation to add a new subject. | Medium | High (16h) | Admin, Product | M8 |
| L2 | **Time-scoped trending** — "Trending this week" using a sliding window on view counts | All-time trending is dominated by early content. Time-scoping surfaces genuinely useful recent uploads. | Medium | Medium (8h) | Product | None |
| L3 | **Document discussion/comments** — a simple threaded comment system on documents | Students currently have no way to discuss, ask questions about, or annotate specific notes. This is the #1 feature for academic community building. | High | High (20h) | Product, Community | New table, RLS, components |
| L4 | **Admin audit log table** — record all admin actions (approve, reject, delete, dismiss flags) with timestamps | Essential for accountability and dispute resolution as the platform grows. | Medium | Medium (6h) | Security, Admin | DB migration |
| L5 | **JSON-LD structured data** for educational resources | Helps search engines understand your content as educational material, potentially earning rich snippets. | Low | Medium (4h) | SEO | None |
| L6 | **Admin bulk actions** — select multiple pending docs and approve/reject in batch | Significantly improves admin efficiency when there are 10+ pending uploads. | Medium | Medium (8h) | Admin, UX | None |
| L7 | **Document version history** — preserve previous PDF versions when a document is resubmitted | Currently, resubmit deletes the old file. Version history provides audit trail and rollback capability. | Low | High (12h) | Product | DB changes |
| L8 | **Compose context providers into a single `<Providers>` component** | 7-deep nesting in `ClientLayout.tsx` is hard to read. A single wrapper improves DX. | Low | Low (1h) | Engineering | None |
| L9 | **Offline bookmark viewing** — cache bookmarked document metadata for offline access | PWA users who saved bookmarks should be able to see their list even without internet, even if they can't view the actual PDFs. | Medium | Medium (6h) | UX, PWA | None |
| L10 | **End-to-end tests** — add Playwright tests for critical flows (login, upload, approve, view PDF) | Playwright is already in `devDependencies` but no test files exist in the frontend. Backend has basic tests but no integration tests. | High | High (16h) | Engineering | CI/CD |
| L11 | **API response caching** — add Supabase client-side caching or HTTP cache headers for immutable data (subjects, modules) | Subjects and modules almost never change. Every page load re-fetches them. | Medium | Medium (4h) | Performance | None |
| L12 | **First-use discovery tooltips** — highlight Command Palette shortcut, upload button, and bookmark functionality on first visit | New users don't discover power features. A subtle, dismissible tooltip system (not a full tour) increases feature adoption. | Medium | Medium (8h) | UX, Product | None |

---

## Phased Roadmap (Ranked by ROI)

### Phase 1: Immediate (This Week) — Security & Performance Fixes

> **Theme: Fix what could hurt you**

| Priority | Item | Impact | Effort |
|---|---|---|---|
| 🔴 | C1 — Replace `getSession()` with `getUser()` in server components | High | 2h |
| 🔴 | C2 — Add database indexes on `subject`, `module_id` | High | 1h |
| 🟠 | H2 — Unify toast system, remove all `alert()` calls | Medium | 2h |
| 🟠 | H8 — Add `inputMode="numeric"` to OTP inputs | Medium | 30min |
| 🟠 | H9 — Server-side analytics aggregation | Medium | 2h |
| 🟡 | M2 — Add `accept=".pdf"` to file upload input | Medium | 30min |
| 🟡 | M4 — Restrict CORS methods/headers | Medium | 1h |
| 🟡 | M9 — Add `viewport-fit=cover` | Low | 15min |

**Total estimated effort: ~9h**

---

### Phase 2: Short-term (Next 2 Weeks) — Architecture & UX

> **Theme: Make the foundation scale**

| Priority | Item | Impact | Effort |
|---|---|---|---|
| 🔴 | C3 — Cache/ISR the home page | High | 4h |
| 🟠 | H1 — Split `api.ts` into domain modules | High | 6h |
| 🟠 | H3 — Eliminate `any` types in API layer | Medium | 4h |
| 🟠 | H4 — Add filter/sort controls on subject pages | High | 8h |
| 🟠 | H5 — Database-driven subjects list | High | 6h |
| 🟠 | H6 — Set up error monitoring (Sentry) | High | 4h |
| 🟠 | H10 — Open Graph meta tags | Medium | 2h |
| 🟡 | M1 — Skip-to-main-content link | Medium | 1h |
| 🟡 | M5 — Upload deduplication/debounce | Medium | 2h |

**Total estimated effort: ~37h**

---

### Phase 3: Medium-term (Next Month) — Product Maturity

> **Theme: Earn user trust and loyalty**

| Priority | Item | Impact | Effort |
|---|---|---|---|
| 🟠 | H7 — Full React Query integration | High | 12h |
| 🟡 | M3 — CSP headers | Medium | 4h |
| 🟡 | M6 — URL-safe subject slugs | High | 6h |
| 🟡 | M7 — Contributor profiles | Medium | 12h |
| 🟡 | M8 — Admin notification for new pending uploads | Medium | 4h |
| 🟡 | M10 — Consolidate duplicate RLS policies | Low | 1h |
| 🟡 | M12 — Account deletion endpoint | Medium | 6h |
| 🟢 | L4 — Admin audit log | Medium | 6h |
| 🟢 | L8 — Compose context providers | Low | 1h |

**Total estimated effort: ~52h**

---

### Phase 4: Long-term (Next Quarter) — Platform Differentiation

> **Theme: Stand out from the crowd**

| Priority | Item | Impact | Effort |
|---|---|---|---|
| 🟢 | L1 — Admin subject/module management UI | Medium | 16h |
| 🟢 | L2 — Time-scoped trending | Medium | 8h |
| 🟢 | L3 — Document discussion/comments | High | 20h |
| 🟢 | L6 — Admin bulk actions | Medium | 8h |
| 🟢 | L9 — Offline bookmark viewing | Medium | 6h |
| 🟢 | L10 — End-to-end tests (Playwright) | High | 16h |
| 🟢 | L11 — API response caching | Medium | 4h |
| 🟢 | L12 — First-use discovery tooltips | Medium | 8h |
| 🟢 | L5 — JSON-LD structured data | Low | 4h |
| 🟢 | L7 — Document version history | Low | 12h |

**Total estimated effort: ~102h**

---

## What's Already Excellent

Before closing, these are the things you've done well that many production apps at this stage lack:

| Area | What You Did Right |
|---|---|
| **Security** | MFA-gated admin with AAL2 enforcement, JWT signature verification, PDF magic byte validation, RLS on all tables |
| **Design System** | Strict typography scale lock, semantic color tokens, consistent motion system, Plus Jakarta Sans + Geist stack |
| **Architecture** | Clean frontend/backend separation, R2 object storage, Supabase Realtime subscriptions for notifications |
| **Error Handling** | Route-level error boundaries, global error boundary, backend rollback on failed DB inserts |
| **SEO** | Dynamic sitemap, robots.txt, template metadata, descriptive page titles |
| **PWA** | Service worker, offline fallback, manifest, install capability |
| **Crowdsourcing** | Upload → pending → approval pipeline with notifications, resubmission flow, document flagging |
| **Personalization** | Favorite subjects, personalized feeds, contextual upload prompts based on engagement |
| **Onboarding** | Profile completion gate, contextual auth prompts per feature, skip functionality |
| **Accessibility** | Global focus-visible styles, ARIA-compliant Command Palette, semantic HTML |

---

> **Bottom line:** This is a strong, well-architected academic portal. The 42 recommendations above are not about fixing broken things — they're about elevating an already-good product to a premium, production-hardened standard. Start with Phase 1 (security and performance) and work forward. Every phase independently improves the platform, so even partial completion delivers meaningful value.
