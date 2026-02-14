# Work Timer — Chrome Extension + Web Dashboard

> **A modern, privacy-first time tracking system with Chrome extension and companion website**

Track your work time effortlessly with stopwatch, manual entry, and Pomodoro modes. Start with local-only tracking (no account needed), or upgrade to Premium for cloud sync, advanced analytics, and multi-device support.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css&logoColor=white)

---

## ✨ Features

### 🎯 Core Timer Modes
- **Stopwatch** — Start, pause, resume, and stop with one click
- **Manual Entry** — Log time retroactively with time ranges or duration
- **Pomodoro** — 25/5/15 intervals with auto-break transitions and notifications

### 📊 Tracking & Analytics
- **Daily View** — See today's entries with project breakdown
- **Weekly View** — 7-day grid with daily totals and progress bars
- **Statistics** — Weekly bar chart, project pie chart, monthly heatmap (GitHub-style)
- **Goals & Targets** — Set daily/weekly hour goals with visual progress tracking

### 🎨 Modern UI & UX
- **6 Themes** — Light Soft, Light Paper, Light Sepia, Dark Charcoal, Dark Mocha, Dark Midnight, System
- **Inter Variable Font** — Professional typography with indigo accent palette
- **19 Custom Icons** — Handcrafted SVG line icons throughout
- **Smooth Animations** — Backdrop blur modals, fade-in transitions, theme switching
- **Keyboard Shortcuts** — Alt+Shift+S (start/stop), Alt+Shift+P (pause), Alt+Shift+T (open popup)
- **Confirmation Dialogs** — Prevents accidental deletion with ESC key support

### 🔧 Advanced Features
- **Projects** — Color-coded projects with inline creation, editing, and color-dot dropdown selector
- **Work Types (Tags)** — Categorize entries with custom tags via tabbed input interface
- **Entry Links** — Attach URLs to time entries via dedicated link tab (open in new tab)
- **Tabbed Input** — Switch between Description, Work Type, and Link fields while timing
- **Idle Detection** — Prompt to keep or discard idle time when you return
- **Export** — CSV and Excel export with auto-sized columns
- **Browser Integration** — Floating timer widget (shows project + description), timer in tab title, right-click context menu

### 💎 Premium Features (Optional)
- **Cloud Sync** — Automatic sync across all your devices via Supabase
- **Unlimited History** — Access all your time entries (free users limited to 30 days)
- **Unlimited Projects** — Create as many projects as you need (free users limited to 5)
- **Advanced Analytics** — Detailed reports, trends, and insights on companion website
- **CSV/Excel Export** — Export your data for external analysis
- **Work Type Editing** — Full tag management and customization
- **Multi-Device** — Seamlessly work across Chrome on different computers

### 🌐 Companion Website
- **Dashboard** — Account overview, plan management, connected devices
- **Analytics** — Advanced reports with weekly trends, project breakdowns, and insights
- **Billing** — Manage subscriptions, upgrade plans, promo codes
- **Admin Panel** — User management, statistics, domain whitelisting, promo codes (admin only)

### 🛡️ Quality & Polish
- **Offline-First** — All data stored locally with `chrome.storage.local`, works 100% offline
- **Error Handling** — User-friendly error messages instead of technical jargon
- **Loading States** — Spinners and feedback during async operations
- **Accessibility** — ARIA labels, keyboard navigation, WCAG AA contrast
- **Structured Logging** — Timestamped, leveled logs for debugging

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Chrome browser

### Installation

```bash
# Clone the repository
git clone https://github.com/mustafa-mbari/Work-Timer.git
cd Work-Timer

# Install dependencies
npm install

# Development build with HMR
npm run dev

# Production build
npm run build
```

### Load in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `dist/` folder

The extension popup will appear when you click the extension icon in the toolbar.

---

## 📁 Project Structure (Monorepo)

```
Work-Timer/
├── shared/             # Shared types & constants
│   ├── types.ts        # Database types, shared interfaces
│   └── constants.ts    # Free/Premium limits, pricing
├── src/                # Chrome Extension
│   ├── popup/          # Popup entry point
│   ├── background/     # Service worker (timer engine, sync, auth)
│   ├── components/     # React UI components
│   ├── hooks/          # Custom React hooks
│   ├── auth/           # Supabase auth client
│   ├── sync/           # Cloud sync engine
│   ├── premium/        # Feature gating utilities
│   ├── utils/          # Helper functions
│   ├── constants/      # Extension constants
│   ├── types/          # TypeScript interfaces
│   ├── storage/        # chrome.storage.local wrapper
│   ├── content/        # Content script (floating widget)
│   └── index.css       # Global styles + Tailwind v4
├── web/                # Companion Website (Next.js 15)
│   ├── app/            # Next.js App Router
│   │   ├── page.tsx            # Landing page
│   │   ├── login/              # Authentication
│   │   ├── register/           # Registration
│   │   ├── dashboard/          # User dashboard
│   │   ├── billing/            # Subscription management
│   │   ├── analytics/          # Advanced reports (premium)
│   │   ├── admin/              # Admin panel (6 pages)
│   │   └── api/                # API routes (Stripe, promo validation)
│   ├── components/     # React components
│   ├── lib/            # Supabase SSR, Stripe client
│   ├── middleware.ts   # Auth + route protection
│   └── package.json
├── public/             # Extension assets
├── package.json        # Workspace root
└── pnpm-workspace.yaml # Monorepo config
```

---

## 🛠️ Tech Stack

### Chrome Extension
| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | React 18 | Component-based UI |
| **Language** | TypeScript 5 | Type safety |
| **Styling** | TailwindCSS v4 | Utility-first CSS |
| **Build** | Vite | Fast builds & HMR |
| **Charts** | Recharts | React-native charts |
| **Storage** | chrome.storage.local | Offline-first persistence |
| **Sync** | Supabase Realtime | Cloud sync & multi-device |
| **Auth** | Supabase Auth | User authentication |
| **State** | React Context + Hooks | Simple state management |
| **IDs** | nanoid | Compact unique IDs |
| **Dates** | date-fns | Lightweight date utils |
| **Export** | xlsx + file-saver | Excel/CSV export |
| **Icons** | Custom SVG | 19 handcrafted icons |
| **Font** | Inter Variable | Modern typography |

### Companion Website
| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 15 | Server-side rendering & API routes |
| **UI Library** | React 19 | Component-based UI |
| **Language** | TypeScript 5 | Type safety |
| **Styling** | TailwindCSS v4 | Utility-first CSS (matching extension) |
| **Auth** | @supabase/ssr | Server-side auth with SSR |
| **Database** | Supabase PostgreSQL | User data, subscriptions, time entries |
| **Payments** | Stripe | Subscription billing |
| **Deployment** | Vercel | Serverless hosting |

---

## 📝 Development

### Available Scripts

```bash
npm run dev          # Development build with HMR (watch mode)
npm run build        # Production build → dist/
npm run lint         # Run ESLint
npm run preview      # Preview production build (not for extensions)
```

### Path Alias

The `@/` alias maps to `src/`:

```typescript
import { useTimer } from '@/hooks/useTimer'
import { PROJECT_COLORS } from '@/constants/colors'
```

Configured in `vite.config.ts` and `tsconfig.app.json`.

### Code Quality

- **ESLint** — Pre-configured with React + TypeScript rules
- **TypeScript** — Strict mode enabled
- **Structured Logging** — Use `logger.debug/info/warn/error` instead of console
- **Error Messages** — Use `getUserFriendlyError()` for user-facing errors
- **Loading States** — Use `<Spinner />` or `<LoadingState />` for async operations

---

## 🎯 Roadmap

See [PLAN.md](PLAN.md) and [PLAN_2.md](PLAN_2.md) for full development plans.

### ✅ Completed (Phases 1–4)

**Phases 1–3: Extension Core Features**
- Stopwatch, Manual, Pomodoro timer modes
- Daily/Weekly/Stats views with charts and heatmap
- Projects, tags, goals, idle detection
- Export (CSV/Excel), 6 themes, keyboard shortcuts
- Floating widget, tab title integration, context menu
- Code quality improvements (constants, logging, error handling, UX polish)

**Phase 4: Premium, Auth, Cloud Sync & Website** (✅ Complete)
- ✅ Supabase backend integration
- ✅ User authentication (email/password, Google OAuth, magic links)
- ✅ Cloud sync engine with Supabase Realtime
- ✅ Multi-device support with conflict resolution
- ✅ Premium tier with Stripe subscriptions (monthly/yearly/lifetime)
- ✅ Feature gating (5 projects free, 30-day history limit, premium analytics)
- ✅ Companion Next.js website with landing page
- ✅ User dashboard and analytics
- ✅ Billing management and upgrade flows
- ✅ Admin panel (6 pages: overview, users, stats, domains, promos, subscriptions)
- ✅ Promo codes and domain whitelisting
- ✅ Extension ↔ Website messaging bridge

### 🔜 Next (Future Enhancements)
- Smart reminders (no time logged, break reminders, end-of-day)
- Auto-categorization (URL → project mapping)
- Rich notes with Markdown support
- Internationalization (English, Arabic with RTL)
- Team workspaces
- API for third-party integrations

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/mustafa-mbari/Work-Timer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/mustafa-mbari/Work-Timer/discussions)

---

**Made with ❤️ using React + TypeScript + TailwindCSS**
