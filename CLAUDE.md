# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Work-Timer is a Chrome Extension (Manifest V3) for time tracking. It runs entirely in the browser with offline-first local storage (`chrome.storage.local`). No backend is required for the MVP.

**Core philosophy:** Maximum usability with minimum clicks. Popup-first, privacy-first, offline-first.

## Tech Stack

- **Framework:** React 18+ with TypeScript
- **Styling:** TailwindCSS (utility-first)
- **Build:** Vite (configured for Chrome extension output — popup + background service worker)
- **State:** React Context + useReducer (no Redux)
- **Storage:** chrome.storage.local
- **IDs:** nanoid
- **Dates:** date-fns
- **Charts:** Recharts

## Build & Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Development build with HMR
npm run build        # Production build → dist/
npm run lint         # Run ESLint
```

Load the extension in Chrome:
1. `npm run build`
2. Open `chrome://extensions`, enable Developer Mode
3. Click "Load unpacked" → select the `dist/` folder

Path alias: `@/` maps to `src/` (configured in `vite.config.ts` + `tsconfig.app.json`).

## Architecture

### Extension Entry Points

- **Popup** (`src/popup/`) — Main UI (~380x520px). Timer view, today's entries, project selector, weekly view, stats, settings. Entry: `popup.html` + `popup.tsx`.
- **Background Service Worker** (`src/background/`) — Timer engine, `chrome.alarms` for keepalive, message passing. Entry: `background.ts`.
- **Content Script** (`src/content/`) — Phase 3 only. Floating mini timer widget.

### Source Layout

```
src/
  popup/          # Popup entry point
  background/     # Service worker (timer engine)
  components/     # Shared React UI components
  hooks/          # Custom React hooks
  utils/          # Helper functions (date/time formatting, etc.)
  types/          # TypeScript interfaces (TimeEntry, Project, Settings)
  storage/        # chrome.storage.local abstraction layer
  assets/         # Extension icons (16, 32, 48, 128px)
```

### Popup ↔ Background Communication

Message passing via `chrome.runtime` with action types:
- `START_TIMER`, `PAUSE_TIMER`, `RESUME_TIMER`, `STOP_TIMER`
- `GET_TIMER_STATE`, `TIMER_TICK`

Timer state persists in `chrome.storage.local` so it survives popup close and browser restart.

### Data Model

Three core types defined in `src/types/`:

- **TimeEntry** — id, date, startTime, endTime, duration (ms), projectId, taskId, description, type (`"manual" | "stopwatch" | "pomodoro"`), tags
- **Project** — id, name, color (hex), targetHours, archived
- **Settings** — workingDays, weekStartDay, idleTimeout, theme, language, notifications

### Storage Layer

`src/storage/` wraps `chrome.storage.local` with typed methods:
- `getEntries(date)` / `getEntriesByRange(startDate, endDate)`
- `saveEntry()` / `updateEntry()` / `deleteEntry()`
- `getProjects()` / `saveProject()` / `updateProject()` / `archiveProject()`
- `getSettings()` / `updateSettings()`

### Navigation

Bottom tab bar with four views: Timer (default), Week, Stats, Settings.

## Development Phases

The project follows a phased plan documented in [PLAN.md](PLAN.md):

- **Phase 1 (MVP):** ✅ Timer modes, daily records, projects, weekly view, basic stats, error handling, accessibility
- **Phase 2:** ✅ Idle detection, Pomodoro timer, goals/targets with progress bars, export (CSV/Excel)
- **Phase 3:** Browser integration, smart reminders, auto-categorization, ✅ keyboard shortcuts, dark/light theme, i18n (English + Arabic with RTL)
- **Phase 4:** Cloud sync (Firebase/Supabase), auth, multi-device

Phase 1 tasks are sequential. Phase 2 and 3 features are independent and can be built in parallel.

## Non-Functional Requirements

- Popup load time < 200ms
- Extension size < 5MB
- Works fully offline
- WCAG AA color contrast compliance
- Keyboard navigation and ARIA labels on all interactive elements

## Chrome APIs Used

`storage`, `alarms`, `notifications`, `idle` (Phase 2), `tabs` (Phase 3), `runtime` (message passing)

---

## Companion Website (`web/`)

The companion website is a Next.js app that provides authentication, billing, analytics, and admin management for the Chrome Extension.

### Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript 5.7
- **Styling:** TailwindCSS v4 (`@tailwindcss/postcss` plugin)
- **UI Components:** shadcn/ui (Radix UI primitives, copy-paste, no runtime dep)
- **Charts:** Recharts (same as extension)
- **Auth & DB:** Supabase (`@supabase/ssr` for user client, `@supabase/supabase-js` for service role client)
- **Payments:** Stripe (checkout sessions, billing portal, webhooks)
- **Font:** Inter Variable (`@fontsource-variable/inter`)
- **Icons:** Lucide React (consistent with shadcn/ui)

### Build & Dev Commands

```bash
cd web
npm install          # Install dependencies
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
```

### Path Aliases

- `@/*` → `web/*` (configured in `web/tsconfig.json`)
- `@shared/*` → `shared/*` (shared types & constants used by both extension and website)

### Architecture

```
web/
  app/
    (authenticated)/    # Route group for logged-in pages (dashboard, billing, analytics)
      layout.tsx        # Shared auth layout — fetches user+subscription once
      dashboard/        # User overview, plan, connected devices
      billing/          # Plan management, Stripe checkout, promo codes
      analytics/        # Premium-only analytics with Recharts
    admin/              # Admin panel (role-gated)
      layout.tsx        # Admin layout with nav + role check
      users/            # Paginated user table
      stats/            # Platform-wide metrics (SQL-optimized)
      domains/          # Email domain whitelist
      promos/           # Promo code CRUD
      subscriptions/    # Manual premium grants
    api/                # API routes (checkout, billing portal, webhooks, admin CRUD)
    auth/               # OAuth callback + extension bridge
    login/, register/   # Auth forms
    page.tsx            # Landing page
    layout.tsx          # Root layout (Navbar, footer, Toaster, dark mode)
    globals.css         # Tailwind imports + design tokens + dark mode variables
  components/
    ui/                 # shadcn/ui components (button, card, table, dialog, etc.)
    Navbar.tsx          # Responsive nav with mobile menu, active states, theme toggle
    PricingCard.tsx     # Pricing tier card
    ThemeToggle.tsx     # Light/Dark/System theme switcher
  lib/
    utils.ts            # cn() helper for class merging
    theme.ts            # Cookie-based theme provider
    stripe.ts           # Stripe singleton + price ID config
    supabase/
      client.ts         # Browser Supabase client
      server.ts         # Server + service role Supabase clients
  middleware.ts         # Auth guards, session refresh (optimized for public routes)
```

### Key Patterns

- **Server Components** (default): Pages fetch data server-side via Supabase, stream with Suspense
- **Client Components** (`'use client'`): Forms, interactive UI, theme toggle
- **Route Groups**: `(authenticated)` groups dashboard/billing/analytics with shared layout without affecting URLs
- **Auth**: Cookie-based via `@supabase/ssr`. Middleware guards protected routes. Admin role checked in layout via service role client
- **Billing**: Stripe Checkout for payments, webhooks for subscription lifecycle, promo codes with validation + redemption
- **Dark Mode**: CSS custom properties with cookie-based persistence to avoid flash. Supports Light/Dark/System
- **Service Role Client**: Uses `createClient` from `@supabase/supabase-js` (NOT `createServerClient` from `@supabase/ssr`) to properly bypass RLS. The SSR client passes cookies which can cause RLS to apply based on user session even with service role key.
- **Admin User Queries**: Use `auth.admin.listUsers()` for user counts/lookups (not `profiles` table, which may be incomplete if DB triggers didn't run for all users)
- **Supabase Row Limits**: Always use `.range(0, 49999)` on queries that aggregate data. PostgREST defaults to 1000 rows max without explicit range.

### Design System (shared with extension)

- **Accent:** Indigo (#6366F1 light, #818CF8 dark)
- **Neutrals:** Stone scale (warm grays)
- **Semantic:** Emerald (success), Amber (warning), Rose (danger)
- **Dark surfaces:** Custom tokens (dark, dark-card, dark-elevated, dark-border, dark-hover)
- **Border radius:** `rounded-xl` for cards, `rounded-lg` for inputs
- **Font:** Inter Variable

### Database Types

Shared types in `shared/types.ts` define typed interfaces for all Supabase tables (`DbProfile`, `DbSubscription`, `DbProject`, `DbTimeEntry`, etc.) with a `Database` type map for the typed Supabase client.

### Completed Redesign (PLAN_3.md)

- shadcn/ui component library (16 components)
- Responsive navbar with mobile menu, active states, theme toggle
- Authenticated route group with shared layout, loading/error states
- Dark mode across all pages (cookie-based, no flash)
- Toast notifications (sonner) for all CRUD operations
- Confirmation dialogs for destructive actions (AlertDialog)
- Search + pagination on admin users table
- Admin pages use `auth.admin.listUsers()` for accurate user counts
- Service role client properly bypasses RLS
- All data queries use `.range(0, 49999)` to bypass PostgREST row limits
- Promo code CRUD with `valid_from` field
- Privacy/Terms placeholder pages

### Remaining Goals

- SQL aggregation for analytics/admin stats (currently client-side JS)
- Suspense streaming for heavy pages
- Proper caching (remove unnecessary `force-dynamic`)
- Middleware optimization (skip auth on public routes)
- Remove remaining `as any` casts (requires Supabase CLI-generated types)
- Date range filters on analytics
- Full accessibility audit (keyboard nav, screen reader, WCAG AA contrast)
