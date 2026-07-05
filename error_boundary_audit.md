# Error Boundary Comprehensive Audit — Academic Portal

> Audited: `frontend/src` | Date: 2026-07-05 | React / Next.js App Router (v14)

---

## Executive Summary

The portal has a solid, single-implementation `ErrorBoundary` class component. Coverage exists for all major high-risk pages (admin, profile, uploads, inbox, module grids, search palette, upload modal). However, several **high-risk areas have no boundary at all**, the component itself has **two significant structural bugs**, the **reset/recovery flow is broken**, and there are **granularity issues** in two locations. This report details every finding with prioritized fixes.

---

## Part 1 — The ErrorBoundary Component (`ErrorBoundary.tsx`)

### Current Implementation

```tsx
// src/components/ui/ErrorBoundary.tsx
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Section error boundary caught an error:", error, errorInfo);
  }
  reset = () => { this.setState({ hasError: false }); };
  render() { ... }
}
```

---

### 🐛 Bug 1 — `getDerivedStateFromError` discards the error object

**File:** [ErrorBoundary.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/ui/ErrorBoundary.tsx#L20-L22)

The static lifecycle receives the thrown `error` as its first argument but the current signature ignores it:

```diff
- static getDerivedStateFromError() {
+ static getDerivedStateFromError(error: Error) {
    return { hasError: true };
```

This isn't critical today, but it means you can never store or display the error message in state without refactoring later. **It will break if you ever want to conditionally show different UIs based on error type** (e.g., network error vs. runtime crash).

**Fix:** Accept and store the error.

```ts
type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

static getDerivedStateFromError(error: Error) {
  return { hasError: true, error };
}
```

---

### 🐛 Bug 2 — Reset/recovery flow is broken by design

**File:** [ErrorBoundary.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/ui/ErrorBoundary.tsx#L28-L30)

The `reset()` method sets `hasError: false`, but **does not clear the error root cause**. If the child component still has the same broken state (e.g., a bad API response cached in a parent, or a corrupted `localStorage` value), clicking "Try again" will immediately re-throw and re-enter the error state.

```tsx
reset = () => {
  this.setState({ hasError: false }); // ← does NOT unmount/remount children
};
```

React's error boundary `reset` pattern requires either:
1. Changing a `key` prop on the boundary (forces full child remount), or
2. Calling an `onReset` callback passed from the parent so the parent can clear problematic state.

Neither is implemented today. The "Try again" button is therefore cosmetically functional but behaviorally broken for most real error scenarios.

**Fix — Recommended approach: `key`-based reset**

```tsx
type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  resetKey: number;
};

reset = () => {
  this.setState(prev => ({
    hasError: false,
    error: undefined,
    resetKey: prev.resetKey + 1,
  }));
};

render() {
  if (!this.state.hasError) {
    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
  // ... fallback UI
}
```

Alternatively, accept an optional `onReset` prop for caller-controlled cleanup:

```ts
type ErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  message?: string;
  className?: string;
  onReset?: () => void; // caller can clear bad state
};
```

---

### 🪵 Observation — Logging uses `console.error` only

**File:** [ErrorBoundary.tsx](file:///c:/Users/raydi/Downloads\Files\frontend\src\components\ui\ErrorBoundary.tsx#L24-L26)

`componentDidCatch` currently only does `console.error(...)`. There is no integration with a production error tracking service. For a deployed academic portal this means:
- Errors are invisible in production (browser console is not monitored).
- The `errorInfo.componentStack` string is valuable for debugging but is never persisted.

**Recommendation:** Add a stub/hook for a future monitoring service:

```ts
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  console.error("ErrorBoundary caught:", error, errorInfo);
  // Future: reportToMonitoring(error, { componentStack: errorInfo.componentStack });
}
```

---

## Part 2 — Placement Audit (Existing Boundaries)

### ✅ Correct and well-scoped placements

| Location | Boundary Scope | Assessment |
|---|---|---|
| `portal-admin/page.tsx` | Wraps `AdminPortalLoginContent` | ✅ Correct — isolates MFA flow |
| `profile/page.tsx` | Wraps `ProfileContent` | ✅ Correct — isolates entire dashboard |
| `recent-uploads/page.tsx` | Wraps `RecentUploadsContent` | ✅ Correct — page-level isolation |
| `subject/[subjectSlug]/[moduleSlug]/page.tsx` | Wraps `DocumentInteractiveGrid` only | ✅ Correct — server component wrapper, client grid isolated |
| `subject/admin/inbox/page.tsx` | Wraps `AdminInboxAuditingContent` | ✅ Correct — critical admin tool |
| `LayoutComponents.tsx` — Search Palette | Wraps inner content of `CommandPalette` | ✅ Correct — search failure doesn't close the dialog |
| `LayoutComponents.tsx` — Upload Modal | Wraps upload form inside dialog | ✅ Correct — isolates form from modal chrome |
| `SubjectTabs.tsx` | Wraps `DocumentInteractiveGrid` per tab | ✅ Correct — tab switch still works on failure |

---

### ⚠️ Structural Issue — CommandPalette ErrorBoundary placement

**File:** [LayoutComponents.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/layout/LayoutComponents.tsx#L243-L330)

The `<ErrorBoundary>` begins at line 243 (inside `Dialog.Content`) but the closing `</ErrorBoundary>` is at line 330, **after** the keyboard shortcut footer `<div>` and the closing pagination bar. This means the footer is inside the error boundary.

If an error occurs, the fallback replaces **all** content including the dialog chrome, which could confuse users who now see only an error card inside the dialog. The footer navigation hints (`↓ Use arrow keys`) are a presentational concern not a risk surface and don't need boundary protection.

**Impact:** Low — it works, but the fallback looks visually awkward within the dialog.

---

### ⚠️ Granularity Issue — SubjectTabs dashboard tab has no boundary

**File:** [SubjectTabs.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/subject/SubjectTabs.tsx#L62-L94)

The `dashboard` tab renders the **Module Card grid** (the `<Link>` tiles for Module 1–5). This branch does **not** have an `ErrorBoundary`. Only the Notes/PYQ/Syllabus tab branches are wrapped. If a module card fails to render (e.g., malformed `mod.name`, a bad `moduleCounts` key), it will propagate up and take out the entire `SubjectPage`.

```tsx
// No ErrorBoundary here:
{activeTab === "dashboard" && !subjectDetails?.is_non_module ? (
  <div className="space-y-4 pt-6">
    <div className="grid ...">
      {modules.map((mod) => { ... })}
    </div>
  </div>
```

**Fix:** Wrap the dashboard grid the same way the other tabs are wrapped.

---

## Part 3 — Missing Error Boundary Coverage

### 🔴 Priority 1 — Critical (Missing, high blast radius)

#### 3.1 `PDFViewerClient` — No boundary anywhere in the viewer

**File:** [PDFViewerClient.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/pdf/PDFViewerClient.tsx)  
**File:** [PDFViewerWrapper.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/pdf/PDFViewerWrapper.tsx)

`PDFViewerClient` is the heaviest interactive component in the app. It:
- Uses `react-pdf` (a complex rendering library using a WebAssembly PDF.js worker)
- Makes 4+ async Supabase calls (`trackDocumentStat`, `logStudySession`, `triggerStreakUpdate`, document ratings, flagging)
- Uses a custom `Toast.Provider`
- Manages `DropdownMenu`, custom modals, clipboard access, `window.open`

**Current state:** `PDFViewerWrapper` wraps it with `dynamic({ ssr: false })` but provides no error boundary. If `react-pdf` fails (CORS on the PDF URL, worker init failure, malformed PDF), the error propagates to the nearest ancestor boundary — which could be as far up as the page-level server component.

There is no `error.tsx` in the subject viewer route.

```tsx
// PDFViewerWrapper.tsx — currently no ErrorBoundary:
export default function PDFViewerWrapper({ documentMeta }) {
  return <PDFViewerClient documentMeta={documentMeta} />;
}
```

**Recommended fix:** Wrap in `PDFViewerWrapper`:

```tsx
import ErrorBoundary from "@/components/ui/ErrorBoundary";

export default function PDFViewerWrapper({ documentMeta }) {
  return (
    <ErrorBoundary
      title="Document viewer could not load"
      message="The PDF viewer ran into a problem. Try refreshing, or open the document in a new tab."
    >
      <PDFViewerClient documentMeta={documentMeta} />
    </ErrorBoundary>
  );
}
```

---

#### 3.2 `ClientLayout.tsx` — Global layout shell has no boundary

**File:** [ClientLayout.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/ClientLayout.tsx)

`ClientLayout` renders the entire application shell: `TopBar`, `Sidebar`, `ContentArea` (wrapping `children`), `MobileNav`, `AuthModal`, `UploadModal`, and `BannersAndToasts`. It is a `"use client"` component powered by the monolithic `useClientLayout` hook.

If any of these crash (e.g., `useClientLayout` hook throws, `StudyHistoryProvider` throws, Radix `Toast.Provider` has an initialization error), the **entire app goes blank** — not just the current page.

There is no boundary in `RootLayout` (`layout.tsx`), no `global-error.tsx`, and no outer boundary in `ClientLayout` itself.

**Note:** This is a structural gap. In Next.js App Router, `global-error.tsx` is the correct pattern for the true root boundary.

**Recommended fix (two-layer):**

1. Add `app/global-error.tsx` (Next.js App Router root boundary):

```tsx
// app/global-error.tsx
"use client";
import { AlertTriangle, RefreshCcw } from "lucide-react";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background p-8 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-4 text-destructive" size={40} />
          <h1 className="text-2xl font-extrabold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">The portal hit a critical error. Your work is safe.</p>
          <button onClick={reset} className="mt-6 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">
            Reload Portal
          </button>
        </div>
      </body>
    </html>
  );
}
```

2. Optionally wrap `ClientLayout` children with a shell-level boundary:

```tsx
// ClientLayout.tsx
<ErrorBoundary title="App shell error" message="A core UI element failed. Try reloading the portal.">
  <AppShell>...</AppShell>
</ErrorBoundary>
```

---

#### 3.3 `bookmarks/page.tsx` — No ErrorBoundary

**File:** [bookmarks/page.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/bookmarks/page.tsx)

`BookmarksPage` is a `"use client"` component that:
- Fetches Supabase auth session
- Calls `getStudentBookmarks` (database query)
- Handles `localStorage` bookmark state
- Handles download via `fetch()` and `URL.createObjectURL`
- Manages `manageOfflinePdf` (service worker)

Any of these can throw. Unlike similar pages (`recent-uploads`, `profile`), `bookmarks/page.tsx` uses a **flat export** with no inner function split and no `ErrorBoundary` wrapping.

**Recommended fix:** Apply the same two-function wrapper pattern used on profile/recent-uploads:

```tsx
function BookmarksContent() { /* existing code */ }

export default function BookmarksPage() {
  return (
    <ErrorBoundary
      title="Bookmarks could not load"
      message="Your saved library ran into a problem. The rest of the portal stays available."
    >
      <BookmarksContent />
    </ErrorBoundary>
  );
}
```

---

#### 3.4 `continue-studying/page.tsx` — No ErrorBoundary

**File:** [continue-studying/page.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/continue-studying/page.tsx)

`ContinueStudyingPage` fetches: auth session, study history, profile preferences, suggestions, trending documents, and handles download flows. It is a complex multi-source client component with no boundary.

**Recommended fix:** Same wrapper pattern:

```tsx
function ContinueStudyingContent() { /* existing code */ }

export default function ContinueStudyingPage() {
  return (
    <ErrorBoundary
      title="Study workspace could not load"
      message="Your recent activity ran into a problem. Navigate to any subject to keep studying."
    >
      <ContinueStudyingContent />
    </ErrorBoundary>
  );
}
```

---

#### 3.5 `reset-password/page.tsx` — No ErrorBoundary

**File:** [reset-password/page.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/reset-password/page.tsx)

This is a critical authentication flow that:
- Uses `supabase.auth.onAuthStateChange` (can throw if SDK state is corrupted)
- Calls `supabase.auth.updateUser` (network call)
- Handles a user at their most vulnerable security moment (active session recovery token)

A crash here means the user's password reset window expires with no usable UI. This is a **high-impact, low-probability** risk but the fix is trivial.

**Recommended fix:**

```tsx
function ResetPasswordContent() { /* existing code */ }

export default function ResetPasswordPage() {
  return (
    <ErrorBoundary
      title="Password reset could not load"
      message="An error occurred during password reset. Please use the link from your email again."
    >
      <ResetPasswordContent />
    </ErrorBoundary>
  );
}
```

---

### 🟡 Priority 2 — Medium (Missing coverage, moderate risk)

#### 3.6 `SubjectGrid` (home page) — No boundary

**File:** [SubjectGrid.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/SubjectGrid.tsx)

`SubjectGrid` is a `"use client"` component rendered on the homepage that uses `SUBJECT_UI_MAP` (if a slug is missing, `SUBJECT_UI_MAP["default"]` is used — but if the default key also fails, the `.icon` access throws). It also has keyboard navigation logic with `elementsRef`.

The parent (`app/page.tsx`) is a Server Component and **cannot** wrap a client component in an ErrorBoundary directly. The boundary needs to be inside `SubjectGrid` itself or at the client boundary.

**Recommended fix:** Wrap with a page-level error route OR wrap SubjectGrid's render return in a try-catch + self-contained boundary logic. The cleanest solution for a Server Component parent is to wrap at the import:

```tsx
// app/page.tsx
import ErrorBoundary from "@/components/ui/ErrorBoundary";
// (This boundary must be declared in a Client Component wrapper)
```

The better approach since `page.tsx` is a Server Component: add `app/error.tsx` for the root route:

```tsx
// app/error.tsx  ← catches client errors in the root segment
"use client";
export default function Error({ error, reset }) { ... }
```

---

#### 3.7 Profile sub-components: `ActivityHeatmap`, `ActivityTimeline`, `AchievementsList`

**Files:** 
- [ActivityHeatmap.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/profile/ActivityHeatmap.tsx)
- [ActivityTimeline.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/profile/ActivityTimeline.tsx)  
- [AchievementsList.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/profile/AchievementsList.tsx)

These are rendered inside `ProfileTabs` which is inside `ProfileContent` which is inside the profile page `ErrorBoundary`. So they **are** caught eventually, but at the cost of taking down the **entire profile page** when only a chart visualization fails.

`ActivityHeatmap` in particular does complex date math inside `useMemo` on `history` data — a malformed `accessed_at` field (e.g., `null`, wrong format) will throw inside the memo and crash the entire profile.

**Recommended fix:** Add per-component boundaries inside `ProfileTabs`:

```tsx
// Inside ProfileTabs.tsx render, wrap each tab section:
<ErrorBoundary title="Activity chart could not load" message="...">
  <ActivityHeatmap history={history} />
</ErrorBoundary>

<ErrorBoundary title="Timeline could not load" message="...">
  <ActivityTimeline history={history} />
</ErrorBoundary>

<ErrorBoundary title="Achievements could not load" message="...">
  <AchievementsList achievements={achievements} />
</ErrorBoundary>
```

---

#### 3.8 `SubjectPage` (`/subject/[subjectSlug]`) — No boundary around `SubjectTabs`

**File:** [subject/[subjectSlug]/page.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/app/subject/%5BsubjectSlug%5D/page.tsx#L54-L59)

The Server Component renders `<SubjectTabs>` with no boundary. `SubjectTabs` is a Client Component that makes async Supabase calls and renders `DocumentInteractiveGrid`. While the grid itself is wrapped inside `SubjectTabs`, a crash in the `SubjectTabs` component logic itself (e.g., `useEffect`, `useState` update, rendering the dashboard module cards) propagates unhandled.

**Recommended fix:** Add a boundary in `SubjectPage` around `SubjectTabs`:

```tsx
// subject/[subjectSlug]/page.tsx
import ErrorBoundary from "@/components/ui/ErrorBoundary";

// Inside return:
<ErrorBoundary
  title="Subject page could not load"
  message="The subject browser ran into a problem. Try going back and selecting the subject again."
>
  <SubjectTabs ... />
</ErrorBoundary>
```

---

### 🟢 Priority 3 — Low (Nice-to-have / future-proofing)

#### 3.9 Notification dropdown — No boundary

**File:** [LayoutComponents.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/layout/LayoutComponents.tsx#L387-L428)

The notification panel renders inside `TopBar` with no boundary. It does inline Supabase deletes and iterates `ctx.notifications`. Since `TopBar` is part of the global shell, a crash would take down the entire header. The risk is low (mostly simple rendering) but the position is very high-blast-radius.

**Recommendation:** Wrap the notification dropdown content (not the trigger button):

```tsx
{ctx.showNotifications && (
  <ErrorBoundary title="Notifications could not load" className="m-2" message="...">
    <div className="absolute ... rounded-2xl ...">
      {/* notification panel content */}
    </div>
  </ErrorBoundary>
)}
```

#### 3.10 `ResubmitModal` — No boundary

**File:** [ResubmitModal.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/ui/ResubmitModal.tsx)

This modal handles document resubmission by students. It's a complex form component that likely involves file uploads. It sits in the same risk tier as `UploadModal` (which is wrapped). Wrapping it would be consistent.

#### 3.11 `SidebarNavigation` — No boundary

**File:** [LayoutComponents.tsx](file:///c:/Users/raydi/Downloads/Files/frontend/src/components/layout/LayoutComponents.tsx#L454-L565)

Contains the trending documents section which reads `ctx.trendingDocs`. This data comes from a React Query `useQuery` in `useClientLayout`. A malformed document shape would crash the sidebar navigation. The trending section specifically would benefit from isolation:

```tsx
<ErrorBoundary title="Trending section could not load" className="mt-2" message="">
  {!ctx.sidebarCollapsed && ctx.trendingDocs.length > 0 && (
    <div>... trending docs ...</div>
  )}
</ErrorBoundary>
```

---

## Part 4 — Boundaries That Are Correctly NOT Present

The following areas correctly do **not** have Error Boundaries and should not receive them:

| Area | Reason |
|---|---|
| `loading.tsx` (route segment) | Next.js Suspense boundary — different mechanism |
| Static UI elements (TopBar logo, nav links) | No async behavior, pure JSX |
| `AppShell`, `ContentArea` | Structural wrappers only |
| `SidebarFooter` | Pure display, no data fetching |
| `BannersAndToasts` (offline banner, email banner) | Simple boolean flag renders — crash risk negligible |
| Auth form fields inside `AuthModal` | Form inputs cannot throw; form submit errors are caught by try/catch |

---

## Part 5 — React/Next.js App Router Best Practices Assessment

### What is correctly done ✅

1. **`"use client"` on `ErrorBoundary`** — Correct. Class components require the client boundary.
2. **Inner function pattern** — `ProfileContent` inside `ProfilePage`, `AdminPortalLoginContent` inside `AdminPortalLogin` etc. This is the correct Next.js App Router pattern — keep server metadata/data fetching in the outer component, error boundary isolates the client tree.
3. **`componentDidCatch`** — Correctly implemented for side-effect logging.
4. **`role="alert"`** on the fallback div — Correct for accessibility.
5. **Scoped boundaries** (not wrapping entire pages in one mega-boundary) — Good isolation strategy.
6. **Custom `title` and `message` props per boundary** — Context-aware error messages, correct.

### What needs improvement ⚠️

1. **No `global-error.tsx`** — This is the Next.js App Router mechanism for root-level catches. Missing.
2. **No `app/error.tsx`** for the root segment (home page) — Errors in `SubjectGrid` have no Next.js route-level safety net.
3. **`getDerivedStateFromError` discards the error** — Bug.
4. **Reset button doesn't actually recover** — UX bug.
5. **No error monitoring integration** — `console.error` only.
6. **Inconsistent coverage** — `bookmarks`, `continue-studying`, `reset-password` are missing boundaries while peer pages have them.

---

## Part 6 — Prioritized Implementation Roadmap

### 🔴 Priority 1 — Do immediately

| # | Action | File | Impact |
|---|---|---|---|
| P1-A | Fix `getDerivedStateFromError` signature | `ErrorBoundary.tsx` | Enables future error-type inspection |
| P1-B | Fix reset/recovery (key-based remount) | `ErrorBoundary.tsx` | "Try again" actually works |
| P1-C | Add `global-error.tsx` | `app/global-error.tsx` | Root-level safety net — **currently missing** |
| P1-D | Wrap `PDFViewerClient` in `PDFViewerWrapper` | `PDFViewerWrapper.tsx` | PDF viewer is highest-risk component |
| P1-E | Add boundary to `bookmarks/page.tsx` | `bookmarks/page.tsx` | Consistent with peer pages |
| P1-F | Add boundary to `continue-studying/page.tsx` | `continue-studying/page.tsx` | Complex multi-source client page |

### 🟡 Priority 2 — Address soon

| # | Action | File | Impact |
|---|---|---|---|
| P2-A | Add boundary to `reset-password/page.tsx` | `reset-password/page.tsx` | Critical auth flow protection |
| P2-B | Wrap dashboard tab in `SubjectTabs` | `SubjectTabs.tsx` | Consistent grid isolation |
| P2-C | Add boundary around `SubjectTabs` in subject page | `subject/[subjectSlug]/page.tsx` | Subject overview safety net |
| P2-D | Add per-widget boundaries in `ProfileTabs` | `ProfileTabs.tsx` | Heatmap/timeline isolated from profile shell |
| P2-E | Add `app/error.tsx` for root route | `app/error.tsx` | Home page grid safety net |

### 🟢 Priority 3 — Polish

| # | Action | File | Impact |
|---|---|---|---|
| P3-A | Wrap notification dropdown content | `LayoutComponents.tsx` | Shell protection |
| P3-B | Wrap `ResubmitModal` | `ResubmitModal.tsx` | Consistent with `UploadModal` |
| P3-C | Wrap trending section in `SidebarNavigation` | `LayoutComponents.tsx` | Sidebar resilience |
| P3-D | Add error monitoring stub to `componentDidCatch` | `ErrorBoundary.tsx` | Production observability |
| P3-E | Add optional `onReset` prop | `ErrorBoundary.tsx` | Caller-controlled cleanup |

---

## Part 7 — Edge Cases to Watch

1. **`ActivityHeatmap` date parsing:** `new Date(item.accessed_at || item.created_at)` — if both fields are `null` or an invalid string, this returns `Invalid Date`, and `toISOString()` throws. Needs boundary AND defensive coding.

2. **PDF.js worker CDN:** The worker is loaded from `unpkg.com` — a network failure at worker initialization causes `react-pdf` to throw synchronously during render, not in an async handler. **This is exactly the kind of error an `ErrorBoundary` catches.** Very high priority.

3. **`downloadingRef` and `useRef<Set<number>>`:** Used in `bookmarks`, `recent-uploads`, and `continue-studying`. If `Set` constructor throws (pathological environment), these pages have no boundary.

4. **`localStorage` JSON.parse:** Used in many components. Currently wrapped in `try/catch` inline in `CommandPalette` and `DocumentInteractiveGrid`. Other pages (e.g., `bookmarks`) use it without try/catch — a corrupted `portal_bookmarks` key would throw.

5. **`dangerouslySetInnerHTML` in `portal-admin/page.tsx`:** The QR code SVG is inserted via `dangerouslySetInnerHTML={{ __html: qrCode }}`. If `qrCode` is empty string or malformed, it renders as empty — not a throw. But if the Supabase MFA `enroll` API changes its response shape, `enrollData.totp.qr_code` would be `undefined` and render safely. Low risk.

6. **`ProfileDropdown` and `ProfileSidebarCard`:** Rendered in `TopBar` and `Sidebar` without boundaries. A bad `userName` or `userEmail` prop (e.g., a non-string type from a schema change) would crash header/sidebar.

---

## Summary Table

| Component/Route | Has EB? | Scope | Issues |
|---|---|---|---|
| `ErrorBoundary.tsx` | — | Core component | 2 bugs: error discarded, reset broken |
| `global-error.tsx` | ❌ Missing | Root | **Critical gap** |
| `app/error.tsx` (root) | ❌ Missing | Root route | No home-page safety net |
| `PDFViewerWrapper` | ❌ Missing | PDF viewer | Highest-risk component |
| `bookmarks/page.tsx` | ❌ Missing | Full page | Inconsistent vs. peers |
| `continue-studying/page.tsx` | ❌ Missing | Full page | Complex multi-fetch page |
| `reset-password/page.tsx` | ❌ Missing | Auth flow | Critical auth moment |
| `SubjectTabs` — dashboard tab | ❌ Missing | Module grid | Only tab without boundary |
| `subject/[subjectSlug]/page.tsx` | ❌ Missing | SubjectTabs wrapper | Server component gap |
| `ProfileTabs` sub-widgets | ❌ Missing | Heatmap/Timeline | Crash takes out whole profile |
| `portal-admin/page.tsx` | ✅ | Full page | Correct |
| `profile/page.tsx` | ✅ | Full page | Correct |
| `recent-uploads/page.tsx` | ✅ | Full page | Correct |
| `subject/[subjectSlug]/[moduleSlug]/page.tsx` | ✅ | Document grid | Correct |
| `subject/admin/inbox/page.tsx` | ✅ | Full page | Correct |
| `CommandPalette` | ✅ | Dialog content | Minor placement issue |
| `UploadModal` | ✅ | Form only | Correct |
| `SubjectTabs` — notes/pyq/syllabus tabs | ✅ | Document grid | Correct |
