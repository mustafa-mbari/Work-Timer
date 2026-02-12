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
