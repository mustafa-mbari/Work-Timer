# Task Timer - Chrome Extension Development Plan

> **Stack:** React + TypeScript + TailwindCSS + Vite
> **Storage:** chrome.storage.local (offline-first)
> **Target:** Chrome Extension (Manifest V3)

---

## Recent Updates & Bug Fixes

### 2026-02-14 (Code Quality & UX Polish)
- **Week 1 — Constants & Performance:**
  - Extracted `PROJECT_COLORS` to `src/constants/colors.ts` (eliminated duplication across 3 files)
  - Extracted timer constants to `src/constants/timers.ts` (POMODORO_WORK_MS, IDLE_THRESHOLD_MS)
  - Extracted shared CSS classes to `src/constants/styles.ts` (inputClass, labelClass variants)
  - Added `useMemo` to EntryList sort and WeekView days calculation (performance optimization)
  - Added saving states to modal save buttons (prevents double-saves, shows "Saving..." feedback)
  - Added error handling with toast notifications for export failures
  - Fixed silent export failure when no entries exist
- **Week 2 — Architecture Cleanup:**
  - Unified `DEFAULT_SETTINGS` to single source in `storage/index.ts` (eliminates drift risk)
  - Extracted `background/storage.ts` module (~110 lines: timer state, settings, entries CRUD)
  - Extracted `background/ui.ts` module (~140 lines: badge, tab title, broadcasts)
  - Added structured logging utility (`utils/logger.ts`) with timestamped, leveled logging
  - Background.js reduced from 12.76 kB → 12.51 kB
- **Week 3 — UX Polish:**
  - Added reusable `ConfirmDialog` component with danger/warning/info variants
  - Added confirmation before project archive and tag delete (prevents accidental data loss)
  - Added ESC key support to all modals (AddEntryModal, EntryEditModal, ConfirmDialog)
  - Added `errorMessages` utility translating technical errors to user-friendly messages
  - Updated `ErrorBoundary` to use logger and show helpful errors (network, storage, permission)
  - Added reusable `Spinner` component (sm/md/lg) with LoadingOverlay and LoadingState
  - Added loading state to WeekView ("Loading week data..." with spinner)
- **Week 4 — Timer Input Enhancements:**
  - **Fixed:** Project selector now displays color dots in dropdown list (replaced native `<select>` with custom dropdown component)
  - **Added:** Input tabs in TimerView (Description, Work Type, Link) for Stopwatch and Manual modes
    - Tab switching UI below project selector (Description is default)
    - Work Type tab uses existing Tags system with dropdown selector
    - Link tab for attaching URLs to time entries
    - All three fields saved together when timer stops or manual entry is saved
    - Fields cleared after successful save
  - **Enhanced:** Floating timer widget now displays both project name and description
    - Format: `"Project Name • Description"` when both exist
    - Falls back to project only, description only, or "No project" as appropriate
    - Project color applied to text when available

### 2026-02-12 (Entry & Week Enhancements)
- **Added:** Date picker on manual entry mode — save records to any date (defaults to today)
- **Added:** Week tab — `+` button on each day card opens `AddEntryModal` for that date
- **Added:** Week tab — entry pills are now clickable buttons to edit/delete entries via `EntryEditModal`
- **Added:** `AddEntryModal` component — create manual entries with Time Range or Duration, Project, Work Type, Description, and Link fields; supports inline project/tag creation
- **Updated:** Monthly heatmap thresholds — 0h / <2h / <5h / <8h / 8h+ (aligned to standard workday)
- **Updated:** Extension icon — replaced with a clean, simple white-circle/black-clock SVG icon (all 4 sizes regenerated from `public/icons/icon.svg`)

### 2026-02-12 (UI Redesign)
- **Redesigned:** Complete UI overhaul — modern, minimal, professional design
  - **Font:** Inter Variable (via @fontsource-variable/inter) replacing system fonts
  - **Color palette:** Indigo accent (#6366F1) + warm Stone neutrals replacing generic gray/blue
  - **Semantic colors:** Emerald (success), Amber (warning), Rose (danger), Purple (pomodoro)
  - **Dark mode:** Custom surface tokens (dark, dark-card, dark-elevated, dark-border, dark-hover)
  - **Icons:** 18 custom SVG icon components replacing emoji icons in NavBar and throughout
  - **NavBar:** SVG line icons, active indicator pill, better spacing
  - **TimerView:** Larger timer digits, icon+text buttons, subtle colored shadows
  - **Buttons:** Rounded-xl with shadow-sm and icon+label pattern
  - **Inputs:** Indigo focus ring, rounded-xl, better padding
  - **Cards/Entries:** Hover effects, better visual hierarchy, group interactions
  - **Modal:** Backdrop blur, slide-up animation, rounded-2xl sheet
  - **Progress bars:** Taller (8px), semantic color coding
  - **Charts:** Styled tooltip, rounded bars, card containers with borders
  - **Settings:** Icon+text theme buttons, grid layouts, styled keyboard shortcuts
  - **Toast:** Rounded-xl, dark-aware info variant
  - **ErrorBoundary:** Circular error icon, polished CTA
- **Fixed:** Dark mode Tailwind v4 variant — corrected `@variant dark` selector syntax
  - Old block form generated impossible selectors (utility as ancestor of :root)
  - New inline form `(&:is(.dark *, .dark))` generates correct descendant selectors

### 2026-02-12 (Phase 3.1 — Browser Integration)
- **Added:** Toolbar quick actions via right-click context menu on extension icon
  - "Start Timer" / "Stop Timer" toggle (label updates after each click)
  - "Pause Timer" / "Resume Timer" toggle (disabled when idle)
  - `contextMenus` permission added to manifest
- **Added:** Floating mini timer content script (6.8 kB, Shadow DOM isolated)
  - Appears automatically on any page when timer starts
  - Shows elapsed time, project name/color, Pause/Resume and Stop buttons
  - Draggable (mouse drag) with position persisted in `chrome.storage.local`
  - Minimizable to a compact pill showing just elapsed time + status dot
  - Background broadcasts `TIMER_SYNC` to all tabs on timer state change

### 2026-02-12 (Phase 2 — Monthly Heatmap)
- **Added:** Monthly calendar heatmap in Stats view (GitHub-style contribution graph)
  - Month navigation (← →), next disabled at current month
  - Day cells colored by hours logged (indigo intensity scale: 0h → 6h+)
  - Today highlighted with indigo ring
  - Tooltip: date + duration on hover
  - Color legend row at bottom
  - Correct Mon-based weekday alignment

### 2026-02-12
- **Added:** Full dark/light theme system with automatic system preference detection
  - Theme toggle in Settings (Light, Dark, System)
  - Smooth theme transitions across all views
  - All components updated with dark mode support
- **Added:** Timer in tab title feature
  - Active tab title shows running timer (e.g., `[01:23:45] Page Title`)
  - Automatically restores original titles when timer stops
  - Works across all accessible browser tabs

### 2024-02-12
- **Fixed:** Recharts dimension error in StatsView - Added explicit `minHeight`/`minWidth` props to `ResponsiveContainer` components to prevent "-1 width/height" errors on popup load
- **Fixed:** Continue button functionality - Updated timer logic to properly resume existing entries with accurate time tracking:
  - Timer now shows continued time (e.g., if entry stopped at 55:00, continuing shows 55:01, 55:02...)
  - Maintains exact from-to times (original startTime preserved, only endTime and duration updated)
  - Single entry updated instead of creating duplicate entries

---

## Phase 1 — MVP (Core Timer & Tracking)

### 1.1 Project Setup & Scaffolding ✅

- [x] Initialize Vite + React + TypeScript project
- [x] Configure TailwindCSS
- [x] Set up Manifest V3 (`manifest.json`) with required permissions (`storage`, `alarms`, `notifications`)
- [x] Set up Chrome extension folder structure
- [x] Configure Vite build for Chrome extension output (popup, background service worker)
- [x] Create extension icons (16, 32, 48, 128px)
- [x] Set up ESLint (included via Vite template)
- [ ] Verify extension loads in `chrome://extensions` with dev build

### 1.2 Data Layer & Storage ✅

- [x] Define TypeScript interfaces (`TimeEntry`, `Project`, `Settings`, `TimerState`)
- [x] Build `storage` abstraction over `chrome.storage.local`
- [x] Add ID generation utility (nanoid)
- [x] Add date/time utility helpers (date-fns)

### 1.3 Timer Engine (Background Service Worker) ✅

- [x] Create background service worker (`background.ts`)
- [x] Implement timer state management (start, pause, resume, stop)
- [x] Persist running timer state in `chrome.storage.local`
- [x] Use `chrome.alarms` to keep timer alive in MV3
- [x] Set up message passing between popup ↔ background
- [x] Update badge text with running time

### 1.4 Popup UI — Timer View (Default Screen) ✅

- [x] Create popup entry point (`popup.html` + `popup/index.tsx`)
- [x] Build Timer View layout (time display, buttons, project selector, description)
- [x] Stopwatch mode (start/pause/resume/stop)
- [x] Manual mode (from/to time pickers, save)
- [x] Visual indicator when timer is running (pulsing dot)
- [x] Connect popup to background via message passing

### 1.5 Popup UI — Today's Records ✅

- [x] Build Today's Entries List below the timer
- [x] Edit entry (modal with time, project, description)
- [x] Delete entry (with confirmation)
- [x] Total hours for today

### 1.6 Projects Management ✅

- [x] Projects section in Settings view (list, create, archive, restore)
- [x] Project selector component (reusable dropdown with color dots)
- [x] Seed with "Default" project on first install
- [x] Color picker for new projects

### 1.7 Weekly View ✅

- [x] Build Week View screen (day rows, entries, totals)
- [x] Week navigation (previous/current/next)
- [x] Weekly total bar
- [x] Today highlighting
- [x] Working days configurable in settings

### 1.8 Basic Statistics ✅

- [x] Summary cards (today, weekly total, daily average)
- [x] Weekly bar chart (Recharts)
- [x] Per-project pie/donut chart for today

### 1.9 Navigation & Layout ✅

- [x] Bottom tab bar (Timer, Week, Stats, Settings)
- [x] Settings screen (working days, week start day)
- [x] View switching

### 1.10 Polish & Testing

- [ ] Test full flow: start timer → stop → entry appears → edit → delete
- [ ] Test manual entry flow
- [ ] Test popup close & reopen (timer persists)
- [ ] Test browser restart (timer state recovery)
- [ ] Verify < 200ms popup load time
- [ ] Verify extension size < 5MB
- [ ] Cross-check all data persists correctly in `chrome.storage.local`
- [ ] Fix visual/layout bugs

### 1.11 Error Handling ✅

- [x] Global error boundary (React `ErrorBoundary` component)
- [x] User-friendly error messages (Toast/snackbar notification system with `useToast` hook)
- [x] Retry mechanism for failed storage operations (3 attempts, exponential backoff)
- [ ] Offline mode indicator (show when storage is unavailable)
- [x] Storage quota exceeded handling (dispatches event → error toast)
- [x] Invalid data recovery (corrupted entries/projects silently filtered on read)
- [ ] Error reporting (optional: Sentry integration)

### 1.12 Accessibility (Ongoing) ✅

- [x] ARIA labels on all interactive elements (buttons, inputs, dropdowns)
- [x] Keyboard navigation support across all views
- [x] Focus management (modal click-outside-to-close, focus trapping)
- [ ] Screen reader testing (NVDA / VoiceOver)
- [x] Color contrast compliance (WCAG AA minimum)
- [x] Reduced motion mode (respect `prefers-reduced-motion`)
- [x] Visible focus indicators on all focusable elements (focus:ring-2 throughout)

> **Note:** Accessibility is a cross-cutting concern. Every new feature in Phase 2–4 must follow these standards. Review accessibility checklist before marking any section complete.

---

## Phase 2 — Enhanced Features ✅

### 2.1 Idle Detection ✅

- [x] Request `idle` permission in manifest
- [x] Use `chrome.idle.onStateChanged` to detect idle/active/locked states
- [x] Configure idle threshold (default: 5 minutes, configurable in settings)
- [x] When idle detected while timer is running: notification + keep/discard options in popup
- [x] Add idle timeout setting to Settings screen

### 2.2 Pomodoro Timer ✅

- [x] Add Pomodoro as third timer mode (Stopwatch / Manual / Pomodoro)
- [x] Pomodoro controls: start, skip phase, stop
- [x] Default intervals: 25/5/15 with configurable settings
- [x] Chrome notifications for phase transitions (with sound toggle)
- [x] Visual progress ring showing time remaining
- [x] Session counter and total focus time display
- [x] Each completed pomodoro auto-creates a `TimeEntry` with `type: "pomodoro"`

### 2.3 Goals & Targets ✅

- [x] Daily & weekly target hours in Settings (number inputs)
- [x] Daily progress bar in Timer view (`GoalProgress` component)
- [x] Weekly progress bar in Week view
- [x] Color coding: green (on track), amber (behind), red (far behind)

### 2.4 Advanced Statistics & Charts ✅

- [x] Summary cards (today, weekly total, daily average)
- [x] Weekly bar chart (Recharts)
- [x] Per-project donut chart for today
- [x] Monthly overview / calendar heatmap (GitHub-style, month navigation, today highlight)
- [ ] Project-level reports (future)

### 2.5 Export ✅

- [x] **CSV Export** with proper escaping
- [x] **Excel Export** with auto-sized columns (SheetJS/xlsx)
- [x] Export from Week view and Statistics view
- [ ] PDF Export (future)
- [ ] Date range picker for export (future)

---

## Phase 3 — Smart Features

### 3.2 Smart Reminders

- [ ] **No time logged reminder:**
  - If no entry logged by configurable time (e.g., 10:00 AM), show notification
  - "You haven't logged any time today. Start tracking?"
  - Action buttons: Start Timer / Dismiss / Snooze
- [ ] **Break reminders:**
  - After X continuous minutes of work, remind to take a break
  - Configurable interval (default: 60 min)
  - "You've been working for 1 hour. Take a break!"
- [ ] **End-of-day reminder:**
  - Configurable time (e.g., 6:00 PM)
  - "Time to wrap up! You logged X hours today."
- [ ] Reminder settings panel in Settings view
- [ ] Do Not Disturb mode (suppress all reminders)

### 3.3 Auto Categorization

- [ ] **URL-based project suggestion:**
  - Track which URLs are visited while working on each project
  - Build simple URL → Project mapping rules (user-configurable)
  - When starting timer, suggest project based on current tab URL/domain
- [ ] **Title-based suggestion:**
  - Use tab title keywords to suggest project
- [ ] **Rule management UI:**
  - List of rules: URL pattern → Project
  - Add/edit/delete rules
  - Example: `github.com/org/repo*` → Project "Work"
- [ ] Suggestions appear as a chip in the timer view (click to accept)

### 3.1 Browser Integration

- [x] **Timer in tab title:**
  - Use `chrome.tabs` and `chrome.scripting` API to update active tab title
  - Format: `[01:23:45] Original Tab Title`
  - Automatically restores original title when timer stops
- [x] **Floating mini timer:**
  - Shadow DOM content script injected on all pages
  - Shows: elapsed time, project name/color, Pause/Resume + Stop buttons
  - Click drag-handle to toggle mini pill / full mode
  - × button dismisses widget (persisted; clears on next timer start)
  - Position persists across page loads (chrome.storage.local)
  - Viewport boundary clamping (both axes, respects widget dimensions)
  - Only visible in the active tab (Page Visibility API + chrome.tabs.onActivated)
  - Theme-aware: follows extension light/dark theme setting
  - Auto-show on timer start configurable in Settings → Floating Widget
- [x] **Toolbar quick actions:**
  - Right-click context menu on extension icon
  - Start Timer / Stop Timer (toggles)
  - Pause Timer / Resume Timer (disabled when idle)
  - Show Floating Widget (enabled when timer is active)

### 3.4 Keyboard Shortcuts ✅

- [x] Define Chrome extension keyboard shortcuts in manifest:
  - `Alt+Shift+S` → Start/stop timer
  - `Alt+Shift+P` → Pause/resume
  - `Alt+Shift+T` → Open popup
- [x] Show shortcut hints in Settings view
- [x] Add shortcut hints to Timer view buttons (title tooltips)
- [ ] Customizable shortcuts in Settings (future: requires chrome.commands.update API)

### 3.5 Dark/Light Theme ✅

- [x] Full theme system (not just basic toggle):
  - Light theme (default)
  - Dark theme
  - System preference auto-detect
- [x] TailwindCSS dark mode classes throughout all views
- [x] Smooth theme transition animation (200ms ease-in-out)
- [x] Persist theme preference

### 3.8 UI Redesign ✅

- [x] Inter Variable font (bundled via @fontsource-variable/inter)
- [x] Indigo accent color palette with warm Stone neutrals
- [x] Custom SVG icon system (19 icons in `Icons.tsx`)
- [x] Redesigned all 14 components with modern styling
- [x] Custom dark mode surface tokens for crafted dark experience
- [x] Consistent design system: rounded-xl cards, shadow-sm buttons, 8px grid
- [x] Fixed Tailwind v4 `@variant dark` selector generation
- [x] Entry cards always-visible background (border + bg-white/dark-card)
- [x] Continue button always visible on entry cards (was hover-only)

### 3.9 Entry Enhancements ✅

- [x] **Link field on entries:** optional URL per entry, stored in `TimeEntry.link`
  - Clickable link button on entry card (opens in new tab via `chrome.tabs.create`)
  - URL input in Edit Entry modal
- [x] **Work Type (Tag) field on entries:** global tag list, single-select per entry
  - `Tag { id, name }` entity stored in `chrome.storage.local`
  - `useTags` hook with create / update / remove
  - Tags stored as ID array in `TimeEntry.tags`
  - Selector in Edit Entry modal with inline "+ Add" form
- [x] **Inline project creation** from Edit Entry modal (auto-assigned color)

### 3.11 Manual Entry Date & Week Enhancements ✅

- [x] Date picker on manual entry form (default today, any past/future date selectable)
- [x] Week view: `+` button per day card to add a manual entry for that specific date
- [x] Week view: clickable entry pills to open full edit modal (edit times, project, work type, description, link, delete)
- [x] `AddEntryModal` — standalone create modal with Time Range / Duration, Project (+ inline create), Work Type (+ inline create), Description, Link fields
- [x] Monthly heatmap bands updated to 0h / <2h / <5h / <8h / 8h+
- [x] Extension icon replaced with clean SVG (white circle, black clock hands, all 4 PNG sizes)

### 3.10 Settings Improvements ✅

- [x] **Tabbed Settings layout** (General / Timer / Data) with sticky tab bar
- [x] **Project editing** in Settings → Data: rename + change color inline
- [x] **Work Types management** in Settings → Data: add / rename / delete

### 3.6 Rich Notes

- [ ] Add rich text notes to time entries (multi-line description field)
- [ ] Markdown support for formatting (bold, lists, code blocks)
- [x] Attach links to entries (clickable URLs in notes)
- [ ] Search within notes (full-text search across all entry descriptions)

### 3.7 Internationalization (i18n)

- [ ] Set up `react-i18next` with namespace-based translation files
- [ ] Initial language support: English, Arabic
- [ ] RTL layout support for Arabic (CSS logical properties + `dir="rtl"`)
- [ ] Language switcher in Settings
- [ ] Localized date/time formats (per locale)
- [ ] Translated notification messages and error strings

---

## Phase 4 — Cloud Sync

### 4.1 Cloud Sync

- [ ] Choose backend: Firebase / Supabase
- [ ] User authentication:
  - Email/password sign-up
  - Google OAuth sign-in
- [ ] Sync engine:
  - Sync `TimeEntry`, `Project`, `Settings` to cloud
  - Conflict resolution (last-write-wins or merge strategy)
  - Offline queue: changes made offline sync when connection restores
- [ ] Multi-device support:
  - Same account on multiple browsers/devices
  - Real-time sync across devices
- [ ] Account management UI:
  - Sign in / Sign up / Sign out
  - Sync status indicator
  - "Last synced" timestamp
- [ ] Data migration: local-only → cloud-synced (one-time import)

---

## Task Dependencies & Suggested Order

```
Phase 1 (build sequentially):
  1.1 Setup → 1.2 Data Layer → 1.3 Timer Engine → 1.4 Timer UI
  → 1.5 Today's Records → 1.6 Projects → 1.7 Week View
  → 1.8 Statistics → 1.9 Navigation → 1.10 Polish
  → 1.11 Error Handling → 1.12 Accessibility (ongoing through all phases)

Phase 2 (can be parallel after Phase 1):
  2.1 Idle Detection  ──┐
  2.2 Pomodoro Timer  ──┤── independent, can be done in any order
  2.3 Goals & Targets ──┤
  2.4 Charts          ──┘
  2.5 Export (depends on 2.4 for PDF charts)

Phase 3 (can be parallel after Phase 1):
  3.1 Browser Integration ──┐
  3.2 Smart Reminders     ──┤
  3.3 Auto Categorization ──┤── independent
  3.4 Keyboard Shortcuts  ──┤
  3.5 Theme System        ──┤
  3.6 Rich Notes          ──┤
  3.7 Internationalization──┘ (RTL depends on 3.5 Theme System)

Phase 4:
  4.1 Cloud Sync

Documentation: ongoing throughout all phases
```

---

## Key Technical Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Framework | React 18+ | Rich ecosystem, component model fits extension UI |
| Language | TypeScript | Type safety for complex state management |
| Styling | TailwindCSS | Utility-first, small bundle, fast iteration |
| Build | Vite | Fast builds, HMR for dev, clean config |
| Charts | Recharts | React-native, composable, lightweight |
| Storage | chrome.storage.local | Offline-first, no backend needed for MVP |
| State | React Context + useReducer | Simple enough for popup scope, no Redux overhead |
| IDs | nanoid | Compact, fast, collision-resistant |
| Dates | date-fns | Tree-shakeable, lightweight date utilities |
| Manifest | V3 | Required for new Chrome extensions |
| i18n | react-i18next | Industry standard, supports RTL, namespaces |

---

## Documentation (Ongoing)

- [ ] `README.md` with setup instructions, dev workflow, and build steps
- [ ] `CONTRIBUTING.md` with coding standards, PR process, branch naming
- [ ] API documentation for storage layer (inline TSDoc + generated docs)
- [ ] User guide (in-app help tooltips or external page)
- [ ] Video tutorials for complex features (Pomodoro, exports, integrations)
- [ ] FAQ section (common issues and solutions)
- [ ] `CHANGELOG.md` (keep updated with every release, follow Keep a Changelog format)
