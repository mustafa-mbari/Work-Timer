# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Work-Timer is a Chrome Extension (Manifest V3) + Next.js companion website for time tracking. The extension is offline-first with `chrome.storage.local` as the primary data store. Premium users get cloud sync via Supabase, advanced analytics, and multi-device support.

**Core philosophy:** Maximum usability with minimum clicks. Popup-first, privacy-first, offline-first.

## Tech Stack

### Chrome Extension (`src/`)

- **Framework:** React 18 + TypeScript
- **Styling:** TailwindCSS v4 (`@tailwindcss/vite` plugin, `@import "tailwindcss"` syntax)
- **Build:** Vite (popup + background service worker + content script)
- **State:** React Context + hooks (useTimer, useProjects, useEntries, useSettings)
- **Storage:** `chrome.storage.local` abstraction in `src/storage/`
- **Sync:** Supabase (push/pull with sync queue, Realtime channels)
- **Auth:** Supabase Auth (session bridged from website via content script `postMessage` relay or direct `chrome.runtime.sendMessage`)
- **Charts:** Recharts (lazy loaded)
- **Export:** xlsx (dynamic import) + jsPDF/jspdf-autotable (dynamic import) + file-saver
- **IDs:** nanoid
- **Dates:** date-fns
- **Font:** Inter Variable (`@fontsource-variable/inter`)
- **Icons:** Custom SVG components in `src/components/Icons.tsx`
- **Testing:** Vitest

### Companion Website (`web/`)

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5.7
- **Styling:** TailwindCSS v4 (`@tailwindcss/postcss` plugin)
- **UI Components:** shadcn/ui (Radix primitives)
- **Charts:** Recharts
- **Auth & DB:** Supabase (`@supabase/ssr` v0.8+ for user client, `@supabase/supabase-js` v2.97+ for service role client)
- **Payments:** Stripe v20 (checkout sessions, billing portal, webhooks; API version `2026-02-25.clover`)
- **Validation:** Zod (all API route inputs)
- **Icons:** Lucide React

## Build & Dev Commands

```bash
# Extension
pnpm install         # Install dependencies
pnpm dev             # Development build with HMR
pnpm build           # Production build -> dist/
pnpm lint            # Run ESLint
pnpm test            # Run unit tests (Vitest)
pnpm test:watch      # Run tests in watch mode

# Website
cd web
pnpm install
pnpm dev             # Next.js dev server (port 3000)
pnpm build           # Production build
pnpm lint

# Admin App
cd admin
pnpm install
pnpm dev             # Next.js dev server (port 3001)
pnpm build           # Production build
pnpm lint
```

Load the extension in Chrome:

1. `pnpm build`
2. Open `chrome://extensions`, enable Developer Mode
3. Click "Load unpacked" -> select the `dist/` folder

## Path Aliases

- Extension: `@/` -> `src/`, `@shared/` -> `shared/` (in `vite.config.ts` + `tsconfig.app.json`)
- Website: `@/` -> `web/`, `@shared/` -> `shared/` (in `web/tsconfig.json`)
- Admin: `@/` -> `admin/` (in `admin/tsconfig.json`)

## Architecture

### Extension Source Layout

```
src/
  popup/          # Popup entry point (popup.html + popup.tsx)
  background/     # Service worker modules:
    background.ts #   Main entry (message router, alarms, auth)
    timerEngine.ts#   Timer state machine (start/pause/resume/stop)
    pomodoroEngine.ts # Pomodoro cycle management
    storage.ts    #   Storage helpers (entry save, settings)
    ui.ts         #   Badge updates, content script broadcasts
    contextMenus.ts # Right-click context menu actions
    idleDetection.ts # Idle timeout detection
    reminders.ts  #   Notification reminders
  components/     # React UI components
  hooks/          # Custom React hooks (useTimer, useAuth, usePremium, etc.)
  auth/           # Supabase client + auth state
  sync/           # Cloud sync engine (queue, push/pull, conflict resolver)
  premium/        # Feature gating utilities
  storage/        # chrome.storage.local wrapper with sync hooks
  content/        # Content script (floating mini timer widget + widget.css)
  utils/          # Helper functions (date/time formatting, export, etc.)
  constants/      # Shared constants (colors, timers, styles)
  types/          # TypeScript interfaces
  __tests__/      # Test setup (chrome.storage mock)
  index.css       # Global styles + Tailwind v4 theme tokens
```

### Website Source Layout

```
web/
  app/
    (authenticated)/    # Route group (dashboard, billing, analytics, entries)
                        #   dashboard/ includes WeeklyProjectChart (CSS stacked bars, no Recharts)
    api/                # API routes (checkout, billing, webhooks, promo)
    auth/               # OAuth callback + extension bridge (postMessage relay)
    api/auth/           # Server-side auth routes (sign-in, sign-up, magic-link, forgot-password, google, session)
    login/, register/   # Auth forms
    page.tsx            # Landing page
    globals.css         # Tailwind imports + dark mode variables
  components/
    ui/                 # shadcn/ui components
    Navbar.tsx, PricingPlans.tsx, ThemeToggle.tsx
  lib/
    repositories/       # Typed Supabase query functions (7 modules)
    services/           # Business logic (auth, analytics, billing)
    validation.ts       # Zod schemas for all API inputs
    stripe.ts           # Stripe singleton + price config
    supabase/           # Server + service role Supabase clients
    utils.ts            # cn() helper
    theme.ts            # Cookie-based theme provider
  middleware.ts         # Auth guards (skips public routes for performance) — deprecated name, will become proxy.ts
```

### Admin App Source Layout (`admin/`)

Standalone Next.js 16 app on port 3001. No next-intl. All strings hardcoded English.

```
admin/
  app/
    (admin)/            # Route group (layout with AdminHeader + AdminNav)
      page.tsx          # Overview (user counts, premium breakdown, recent sign-ups)
      users/            # User table with search + pagination
      stats/            # Full platform stats
      domains/          # Whitelist domain management
      promos/           # Promo code management
      subscriptions/    # Grant/view premium
      groups/           # Group management
      ui-test/          # UITestLab (admin-only design prototyping)
    api/                # Admin API routes (domains, promos, subscriptions, groups)
    login/              # Admin login (role check: profiles.role === 'admin')
    globals.css         # Design tokens + dark mode
  components/
    ui/                 # shadcn/ui (16 components, only those used)
    AdminHeader.tsx     # Top bar (branding, user email, theme toggle, sign out)
    AdminNav.tsx        # Horizontal pill nav (7 items)
    ThemeProvider.tsx   # Cookie-based theme
  lib/
    repositories/       # Admin-only Supabase queries (admin, domains, promoCodes, subscriptions, profiles)
    services/           # auth.ts (requireAdmin, requireAdminApi), analytics.ts
    validation.ts       # Admin Zod schemas only
    supabase/           # Server + service role clients
    shared/             # types.ts + constants.ts (copied from shared/)
  middleware.ts         # Protects all routes; checks auth + admin role
```

### Popup <-> Background Communication

Message passing via `chrome.runtime` with action types:

- Timer: `START_TIMER`, `PAUSE_TIMER`, `RESUME_TIMER`, `STOP_TIMER`, `GET_TIMER_STATE`
- Sync: `TIMER_SYNC` (broadcast from background to popup/tabs)
- Pomodoro: `START_POMODORO`, `STOP_POMODORO`, `SKIP_POMODORO_PHASE`
- Auth: `AUTH_LOGIN` (handled in both `onMessage` and `onMessageExternal`), `AUTH_LOGOUT`, `AUTH_STATE`, `POPUP_OPENED`
- Idle: `IDLE_KEEP`, `IDLE_DISCARD`

### Website <-> Extension Auth Bridge

Two approaches run simultaneously for maximum compatibility:

1. **Direct** (`chrome.runtime.sendMessage(extensionId, ...)`): Uses `NEXT_PUBLIC_EXTENSION_ID` env var. Works when ID matches (published extension or same dev machine). Handled by `onMessageExternal`.
2. **Content script relay** (`window.postMessage` → content script → `chrome.runtime.sendMessage`): No extension ID needed. Content script in `src/content/content.ts` listens for `WORK_TIMER_AUTH` messages and relays to background via internal `onMessage`. Works with any unpacked installation.

The `ExtensionBridge.tsx` component retries postMessage every 500ms for 8s to handle content script loading timing.

**Ping/Pong (extension detection):** A lightweight `WORK_TIMER_PING` → `WORK_TIMER_PONG` message pair lets the website detect whether the content script is running WITHOUT triggering a full `AUTH_LOGIN`. Used by `ExtensionStatusButton` and `ExtensionBanner` for silent probing on mount.

**`maybeOpenDashboard()` guard:** Opens `/dashboard` in a new tab only when `AUTH_LOGIN` comes from a login/register/auth page (checks `sender.tab?.url` in `onMessage`, `sender.url` in `onMessageExternal`). Prevents opening a new tab when the user is already on the dashboard and clicks "Reconnect Extension".

**`POPUP_OPENED` message:** Sent by popup `App.tsx` on mount to trigger a delta sync (`syncAll()`) for authenticated users.

### Extension Header Components (Authenticated Website)

- **`ExtensionStatusButton`** (`web/components/ExtensionStatusButton.tsx`): Icon button in `AppHeader.tsx` showing extension connection state. Probes with ping on mount; manual click sends `WORK_TIMER_AUTH` to reconnect. States: `probing` → `unknown`/`connected`; on click `connecting` → `connected`/`failed`.
- **`ExtensionBanner`** (`web/components/ExtensionBanner.tsx`): Indigo banner below AppHeader shown when extension is NOT installed. Uses ping probe (no auth). Dismissible per-session via `sessionStorage`. Chrome Store URL is a `#` placeholder until published.

### Data Model

Core types in `src/types/`:

- **TimeEntry** -- id, date, startTime, endTime, duration (ms), projectId, taskId, description, type, tags, link
- **Project** -- id, name, color (hex), targetHours, archived, createdAt, defaultTagId
- **Tag** -- id, name, color (hex)
- **Settings** -- workingDays, weekStartDay, idleTimeout, theme, language, notifications, dailyTarget, weeklyTarget, pomodoroConfig

### Database

Supabase PostgreSQL with RLS. Tables: `profiles`, `subscriptions`, `projects`, `tags`, `time_entries`, `user_settings`, `sync_cursors`, `promo_codes`, `promo_redemptions`, `whitelisted_domains`, `stripe_events`, `groups`, `group_members`, `group_invitations`, `group_sharing_settings`, `group_shares`.

Shared types in `shared/types.ts` define typed interfaces for all tables with a `Database` type map for the Supabase client. SQL migrations in `supabase/migrations/`.

### Repository & Service Layer (`web/lib/`)

**Repositories** (typed Supabase queries, no `as any` on selects):

- `profiles.ts`, `subscriptions.ts`, `promoCodes.ts`, `domains.ts`, `syncCursors.ts` -- CRUD operations
- `projects.ts` -- CRUD + reorder + default tag linking (`default_tag_id`)
- `tags.ts` -- CRUD + reorder + color + hourly rate + earnings toggle
- `earnings.ts` -- `get_earnings_report` RPC with `groupBy` parameter ('tag' | 'project')
- `analytics.ts` -- `get_user_analytics` RPC
- `groups.ts` -- CRUD + member management + join code + `GroupWithMeta` type (includes `role`, `member_count`, `share_frequency`, `share_deadline_day`)
- `groupShares.ts` -- Timesheet approval workflow: `getSharesByStatus()`, `autoCreateOpenShare()`, `submitShare()`, `reviewShare()`, snapshot JSONB entries
- `groupSharing.ts` -- Per-member sharing toggle + `getUserOwnStats()` (today/week/month hours)
- `groupInvitations.ts` -- Invite by email with 7-day expiry

**Services** (business logic):

- `auth.ts` -- `requireAuth()`, `getUser()` (React `cache()` wrapped), `requireAdminApi()`, `requireAuthApi()`
- `analytics.ts` -- `getUserAnalytics()` (wraps `get_user_analytics` RPC)
- `billing.ts` -- checkout/portal helpers
- `earnings.ts` -- `getEarningsReport()` with groupBy passthrough, `formatEarningsCsv()`

### Performance Optimizations

**Extension:**

- `useTimer` uses event-driven `TIMER_SYNC` messages (no 5s polling)
- Premium status cached in module-level variable with `chrome.storage.onChanged` invalidation
- `React.lazy()` for WeekView, StatsView, SettingsView with `<Suspense>`
- Dynamic `import('xlsx')` and `import('jspdf')` inside export functions (not top-level)
- Vite `manualChunks`: recharts (290KB), xlsx (429KB), jspdf (418KB), supabase (170KB) -- loaded on demand
- Single multiplexed Realtime channel (1 connection per user, not 4)
- Conditional pull via `has_changes_since()` RPC -- skips full pull when nothing changed
- Selective column pulls (explicit `.select()` instead of `select('*')`)
- Debounced `syncAll()` on entry saves (10s timer batches rapid saves)

**Website:**

- Middleware skips auth for public routes (`/`, `/login`, `/register`, `/terms`, `/privacy`, `/api/webhooks`, `/auth`)
- `React.cache()` on `getUser()` for request-level dedup
- Admin pages use `revalidate = 60` (1-minute cache)
- Server-side SQL aggregation via RPC functions (replaces client-side JS)
- Error boundaries for `(authenticated)/` and `admin/` route groups
- `getSubscriptionFlags()` deduplicates premium + allIn checks in layout (1 query instead of 2)
- Dashboard `page.tsx` fetches week entries with 1 extra day before week start (handles entries crossing midnight into the week)

### Dashboard Weekly Chart (`WeeklyProjectChart.tsx`)

- CSS stacked bars (no Recharts) showing per-project hours for each working day of the current week
- Hours label shown above every day column; today's column highlighted in indigo
- Hover tooltip shows per-project breakdown + day total
- Respects `weekStartDay` (0=Sunday, 1=Monday) and `workingDays` **count** (5/6/7 — days from week start, NOT a bitmask)
- Splits entries that cross midnight into per-day slices using `start_time`/`end_time` timestamps
- Uses project colors; "No project" entries shown in stone-400

### Manual Entry Forms (2 locations)

- **`TimerWidget.tsx`**: Inline form on entries page with Stopwatch/Manual/Pomodoro tabs. Duration mode has typeable `<input type="number">` for hours/minutes with +/- stepper buttons
- **`EntryFormDialog.tsx`**: Modal dialog for editing/adding entries. Same typeable duration inputs
- Both derive `entry.date` from `startMs` using local date (not UTC) and anchor duration-mode timestamps to the selected date

### PDF Export (`src/utils/export.ts`)

`exportPDF()` generates a comprehensive A4 report with 8 sections:

1. **Header** -- "Work Timer" branding + date range (left), user display name + email (right)
2. **Summary Box** -- Bordered box with Total Hours, Entries, Projects, Daily Average
3. **Weekly Bar Chart** -- Stacked bars drawn with jsPDF rect() primitives, project-colored segments, midnight-crossing splitting, today highlight, hour labels, legend
4. **Project Breakdown** -- 2-column layout with colored circles, hours, and percentages
5. **Tag Breakdown** -- Same layout for tags (resolves tag IDs to names via Tag[] parameter)
6. **Daily Summary Table** -- autoTable with Day, Date, Hours, Entries, Projects + bold totals row
7. **Entries Table** -- autoTable with Date, Start, End, Duration, Project, Tags, Description
8. **Footer** -- `w-timer.com` + `info@w-timer.com` (left), generation timestamp (center), page numbers (right)

Signature: `exportPDF(entries, projects, tags, filename, dateRange, options?)` where options includes `userName`, `userEmail`, `weekStartDay`, `workingDays`.

`ExportMenu.tsx` uses `useAuth()`, `useTags()`, `useSettings()` hooks to gather all data internally (no prop drilling from parent components).

`AuthSession` type includes optional `displayName` extracted from `session.user.user_metadata.full_name` or `.name` (populated by OAuth providers like Google).

### Sync Engine (`src/sync/`)

- **Queue-based**: Every local write adds to `syncQueue` in `chrome.storage.local`
- **Push**: Background processes queue in batches (500/batch), only pushes queued items (not all data)
- **Pull**: Conditional -- calls `has_changes_since()` RPC first; if nothing changed, skips the full 4-table pull. Fetches records with `updated_at > last_sync`, skips records with pending local changes (queue-based conflict resolution)
- **Realtime**: Single multiplexed Supabase Realtime channel with 4 table listeners (1 connection per user)
- **Periodic**: `chrome.alarms` every 15 minutes + debounced sync on entry saves (10s timer)
- **Initial upload**: Batch upload with per-batch retry (1 retry, 1s backoff)
- **Data transfer**: ~97 KB egress/user/day, ~150-300 queries/user/day

### Selective Sync Preferences (Premium)

Premium users can disable cloud sync per data category via Settings > Account > Data Sync Controls.

- **Type**: `SyncPreferences` (`src/types/index.ts`) — `{ entries, statistics, projects, tags }` (all boolean, default `true`)
- **Storage**: Stored in `chrome.storage.local` under key `syncPreferences` — local-only, never synced to cloud
- **Helpers**: `getSyncPreferences()`, `updateSyncPreferences()`, `DEFAULT_SYNC_PREFERENCES` in `src/storage/index.ts`
- **Categories**:
  - `entries` → gates `time_entries` table sync (enqueue, push, pull, realtime)
  - `statistics` → gates `pushUserStats()` in `src/sync/statsSync.ts`
  - `projects` → gates `projects` table sync (enqueue, push, pull, realtime)
  - `tags` → gates `tags` table sync (enqueue, push, pull, realtime)
- **Settings sync**: `user_settings` always syncs (no toggle) — essential for cross-device consistency
- **Interception points**: `enqueueSyncItem()` (storage), `pushQueue()` / `pullDelta()` (syncEngine), realtime handlers (realtimeSubscription), `pushUserStats()` (statsSync)
- **Queue cleanup**: Disabled categories still dequeue items in `pushQueue()` to prevent queue buildup

### Earnings System

Earnings are **tag-based** (not project-based). Each tag can have:

- `color` -- Hex color for display (default `#6366F1`)
- `hourly_rate` -- Per-tag rate (null = use default from user_settings)
- `earnings_enabled` -- Whether included in earnings calculations

**Project-tag linking**: Each project can have one `default_tag_id`. When the user selects a project in the timer, the linked tag auto-selects. Managed via:

- Extension: SettingsView project dots menu "Link Default Tag"
- Website: ProjectsCard link icon (chain) with tag selector dropdown

**Auto-select implementation** (3 locations):

- Extension `TimerView.tsx`: `handleProjectChange()` checks `project.defaultTagId`
- Website `TimerWidget.tsx`: `onProjectChange` callback + default project `useEffect` both check `project.default_tag_id`
- Website `EntryFormDialog.tsx`: project select `onChange` checks `project.default_tag_id`

**Earnings reports** (`get_earnings_report` RPC):

- Accepts `p_group_by` parameter: `'tag'` (default) or `'project'`
- Tag mode: Joins `time_entries.tags[]` array with `tags` table via `ANY(te.tags)` and `CROSS JOIN LATERAL unnest(te.tags)`
- Project mode: Joins via `time_entries.project_id` (backward compatible)
- Returns unified shape: `items[]`, `grand_total`, `total_hours`, `total_items`, `daily_earnings[]` with generic keys (`item_id`, `item_name`, `item_color`)
- Website earnings page has a "By Tag" / "By Project" toggle (`GroupByToggle` component, `?groupBy=project` search param)

**Migration**: `supabase/migrations/024_earnings_to_tags.sql` -- adds tag columns, project `default_tag_id`, replaces RPC

### Groups & Timesheet Approval System

Groups enable team time management with an admin-controlled **timesheet approval workflow**:

**Workflow**: Admin configures schedule → system auto-creates open shares → members review & submit → admin approves or denies (with comment) → denied shares return to open for resubmission.

**Status flow**: `Open → Submitted → Approved` or `Submitted → Denied → Open (resubmit)`

**Database tables**:

- `groups` -- name, owner, join_code, max_members, `share_frequency` (daily/weekly/monthly), `share_deadline_day`
- `group_members` -- (group_id, user_id) with role (admin/member)
- `group_invitations` -- email invitations with 7-day expiry
- `group_sharing_settings` -- per-member sharing_enabled toggle + shared_project_ids filter
- `group_shares` -- timesheet records with `status` (open/submitted/approved/denied), `entries` (JSONB snapshot), `admin_comment`, `submitted_at`, `reviewed_at`, `reviewed_by`, `due_date`

**Auto-creation logic**: When member fetches `GET /api/groups/{id}/shares?status=open&mine=true` and group has `share_frequency` set, computes current period dates and auto-creates an open share if none exists. Entries are populated at **submit time** (fresh snapshot from `time_entries`), not at creation.

**Schedule settings**: `share_frequency` = `daily|weekly|monthly`, `share_deadline_day` = day of week (0=Mon..6=Sun for weekly) or day of month (1-31 for monthly). Stored on `groups` table.

**Component architecture**:

```
GroupsView (client orchestrator, AlertDialog for delete group confirmation)
  ├── Group selector + Create/Join + Invitations banner
  ├── [isAdmin] → Admin/My Timesheets tab switcher (pill/segment style)
  │     ├── AdminDashboard (underline tabs)
  │     │     ├── Team tab → AdminTeamTable (invite/remove/roles, danger zone, mobile cards)
  │     │     ├── Reviews tab → PendingReviewsPanel (filter pills, mobile cards) → ReviewDialog
  │     │     ├── Reports tab → ReportDialog (shadcn Dialog, date range + CSV export)
  │     │     └── Schedule tab → ScheduleSettings + CreateShareRequestDialog (2-col grid on lg+)
  │     └── MemberView (same as non-admin, see below)
  └── [!isAdmin] → MemberView (underline tabs)
        ├── Overview tab → MemberStatsCard + sharing toggle (shadcn Switch) + CurrentSharePanel
        ├── History tab → past shares with status badges (approved/denied only)
        └── Members tab → name list with role badges (NO hours data)
```

**Shared UI components** (`web/app/(authenticated)/groups/`):

- `StatusBadge.tsx` -- `StatusBadge` (open/submitted/approved/denied/returned) + `TypeBadge` (day/week/month)
- `MemberAvatar.tsx` -- Consistent avatar with initials, `size?: 'sm' | 'md' | 'lg'`
- `EmptyState.tsx` -- Shared empty state with `variant?: 'default' | 'success' | 'dashed'`

**Tab hierarchy** (3 visually distinct levels):

- Level 1: Pill/segment tabs (GroupsView Admin/My Timesheets) — `rounded-lg bg-stone-100 p-1`, active: `bg-white shadow-sm`
- Level 2: Underline tabs (AdminDashboard, MemberView) — `border-b-2`, active: `border-indigo-500`
- Level 3: Filter pills (PendingReviewsPanel) — `rounded-lg border`, active: `bg-indigo-50 border-indigo-200`

**Shared utilities** (`web/app/(authenticated)/groups/utils.ts`):

- Types: `ProjectItem`, `TagItem`, `MemberInfo`, `OwnStats`, `QuickRange`, `PeriodType`
- Functions: `formatHours`, `formatDuration`, `formatDate`, `formatIsoDate`, `formatPeriod`, `getInitials`, `getQuickRange`, `periodLabel`, `QUICK_RANGES`
- Imported by all group components to eliminate duplication

**API routes**:

- `GET /api/groups/{id}/shares?status=&mine=true` -- list shares with status filter + auto-creation
- `POST /api/groups/{id}/shares/{shareId}/submit` -- member submits (auto-fills entries snapshot)
- `POST /api/groups/{id}/shares/{shareId}/review` -- admin approves/denies (comment required on deny)
- `GET /api/groups/{id}/shares/preview` -- preview entry count/hours before submit
- `GET /api/groups/{id}/shared-entries` -- admin fetches member summaries via `get_group_members_summary` RPC

**Privacy**: Admin can only see member data AFTER the member submits. Members can see other members' names and roles but NOT their hours or entries.

**Migrations**: `013_groups.sql` (tables), `018_group_sharing.sql` (sharing settings + RPCs), `026_group_shares.sql` (snapshot table), `027_share_approval_workflow.sql` (approval columns + schedule settings)

### Auth Session Hardening

- **Proactive token refresh**: `SUBSCRIPTION_ALARM` (every 60 min) calls `supabase.auth.refreshSession()` with 120-second buffer before expiry, preventing `auth.uid()` NULL errors on server-side RLS
- **Free user auto-logout**: Free users are automatically signed out 7 days after their last login. Tracked via `lastLoginAt` timestamp in `chrome.storage.local`. Checked on startup and every `SUBSCRIPTION_ALARM` cycle
- **Login stamp**: `stampLoginTime()` called in both `AUTH_LOGIN` handlers (`onMessage` internal + `onMessageExternal` external) in `src/background/background.ts`
- **Session expiry check**: `checkFreeSessionExpiry()` in `src/auth/authState.ts` — reads cached subscription, skips premium users, compares `lastLoginAt` against 7-day window
- Premium users (active/trialing, non-free plan) are never auto-logged out

### Free Plan Limits

- **Projects**: Max 5 (active + archived combined) — enforced in `useProjects.ts` create function
- **Tags**: Max 5 (active + archived combined) — enforced in `useTags.ts` create function + `web/app/api/tags/route.ts` POST handler
- **Constants**: `FREE_LIMITS.maxProjects` and `FREE_LIMITS.maxTags` in `shared/constants.ts` (extension) and `web/lib/shared/constants.ts` (website)
- **Archive bypass prevention**: Limit check counts ALL items (not just active) to prevent archive-then-create workaround
- **Error classes**: `ProjectLimitError` (`useProjects.ts`) and `TagLimitError` (`useTags.ts`) thrown on limit exceeded
- **UI**: UpgradePrompt modal shown in SettingsView when limit reached (both projects and tags)
- Premium users: unlimited projects and tags (`Infinity`)

### Security

- All API inputs validated with Zod schemas (`web/lib/validation.ts`)
- Stripe webhook signature verification + idempotency via `stripe_events` table
- RLS on all tables; admin operations use service role client
- Service role client uses `createClient` from `@supabase/supabase-js` (NOT `createServerClient` from `@supabase/ssr`) to properly bypass RLS
- `externally_connectable` restricts extension messaging to allowed origins
- All auth flows use server-side API routes (no browser-to-Supabase calls that corporate proxies block)
- Static assets served from trusted CDN domain via `assetPrefix` to bypass corporate proxy site-reputation blocks

## Theme System (6 themes)

- Type: `'light-soft' | 'light-paper' | 'light-sepia' | 'dark-charcoal' | 'dark-mocha' | 'dark-midnight' | 'system'`
- Hook: `src/hooks/useTheme.ts` -- exports `useTheme()` and `THEMES` constant
- CSS: `src/index.css` -- `[data-theme="..."]` blocks override CSS custom properties
- Strategy: `.dark`/`.light` class for Tailwind variant; `data-theme` drives palette overrides
- Default: `'light-soft'`

## Design System

- **Accent:** Indigo (#6366F1 light, #818CF8 dark)
- **Neutrals:** Stone scale (warm grays)
- **Semantic:** Emerald (success), Amber (warning), Rose (danger), Purple (pomodoro)
- **Dark surfaces:** Custom tokens (dark, dark-card, dark-elevated, dark-border, dark-hover)
- **Border radius:** `rounded-xl` for cards/buttons, `rounded-lg` for inputs
- **Spacing:** `px-5 py-4` containers, `gap-4` between sections
- **Font:** Inter Variable

## Key Gotchas

### Supabase Type System (v2.97+)

- Hand-crafted `Database` types don't fully work with supabase-js type inference for mutations
- **Selects**: Use `.single<Pick<T, ...>>()` or `.returns<T[]>()` for typed results
- **Mutations**: Use `(supabase.from('table') as any)` for insert/update/upsert operations
- **RPC calls**: Use `(supabase.rpc as Function)('name', args)` pattern
- `Relationships: []` required on all table definitions in Database type

### Supabase Service Role

- MUST use `createClient` from `@supabase/supabase-js`, NOT `createServerClient` from `@supabase/ssr`
- SSR client passes cookies which causes RLS to apply even with service role key

### Supabase Row Limits

- PostgREST defaults to 1000 rows max. Use `.range(0, 49999)` on aggregating queries

### Admin User Queries

- Use `auth.admin.listUsers()` for user counts (profiles table may be incomplete)

### Promo Codes

- `valid_from` field required on insert (no DB default)

### Stripe API (v20, API `2026-02-25.clover`)

- `Subscription.current_period_end` moved to item-level: use `sub.items.data[0]?.current_period_end`
- `Invoice.subscription` moved to `invoice.parent?.subscription_details?.subscription`
- API version pinned in `web/lib/stripe.ts`

### Tailwind v4

- `@theme {}` block defines CSS custom properties for colors
- `@custom-variant dark (&:where(.dark, .dark *))` in website globals.css for class-based dark mode
- Extension uses `@variant dark` with `@slot`

### Corporate Proxy Compatibility

- `assetPrefix` in `next.config.js` reads from `NEXT_PUBLIC_ASSET_PREFIX` env var (set to `https://work-timer-web.vercel.app` on Vercel)
- Auth forms (`LoginForm`, `RegisterForm`, `ForgotPasswordForm`) use `fetch('/api/auth/...')` instead of Supabase browser client
- `ExtensionBridge.tsx` uses dual approach: direct `chrome.runtime.sendMessage` + content script `postMessage` relay with 500ms retry
- `SessionsTab.tsx` has a "Reconnect Extension" button using `fetch('/api/auth/session')` + `postMessage`
- Background `AUTH_LOGIN` handler sends `sendResponse` immediately, then does heavy work (sync, upload, etc.) asynchronously
- Content script `AUTH_LOGIN` messages go through `onMessage` (internal), not `onMessageExternal` (external)

### workingDays is a COUNT, not a bitmask

- `working_days` in `user_settings` is a count: `5` = Mon–Fri, `6` = Mon–Sat, `7` = Mon–Sun
- Validated as `z.number().int().min(1).max(7)` in `web/lib/validation.ts`
- Extension default: `5` (see `src/storage/index.ts` and `src/utils/date.ts`)
- Website default in `dashboard/page.tsx`: `settings?.working_days ?? 5`
- `WeeklyProjectChart` uses `Array.from({ length: count })` from week start — do NOT use bitmask logic (`1 << d.getDay()`)

### UI Test Lab (`admin/app/(admin)/ui-test/`)

- Admin-only page in the standalone admin app; protected by `requireAdmin()` in `page.tsx`
- `UITestLab.tsx` — single `'use client'` file with all mock data + variant components inline
- Tabs: Entries List (4 variants), Timer Widget (9 + 3 improved variants), Quick Add (4), Dashboard (16), Project Picker (4), Daily Goal (10)
- Timer improved variants include tag chip multi-select and typeable duration inputs
- No API calls; all state is local `useState` only; no i18n (hardcoded English)

### Date Handling (UTC vs Local)

- NEVER use `toISOString().slice(0, 10)` to get a local date -- it returns UTC and shifts dates in UTC+ timezones after midnight
- Always use `new Date()` with `getFullYear()`/`getMonth()`/`getDate()` for local date strings
- `new Date('YYYY-MM-DDTHH:mm:ss')` without `Z` suffix parses as LOCAL time in browsers
- Entries that cross midnight must be split across days using `start_time`/`end_time` timestamps (see `WeeklyProjectChart.tsx`)
- Both `TimerWidget.tsx` and `EntryFormDialog.tsx` have manual entry forms with duration mode -- changes must be applied to BOTH

### Pre-existing Lint Issues

- ESLint errors in hooks (useTimer, useEntries, useProjects, useSettings) are pre-existing
- `react-hooks/set-state-in-effect` warnings, `react-hooks/purity` in useTimer
- These are NOT introduced by recent changes

## Chrome APIs Used

`storage`, `alarms`, `notifications`, `idle`, `tabs`, `contextMenus`, `runtime`

## Test Infrastructure

- **Framework:** Vitest (config in `vitest.config.ts`)
- **Setup:** `src/__tests__/setup.ts` — in-memory `chrome.storage.local` mock with `onChanged` listener support, `self` global mock for service worker context
- **Test files:** Co-located with source (`*.test.ts`), excluded from build via `tsconfig.app.json`
- **Coverage:** Storage layer (34 tests), sync queue (13 tests), date utils (13 tests), timer utils (5 tests), timer engine integration (18 tests)
- **Run:** `pnpm test` (single run) or `pnpm test:watch` (watch mode)

## Non-Functional Requirements

- Popup load time < 200ms
- Extension size < 5MB
- Works fully offline
- WCAG AA color contrast compliance
- Keyboard navigation and ARIA labels on all interactive elements
