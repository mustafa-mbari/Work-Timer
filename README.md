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
- **Timesheet Approval Workflow** -- Admin configures recurring share schedules (daily/weekly/monthly), system auto-creates open shares for members
- **Member Submission** -- Members review auto-filled time entries, filter by project, and submit for review
- **Admin Review** -- Approve or deny submissions with required comment on denial; denied shares return to member for editing and resubmission
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
- **Role-Based Export Quotas** -- Monthly export limits enforced per plan role (Pro: 10 PDF / 20 Excel / 30 CSV; Team: 20 PDF / 30 Excel / 30 CSV). Tracked server-side with atomic PostgreSQL counters. Quota badge shown inline next to each export button; resets on the 1st of each month.
- **Browser Integration** -- Floating timer widget, right-click context menu

### Guest Mode

Try Work Timer instantly -- no sign-up required:

- **Instant access** -- Click "Try as Guest" and start tracking immediately
- **5-day trial** -- All core timer features with limited projects (3), tags (3), and 5-day history
- **Expiry warnings** -- Banner shows days remaining; modal alert on days 4-5
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
- **Earnings** -- Tag-based earnings reports with daily charts, groupBy toggle (tag/project), CSV/Excel/PDF export with configurable date range, sheets, and language. Role-based monthly export quotas (Pro/Team) with inline quota badge and atomic server-side tracking.
- **Groups** -- Team time management with timesheet approval workflow. Admins configure recurring share schedules, review and approve/deny member submissions, generate CSV reports. Members submit auto-filled timesheets, view own stats, and see team member names (no hours). Shared UI components (StatusBadge, MemberAvatar, EmptyState) with 3-level tab hierarchy (pill segments, underline tabs, filter pills)
- **Analytics** -- Weekly trends, project breakdowns, peak hours, streaks
- **Support** -- Submit support tickets (bug reports, account/billing/sync issues) with priority and platform selection; view ticket history and status updates
- **Suggestions** -- Submit feature ideas and improvements with importance level and target platform; opt-in to release notifications; view suggestion history
- **Billing** -- Subscription management, promo codes, Stripe checkout
- **Admin Panel** -- Separate app at `admin/` (port 3001). User management, platform stats, domain whitelisting, promo codes, group management, support ticket triage, feature suggestion review
- **UI Test Lab** -- Admin-only page (`/ui-test`) for prototyping alternative UI designs across Entries, Timer, Quick Add, Dashboard, Project Picker, and Daily Goal tabs; each tab has multiple design variants for side-by-side comparison

---

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
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
    migrations/         # SQL migrations (indexes, RPCs, promo, stripe_events)
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
- **Code splitting**: Heavy libraries (recharts, xlsx, supabase) in separate chunks, lazy loaded.
- **Repository pattern**: All database queries centralized in `web/lib/repositories/` with typed Supabase calls.
- **Server-side aggregation**: Admin stats and user analytics computed via PostgreSQL RPC functions (not client-side JS).
- **Selective sync controls**: Premium users can disable cloud sync per category (entries, statistics, projects, tags) via Settings. Preferences stored locally, never synced.
- **Sync conflict resolution**: Queue-based -- local changes win over remote when pending in sync queue.
- **Optimized sync**: Conditional pull via `has_changes_since()` RPC, single multiplexed Realtime channel (1 connection per user), 15-minute periodic sync with debounced entry saves (~150-300 queries/user/day, ~97 KB egress/day).
- **Webhook idempotency**: Insert-first Stripe event deduplication — claim event via INSERT before processing; unique constraint prevents concurrent duplicates. Failed processing releases the claim, allowing Stripe retries.
- **Input validation**: All API routes validated with Zod schemas.
- **Export quota enforcement**: Monthly limits per plan role (`free/pro/team`) tracked atomically server-side via PostgreSQL `FOR UPDATE` row locks. Quota charged before generation begins; fails open on DB errors to avoid blocking paying users.
- **Corporate proxy safe**: Static assets served from trusted CDN domain via `assetPrefix`; all auth flows use server-side API routes (no browser-to-Supabase calls); extension bridge uses content script relay (no extension ID dependency).
- **Groups performance**: Batch member count queries (no N+1), parallel data fetching, debounced preview requests, granular refresh (member-only vs full).
- **Modular service worker**: Background split into 7 focused modules (timer, pomodoro, idle, context menus, reminders, storage, UI) instead of a single monolithic file.
- **Auth session hardening**: Proactive token refresh every 60 minutes; free users auto-logged out after 7 days of inactivity.
- **Free plan limit enforcement**: Projects and tags capped at 5 total (active + archived) to prevent archive-then-create bypass.
- **WCAG AA compliant**: All 6 themes verified for color contrast ratios (4.5:1+ for text).
- **Guest mode**: 5-day trial with restricted limits (3 projects, 3 tags, 5-day history), automatic data expiry via `chrome.alarms`, and seamless data merge on signup.
- **Subscription security**: RLS on `subscriptions` table, trialing status consistency across extension/website, checkout duplicate guard blocks active+trialing+past_due+unpaid, admin grants clear Stripe fields, default free subscription on signup via trigger. Premium check validates `currentPeriodEnd` expiry (prevents indefinite access from admin grants/promos).
- **API rate limiting**: In-memory rate limiter (`web/lib/rateLimit.ts`) protects promo validate/redeem endpoints (10 req/min/user). Keyed by authenticated user ID (not IP) to prevent header spoofing bypass. Best-effort per-instance protection with periodic cleanup.
- **Test coverage**: 177 tests across storage, sync queue, timer engine, feature gating, guest mode, and utility functions via Vitest with chrome.storage.local mock.

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

- **Issues:** [GitHub Issues](https://github.com/mustafa-mbari/Work-Timer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/mustafa-mbari/Work-Timer/discussions)
