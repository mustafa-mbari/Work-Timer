# Work Timer

A modern, privacy-first time tracking system with Chrome extension and companion website.

Track your work time with stopwatch, manual entry, and Pomodoro modes. Start with local-only tracking (no account needed), or upgrade to Premium for cloud sync, advanced analytics, and multi-device support.

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

### Advanced Features
- **Projects** -- Color-coded with inline creation, editing, and default tag linking
- **Tags** -- Color-coded with earnings tracking, hourly rates, and inline management
- **Tag-Based Earnings** -- Set hourly rates per tag, toggle earnings inclusion, view reports grouped by tag or project
- **Default Tag per Project** -- Link a tag to a project; selecting the project auto-selects its linked tag
- **Entry Links** -- Attach URLs to time entries (opens in new tab)
- **Idle Detection** -- Prompt to keep or discard idle time
- **Export** -- CSV and Excel export with auto-sized columns
- **Browser Integration** -- Floating timer widget, timer in tab title, right-click context menu

### Premium Features (Optional)
- **Cloud Sync** -- Automatic sync across devices via Supabase with conflict resolution
- **Unlimited History** -- All time entries (free: 30 days)
- **Unlimited Projects** -- No limit (free: 5 projects)
- **Advanced Analytics** -- Detailed reports on companion website
- **CSV/Excel Export** -- Export data for external analysis
- **Work Type Editing** -- Full tag management
- **Multi-Device** -- Seamless cross-browser sync

### Companion Website
- **Dashboard** -- Account overview, weekly stacked bar chart (CSS, per-project colors, hours per day), project/tag management with inline editing, default tag linking
- **Earnings** -- Tag-based earnings reports with daily charts, groupBy toggle (tag/project), CSV export
- **Analytics** -- Weekly trends, project breakdowns, peak hours, streaks
- **Billing** -- Subscription management, promo codes, Stripe checkout
- **Admin Panel** -- User management, platform stats, domain whitelisting, promo codes
- **UI Test Lab** -- Admin-only page (`/ui-test`) for prototyping alternative UI designs across Entries, Timer, Quick Add, Dashboard, Project Picker, and Daily Goal tabs; each tab has multiple design variants for side-by-side comparison

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Chrome browser

### Installation

```bash
git clone https://github.com/mustafa-mbari/Work-Timer.git
cd Work-Timer
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `dist/` folder

### Development

```bash
# Extension (with HMR)
npm run dev

# Website
cd web && npm install && npm run dev
```

---

## Project Structure

```
Work-Timer/
  shared/               # Shared types & constants (extension + website)
    types.ts            # Database types, Database type map
    constants.ts        # Free/Premium limits
  src/                  # Chrome Extension
    popup/              # Popup entry point
    background/         # Service worker (timer, sync, auth)
    components/         # React UI components
    hooks/              # Custom hooks (useTimer, useAuth, usePremium, etc.)
    auth/               # Supabase auth client
    sync/               # Cloud sync engine (queue, push/pull, conflict resolver)
    premium/            # Feature gating
    storage/            # chrome.storage.local wrapper
    content/            # Floating timer widget (content script)
    utils/              # Helpers (date/time, export, logger, etc.)
    constants/          # Colors, timers, styles
    types/              # TypeScript interfaces
  web/                  # Companion Website (Next.js 16)
    app/                # App Router pages + API routes
    components/         # UI components (shadcn/ui)
    lib/
      repositories/     # Typed Supabase queries (7 modules)
      services/         # Business logic (auth, analytics, billing)
      validation.ts     # Zod schemas for API inputs
      supabase/         # Server + service role clients
      stripe.ts         # Stripe config
  supabase/
    migrations/         # SQL migrations (indexes, RPCs, promo, stripe_events)
  public/               # Extension assets + manifest.json
```

---

## Tech Stack

### Chrome Extension
| Technology | Purpose |
|-----------|---------|
| React 18 + TypeScript | Component UI with type safety |
| TailwindCSS v4 | Utility-first styling |
| Vite | Build tool with HMR |
| Recharts | Charts (lazy loaded) |
| xlsx | Excel export (dynamic import) |
| Supabase | Auth + cloud sync |
| chrome.storage.local | Offline-first persistence |
| nanoid / date-fns | IDs and dates |

### Companion Website
| Technology | Purpose |
|-----------|---------|
| Next.js 16 + React 19 | Server-side rendering + API routes |
| shadcn/ui | UI component library |
| TailwindCSS v4 | Matching design system |
| Supabase (SSR + service role) | Auth + database |
| Stripe | Subscription billing |
| Zod | Input validation |
| Recharts | Analytics charts |

---

## Development

### Scripts

```bash
# Extension
npm run dev          # Dev build with HMR
npm run build        # Production build -> dist/
npm run lint         # ESLint

# Website
cd web
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run lint
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
- **Sync conflict resolution**: Queue-based -- local changes win over remote when pending in sync queue.
- **Optimized sync**: Conditional pull via `has_changes_since()` RPC, single multiplexed Realtime channel (1 connection per user), 15-minute periodic sync with debounced entry saves (~150-300 queries/user/day, ~97 KB egress/day).
- **Webhook idempotency**: Stripe events deduplicated via `stripe_events` table.
- **Input validation**: All API routes validated with Zod schemas.
- **Corporate proxy safe**: Static assets served from trusted CDN domain via `assetPrefix`; all auth flows use server-side API routes (no browser-to-Supabase calls); extension bridge uses content script relay (no extension ID dependency).

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
