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
- **Auth:** Supabase Auth (session bridged from website via `chrome.runtime.sendMessage`)
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
    auth/               # OAuth callback + extension bridge
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
- Idle: `IDLE_KEEP`, `IDLE_DISCARD`

### Data Model

Core types in `src/types/`:
- **TimeEntry** -- id, date, startTime, endTime, duration (ms), projectId, taskId, description, type, tags, link
- **Project** -- id, name, color (hex), targetHours, archived, createdAt
- **Tag** -- id, name
- **Settings** -- workingDays, weekStartDay, idleTimeout, theme, language, notifications, dailyTarget, weeklyTarget, pomodoroConfig

### Database

Supabase PostgreSQL with RLS. Tables: `profiles`, `subscriptions`, `projects`, `tags`, `time_entries`, `user_settings`, `sync_cursors`, `promo_codes`, `promo_redemptions`, `whitelisted_domains`, `stripe_events`.

Shared types in `shared/types.ts` define typed interfaces for all tables with a `Database` type map for the Supabase client. SQL migrations in `supabase/migrations/`.

### Repository & Service Layer (`web/lib/`)

**Repositories** (typed Supabase queries, no `as any` on selects):
- `profiles.ts`, `subscriptions.ts`, `promoCodes.ts`, `domains.ts`, `syncCursors.ts` -- CRUD operations
- `admin.ts` -- RPC calls (`get_platform_stats`, `get_active_users`, `get_user_growth`, etc.) + auth admin
- `analytics.ts` -- `get_user_analytics` RPC

**Services** (business logic):
- `auth.ts` -- `requireAuth()`, `getUser()` (React `cache()` wrapped), `requireAdminApi()`, `requireAuthApi()`
- `analytics.ts` -- `getAdminStats()` (aggregates 11 RPC calls)
- `billing.ts` -- checkout/portal helpers

### Performance Optimizations

**Extension:**
- `useTimer` uses event-driven `TIMER_SYNC` messages (no 5s polling)
- Premium status cached in module-level variable with `chrome.storage.onChanged` invalidation
- `React.lazy()` for WeekView, StatsView, SettingsView with `<Suspense>`
- Dynamic `import('xlsx')` inside export function (not top-level)
- Vite `manualChunks`: recharts (366KB), xlsx (429KB), supabase (170KB) -- loaded on demand

**Website:**
- Middleware skips auth for public routes (`/`, `/login`, `/register`, `/terms`, `/privacy`, `/api/webhooks`, `/auth`)
- `React.cache()` on `getUser()` for request-level dedup
- Admin pages use `revalidate = 60` (1-minute cache)
- Server-side SQL aggregation via RPC functions (replaces client-side JS)
- Error boundaries for `(authenticated)/` and `admin/` route groups

### Sync Engine (`src/sync/`)

- **Queue-based**: Every local write adds to `syncQueue` in `chrome.storage.local`
- **Push**: Background processes queue in batches (500/batch), only pushes queued items (not all data)
- **Pull**: Fetch records with `updated_at > last_sync`, skips records with pending local changes (queue-based conflict resolution)
- **Realtime**: Supabase Realtime channels for instant cross-device updates
- **Periodic**: `chrome.alarms` every 5 minutes
- **Initial upload**: Batch upload with per-batch retry (1 retry, 1s backoff)

### Security

- All API inputs validated with Zod schemas (`web/lib/validation.ts`)
- Stripe webhook signature verification + idempotency via `stripe_events` table
- RLS on all tables; admin operations use service role client
- Service role client uses `createClient` from `@supabase/supabase-js` (NOT `createServerClient` from `@supabase/ssr`) to properly bypass RLS
- `externally_connectable` restricts extension messaging to allowed origins

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
