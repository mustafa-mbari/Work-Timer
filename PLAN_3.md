# Work-Timer Companion Website — UI Redesign & Rebuild Plan

> **Stack:** Next.js 15 + React 19 + TypeScript 5.7 + TailwindCSS v4 + Supabase + Stripe
> **UI Library:** shadcn/ui (Radix UI primitives, copy-paste components)
> **Charts:** Recharts (consistent with Chrome Extension)
> **Target:** Full UI rebuild — performance, reliability, usability, accessibility

---

## Why This Rebuild

The companion website was built as a rapid prototype alongside the Chrome Extension's Phase 4 (cloud sync). While functionally complete, it had significant issues:

- **Slow**: Analytics and admin pages took 2-5 seconds to load due to client-side JS aggregation instead of SQL queries
- **Unstable**: No error boundaries, no try/catch on server queries, pervasive `as any` TypeScript casts
- **Poor UX**: No mobile navigation, no dark mode, no loading states, no toast feedback, no pagination on tables
- **Not accessible**: Missing ARIA labels, no keyboard navigation, untested contrast ratios
- **Hard to maintain**: Only 2 shared components, massive code duplication, no design system

---

## Milestone 1 — Foundation: Type Safety, Component Library & Design Tokens ✅

**Goal:** Establish the infrastructure everything else builds on.

### 1.1 Fix Supabase Database Types ✅

- **File:** `shared/types.ts`
- Replaced `Insert: Partial<T>` / `Update: Partial<T>` with proper `Pick`/`Omit` types that enforce required fields for inserts while keeping updates fully partial
- All 10 tables now have proper `Insert`/`Update` types in the `Database` type map

### 1.2 Install & Configure shadcn/ui ✅

- **New dir:** `web/components/ui/` — 16 components installed
- **Components:** button, card, input, badge, skeleton, dialog, alert-dialog, table, dropdown-menu, tabs, sonner, separator, avatar, sheet, label, select
- **Dependencies added:** `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-*` (slot, dialog, dropdown-menu, tabs, avatar, separator, label, select, alert-dialog, tooltip), `lucide-react`, `sonner`
- **New file:** `web/lib/utils.ts` — standard `cn()` class merge helper

### 1.3 Design Tokens & Dark Mode CSS ✅

- **File:** `web/app/globals.css`
  - CSS custom properties matching extension design system (Indigo accent, Stone neutrals)
  - Dark mode surface tokens: `--dark`, `--dark-card`, `--dark-elevated`, `--dark-border`, `--dark-hover`
  - `@custom-variant dark (&:where(.dark, .dark *))` — **critical fix** for Tailwind v4 class-based dark mode (v4 defaults to `prefers-color-scheme` media query; this override makes `dark:` variants respond to the `.dark` class instead)
  - shadcn animation keyframes (accordion-down, accordion-up)

### 1.4 Dark Mode Provider ✅

- **New file:** `web/lib/theme.ts` — Theme context, `useTheme()` hook, `storeTheme()`, `applyTheme()`, `getSystemTheme()` utilities
- **New file:** `web/components/ThemeProvider.tsx` — Cookie-based theme provider with SSR-safe initial state
  - Accepts `initialTheme` prop from server-read cookie to avoid hydration mismatch
  - Resolves "system" preference in `useEffect` after mount
  - Listens for OS theme changes via `matchMedia`
- **New file:** `web/components/ThemeToggle.tsx` — Light/Dark/System 3-button toggle
- **File:** `web/app/layout.tsx`
  - Reads `theme` cookie server-side via `cookies()`, passes to `ThemeProvider`
  - Inline `<script>` in `<head>` applies theme class before first paint (prevents flash)
  - `suppressHydrationWarning` on `<html>` and footer year `<span>`

### 1.5 Install Recharts ✅

- **Dep:** `recharts` added to `web/package.json`
- Used in Analytics (BarChart, PieChart, AreaChart) and Admin Stats (bar charts)

### Validation

- [x] `cd web && npm run build` passes with zero type errors (24/24 routes)
- [x] shadcn components render correctly
- [x] Dark mode toggles without flash (cookie persistence + inline script)
- [x] CSS custom properties apply correctly in both modes
- [x] Tailwind v4 `dark:` variant works with class-based toggle (via `@custom-variant`)

### Deviations from Plan

- **Tailwind v4 `dark:` variant required `@custom-variant` override** — Not anticipated in original plan. Without this, `dark:` utilities only responded to OS preference, making the manual light/dark toggle non-functional.
- **Hydration mismatch fix** — Original plan didn't anticipate that `ThemeProvider` reading `document.cookie` during `useState` init would cause SSR/client state mismatch. Fixed by passing server-read cookie as `initialTheme` prop.
- **`as any` casts still present** — The typed Supabase client returns `never` for `.select()` with column subsets due to a mismatch between our manual types and Supabase's expected format. `as any` on `.from()` is still needed as a workaround. Full removal would require using Supabase CLI-generated types.

---

## Milestone 2 — Shared Layouts & Navigation ✅

**Goal:** Fix navigation, create shared layouts, add loading/error infrastructure.

### 2.1 Responsive Navbar Rebuild ✅

- **File:** `web/components/Navbar.tsx` — Server component that fetches user + profile, passes data to client subcomponents
- **New file:** `web/components/NavLink.tsx` — Client component using `usePathname()` for active link detection
- **New file:** `web/components/UserMenu.tsx` — Client component with Radix DropdownMenu (avatar, email, dashboard/admin links, sign out)
- **New file:** `web/components/MobileMenu.tsx` — Client component using shadcn Sheet (slide-out drawer) for mobile nav
- Desktop nav hidden on mobile (`hidden md:flex`), mobile menu only on small screens

**Note:** Navbar kept as server component (not converted to client as originally planned) — server-side fetching is more efficient and avoids client-side auth state management. Client interactivity delegated to subcomponents.

### 2.2 Shared Authenticated Layout (Route Group) ✅

- **New file:** `web/app/(authenticated)/layout.tsx` — Shared layout for `/dashboard`, `/billing`, `/analytics`
  - Checks auth (redirects to `/login` if not logged in)
  - Consistent `max-w-5xl mx-auto px-6 py-8` wrapper
- **Moved pages (URLs unchanged):**
  - `app/dashboard/page.tsx` → `app/(authenticated)/dashboard/page.tsx`
  - `app/billing/page.tsx` → `app/(authenticated)/billing/page.tsx` (+ CheckoutButton, PortalButton, PromoCodeInput)
  - `app/analytics/page.tsx` → `app/(authenticated)/analytics/page.tsx` (+ AnalyticsCharts)
- Old directories deleted

### 2.3 Loading & Error Infrastructure ✅

- `web/app/(authenticated)/loading.tsx` — Skeleton-based loading with card placeholders
- `web/app/(authenticated)/error.tsx` — Error boundary with retry button, dark mode
- `web/app/admin/loading.tsx` — Admin skeleton loading
- `web/app/admin/error.tsx` — Admin error boundary with retry

### 2.4 Toast System ✅

- **File:** `web/components/ui/sonner.tsx` — Custom styled Toaster (indigo actions, dark mode, rounded-xl, success/error color variants)
- **File:** `web/app/layout.tsx` — `<Toaster position="bottom-right" />` in root layout
- Used by all CRUD forms, auth forms, and billing components

### 2.5 Footer Fix ✅

- **New file:** `web/app/privacy/page.tsx` — Placeholder privacy policy
- **New file:** `web/app/terms/page.tsx` — Placeholder terms of service
- Footer links in `layout.tsx` now resolve to real pages

### Validation

- [x] Mobile nav opens/closes on all screen sizes
- [x] Active link highlighted correctly on all routes
- [x] Loading skeleton appears during navigation
- [x] Error boundary catches and displays errors with retry
- [x] Toasts appear for all form actions
- [x] URLs remain unchanged after route group migration (`/dashboard`, `/billing`, `/analytics`)

### Deviations from Plan

- **Navbar architecture:** Kept as async server component instead of converting to client. Subcomponents (NavLink, UserMenu, MobileMenu) handle client-side interactivity.
- **Stale `.next` cache:** After route migration, the `.next/types/` directory still referenced old paths. Required `rm -rf .next` to fix.

---

## Milestone 3 — Public Pages Rebuild ✅

**Goal:** Rebuild landing, login, and register pages with shadcn + dark mode.

### 3.1 Landing Page ✅

- **File:** `web/app/page.tsx`
  - Replaced emoji icons with Lucide icons (Timer, FolderKanban, BarChart3, ShieldCheck, Cloud, FileSpreadsheet)
  - Features grid with shadcn Card, icon containers with colored backgrounds
  - Pricing section with shadcn Card, Badge for "Forever" tag
  - CTA section with indigo background, dark mode variant
  - Full dark mode support on all sections
- **File:** `web/components/PricingCard.tsx`
  - Rebuilt with shadcn Card, Badge ("Popular"), Button, Check icon
  - Toast for checkout errors (replaced `alert()`)
  - `cn()` for conditional "recommended" styling

### 3.2 Login Page ✅

- **File:** `web/app/login/LoginForm.tsx`
  - Rebuilt with shadcn Tabs (Password / Magic Link), Input, Button, Label, Separator
  - **Bug fix:** `signInWithPassword()` now redirects to `/dashboard` directly via `router.push()` instead of going through `/auth/callback` (which expects OAuth code exchange). Extension flow (`?ext=true`) still uses callback.
  - Google OAuth with SVG icon
  - Toast notifications for all auth outcomes
  - Dark mode

### 3.3 Register Page ✅

- **File:** `web/app/register/RegisterForm.tsx`
  - Rebuilt with shadcn Input, Button, Label, Separator
  - Password strength indicator (Weak/Fair/Strong with animated color bar)
  - Google OAuth
  - Toast notifications
  - Dark mode

### Validation

- [x] Landing page responsive
- [x] Login password flow redirects to `/dashboard` correctly (bug fixed)
- [x] Login magic link and Google OAuth work
- [x] Registration creates account with toast feedback
- [x] All pages correct in light and dark modes

---

## Milestone 4 — Authenticated User Pages ✅

**Goal:** Rebuild dashboard, analytics, and billing with proper data fetching.

### 4.1 Dashboard Enhancement ✅

- **File:** `web/app/(authenticated)/dashboard/page.tsx`
  - Plan card with shadcn Card + Badge
  - Connected devices with shadcn Table
  - Quick links to analytics and billing
  - Parallel data fetching (subscription + sync cursors)
  - Dark mode

### 4.2 Analytics — UI Overhaul ✅

- **File:** `web/app/(authenticated)/analytics/page.tsx`
- **File:** `web/app/(authenticated)/analytics/AnalyticsCharts.tsx` (client component for Recharts)

**Overview stats (6 cards):**
- Total Hours, Total Entries, Avg Hours/Day
- Avg Session Duration (minutes)
- Streak (consecutive days with entries counting back from today)
- Best Day (day of week with most hours)

**Charts (6 visualizations):**
- AreaChart: Daily activity (last 30 days) with gradient fill
- BarChart: Weekly hours (last 12 weeks)
- PieChart: Time by project (top 8)
- Horizontal BarChart: Time by entry type (Manual/Stopwatch/Pomodoro) with entry count in tooltip
- BarChart: Hours by day of week (Sun-Sat)
- BarChart: Peak working hours (00:00-23:00)

**New sections:**
- Project Progress: For projects with `target_hours`, shows progress bars with percentage and color (green when complete)

**Data fetching:** Fetches `date, start_time, end_time, duration, project_id, type, tags, description` fields + projects with `target_hours`. Up to 2000 entries, aggregated server-side before passing to client charts.

### 4.3 Billing Page ✅

- **File:** `web/app/(authenticated)/billing/page.tsx` — shadcn Card, Badge, Button
- **File:** `web/app/(authenticated)/billing/CheckoutButton.tsx` — shadcn Button + toast
- **File:** `web/app/(authenticated)/billing/PortalButton.tsx` — shadcn Button + toast
- **File:** `web/app/(authenticated)/billing/PromoCodeInput.tsx` — shadcn Input + Button + toast

### Validation

- [x] Dashboard loads with shadcn components and dark mode
- [x] Analytics shows 6 stat cards + 6 charts + project progress
- [x] Recharts renders correctly (BarChart, PieChart, AreaChart)
- [x] Billing with toast feedback
- [x] All pages responsive and dark-mode compatible
- [x] Build passes with zero errors

### Deviations from Plan

- **SQL optimization deferred:** Original plan called for replacing JS aggregation with SQL queries/RPCs. Current implementation still fetches entries and aggregates server-side in JS. This is acceptable for individual users (max ~2000 entries) but would need RPCs at scale. Date range filter also deferred.
- **Suspense streaming deferred:** Pages render as single server components. Streaming per-section would require more granular component splitting.
- **Analytics significantly expanded:** Original plan had 3 stat cards + 3 charts. Implementation has 6 stat cards + 6 charts + project progress section.
- **`force-dynamic` still present on admin pages** — Needed because admin data must always be fresh. Could be replaced with `revalidate: 0` or ISR in future.

---

## Milestone 5 — Admin Panel Full Rebuild ✅

**Goal:** Professional admin panel with pagination, search, sort, friendly labels, toasts, confirmations.

### 5.1 Admin Layout & Navigation ✅

- **File:** `web/app/admin/layout.tsx` — Rebuilt with dark mode, ArrowLeft back link, delegated nav to AdminNav
- **New file:** `web/app/admin/AdminNav.tsx` — Client component with `usePathname()` for active tab highlighting, Lucide icons on each tab, `overflow-x-auto` for mobile, `aria-current` for accessibility

### 5.2 Admin Overview ✅

- **File:** `web/app/admin/page.tsx`
  - 4 stat cards with Lucide icons: Total Users, Premium Users, Free Users, Total Hours Tracked
  - Conversion rate progress bar (free vs premium)
  - Recent sign-ups table with shadcn Table (display name + email, formatted dates)
  - **Data fix:** Uses `select('id')` + array length counting instead of `head: true` count (which was returning unreliable results)
  - Dark mode

### 5.3 Admin Users — Paginated DataTable ✅

- **File:** `web/app/admin/users/page.tsx` — Server component with URL-based pagination via `searchParams`
- **New file:** `web/app/admin/users/UsersTable.tsx` — Client component with:
  - Server-side pagination with `.range()` (15 per page)
  - Search by email via URL params (`?search=...&page=...`)
  - Friendly plan labels ("Premium Monthly" instead of "premium_monthly")
  - Role badges (admin highlighted with `variant="default"`)
  - Smart page number windowing (shows 5 pages around current)
  - Loading transition state with `useTransition`
  - Clear search button, results count

### 5.4 Admin Stats ✅

- **File:** `web/app/admin/stats/page.tsx`
  - **Data fix:** All queries use `select('id/fields')` + array counting instead of `head: true` (fixed the "Total Users = 1" bug)
  - **Parallel fetch:** 11 concurrent queries (profiles, subscriptions, promos, domains, entries, DAU/WAU/MAU, recent entries, new users, projects)

**Sections:**
- **Users** (4 cards): Total Users (+new this week), DAU, WAU, MAU
- **User Growth** (bar chart): Signups per week for last 8 weeks (CSS bar chart, no Recharts dependency for server component)
- **Premium Subscriptions**: By Plan Type + By Source breakdown with progress bars
- **Platform Usage** (4 cards): Total Hours, Total Entries, Avg Session Duration, Conversion Rate
- **Content Breakdown**: Entry type distribution (Manual/Stopwatch/Pomodoro) + Quick Stats (projects, avg projects/user, avg entries/day, avg session)
- **Top Users by Hours**: Ranked table of top 5 most active users
- **Promotions & Domains** (3 cards): Active Promos, Whitelisted Domains, Manual Grants
- Dark mode throughout

### 5.5 Admin CRUD Pages ✅

**Domains** — `web/app/admin/domains/page.tsx`
- shadcn Input + Select + Button form for adding domains
- shadcn Table with plan labels, active/inactive Badge
- AlertDialog confirmation for activate/deactivate
- Toast notifications for all actions
- Loading skeleton state, dark mode

**Promos** — `web/app/admin/promos/page.tsx`
- shadcn grid form (code, discount %, plan, max uses)
- shadcn Table with monospace code display, discount Badge
- AlertDialog confirmation for activate/deactivate
- Toast notifications, loading skeleton, dark mode

**Subscriptions** — `web/app/admin/subscriptions/page.tsx`
- shadcn Input + Select form for granting premium
- shadcn Table with friendly plan labels + source labels ("Stripe", "Domain Whitelist", "Promo Code", "Manual Grant")
- Toast notifications, loading skeleton, dark mode

### Validation

- [x] Users table paginates with 15 per page
- [x] Search filters users by email via URL params
- [x] Stats page uses reliable data-based counting (fixed Total Users bug)
- [x] All CRUD operations show toast feedback
- [x] Domains and Promos have AlertDialog confirmation for destructive actions
- [x] All admin pages work in dark mode
- [x] Friendly labels everywhere (no raw DB values)
- [x] Build passes with zero errors

### Deviations from Plan

- **No Supabase RPC functions created** — Original plan called for SQL RPCs for DAU/WAU/MAU and total hours. Instead, queries fetch minimal columns and aggregate in JS. This works well for current scale but would benefit from RPCs at >10K users.
- **No Recharts on admin stats** — User growth chart uses CSS bars (server component compatible) instead of Recharts (which requires client component). Keeps admin pages lightweight.
- **`head: true` count abandoned** — Discovered that PostgREST `HEAD` requests with count option returned unreliable results (showing 1 instead of actual count). Switched all admin queries to data-based counting with `select('id')` + array `.length`.
- **Page size selector not implemented** — Fixed at 15 per page. Could add URL param for size in future.

---

## Milestone 6 — Polish & Build Verification ✅

**Goal:** Final build verification and critical bug fixes.

### 6.1 Build Verification ✅

- `npm run build` passes with zero TypeScript errors
- All 24 routes compile successfully
- Clean build after `rm -rf .next` to clear stale cache

### 6.2 Critical Bug Fixes ✅

- **Light mode not working:** Added `@custom-variant dark (&:where(.dark, .dark *))` to `globals.css`. Tailwind v4 defaults to media-query dark mode; this override enables class-based dark mode required by our theme toggle.
- **Hydration mismatch:** Fixed ThemeProvider to accept `initialTheme` from server-read cookie, ensuring SSR and client agree on initial state. Added `suppressHydrationWarning` on dynamic content (footer year).
- **Admin stats showing wrong counts:** Replaced `head: true` count queries with reliable data-based `select('id')` + `.length` approach across all admin pages.

### 6.3 Missing Pages ✅

- `/privacy` and `/terms` placeholder pages created in M2

### Not Yet Completed

- [ ] Lighthouse performance audit (90+ target)
- [ ] Full accessibility audit (keyboard nav, screen reader, WCAG AA contrast)
- [ ] Middleware optimization (skip auth on public routes)
- [ ] Remove remaining `as any` casts (requires Supabase CLI-generated types)
- [ ] Date range filter on analytics page
- [ ] Suspense streaming for heavy pages
- [ ] `force-dynamic` cleanup where possible

---

## Risks & Mitigations

| Risk | Impact | Outcome |
|------|--------|---------|
| shadcn/ui + Tailwind v4 compatibility | Medium | **Resolved.** Required `@custom-variant dark` override for class-based dark mode. All components work. |
| Route group migration breaks URLs | High | **No issues.** `(authenticated)` group preserves `/dashboard`, `/billing`, `/analytics` URLs. Required `.next` cache clear after migration. |
| SQL RPC functions need Supabase access | Medium | **Deferred.** JS-side aggregation works for current scale. RPCs remain a future optimization. |
| Admin rebuild scope creep | Medium | **Managed.** Added user growth chart, top users table, entry type breakdown beyond original scope, but all serve the admin use case. |
| Dark mode inconsistencies | Low | **Resolved.** CSS custom properties + `@custom-variant` ensure consistent dark mode. All pages tested. |
| Recharts bundle size | Low | **Managed.** Analytics page is 117 kB First Load JS (includes Recharts). Admin stats use CSS bars instead to stay lightweight. |
| `head: true` count reliability | New | **Resolved.** Discovered PostgREST HEAD counts were unreliable. Switched to data-based counting. |
| Hydration mismatch | New | **Resolved.** Server-read cookie passed as prop to ThemeProvider ensures SSR/client state agreement. |

---

## Deployment

All changes are on the `primum_version` branch. The build compiles cleanly with 24/24 routes.

---

## Dependencies Added

```json
{
  "dependencies": {
    "recharts": "^2.15.3",
    "lucide-react": "^0.469.0",
    "sonner": "^2.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.2",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-alert-dialog": "^1.1.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@fontsource-variable/inter": "^5.1.1"
  },
  "devDependencies": {
    "tailwindcss-animate": "^1.0.7"
  }
}
```

---

## File Inventory

### New Files Created

| File | Purpose |
|------|---------|
| `web/lib/utils.ts` | `cn()` class merge helper |
| `web/lib/theme.ts` | Theme context, `useTheme()`, cookie utilities |
| `web/components/ThemeProvider.tsx` | Cookie-based theme provider with SSR-safe state |
| `web/components/ThemeToggle.tsx` | Light/Dark/System 3-button toggle |
| `web/components/NavLink.tsx` | Active link highlighting with `usePathname` |
| `web/components/UserMenu.tsx` | User dropdown menu (avatar, sign out, links) |
| `web/components/MobileMenu.tsx` | Mobile hamburger menu using Sheet |
| `web/components/ui/button.tsx` | shadcn Button |
| `web/components/ui/card.tsx` | shadcn Card (+ Header, Title, Description, Content, Footer) |
| `web/components/ui/input.tsx` | shadcn Input |
| `web/components/ui/badge.tsx` | shadcn Badge |
| `web/components/ui/label.tsx` | shadcn Label |
| `web/components/ui/dialog.tsx` | shadcn Dialog |
| `web/components/ui/alert-dialog.tsx` | shadcn AlertDialog |
| `web/components/ui/table.tsx` | shadcn Table |
| `web/components/ui/tabs.tsx` | shadcn Tabs |
| `web/components/ui/separator.tsx` | shadcn Separator |
| `web/components/ui/dropdown-menu.tsx` | shadcn DropdownMenu |
| `web/components/ui/sheet.tsx` | shadcn Sheet |
| `web/components/ui/avatar.tsx` | shadcn Avatar |
| `web/components/ui/sonner.tsx` | Custom styled Toaster |
| `web/components/ui/select.tsx` | shadcn Select |
| `web/components/ui/skeleton.tsx` | shadcn Skeleton |
| `web/app/(authenticated)/layout.tsx` | Shared auth layout |
| `web/app/(authenticated)/loading.tsx` | Skeleton loading state |
| `web/app/(authenticated)/error.tsx` | Error boundary with retry |
| `web/app/(authenticated)/dashboard/page.tsx` | Dashboard page |
| `web/app/(authenticated)/billing/page.tsx` | Billing page |
| `web/app/(authenticated)/billing/CheckoutButton.tsx` | Stripe checkout button |
| `web/app/(authenticated)/billing/PortalButton.tsx` | Stripe portal button |
| `web/app/(authenticated)/billing/PromoCodeInput.tsx` | Promo code input |
| `web/app/(authenticated)/analytics/page.tsx` | Analytics page (6 stats + project progress) |
| `web/app/(authenticated)/analytics/AnalyticsCharts.tsx` | Recharts client component (6 charts) |
| `web/app/admin/AdminNav.tsx` | Admin navigation with active tabs |
| `web/app/admin/loading.tsx` | Admin skeleton loading |
| `web/app/admin/error.tsx` | Admin error boundary |
| `web/app/admin/users/UsersTable.tsx` | Paginated users table client component |
| `web/app/privacy/page.tsx` | Privacy policy placeholder |
| `web/app/terms/page.tsx` | Terms of service placeholder |

### Modified Files

| File | Changes |
|------|---------|
| `shared/types.ts` | Proper `Pick`/`Omit` Insert/Update types for all 10 tables |
| `web/package.json` | Added all dependencies above |
| `web/app/globals.css` | Design tokens, dark mode CSS vars, `@custom-variant dark` for Tailwind v4 |
| `web/app/layout.tsx` | Async, server-read theme cookie, ThemeProvider with `initialTheme`, Toaster, `suppressHydrationWarning`, footer fix |
| `web/components/Navbar.tsx` | Full rebuild: server component + client subcomponents (NavLink, UserMenu, MobileMenu, ThemeToggle) |
| `web/components/PricingCard.tsx` | shadcn Card/Badge/Button rebuild, toast, dark mode |
| `web/app/page.tsx` | Landing page: Lucide icons, shadcn Card/Badge/Button, dark mode |
| `web/app/login/LoginForm.tsx` | shadcn Tabs/Input/Button, password login bug fix, toast |
| `web/app/register/RegisterForm.tsx` | shadcn Input/Button, password strength indicator, toast |
| `web/app/admin/layout.tsx` | Dark mode, AdminNav client component |
| `web/app/admin/page.tsx` | shadcn Card/Table, Lucide icons, data-based counting, conversion rate bar |
| `web/app/admin/users/page.tsx` | Server-side pagination with `searchParams`, delegates to UsersTable |
| `web/app/admin/stats/page.tsx` | Data-based counting, user growth chart, top users, entry types, content breakdown |
| `web/app/admin/domains/page.tsx` | shadcn Form/Table/Select, AlertDialog confirmation, toast |
| `web/app/admin/promos/page.tsx` | shadcn Form/Table/Select, AlertDialog confirmation, toast |
| `web/app/admin/subscriptions/page.tsx` | shadcn Form/Table/Select, friendly labels, toast |

### Deleted Files

| File | Reason |
|------|--------|
| `web/app/dashboard/` (old) | Moved to `web/app/(authenticated)/dashboard/` |
| `web/app/billing/` (old) | Moved to `web/app/(authenticated)/billing/` |
| `web/app/analytics/` (old) | Moved to `web/app/(authenticated)/analytics/` |
