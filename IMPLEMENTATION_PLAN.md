# Work-Timer Web App — Implementation Plan

> Based on gap analysis of `Plan-not-yet-done.md` against existing codebase.
> **22 use cases** to implement across **6 phases**.

---

## Context

The Work-Timer companion website (`web/`) already has a solid foundation: authentication (login/register/OAuth/extension bridge), dashboard, billing with Stripe, premium analytics with Recharts, promo codes, full admin panel, and Stripe webhooks are **all implemented**. This plan covers the **remaining 22 use cases** that are missing or partially implemented — primarily the Settings pages, Entries CRUD page, auth hardening (email verification, forgot password), dashboard enhancements, analytics filters, and UI polish.

---

## Gap Summary

| Area | Implemented | Missing |
|------|-------------|---------|
| Auth (login/register/OAuth/signout/session) | UC-1.1 to UC-1.9 | UC-1.10, 1.11, 1.12, 1.13, 1.14 |
| Dashboard | UC-2.1, 2.3 | UC-2.2 (enhanced), 2.4, 2.5, 2.6 |
| Billing & Subscriptions | All (UC-3.1 to 3.7) | None |
| Analytics | UC-4.1 to 4.10 | UC-4.11, 4.12 |
| Promo Codes | All (UC-5.1 to 5.4) | None |
| Extension Bridge | All (UC-6.1 to 6.4) | None |
| Settings | None | UC-7.1 to 7.4 (entirely missing) |
| Entries | None | UC-8.1 to 8.5 (entirely missing) |
| Admin (all sections) | All (UC-9 to 14) | None |
| Stripe Webhooks | All (UC-15.1 to 15.5) | None |
| Navigation & UI | UC-16.1 to 16.4 | UC-16.5 (refine), 16.6 |

---

## Phase 1: Authentication Hardening

**Priority: HIGH** — Security-critical, no dependencies, can start immediately.
**Responsibility: Frontend + Backend**

### Task 1.1 — Forgot Password Flow (UC-1.11)

**Description:** Create `/forgot-password` and `/reset-password` pages so users can recover their accounts. The flow uses Supabase's built-in `resetPasswordForEmail` and `updateUser` APIs.

**Owner:** Frontend developer

**Create:**
- `web/app/forgot-password/page.tsx` — Server component wrapper
- `web/app/forgot-password/ForgotPasswordForm.tsx` — Client form: email input, calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`, shows "Check your inbox" on success
- `web/app/reset-password/page.tsx` — Server component wrapper
- `web/app/reset-password/ResetPasswordForm.tsx` — Client form: new password + confirm, password strength indicator, calls `supabase.auth.updateUser({ password })`, redirects to `/login` on success

**Modify:**
- [LoginForm.tsx](web/app/login/LoginForm.tsx) — Add "Forgot password?" link below password field
- [middleware.ts](web/middleware.ts) — Add `/forgot-password` and `/reset-password` to `publicPaths`

**Pattern:** Follow [LoginForm.tsx](web/app/login/LoginForm.tsx) for Card layout, form structure, and error handling.

### Task 1.2 — Email Verification Enforcement (UC-1.10)

**Description:** Create `/verify-email` page and enforce verification for all authenticated routes. Users with unverified emails get redirected there.

**Owner:** Frontend developer

**Create:**
- `web/app/verify-email/page.tsx` — Server component wrapper
- `web/app/verify-email/VerifyEmailContent.tsx` — Client component: displays which email was sent, "Resend verification" button calls `supabase.auth.resend({ type: 'signup', email })`

**Modify:**
- [layout.tsx](web/app/(authenticated)/layout.tsx) — After `requireAuth()`, check `user.email_confirmed_at === null` and redirect to `/verify-email`
- [middleware.ts](web/middleware.ts) — Add `/verify-email` to `publicPaths`
- [RegisterForm.tsx](web/app/register/RegisterForm.tsx) — After successful signup, redirect to `/verify-email?email=${email}`

### Task 1.3 — Rate Limiting Feedback (UC-1.14)

**Description:** Detect Supabase rate limit responses (HTTP 429 / "too many requests" errors) and show user-friendly messages on login/register forms.

**Owner:** Frontend developer

**Modify:**
- [LoginForm.tsx](web/app/login/LoginForm.tsx) — In catch blocks, detect 429 status or "rate limit" in error message, show "Too many login attempts. Please wait a moment and try again."
- [RegisterForm.tsx](web/app/register/RegisterForm.tsx) — Same treatment

**No new files needed.** Purely error handling improvements.

---

## Phase 2: Settings Pages

**Priority: HIGH** — Most requested missing feature, new route group.
**Responsibility: Frontend + Backend + Database (minor)**

### Task 2.1 — Settings Page Shell & Tab Navigation (UC-7.1)

**Description:** Create the `/settings` route with tabbed layout (Profile, Time Tracking, Appearance, Security, Sessions). Uses `?tab=` query param for bookmarkable state.

**Owner:** Frontend developer

**Create:**
- `web/app/(authenticated)/settings/page.tsx` — Server component: calls `requireAuth()`, fetches profile + settings + subscription, renders `SettingsLayout`
- `web/app/(authenticated)/settings/SettingsLayout.tsx` — Client component: tab navigation using shadcn Tabs, renders tab content based on active `?tab=` param

**Modify:**
- [Navbar.tsx](web/components/Navbar.tsx) — Add "Settings" NavLink (after "Billing")
- [MobileMenu.tsx](web/components/MobileMenu.tsx) — Add Settings to `authLinks` array
- [UserMenu.tsx](web/components/UserMenu.tsx) — Add "Settings" dropdown item

**Pattern:** Follow [AdminNav.tsx](web/app/admin/AdminNav.tsx) for tab navigation style.

### Task 2.2 — User Settings Repository & API

**Description:** Create repository functions and API route for reading/updating user settings from the website.

**Owner:** Backend developer

**Create:**
- `web/lib/repositories/userSettings.ts` — `getUserSettings(userId)`, `upsertUserSettings(userId, settings)`
- `web/app/api/settings/route.ts` — GET (fetch settings) and PUT (update settings), both require auth

**Modify:**
- [validation.ts](web/lib/validation.ts) — Add `updateSettingsSchema` (all fields optional: working_days, week_start_day, idle_timeout, theme, language, notifications, daily_target, weekly_target, pomodoro_config, floating_timer_auto, reminder)

**Pattern:** Follow [subscriptions.ts](web/lib/repositories/subscriptions.ts) for repository structure. Follow [checkout/route.ts](web/app/api/checkout/route.ts) for API route pattern.

### Task 2.3 — Profile Tab

**Description:** Profile section showing display name (editable), email (read-only), plan badge, and avatar initials.

**Owner:** Frontend developer

**Create:**
- `web/app/(authenticated)/settings/ProfileTab.tsx` — Client form with display name input, save button
- `web/app/api/profile/route.ts` — PATCH to update display name

**Modify:**
- [profiles.ts](web/lib/repositories/profiles.ts) — Add `updateProfileDisplayName(userId, displayName)`
- [validation.ts](web/lib/validation.ts) — Add `updateProfileSchema`

### Task 2.4 — Time Tracking Tab (UC-7.2)

**Description:** Forms for work week settings, targets, Pomodoro config, idle detection, floating timer, and reminder. Saves to `user_settings` table via the API from Task 2.2.

**Owner:** Frontend developer

**Create:**
- `web/app/(authenticated)/settings/TimeTrackingTab.tsx` — Client form with: working days (1-7), week start (Sun/Mon), daily/weekly target hours, idle timeout minutes, Pomodoro config (work/break/long-break/sessions/sound), floating timer auto-show toggle, reminder config (day/hour/minute)

**Depends on:** Task 2.2 (API route)

### Task 2.5 — Appearance Tab (UC-7.3)

**Description:** Theme selector (light/dark/system). Saves to both the website cookie (immediate) and `user_settings` table (for extension sync).

**Owner:** Frontend developer

**Create:**
- `web/app/(authenticated)/settings/AppearanceTab.tsx` — Client component: theme radio group, uses existing `useTheme()` for immediate preview + API call for persistence

**Depends on:** Task 2.2 (API route)

### Task 2.6 — Security Tab / Change Password (UC-1.12)

**Description:** Current password + new password + confirm form with strength indicator. Uses Supabase client directly (no API route needed).

**Owner:** Frontend developer

**Create:**
- `web/app/(authenticated)/settings/SecurityTab.tsx` — Client form: verify current password via `supabase.auth.signInWithPassword()`, then `supabase.auth.updateUser({ password })` on success

**Reuse:** Extract password strength indicator from [RegisterForm.tsx](web/app/register/RegisterForm.tsx) into a shared component `web/components/PasswordStrengthIndicator.tsx`.

### Task 2.7 — Sessions/Devices Tab (UC-1.13 + UC-2.2)

**Description:** List connected extension devices (from sync_cursors) with disconnect ability. Fulfills both UC-1.13 (session management) and UC-2.2 (enhanced device management).

**Owner:** Frontend + Backend developer

**Create:**
- `web/app/(authenticated)/settings/SessionsTab.tsx` — Client component: device list table with device ID, last sync time, "Disconnect" button
- `web/app/api/devices/route.ts` — GET (list sync cursors) and DELETE (remove by device_id)

**Modify:**
- [syncCursors.ts](web/lib/repositories/syncCursors.ts) — Add `deleteSyncCursor(userId, deviceId)`
- [validation.ts](web/lib/validation.ts) — Add `deleteDeviceSchema`

---

## Phase 3: Entries Page

**Priority: HIGH** — Core product feature, largest new page.
**Responsibility: Frontend + Backend**
**Can run in parallel with Phase 2.**

### Task 3.1 — Time Entries & Projects Repositories

**Description:** Create repository functions for querying time entries and projects from the website.

**Owner:** Backend developer

**Create:**
- `web/lib/repositories/timeEntries.ts` — `getUserTimeEntries(userId, opts)` (paginated, filterable), `getUserTimeEntry(userId, entryId)`, `createTimeEntry(userId, entry)`, `updateTimeEntry(userId, entryId, updates)`, `deleteTimeEntries(userId, ids[])`
- `web/lib/repositories/projects.ts` — `getUserProjects(userId)` (all non-deleted, for dropdowns)

**Pattern:** Follow [subscriptions.ts](web/lib/repositories/subscriptions.ts). Use `.range()` for pagination, `.order('start_time', { ascending: false })` for default sort.

### Task 3.2 — Entries API Routes

**Description:** CRUD endpoints for time entries.

**Owner:** Backend developer

**Create:**
- `web/app/api/entries/route.ts` — GET (paginated list with filters), POST (create), DELETE (bulk delete)
- `web/app/api/entries/[id]/route.ts` — GET (single), PATCH (update), DELETE (single)

**Modify:**
- [validation.ts](web/lib/validation.ts) — Add schemas: `entryCreateSchema`, `entryUpdateSchema`, `entryBulkDeleteSchema`, `entryListQuerySchema`

**Depends on:** Task 3.1

### Task 3.3 — Entries Page UI (UC-8.1, UC-8.5)

**Description:** Main entries page with paginated table, filters, and modern design (sticky header, zebra stripes, type badges).

**Owner:** Frontend developer

**Create:**
- `web/app/(authenticated)/entries/page.tsx` — Server component: `requireAuth()`, check premium, fetch initial entries + projects
- `web/app/(authenticated)/entries/EntriesTable.tsx` — Client component: data table with columns (checkbox, date, time range, duration, project with color dot, type badge, description, actions)
- `web/app/(authenticated)/entries/EntryFilters.tsx` — Client component: date range inputs, project select, type select, "Add Entry" button
- `web/app/(authenticated)/entries/loading.tsx` — Skeleton loading state

**Modify:**
- [Navbar.tsx](web/components/Navbar.tsx) — Add "Entries" NavLink (between "Analytics" and "Billing")
- [MobileMenu.tsx](web/components/MobileMenu.tsx) — Add Entries to `authLinks`

**Pattern:** Follow [UsersTable.tsx](web/app/admin/users/UsersTable.tsx) for pagination, search, and URL-based state management.

**Depends on:** Task 3.2

### Task 3.4 — Entry Create/Edit Dialog (UC-8.2, UC-8.3)

**Description:** Modal dialog for creating and editing time entries. Fields: date, start/end time, project, description, type, tags, link.

**Owner:** Frontend developer

**Create:**
- `web/app/(authenticated)/entries/EntryFormDialog.tsx` — Client component using shadcn Dialog: form fields, validation, calls POST or PATCH endpoint

**Depends on:** Task 3.3

### Task 3.5 — Bulk Operations (UC-8.4)

**Description:** Checkbox selection in entries table + floating action bar for bulk delete/export.

**Owner:** Frontend developer

**Modify:**
- `EntriesTable.tsx` (from Task 3.3) — Add checkbox column, "select all" header, floating action bar with "Delete Selected" button using AlertDialog confirmation

**Depends on:** Task 3.3

---

## Phase 4: Dashboard Enhancements

**Priority: MEDIUM** — Improves existing page, not blocking.
**Responsibility: Frontend**

### Task 4.1 — Dashboard Tab Layout (UC-2.5)

**Description:** Refactor dashboard into tabbed sections (Overview, Devices, Recent Entries, Tips) with `?tab=` query param persistence.

**Owner:** Frontend developer

**Create:**
- `web/app/(authenticated)/dashboard/DashboardTabs.tsx` — Client component: shadcn Tabs wrapper
- `web/app/(authenticated)/dashboard/OverviewTab.tsx` — Extracted current dashboard content (plan card, KPI summary)
- `web/app/(authenticated)/dashboard/DevicesTab.tsx` — Device list with disconnect (reuses SessionsTab data pattern)
- `web/app/(authenticated)/dashboard/RecentTab.tsx` — Last 5-10 entries in compact format with "View all" link to `/entries`

**Modify:**
- [dashboard/page.tsx](web/app/(authenticated)/dashboard/page.tsx) — Refactor to fetch additional data (recent entries) and render DashboardTabs

**Depends on:** Phase 3 (for RecentTab to have entries repository)

### Task 4.2 — Post-Login Landing Logic (UC-2.4)

**Description:** Remember user's last visited page and redirect there after login.

**Owner:** Frontend developer

**Create:**
- `web/components/LastPageTracker.tsx` — Small client component: uses `usePathname()` + `useEffect()` to write `localStorage.setItem('lastPage', pathname)` on route changes

**Modify:**
- [layout.tsx](web/app/(authenticated)/layout.tsx) — Render `<LastPageTracker />` inside the authenticated layout
- [LoginForm.tsx](web/app/login/LoginForm.tsx) — After login success, check `localStorage.getItem('lastPage')` and redirect there (if exists), otherwise default to `/dashboard` (free) or `/analytics` (premium)

### Task 4.3 — Dashboard Visual Modernization (UC-2.6)

**Description:** Add KPI stat cards at top (total hours, entries, streak), better card layouts, and quick action buttons. This is a styling exercise on the existing dashboard.

**Owner:** Frontend developer

**Modify:**
- `OverviewTab.tsx` (from Task 4.1) — Add stat card row at top (fetch basic stats from user_stats or analytics RPC), add quick action buttons ("View Analytics", "Manage Entries", "Add Entry")

**Depends on:** Task 4.1

---

## Phase 5: Analytics Enhancements

**Priority: MEDIUM** — Polish on existing feature.
**Responsibility: Frontend + Database**

### Task 5.1 — Analytics Filters (UC-4.11)

**Description:** Add date range, project, and entry type filters to the analytics page. Requires modifying the Supabase RPC to accept filter parameters.

**Owner:** Backend + Frontend developer

**Create (Database):**
- `supabase/migrations/010_analytics_date_filter.sql` — Modify `get_user_analytics` RPC to accept optional `p_date_from TEXT DEFAULT NULL` and `p_date_to TEXT DEFAULT NULL` parameters, adding `WHERE` clauses to all sub-queries

**Create (Frontend):**
- `web/app/(authenticated)/analytics/AnalyticsFilters.tsx` — Client component: preset buttons (7d, 30d, 90d, All), custom date range, project multi-select, entry type checkboxes. Updates URL searchParams.

**Modify:**
- [analytics/page.tsx](web/app/(authenticated)/analytics/page.tsx) — Read searchParams, pass to repository
- [analytics.ts](web/lib/repositories/analytics.ts) — Update `getUserAnalytics` to forward optional date params to RPC
- [validation.ts](web/lib/validation.ts) — Add `analyticsFilterSchema`

### Task 5.2 — Analytics Empty States (UC-4.12)

**Description:** Show friendly empty states when no data exists instead of blank charts.

**Owner:** Frontend developer

**Create:**
- `web/components/EmptyState.tsx` — Reusable component: icon + title + description + optional CTA button

**Modify:**
- [analytics/page.tsx](web/app/(authenticated)/analytics/page.tsx) — If `data.total_entries === 0`, show full-page empty state
- [AnalyticsCharts.tsx](web/app/(authenticated)/analytics/AnalyticsCharts.tsx) — Wrap each chart section with empty check, show `EmptyState` with relevant message

---

## Phase 6: UI Polish & Navigation

**Priority: LOW** — Quality-of-life improvements.
**Responsibility: Frontend**

### Task 6.1 — Mobile Navigation Refinement (UC-16.5)

**Description:** Ensure all new pages (Settings, Entries) appear in mobile menu. Add icons to menu items.

**Owner:** Frontend developer

**Modify:**
- [MobileMenu.tsx](web/components/MobileMenu.tsx) — Add icons from lucide-react to each link, verify Settings and Entries links are present

### Task 6.2 — Page Transitions (UC-16.6)

**Description:** Add subtle fade/slide-in animations when navigating between pages.

**Owner:** Frontend developer

**Create:**
- `web/app/(authenticated)/settings/loading.tsx` — Skeleton loading state
- `web/app/(authenticated)/entries/loading.tsx` — Skeleton loading state (if not already created in Phase 3)

**Modify:**
- [globals.css](web/app/globals.css) — Add `@keyframes fade-in` animation (0.2s ease-out, opacity 0→1, translateY 4px→0)
- Page content wrappers — Apply `animate-fade-in` class

---

## Execution Order & Dependencies

```
Week 1-2:  Phase 1 (Auth Hardening) — independent, start immediately
           Phase 3.1-3.2 (Entries backend) — can start in parallel

Week 2-3:  Phase 2.1-2.2 (Settings shell + repository) — independent
           Phase 3.3-3.5 (Entries UI) — depends on 3.1-3.2

Week 3-4:  Phase 2.3-2.7 (Settings tabs) — depends on 2.1-2.2

Week 4-5:  Phase 4 (Dashboard enhancements) — depends on Phase 3
           Phase 5 (Analytics filters + empty states) — can run in parallel

Week 5-6:  Phase 6 (UI polish) — depends on Phase 2, 3 for nav links
```

### Parallelization Opportunities

| Track A (Auth + Settings) | Track B (Entries + Dashboard) |
|---------------------------|-------------------------------|
| Phase 1: Auth hardening | Phase 3.1-3.2: Entries backend |
| Phase 2.1-2.2: Settings shell | Phase 3.3-3.5: Entries UI |
| Phase 2.3-2.7: Settings tabs | Phase 4: Dashboard enhancements |
| Phase 5: Analytics | Phase 6: UI polish |

Two developers can work in parallel with minimal conflicts.

---

## New Files Summary (~36 files)

### Pages (14 files)
| File | Type |
|------|------|
| `web/app/forgot-password/page.tsx` | Server |
| `web/app/forgot-password/ForgotPasswordForm.tsx` | Client |
| `web/app/reset-password/page.tsx` | Server |
| `web/app/reset-password/ResetPasswordForm.tsx` | Client |
| `web/app/verify-email/page.tsx` | Server |
| `web/app/verify-email/VerifyEmailContent.tsx` | Client |
| `web/app/(authenticated)/settings/page.tsx` | Server |
| `web/app/(authenticated)/settings/SettingsLayout.tsx` | Client |
| `web/app/(authenticated)/settings/ProfileTab.tsx` | Client |
| `web/app/(authenticated)/settings/TimeTrackingTab.tsx` | Client |
| `web/app/(authenticated)/settings/AppearanceTab.tsx` | Client |
| `web/app/(authenticated)/settings/SecurityTab.tsx` | Client |
| `web/app/(authenticated)/settings/SessionsTab.tsx` | Client |
| `web/app/(authenticated)/entries/page.tsx` | Server |

### Client Components (7 files)
| File | Purpose |
|------|---------|
| `web/app/(authenticated)/entries/EntriesTable.tsx` | Paginated data table |
| `web/app/(authenticated)/entries/EntryFilters.tsx` | Filter bar |
| `web/app/(authenticated)/entries/EntryFormDialog.tsx` | Create/edit modal |
| `web/app/(authenticated)/dashboard/DashboardTabs.tsx` | Tab container |
| `web/app/(authenticated)/dashboard/OverviewTab.tsx` | KPI cards + plan |
| `web/app/(authenticated)/dashboard/DevicesTab.tsx` | Device management |
| `web/app/(authenticated)/dashboard/RecentTab.tsx` | Recent entries |

### Shared Components (3 files)
| File | Purpose |
|------|---------|
| `web/components/PasswordStrengthIndicator.tsx` | Reusable password meter |
| `web/components/EmptyState.tsx` | Generic empty state with CTA |
| `web/components/LastPageTracker.tsx` | localStorage page tracking |

### API Routes (4 files)
| File | Methods |
|------|---------|
| `web/app/api/settings/route.ts` | GET, PUT |
| `web/app/api/profile/route.ts` | PATCH |
| `web/app/api/devices/route.ts` | GET, DELETE |
| `web/app/api/entries/route.ts` | GET, POST, DELETE |

### Backend (3 files)
| File | Purpose |
|------|---------|
| `web/lib/repositories/userSettings.ts` | Settings CRUD |
| `web/lib/repositories/timeEntries.ts` | Entries CRUD |
| `web/lib/repositories/projects.ts` | Projects for dropdowns |

### Database (1 file)
| File | Purpose |
|------|---------|
| `supabase/migrations/010_analytics_date_filter.sql` | Add date params to analytics RPC |

### Loading States (2 files)
| File | Purpose |
|------|---------|
| `web/app/(authenticated)/entries/loading.tsx` | Entries skeleton |
| `web/app/(authenticated)/settings/loading.tsx` | Settings skeleton |

### Analytics (1 file)
| File | Purpose |
|------|---------|
| `web/app/(authenticated)/analytics/AnalyticsFilters.tsx` | Date/project/type filters |

---

## Files to Modify Summary (~15 files)

| File | Changes |
|------|---------|
| [validation.ts](web/lib/validation.ts) | Add 8 new Zod schemas |
| [Navbar.tsx](web/components/Navbar.tsx) | Add Settings + Entries NavLinks |
| [MobileMenu.tsx](web/components/MobileMenu.tsx) | Add Settings + Entries + icons |
| [UserMenu.tsx](web/components/UserMenu.tsx) | Add Settings dropdown item |
| [middleware.ts](web/middleware.ts) | Add public paths (forgot-password, reset-password, verify-email) |
| [LoginForm.tsx](web/app/login/LoginForm.tsx) | Add forgot-password link + rate limit error handling + lastPage redirect |
| [RegisterForm.tsx](web/app/register/RegisterForm.tsx) | Redirect to verify-email + rate limit handling |
| [(authenticated)/layout.tsx](web/app/(authenticated)/layout.tsx) | Email verification check + LastPageTracker |
| [dashboard/page.tsx](web/app/(authenticated)/dashboard/page.tsx) | Refactor to tabbed layout |
| [analytics/page.tsx](web/app/(authenticated)/analytics/page.tsx) | Add searchParams + empty state check |
| [AnalyticsCharts.tsx](web/app/(authenticated)/analytics/AnalyticsCharts.tsx) | Per-chart empty states |
| [analytics.ts](web/lib/repositories/analytics.ts) | Add date params to getUserAnalytics |
| [profiles.ts](web/lib/repositories/profiles.ts) | Add updateProfileDisplayName |
| [syncCursors.ts](web/lib/repositories/syncCursors.ts) | Add deleteSyncCursor |
| [globals.css](web/app/globals.css) | Add fade-in animation keyframes |

---

## Verification Plan

### Phase 1 Verification
- Visit `/forgot-password`, submit email, check Supabase sends reset email
- Click reset link, verify `/reset-password` form works, password updates
- Register new account, verify redirect to `/verify-email`
- Click "Resend verification" button, verify email sends
- Try accessing `/dashboard` with unverified email, verify redirect
- Submit 10+ rapid login attempts, verify rate limit message appears

### Phase 2 Verification
- Navigate to `/settings`, verify all 5 tabs render
- Edit display name in Profile tab, verify it persists on reload
- Change time tracking settings, verify they save via API
- Change theme in Appearance tab, verify cookie + API save
- Change password in Security tab (valid + invalid current password)
- View connected devices in Sessions tab, disconnect one

### Phase 3 Verification
- Navigate to `/entries`, verify paginated table loads
- Apply date range filter, project filter, type filter — verify filtering works
- Click "Add Entry", fill form, verify entry appears in table
- Click an entry, edit it, verify changes persist
- Select multiple entries, bulk delete, verify confirmation dialog + deletion
- Test as free user — verify redirect to `/billing`

### Phase 4 Verification
- Visit `/dashboard`, verify tabs (Overview, Devices, Recent, Tips)
- Switch tabs, verify `?tab=` URL param updates
- Log in, verify redirect to last visited page
- Check KPI cards show real data

### Phase 5 Verification
- Visit `/analytics`, apply date filter (7d, 30d, custom), verify charts update
- Deploy migration 010, verify RPC accepts date params
- Visit analytics with no data, verify empty states render with CTAs

### Phase 6 Verification
- Open mobile menu, verify all links present with icons
- Navigate between pages, verify fade-in animation plays
- Test all new pages on mobile viewport (375px width)
