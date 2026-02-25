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
- **Export:** xlsx (dynamic import) + file-saver
- **IDs:** nanoid
- **Dates:** date-fns
- **Font:** Inter Variable (`@fontsource-variable/inter`)
- **Icons:** Custom SVG components in `src/components/Icons.tsx`

### Companion Website (`web/`)
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5.7
- **Styling:** TailwindCSS v4 (`@tailwindcss/postcss` plugin)
- **UI Components:** shadcn/ui (Radix primitives)
- **Charts:** Recharts
- **Auth & DB:** Supabase (`@supabase/ssr` v0.8+ for user client, `@supabase/supabase-js` v2.97+ for service role client)
- **Payments:** Stripe v20 (checkout sessions, billing portal, webhooks; API version `2026-01-28.clover`)
- **Validation:** Zod (all API route inputs)
- **Icons:** Lucide React

## Build & Dev Commands

```bash
# Extension
npm install          # Install dependencies
npm run dev          # Development build with HMR
npm run build        # Production build -> dist/
npm run lint         # Run ESLint

# Website
cd web
npm install
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run lint
```

Load the extension in Chrome:
1. `npm run build`
2. Open `chrome://extensions`, enable Developer Mode
3. Click "Load unpacked" -> select the `dist/` folder

## Path Aliases

- Extension: `@/` -> `src/`, `@shared/` -> `shared/` (in `vite.config.ts` + `tsconfig.app.json`)
- Website: `@/` -> `web/`, `@shared/` -> `shared/` (in `web/tsconfig.json`)

## Architecture

### Extension Source Layout

```
src/
  popup/          # Popup entry point (popup.html + popup.tsx)
  background/     # Service worker (timer engine, sync alarms, auth)
  components/     # React UI components
  hooks/          # Custom React hooks (useTimer, useAuth, usePremium, etc.)
  auth/           # Supabase client + auth state
  sync/           # Cloud sync engine (queue, push/pull, conflict resolver)
  premium/        # Feature gating utilities
  storage/        # chrome.storage.local wrapper with sync hooks
  content/        # Content script (floating mini timer widget)
  utils/          # Helper functions (date/time formatting, export, etc.)
  constants/      # Shared constants (colors, timers, styles)
  types/          # TypeScript interfaces
  index.css       # Global styles + Tailwind v4 theme tokens
```

### Website Source Layout

```
web/
  app/
    (authenticated)/    # Route group (dashboard, billing, analytics)
    admin/              # Admin panel (overview, users, stats, domains, promos, subscriptions)
    api/                # API routes (checkout, billing, webhooks, admin CRUD, promo)
    auth/               # OAuth callback + extension bridge (postMessage relay)
    api/auth/           # Server-side auth routes (sign-in, sign-up, magic-link, forgot-password, google, session)
    login/, register/   # Auth forms
    page.tsx            # Landing page
    globals.css         # Tailwind imports + dark mode variables
  components/
    ui/                 # shadcn/ui components
    Navbar.tsx, PricingCard.tsx, ThemeToggle.tsx
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

### Popup <-> Background Communication

Message passing via `chrome.runtime` with action types:
- Timer: `START_TIMER`, `PAUSE_TIMER`, `RESUME_TIMER`, `STOP_TIMER`, `GET_TIMER_STATE`
- Sync: `TIMER_SYNC` (broadcast from background to popup/tabs)
- Pomodoro: `START_POMODORO`, `STOP_POMODORO`, `SKIP_POMODORO_PHASE`
- Auth: `AUTH_LOGIN` (handled in both `onMessage` and `onMessageExternal`), `AUTH_LOGOUT`, `AUTH_STATE`
- Idle: `IDLE_KEEP`, `IDLE_DISCARD`

### Website <-> Extension Auth Bridge

Two approaches run simultaneously for maximum compatibility:
1. **Direct** (`chrome.runtime.sendMessage(extensionId, ...)`): Uses `NEXT_PUBLIC_EXTENSION_ID` env var. Works when ID matches (published extension or same dev machine). Handled by `onMessageExternal`.
2. **Content script relay** (`window.postMessage` → content script → `chrome.runtime.sendMessage`): No extension ID needed. Content script in `src/content/content.ts` listens for `WORK_TIMER_AUTH` messages and relays to background via internal `onMessage`. Works with any unpacked installation.

The `ExtensionBridge.tsx` component retries postMessage every 500ms for 8s to handle content script loading timing.

### Data Model

Core types in `src/types/`:
- **TimeEntry** -- id, date, startTime, endTime, duration (ms), projectId, taskId, description, type, tags, link
- **Project** -- id, name, color (hex), targetHours, archived, createdAt, defaultTagId
- **Tag** -- id, name, color (hex)
- **Settings** -- workingDays, weekStartDay, idleTimeout, theme, language, notifications, dailyTarget, weeklyTarget, pomodoroConfig

### Database

Supabase PostgreSQL with RLS. Tables: `profiles`, `subscriptions`, `projects`, `tags`, `time_entries`, `user_settings`, `sync_cursors`, `promo_codes`, `promo_redemptions`, `whitelisted_domains`, `stripe_events`.

Shared types in `shared/types.ts` define typed interfaces for all tables with a `Database` type map for the Supabase client. SQL migrations in `supabase/migrations/`.

### Repository & Service Layer (`web/lib/`)

**Repositories** (typed Supabase queries, no `as any` on selects):
- `profiles.ts`, `subscriptions.ts`, `promoCodes.ts`, `domains.ts`, `syncCursors.ts` -- CRUD operations
- `projects.ts` -- CRUD + reorder + default tag linking (`default_tag_id`)
- `tags.ts` -- CRUD + reorder + color + hourly rate + earnings toggle
- `earnings.ts` -- `get_earnings_report` RPC with `groupBy` parameter ('tag' | 'project')
- `admin.ts` -- RPC calls (`get_platform_stats`, `get_active_users`, `get_user_growth`, etc.) + auth admin
- `analytics.ts` -- `get_user_analytics` RPC

**Services** (business logic):
- `auth.ts` -- `requireAuth()`, `getUser()` (React `cache()` wrapped), `requireAdminApi()`, `requireAuthApi()`
- `analytics.ts` -- `getAdminStats()` (aggregates 11 RPC calls)
- `billing.ts` -- checkout/portal helpers
- `earnings.ts` -- `getEarningsReport()` with groupBy passthrough, `formatEarningsCsv()`

### Performance Optimizations

**Extension:**
- `useTimer` uses event-driven `TIMER_SYNC` messages (no 5s polling)
- Premium status cached in module-level variable with `chrome.storage.onChanged` invalidation
- `React.lazy()` for WeekView, StatsView, SettingsView with `<Suspense>`
- Dynamic `import('xlsx')` inside export function (not top-level)
- Vite `manualChunks`: recharts (366KB), xlsx (429KB), supabase (170KB) -- loaded on demand
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

### Sync Engine (`src/sync/`)

- **Queue-based**: Every local write adds to `syncQueue` in `chrome.storage.local`
- **Push**: Background processes queue in batches (500/batch), only pushes queued items (not all data)
- **Pull**: Conditional -- calls `has_changes_since()` RPC first; if nothing changed, skips the full 4-table pull. Fetches records with `updated_at > last_sync`, skips records with pending local changes (queue-based conflict resolution)
- **Realtime**: Single multiplexed Supabase Realtime channel with 4 table listeners (1 connection per user)
- **Periodic**: `chrome.alarms` every 15 minutes + debounced sync on entry saves (10s timer)
- **Initial upload**: Batch upload with per-batch retry (1 retry, 1s backoff)
- **Data transfer**: ~97 KB egress/user/day, ~150-300 queries/user/day

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

### Stripe API (v20, API `2026-01-28.clover`)
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

### Pre-existing Lint Issues
- ESLint errors in hooks (useTimer, useEntries, useProjects, useSettings) are pre-existing
- `react-hooks/set-state-in-effect` warnings, `react-hooks/purity` in useTimer
- These are NOT introduced by recent changes

## Chrome APIs Used

`storage`, `alarms`, `notifications`, `idle`, `tabs`, `scripting`, `contextMenus`, `runtime`

## Non-Functional Requirements

- Popup load time < 200ms
- Extension size < 5MB
- Works fully offline
- WCAG AA color contrast compliance
- Keyboard navigation and ARIA labels on all interactive elements
