# Work Timer

A modern, privacy-first time tracking system with Chrome extension and companion website.

Track your work time with stopwatch, manual entry, and Pomodoro modes. Try it instantly as a guest -- no account needed. Create a free account to keep your data, or upgrade to Premium for cloud sync, advanced analytics, and multi-device support.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css&logoColor=white)

---

## Features

### Core Timer Modes

- **Stopwatch** -- Start, pause, resume, and stop with one click
- **Manual Entry** -- Log time retroactively with time ranges or typeable duration inputs, any date
- **Pomodoro** -- 25/5/15 intervals with auto-break transitions and notifications

### Tracking & Analytics

- **Daily View** -- Today's entries with project breakdown and total hours
- **Weekly View** -- 7-day grid with daily totals, entry pills, and add entry per day
- **Statistics** -- Weekly bar chart, project pie chart, monthly heatmap (GitHub-style)
- **Goals & Targets** -- Daily/weekly hour goals with color-coded progress bars

### Modern UI

- **6 Themes** -- Light Soft, Light Paper, Light Sepia, Dark Charcoal, Dark Mocha, Dark Midnight, plus System auto-detect
- **Inter Variable Font** -- Professional typography with indigo accent palette
- **Custom SVG Icons** -- 19 handcrafted line icons
- **Smooth Animations** -- Backdrop blur modals, fade-in transitions
- **Keyboard Shortcuts** -- Alt+Shift+S (start/stop), Alt+Shift+P (pause), Alt+Shift+T (open popup)

### Groups & Team Management

- **Create & Join Groups** -- Create groups with join codes, invite members by email
- **Timesheet Approval Workflow** -- Admin configures recurring share schedules (daily/weekly/monthly), system auto-creates open shares for members. Race-condition-safe via DB unique partial index
- **Member Submission** -- Members review auto-filled time entries, filter by project, and submit for review. Membership verified server-side before submit
- **Admin Review** -- Approve or deny submissions with required comment on denial; denied shares return to member for editing and resubmission. Admin role verified server-side
- **Admin & Member Views** -- Admins switch between admin dashboard and personal timesheets; members see their own stats, shares, and team list
- **Team Reports** -- Generate reports for any date range across all members, export as CSV
- **Safety Confirmations** -- Destructive actions (delete group, remove member) require explicit confirmation with danger zone styling
- **Privacy-First** -- Members see team names only (no hours); admin sees data only after member submits
- **Responsive Design** -- Desktop tables with mobile card layouts for all data views

### Advanced Features

- **Projects** -- Color-coded with inline creation, editing, and default tag linking
- **Tags** -- Color-coded with earnings tracking, hourly rates, and inline management
- **Tag-Based Earnings** -- Set hourly rates per tag, toggle earnings inclusion, view reports grouped by tag or project
- **Default Tag per Project** -- Link a tag to a project; selecting the project auto-selects its linked tag
- **Entry Links** -- Attach URLs to time entries (opens in new tab)
- **Idle Detection** -- Prompt to keep or discard idle time
- **Export** -- CSV, Excel, and PDF export. PDF reports include user info, summary stats, weekly stacked bar chart, project/tag breakdowns with percentages, daily summary table, and detailed entries with tags column. Branded footer with page numbers.
- **Role-Based Export Quotas** -- Monthly export limits enforced per plan role (Pro: 10 PDF / 20 Excel / 30 CSV; Team: 20 PDF / 30 Excel / 30 CSV). Tracked server-side with atomic PostgreSQL counters. Single "Export" dropdown menu with CSV/Excel/PDF options; quota limits hidden until exhausted, then surfaced via header notification bell.
- **Notification Bell** -- In-app notification system in the authenticated header. Session-scoped alerts for quota exhaustion and other warnings. Red dot badge for unread notifications, dropdown with colored status dots, relative timestamps, and clear all.
- **Browser Integration** -- Floating timer widget, right-click context menu

### Guest Mode

Try Work Timer instantly -- no sign-up required:

- **Instant access** -- Click "Try as Guest" and start tracking immediately
- **5-day trial** -- All core timer features with limited projects (3), tags (3), and 5-day history
- **Smart nudges** -- Dismissible banner appears after 3 entries (cloud icon + soft CTA); re-shows after 3 more; urgent amber style when ≤2 days remain
- **Seamless upgrade** -- Create a free account anytime to keep all your data
- **Auto-cleanup** -- Data automatically removed after 5 days if no account created

### Plans & Pricing

| Plan | Monthly | Yearly | Highlights |
| ---- | ------- | ------ | ---------- |
| **Guest** | — | — | 3 projects · 3 tags · 5-day history · 5-day trial · no account needed |
| **Free** | $0 | — | 5 projects · 5 tags · 14-day history · local only · all timer modes |
| **Pro** | $1.99 | $17.99 | Unlimited projects & tags · cloud sync · granular sync controls · analytics & earnings · CSV/Excel/PDF export (10/20/30 per month) |
| **Team (≤10)** | $29 | $260 | Everything in Pro + group workspace · timesheet approval · team reports · higher export limits (20/30/30 per month) |
| **Team (≤20)** | $49 | $440 | Same as Team (10) with up to 20 members |
| **Team (larger)** | Contact | — | [hello@w-timer.com](mailto:hello@w-timer.com) |

See [HowToDoPlan.md](HowToDoPlan.md) for the full Stripe setup guide (creating prices, env vars, webhook verification, and legacy plan backward compatibility).

### Companion Website

- **Dashboard** -- Account overview, weekly stacked bar chart (CSS, per-project colors, hours per day), project/tag management with inline editing, default tag linking
- **Earnings** -- Tag-based earnings reports with daily charts, groupBy toggle (tag/project), single "Export" dropdown (CSV/Excel/PDF) with configurable date range, sheets, and language. Role-based monthly export quotas (Pro/Team) tracked atomically server-side; quota exhaustion routed to header notification bell.
- **Groups** -- Team time management with timesheet approval workflow. Atomic group creation (single transaction), race-condition-safe share auto-creation (unique partial index), granular RLS policies (per-operation), optimized list queries (entries JSONB excluded from lists, fetched on-demand). Admins configure recurring share schedules, review and approve/deny member submissions, generate CSV reports. Members submit auto-filled timesheets, view own stats, and see team member names (no hours). Shared UI components (StatusBadge, MemberAvatar, EmptyState) with 3-level tab hierarchy (pill segments, underline tabs, filter pills)
- **Analytics** -- Weekly trends, project breakdowns, peak hours, streaks
- **Support** -- Submit support tickets (bug reports, account/billing/sync issues) with priority and platform selection; view ticket history and status updates
- **Suggestions** -- Submit feature ideas and improvements with importance level and target platform; opt-in to release notifications; view suggestion history
- **Billing** -- Subscription management, promo codes, Stripe checkout
- **Admin Panel** -- Separate app at `admin/` (port 3001). User management with per-user detail pages (overview, data management, subscription control, danger zone), platform stats, domain whitelisting, promo codes, group management, support ticket triage, feature suggestion review
- **UI Test Lab** -- Admin-only page (`/ui-test`) for prototyping alternative UI designs across Entries, Timer, Quick Add, Dashboard, Project Picker, and Daily Goal tabs; each tab has multiple design variants for side-by-side comparison

---

## Quick Start

### Prerequisites

- Node.js 22.x (LTS) and pnpm 9.x
- Google Chrome browser

### Installation

```bash
git clone https://github.com/mustafa-mbari/Work-Timer.git
cd Work-Timer
pnpm install
pnpm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `dist/` folder

### Local Development

```bash
# Extension (with HMR)
pnpm run dev

# Website (port 3000)
cd web && pnpm install && pnpm run dev

# Admin Panel (port 3001)
cd admin && pnpm install && pnpm run dev
```

### Environment Variables (Production)

Key environment variables required on the **web app** Vercel project:

| Variable | Where | Purpose |
| -------- | ----- | ------- |
| `CRON_SECRET` | Vercel → web app → Env Vars | Authenticates the daily cron job that expires admin-granted and promo subscriptions. Generate with `openssl rand -hex 32`. Vercel sends it automatically as `Authorization: Bearer <secret>` when triggering cron jobs defined in `vercel.json`. |
| `UPSTASH_REDIS_REST_URL` | Vercel → web app → Env Vars | Upstash Redis URL for distributed API rate limiting. Rate limiter fails open if not set. |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel → web app → Env Vars | Upstash Redis auth token for rate limiting. |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel → web app → Env Vars | Sentry DSN for client-side error tracking (browser). |
| `SENTRY_DSN` | Vercel → web app → Env Vars | Sentry DSN for server-side error tracking. |
| `SENTRY_AUTH_TOKEN` | Vercel → web app → Env Vars | Sentry auth token for source map upload during builds. |
| `SENTRY_ORG` | Vercel → web app → Env Vars | Sentry organization slug. |
| `SENTRY_PROJECT` | Vercel → web app → Env Vars | Sentry project slug for the web app. |
| `ENABLE_EXPERIMENTAL_COREPACK` | Vercel → web app → Env Vars | Set to `1`. Required for Vercel to use the `packageManager` field in `package.json` and install the correct pnpm version via Corepack. |
| `VITE_SENTRY_DSN` | Extension `.env` | Sentry DSN for the Chrome extension error tracking. |

**Test the cron manually:**

```bash
curl -H "Authorization: Bearer <your-secret>" \
  https://w-timer.com/api/cron/expire-subscriptions
# Returns: {"expired": 0, "details": []} when nothing needs expiring
```

The cron runs daily at **3 AM UTC** and downgrades any non-Stripe subscription (admin grants, promo codes) whose `current_period_end` has passed — setting `status → expired` and `plan → free`. Stripe-managed subscriptions are excluded (Stripe handles its own lifecycle via webhooks).

---

## Project Structure

```text
Work-Timer/
  shared/               # Shared types & constants (extension + website)
    types.ts            # Database types, Database type map
    constants.ts        # Free/Premium limits
  src/                  # Chrome Extension
    popup/              # Popup entry point
    background/         # Service worker modules
      background.ts     # Message router + lifecycle
      timerEngine.ts    # Start/pause/resume/stop logic
      pomodoroEngine.ts # Pomodoro phase management
      idleDetection.ts  # Idle state detection
      contextMenus.ts   # Right-click menu items
      reminders.ts      # Weekly reminder notifications
      storage.ts        # Background-specific storage helpers
      ui.ts             # Badge updates + content-script broadcasts
    components/         # React UI components
    hooks/              # Custom hooks (useTimer, useAuth, usePremium, etc.)
    auth/               # Supabase auth client
    sync/               # Cloud sync engine (queue, push/pull, conflict resolver)
    premium/            # Feature gating
    storage/            # chrome.storage.local wrapper
    content/            # Floating timer widget (content script + widget.css)
    utils/              # Helpers (date/time, export, timer, etc.)
    constants/          # Colors, timers, styles
    types/              # TypeScript interfaces
    __tests__/          # Test setup (chrome.storage mock)
  web/                  # Companion Website (Next.js 16, port 3000)
    app/                # App Router pages + API routes
    components/         # UI components (shadcn/ui)
    lib/
      repositories/     # Typed Supabase queries (7 modules)
      services/         # Business logic (auth, analytics, billing)
      validation.ts     # Zod schemas for API inputs
      supabase/         # Server + service role clients
      stripe.ts         # Stripe config
  admin/                # Admin Panel (Next.js 16, separate app, port 3001)
    app/                # App Router pages + API routes
    components/         # AdminHeader, AdminNav, shadcn/ui
    lib/
      repositories/     # Admin-only Supabase queries
      services/         # Admin auth + analytics
      validation.ts     # Admin Zod schemas
      supabase/         # Server + service role clients
  supabase/
    schema.sql          # Live database export (pg_dump); reflects current Supabase state
    migrations/         # 040_consolidated_schema.sql (full fresh-DB schema) + incremental fix migrations
      archive/          # Original incremental migrations 001–039 (historical reference)
  public/               # Extension assets + manifest.json
```

---

## Tech Stack

### Chrome Extension

| Technology | Purpose |
| ---------- | ------- |
| React 18 + TypeScript | Component UI with type safety |
| TailwindCSS v4 | Utility-first styling |
| Vite | Build tool with HMR |
| Vitest | Unit and integration tests |
| Recharts | Charts (lazy loaded) |
| xlsx | Excel export (dynamic import) |
| Supabase | Auth + cloud sync |
| chrome.storage.local | Offline-first persistence |
| nanoid / date-fns | IDs and dates |

### Website Tech Stack

| Technology | Purpose |
| ---------- | ------- |
| Next.js 16 + React 19 | Server-side rendering + API routes |
| shadcn/ui | UI component library |
| TailwindCSS v4 | Matching design system |
| Supabase (SSR + service role) | Auth + database |
| Stripe | Subscription billing |
| Zod | Input validation |
| Recharts | Analytics charts |

---

## Developer Guide

### Scripts

```bash
# Extension
pnpm run dev          # Dev build with HMR
pnpm run build        # Production build -> dist/
pnpm run lint         # ESLint
pnpm test             # Run unit + integration tests (vitest)
pnpm test:watch       # Run tests in watch mode

# Website
cd web
pnpm run dev          # Next.js dev server (port 3000)
pnpm run build        # Production build
pnpm run lint
```

### Path Aliases

- Extension: `@/` -> `src/`, `@shared/` -> `shared/`
- Website: `@/` -> `web/`, `@shared/` -> `shared/`

---

## Architecture Highlights

- **Offline-first**: Extension works 100% without internet. Cloud sync is additive.
- **Event-driven timer**: Popup receives `TIMER_SYNC` broadcasts from background (no polling).
- **Timer metadata in background**: Tags, link, and dateStarted are stored in background `TimerState` (not just popup React state). Popup syncs metadata changes via `UPDATE_TIMER_META` messages. Ensures metadata is preserved when timer is stopped externally (keyboard shortcut, floating widget, context menu). Midnight-crossing lookups use `dateStarted` for correct date key resolution.
- **Render-pure timer hooks**: All timer display hooks use `useRef` for `Date.now()` captures inside `setInterval` callbacks — no impure `Date.now()` calls during React render phase. Timer, pomodoro countdown, and daily goal gauge all read from the same ref within a render for consistency.
- **Code splitting**: Heavy libraries (recharts, xlsx, supabase) in separate chunks, lazy loaded.
- **Repository pattern**: All database queries centralized in `web/lib/repositories/` with typed Supabase calls.
- **Server-side aggregation**: Admin stats and user analytics computed via PostgreSQL RPC functions (not client-side JS). Admin overview uses `get_admin_overview()` RPC (no more loading all auth users into memory). `get_platform_stats()` uses single-scan `FILTER` optimization.
- **Parallel data fetching**: All authenticated pages use `Promise.all` for independent queries. Middleware skips Supabase auth for API routes and static files. Entries page fetches 6 queries in parallel (filtered entries, week entries, projects, tags, settings, daily goal). Earnings page parallelizes tags, projects, and report fetch. Wide date ranges pre-computed to avoid settings-dependent sequential queries.
- **Selective sync controls**: Premium users can disable cloud sync per category (entries, statistics, projects, tags) via Settings. Preferences stored locally, never synced.
- **Sync conflict resolution**: Queue-based -- local changes win over remote when pending in sync queue.
- **Optimized sync**: Conditional pull via `has_changes_since()` RPC, single multiplexed Realtime channel (1 connection per user), 15-minute periodic sync with debounced entry saves (~150-300 queries/user/day, ~97 KB egress/day).
- **Webhook idempotency**: Insert-first Stripe event deduplication — claim event via INSERT before processing; unique constraint prevents concurrent duplicates. Failed processing releases the claim, allowing Stripe retries.
- **Input validation**: All API routes validated with Zod schemas.
- **Export quota enforcement**: Monthly limits per plan role (`free/pro/team`) tracked atomically server-side via PostgreSQL `FOR UPDATE` row locks. Quota charged before generation begins; fails open on DB errors to avoid blocking paying users. Quota exhaustion surfaces as header notification (no inline badges).
- **Corporate proxy safe**: Static assets served from trusted CDN domain via `assetPrefix`; all auth flows use server-side API routes (no browser-to-Supabase calls); extension bridge uses content script relay (no extension ID dependency).
- **Groups performance**: Batch member count queries (no N+1), parallel data fetching, debounced preview requests, granular refresh (member-only vs full). List API excludes entries JSONB (fetched on-demand via detail endpoint).
- **Groups security**: Atomic group creation via `SECURITY DEFINER` RPC (prevents orphan groups), unique partial index on active shares (prevents race condition duplicates), granular RLS policies per operation (select/insert/update/delete), defense-in-depth membership and admin role checks in repository layer, `.range(0, 4999)` caps on entry fetches.
- **Modular service worker**: Background split into 7 focused modules (timer, pomodoro, idle, context menus, reminders, storage, UI) instead of a single monolithic file.
- **Auth session resilience**: Proactive token refresh every 60 minutes. Popup guards against transient logout from failed token refreshes (only clears on explicit `SIGNED_OUT`). Falls back to background session on popup open. `getSession()` returns existing session on refresh failure instead of null. Background startup recovers expired sessions via `refreshSession()`. Free users auto-logged out after 7 days of inactivity only.
- **Free plan limit enforcement**: Projects and tags capped at 5 total (active + archived) to prevent archive-then-create bypass.
- **WCAG AA compliant**: All 6 themes verified for color contrast ratios (4.5:1+ for text).
- **Guest mode**: 5-day trial with restricted limits (3 projects, 3 tags, 5-day history), automatic data expiry via `chrome.alarms`, and seamless data merge on signup.
- **Subscription security**: RLS on `subscriptions` table, trialing status consistency across extension/website, checkout duplicate guard blocks active+trialing+past_due+unpaid, admin grants clear Stripe fields, default free subscription on signup via trigger. Premium check validates `currentPeriodEnd` expiry (prevents indefinite access from admin grants/promos).
- **Subscription expiry cron**: Daily Vercel cron job (`/api/cron/expire-subscriptions`) expires non-Stripe subscriptions (admin grants, promo codes) where `current_period_end` has passed. Stripe-managed subscriptions are excluded (Stripe handles its own lifecycle via webhooks).
- **Webhook monitoring**: All Stripe webhook events logged to `webhook_logs` table with event type, status, duration, and error details. Admin Webhooks page shows 24h/7d stats, success rate, and filterable paginated log viewer with expandable error details.
- **API rate limiting**: Distributed rate limiting via Upstash Redis (`web/lib/rateLimitRedis.ts`) with plan-based sliding window tiers (free: 20/min, pro: 60/min, team: 100/min). Fails open if Redis is unavailable. Applied to `/api/entries` and analytics page (server component). `isRateLimited()` helper for server components; `withRateLimit()` for API routes. Legacy in-memory limiter (`web/lib/rateLimit.ts`) still protects promo endpoints.
- **Monthly API quotas**: Per-resource-type monthly mutation limits tracked atomically server-side via PostgreSQL `FOR UPDATE` row locks. Configurable per plan role from the admin Quotas page. Default limits: entries (100/1500/2000), projects (30/150/200), tags (30/150/200) for free/pro/team. Fails open on DB errors.
- **Storage atomicity**: Per-key async mutex (`src/utils/storageLock.ts`) serializes `chrome.storage.local` read-modify-write operations, preventing concurrent write loss on rapid timer stops or sync queue updates.
- **Auto-timestamp triggers**: PostgreSQL `BEFORE INSERT OR UPDATE` triggers on all synced tables (`time_entries`, `projects`, `tags`, `user_settings`, `subscriptions`, `profiles`) ensure `updated_at` is always set server-side.
- **Error tracking**: Sentry integration for both extension (`@sentry/browser`) and website (`@sentry/nextjs`). Logger auto-reports errors; sync failures captured with component tags.
- **Chunked sync pull**: Delta pull fetches in 1000-row chunks instead of single 50K-row requests, preventing timeouts on large datasets.
- **Pomodoro resilience**: `phaseTargetEndTime` absolute timestamp enables accurate phase remaining calculation after service worker restarts, with backward compatibility for old state format.
- **Runtime hardening**: All Chrome API calls (`alarms.create`, `tabs.create`, `storage.local.set`) wrapped with `.catch()` to prevent unhandled rejections crashing the service worker. Content script Shadow DOM uses null guards in async callbacks. Context menus wrapped in try-catch with `lastError` checks.
- **Test coverage**: 189 tests across storage, sync queue, timer engine, feature gating, guest mode, storage lock, and utility functions via Vitest with chrome.storage.local mock.

---

## License

MIT License -- See [LICENSE](LICENSE) for details.

---

## Contributing

Contributions welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Support

- **Email:** [support@w-timer.com](mailto:support@w-timer.com) / [info@w-timer.com](mailto:info@w-timer.com)
- **Issues:** [GitHub Issues](https://github.com/mustafa-mbari/Work-Timer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/mustafa-mbari/Work-Timer/discussions)
