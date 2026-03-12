# CLAUDE.md — Work-Timer Mobile App

This file provides guidance to Claude Code when working with the Work-Timer mobile app codebase.

## Project Overview

Work-Timer Mobile is a cross-platform (Android + iOS) companion app for the Work-Timer ecosystem. It replicates the Chrome Extension's feature set as a native mobile experience using React + Capacitor.

**Core philosophy:** Maximum usability with minimum taps. Offline-first, privacy-first. Feature parity with the Chrome Extension.

**Ecosystem:**
- Chrome Extension (primary client) — popup-first time tracker
- Companion Website (Next.js) — dashboard, analytics, billing, earnings
- **This App** — mobile time tracker with the same data model, sync, and feature set
- Shared backend: Supabase (PostgreSQL + Auth + Realtime)

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Native Runtime:** Capacitor (Android + iOS simultaneously)
- **Styling:** TailwindCSS v4
- **State:** React Context + hooks (useTimer, useProjects, useEntries, useSettings)
- **Storage:** Capacitor Preferences API (or SQLite via `@capacitor-community/sqlite` for structured data) — offline-first
- **Sync:** Supabase (`@supabase/supabase-js`) — push/pull with sync queue
- **Auth:** Supabase Auth
- **Charts:** Recharts (lazy loaded) or a lighter mobile alternative (e.g., Victory Native)
- **Export:** Dynamic imports for PDF (jsPDF), Excel (xlsx), CSV generation
- **IDs:** nanoid
- **Dates:** date-fns
- **Font:** Inter Variable
- **Notifications:** Capacitor Local Notifications plugin + Push Notifications plugin
- **Background Tasks:** Capacitor Background Task plugin (for timer persistence)
- **Haptics:** Capacitor Haptics plugin

## Data Model

All types must be compatible with the Chrome Extension and website. Use the same field names and types for cloud sync interoperability.

### TimeEntry

```typescript
interface TimeEntry {
  id: string              // nanoid
  date: string            // ISO date string YYYY-MM-DD (local date, NOT UTC)
  startTime: number       // Unix timestamp ms
  endTime: number         // Unix timestamp ms
  duration: number        // Duration in ms
  projectId: string | null
  taskId: string | null
  description: string
  type: 'manual' | 'stopwatch' | 'pomodoro'
  tags: string[]          // Array of tag IDs
  link?: string           // Optional URL
}
```

### Project

```typescript
interface Project {
  id: string
  name: string
  color: string           // Hex color from PROJECT_COLORS palette
  targetHours: number | null
  archived: boolean
  createdAt: number       // Unix timestamp ms
  isDefault?: boolean
  order?: number          // For manual reordering
  defaultTagId?: string | null  // Auto-selects this tag when project is chosen
}
```

### Tag

```typescript
interface Tag {
  id: string
  name: string
  color: string           // Hex color
  isDefault?: boolean
  order?: number
  archived?: boolean
}
```

### Settings

```typescript
interface Settings {
  workingDays: number           // 5, 6, or 7 (COUNT, NOT a bitmask)
  weekStartDay: 0 | 1          // 0 = Sunday, 1 = Monday
  idleTimeout: number           // Minutes (not applicable on mobile — see Background section)
  theme: ThemeType
  language: 'en' | 'ar'
  notifications: boolean
  dailyTarget: number | null    // Hours (0–24, step 0.5)
  weeklyTarget: number | null   // Hours (0–168, step 1)
  pomodoro: PomodoroSettings
  floatingTimerAutoShow: boolean // Not applicable on mobile — use persistent notification instead
  reminder: ReminderSettings
  entrySaveTime: number         // Minimum entry duration in seconds (5–240, default 10)
}

type ThemeType = 'light-soft' | 'light-paper' | 'light-sepia' | 'dark-charcoal' | 'dark-mocha' | 'dark-midnight' | 'system'
```

### TimerState

```typescript
interface TimerState {
  status: 'idle' | 'running' | 'paused'
  projectId: string | null
  description: string
  startTime: number | null      // Unix timestamp when started
  elapsed: number               // Accumulated elapsed time in ms
  pausedAt: number | null       // Timestamp when paused
  continuingEntryId: string | null  // Entry being continued
  tags: string[]
  link: string
  dateStarted: string           // YYYY-MM-DD for midnight-crossing
}
```

### PomodoroState

```typescript
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

interface PomodoroSettings {
  workMinutes: number           // 1–120, default 25
  shortBreakMinutes: number     // 1–30, default 5
  longBreakMinutes: number      // 1–60, default 15
  sessionsBeforeLongBreak: number // 1–10, default 4
  soundEnabled: boolean
}

interface PomodoroState {
  active: boolean
  phase: PomodoroPhase
  phaseStartedAt: number | null
  phaseDuration: number         // Total duration of current phase in ms
  phaseTargetEndTime?: number | null  // Absolute timestamp when phase should end
  sessionsCompleted: number
  totalWorkTime: number         // ms accumulated across phases
  remainingWork: number         // ms remaining from skipped work phase
  accumWork: number             // ms accumulated within current work session
}
```

### ReminderSettings

```typescript
interface ReminderSettings {
  enabled: boolean              // default: true
  dayOfWeek: number             // 0–6 (0=Sunday), default: 5 (Friday)
  hour: number                  // 0–23, default: 14
  minute: number                // 0–59, default: 0
}
```

### Auth & Subscription

```typescript
interface AuthSession {
  userId: string
  email: string
  displayName?: string
  accessToken: string
  refreshToken: string
  expiresAt: number             // Unix timestamp seconds
}

interface SubscriptionInfo {
  plan: 'free' | 'premium_monthly' | 'premium_yearly' | 'allin_monthly' | 'allin_yearly' | 'team_10_monthly' | 'team_10_yearly' | 'team_20_monthly' | 'team_20_yearly'
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'expired'
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  grantedBy: 'stripe' | 'domain' | 'promo' | 'admin_manual' | null
}
```

### SyncQueueItem

```typescript
interface SyncQueueItem {
  id: string
  table: 'time_entries' | 'projects' | 'tags' | 'user_settings'
  recordId: string
  action: 'upsert' | 'delete'
  updatedAt: number
  date?: string                 // YYYY-MM-DD for time_entries
}
```

## Design System

### Colors

| Token | Light | Dark |
|-------|-------|------|
| **Accent** | Indigo `#6366F1` | Indigo `#818CF8` |
| **Success** | Emerald `#10B981` | Emerald |
| **Warning** | Amber `#F59E0B` | Amber |
| **Danger** | Rose `#F43F5E` | Rose |
| **Pomodoro** | Purple `#A855F7` | Purple |
| **Neutrals** | Stone scale (warm grays) | Custom dark tokens |

### Project Color Palette (10 colors)

```typescript
const PROJECT_COLORS = [
  '#6366F1', // Indigo
  '#F43F5E', // Rose
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#14B8A6', // Teal
]
```

### Typography

- **Font:** Inter Variable (via @fontsource-variable/inter)
- Use system font stack as fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Spacing & Radius

- **Cards/buttons:** `rounded-xl` (12px)
- **Inputs:** `rounded-lg` (8px)
- **Container padding:** 20px horizontal, 16px vertical
- **Section gap:** 16px

### Theme System (6 themes + system)

| ID | Label | Type | Background |
|----|-------|------|------------|
| `light-soft` | Soft (default) | Light | `#F2F2F0` |
| `light-paper` | Paper | Light | `#F4EFE6` |
| `light-sepia` | White | Light | `#FAFAFA` |
| `dark-charcoal` | Charcoal | Dark | `#3A3A3A` |
| `dark-midnight` | Midnight | Dark | `#1C2638` |
| `dark-mocha` | Black | Dark | `#0A0806` |
| `system` | System | Auto | Follows OS |

Implementation: `.dark`/`.light` CSS class on root element + `data-theme` attribute for palette overrides via CSS custom properties. Use `prefers-color-scheme` media query for `system` mode.

### Dark Surface Tokens

- `--dark` — main background
- `--dark-card` — card backgrounds
- `--dark-elevated` — elevated surfaces (modals, dropdowns)
- `--dark-border` — border color
- `--dark-hover` — hover state

## Features

### 1. Timer Modes

The app has three timer modes, toggled via a mode selector (disabled while timer is active).

#### Stopwatch Mode
- Rolling display: `H:MM:SS` with pulsing "Recording.." indicator while running, "Paused" while paused
- Buttons: **Start** (indigo), **Pause** (amber), **Resume** (emerald), **Stop** (rose)
- Input fields (accessible while timing): Description (text), Tag (single selector), Link (URL)
- Project selector always editable while timer runs
- All metadata (description, tags, link, project) persisted to timer state immediately so stopping from notification preserves them
- Description debounced 300ms; tags/link/project immediate

#### Manual Entry Mode
- Date picker defaulting to today
- Two sub-modes: **Duration** (hours/minutes with +/- steppers, hours step 1, minutes step 5) or **Time Range** (from/to time pickers)
- Same inputs: Project, Description, Tag, Link
- "Use last" button pre-fills from most recent manual entry (session memory)
- Duration preview before save
- Minimum duration gate: entries shorter than configured threshold are rejected with alert

#### Pomodoro Mode
- Circular progress ring (SVG) with gradient: red→orange→yellow→lime→green for work; inverted for breaks
- Center: countdown `MM:SS` (monospace), phase label (Focus / Short Break / Long Break / Ready)
- Session dots: completed (emerald), active (pulsing purple), pending (gray)
- "X focused" total work time accumulator
- Work phase buttons: **Break** (skip to break, emerald) + **Stop** (rose)
- Break phase buttons: **Focus** (skip to work, indigo) + **Stop** (rose)
- Idle phase: **Start Focus** (purple)
- Project and description editable during Pomodoro

### 2. Project Management

- **Create:** name + color (10-color palette grid)
- **Edit:** rename
- **Change color:** 10-color palette picker
- **Set default:** auto-selected when opening timer; star indicator
- **Link default tag:** when project selected, linked tag auto-selects
- **Archive:** soft-remove; entries keep association; restorable
- **Delete:** permanent; entries lose project (null)
- **Reorder:** drag-and-drop (use a mobile-friendly drag library)
- **Limits:** Guest 3, Free 5, Premium unlimited (count includes archived)

### 3. Tag Management

- **Create:** name + color (same 10-color palette)
- **Edit:** rename
- **Change color:** palette picker
- **Set default:** auto-selected when no project-linked tag applies
- **Archive:** soft-remove; restorable
- **Delete:** permanent; removed from all entries
- **Reorder:** drag-and-drop
- **Limits:** Guest 3, Free 5, Premium unlimited

### 4. Entry Management

#### Today's Entry List (Timer View)
- Sorted descending by start time
- Each row: colored left bar (project color), project name, time range, description, duration badge
- Link icon: opens URL in system browser
- Continue button: re-starts timer with same project + description, extends existing entry
- Tap row to open edit modal
- New entries animate in and scroll into view

#### Entry Edit Modal
- Date picker
- Duration or Time Range toggle
- Project selector
- Description, Tag, Link inputs
- Delete (two-step confirmation)
- Save button

#### Week View
- Week navigation: prev/next arrows, current week label
- Week total duration badge
- Weekly goal progress bar (if target set)
- Per-day cards: day name, date, total, "+" button to add entry
- Today highlighted in indigo
- Entry chips per day: colored pill with duration
- Tap to edit; long-press or button to continue

### 5. Stats & Analytics

#### Summary Cards
Three cards: Today (indigo), This Week (emerald), Daily Average (purple)

#### Weekly Stacked Bar Chart
- CSS or SVG bars per working day of current week
- Per-project colored segments
- Hours label above each bar; today highlighted
- Hover/tap tooltip: per-project breakdown + total
- Handles midnight-crossing entries

#### Today by Project (Donut Chart)
- Small donut chart with project colors
- Legend: color dot, name, hours

#### Monthly Heatmap (Premium only)
- Month navigation
- 7-column grid (Mon–Sun)
- Day cells colored by intensity: 0h (gray), <2h (indigo-100), <5h (indigo-300), <8h (indigo-500), 8h+ (indigo-600)
- Today has ring highlight
- Tap shows date + duration
- Free/guest: locked with upgrade prompt

### 6. Export (Premium only)

Free and guest users see lock icon; tapping shows upgrade prompt.

#### CSV
- Columns: Date, Start Time, End Time, Duration, Project, Tags, Description, Link

#### Excel (.xlsx)
- Dynamic import of `xlsx` library
- Same data in spreadsheet format

#### PDF
- Dynamic import of jsPDF + jspdf-autotable
- A4 report with sections:
  1. Header: branding + date range, user name + email
  2. Summary box: Total Hours, Entries, Projects, Daily Average
  3. Weekly bar chart (drawn with jsPDF rect primitives)
  4. Project breakdown (2-column with color dots)
  5. Tag breakdown
  6. Daily summary table
  7. Entries table
  8. Footer: website, timestamp, page numbers

### 7. Settings

#### General
- **Theme:** 7 visual swatches (6 themes + System)
- **Working Days:** 5 / 6 / 7 toggle
- **Week Starts On:** Monday or Sunday
- **Daily Target (h):** 0–24, step 0.5
- **Weekly Target (h):** 0–168, step 1

#### Timer
- **Minimum Entry Duration:** 5s / 10s / 15s / 30s / 1min / 2min / 3min / 4min
- **Pomodoro:**
  - Work duration (1–120 min, default 25)
  - Short break (1–30 min, default 5)
  - Long break (1–60 min, default 15)
  - Sessions before long break (1–10, default 4)
  - Sound notifications toggle
  - Vibration/haptics toggle (mobile-specific)
- **Weekly Reminder:** toggle + day + time picker (day/time customization is Premium only)

#### Data (Projects / Tags sub-tabs)
- Full project and tag management UI (see sections 2 & 3)

#### Account
- **Logged in:** avatar, email, plan badge, subscription info, manage billing link
- **Premium sync controls:**
  - Last synced timestamp
  - Selective sync toggles (Entries, Statistics, Projects, Tags)
  - Manual sync buttons: "Sync from cloud", "Re-upload all", "Drop local & sync fresh"
  - Sync diagnostics panel
- **Guest mode:** days remaining, create account / visit website / log out
- **Not logged in:** sign in / create account buttons

### 8. Guest Mode

5-day trial without account creation.

| Feature | Guest | Free | Premium |
|---------|-------|------|---------|
| Projects | 3 | 5 | Unlimited |
| Tags | 3 | 5 | Unlimited |
| History days | 5 | 30 | Unlimited |
| Export | No | No | Yes |
| Cloud sync | No | No | Yes |
| Advanced stats | No | No | Yes |
| Duration | 5 days | Indefinite | Indefinite |

**Guest Banner:** shown after 3 entries; re-shown after 3 more post-dismiss
- Days 1–3: indigo, "Sync your progress — Sign up free"
- Days 4–5: amber warning, "X days left"

**Expiry Alert:** modal on app open when on day 4–5, listing free plan benefits

**Expiry:** after 5 days, clear all local data. Signing in before expiry merges guest data into new account.

### 9. Daily & Weekly Goal Progress

- **Daily goal bar** (Timer view): appears when daily target set
  - < 40%: rose, 40–70%: amber, 70–100%: indigo, 100%+: emerald
- **Weekly goal bar** (Week view): same color logic

### 10. Notifications (Mobile-Specific)

#### Timer Active Notification (replaces Floating Widget)
- Persistent notification while timer is running showing elapsed time, project name
- Action buttons: Pause/Resume, Stop
- Update notification every second (or use a foreground service on Android)
- On iOS, use a local notification with timer category

#### Pomodoro Phase Notifications
- Notify when work phase ends ("Time for a break!")
- Notify when break ends ("Ready to focus?")
- Vibrate/haptic feedback if enabled

#### Weekly Reminder
- Local notification on configured day + time
- Actions: "Open App", "Remind Later" (1 hour snooze)

#### Idle Detection Equivalent
- On mobile, detect app backgrounding while timer runs
- If app returns after configured idle timeout: show "You were away for X minutes" with Keep/Discard options
- Use Capacitor App plugin's `appStateChange` event

### 11. Cloud Sync (Premium)

Same sync engine as the Chrome Extension:

- **Queue-based:** every local write adds to sync queue
- **Push:** process queue in batches (500/batch)
- **Pull:** conditional via `has_changes_since()` RPC; skip if nothing changed
- **Periodic:** every 15 minutes (use Capacitor Background Task or WorkManager on Android)
- **On app open:** delta sync
- **Debounced:** 10s after entry saves
- **Selective sync:** 4 independent toggles (Entries, Statistics, Projects, Tags)
- **Conflict resolution:** queue-based; records with pending local changes skip during pull
- **Realtime:** Supabase Realtime channel (4 tables) when app is in foreground

### 12. Auth

- Supabase Auth with email/password, magic link, Google OAuth
- Deep link handling for OAuth callbacks (Capacitor Deep Links plugin)
- Session stored in Capacitor Preferences
- Proactive token refresh (every 60 min, 120s buffer before expiry)
- Free user auto-logout after 7 days of inactivity
- Login stamp on each sign-in

### 13. Background Timer Persistence

Critical for mobile: the timer must continue running when the app is backgrounded.

**Android:**
- Use a Foreground Service with persistent notification
- Timer ticks in the service; UI updates on resume via state read

**iOS:**
- Store `startTime` + `elapsed` to disk; recalculate on app resume
- Use background task for short-lived operations (sync)
- Persistent notification updates are limited on iOS; store state and reconstruct

**Both platforms:**
- On app resume: read `TimerState` from storage, recalculate elapsed from `startTime` + `Date.now()`
- Midnight crossing: compare `dateStarted` with current date

## Navigation

Bottom tab bar with 4 tabs (always visible):

| Tab | Icon | Label |
|-----|------|-------|
| Timer | Clock | Timer |
| Week | Calendar | Week |
| Stats | Chart | Stats |
| Settings | Gear | Settings |

Sync progress indicator: animated indigo bar at top of screen while syncing.

## Shared Constants

```typescript
const FREE_LIMITS = {
  maxProjects: 5,
  maxTags: 5,
  historyDays: 30,
  allowExport: false,
  allowCloudSync: false,
  allowAdvancedStats: false,
}

const PREMIUM_LIMITS = {
  maxProjects: Infinity,
  maxTags: Infinity,
  historyDays: Infinity,
  allowExport: true,
  allowCloudSync: true,
  allowAdvancedStats: true,
}

const GUEST_LIMITS = {
  maxProjects: 3,
  maxTags: 3,
  historyDays: 5,
  allowExport: false,
  allowCloudSync: false,
  allowAdvancedStats: false,
}

const GUEST_SESSION_MAX_MS = 5 * 24 * 60 * 60 * 1000  // 5 days
const GUEST_EXPIRY_WARNING_MS = 3 * 24 * 60 * 60 * 1000 // Warning on day 4

const PRICING = { monthly: 1.99, yearly: 17.99 }

const ENTRY_SAVE_TIME = {
  min: 5, max: 240, default: 10,
  options: [
    { value: 5, label: '5 seconds' },
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 180, label: '3 minutes' },
    { value: 240, label: '4 minutes' },
  ],
}

const WEBSITE_URL = 'https://w-timer.com'
```

## Supabase Integration

### Database

Supabase PostgreSQL with RLS. Key tables: `profiles`, `subscriptions`, `projects`, `tags`, `time_entries`, `user_settings`, `sync_cursors`, `promo_codes`, `promo_redemptions`.

Types are auto-generated: `npx supabase gen types typescript --project-id <id> > shared/database.types.ts`

### Gotchas

- **Row limits:** PostgREST defaults to 1000 rows. Always use `.range(0, 49999)` on aggregating queries.
- **Service role client:** MUST use `createClient` from `@supabase/supabase-js`, NOT `createServerClient` from `@supabase/ssr`.
- **Type system:** Auto-generated types from `shared/database.types.ts`. No `as any` or `as Function` casts needed.
- **Stripe API (v20, `2026-02-25.clover`):**
  - `Subscription.current_period_end` is item-level: `sub.items.data[0]?.current_period_end`

### Premium Check

```typescript
function isPremiumSubscription(sub: SubscriptionInfo): boolean {
  const isActive = sub.status === 'active' || sub.status === 'trialing'
  const isNotFree = sub.plan !== 'free'
  const notExpired = !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date()
  return isActive && isNotFree && notExpired
}
```

## Key Gotchas

### Date Handling (UTC vs Local)

- **NEVER** use `toISOString().slice(0, 10)` to get a local date — it returns UTC and shifts dates in UTC+ timezones after midnight
- Always use `new Date()` with `getFullYear()`/`getMonth()`/`getDate()` for local date strings
- `new Date('YYYY-MM-DDTHH:mm:ss')` without `Z` suffix parses as LOCAL time
- Entries crossing midnight must be split across days using `start_time`/`end_time`

### workingDays is a COUNT, not a bitmask

- `working_days` is `5` (Mon–Fri), `6` (Mon–Sat), or `7` (all days)
- Validated as `number.int().min(1).max(7)`
- Weekly chart uses `Array.from({ length: count })` from week start — NOT bitmask logic

### Storage Atomicity

- Read-modify-write on storage is not atomic; concurrent calls can lose writes
- Use per-key async mutex pattern: `withStorageLock(key, fn)` serializes access per key
- Apply to: entry saves, sync queue enqueue/dequeue

### Minimum Entry Duration

- Entries shorter than `settings.entrySaveTime` seconds are auto-discarded
- Show a brief dismissible alert: "Entry too short. Change in Settings → Timer."

## Mobile-Specific Considerations

### Performance
- Lazy load heavy views (Stats, Settings) with React.lazy + Suspense
- Dynamic import for export libraries (jsPDF, xlsx)
- Debounce description input (300ms)
- Memoize expensive calculations (weekly totals, chart data)

### Haptics
- Light haptic on timer start/stop/pause/resume
- Medium haptic on Pomodoro phase transitions
- Success haptic on entry save

### Deep Links
- `worktimer://auth/callback` — OAuth redirect
- `worktimer://timer/start` — quick-start from widget/shortcut

### App Widgets (Optional)
- Android: Home screen widget showing current timer status + quick start/stop
- iOS: Widget extension showing timer status

### Accessibility
- WCAG AA color contrast
- All interactive elements have accessible labels
- Support for Dynamic Type (iOS) and font scaling (Android)
- Minimum touch target: 44x44pt (iOS) / 48x48dp (Android)

## Non-Functional Requirements

- App launch time < 500ms
- App size < 20MB
- Works fully offline
- WCAG AA color contrast compliance
- Minimum touch targets per platform guidelines
- Smooth 60fps animations
- Battery efficient (no unnecessary background wake-ups)
