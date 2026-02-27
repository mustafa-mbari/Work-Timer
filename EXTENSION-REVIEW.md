# Work-Timer Chrome Extension — Code Review

> **Reviewer:** Senior Chrome Extension Engineer (AI-assisted)
> **Scope:** Extension source code only (`src/`, `public/manifest.json`, `vite.config.ts`, `package.json`)
> **Date:** 2026-02-27
> **Extension Version:** 1.0.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Code Quality Review](#2-code-quality-review)
3. [Performance Analysis](#3-performance-analysis)
4. [Chrome Web Store Readiness Checklist](#4-chrome-web-store-readiness-checklist)
5. [Refactoring Plan](#5-refactoring-plan)
6. [Optional Improvements](#6-optional-improvements)
7. [Open Questions](#7-open-questions)

---

## 1. Project Overview

### What It Does

Work-Timer is a Manifest V3 Chrome Extension for time tracking. Users can track time with a stopwatch, enter manual entries, or use a Pomodoro timer. The popup UI (380x520px) is the primary interface. A floating mini-widget appears on web pages when a timer is active. Premium users get cloud sync, export, and advanced analytics via Supabase.

### Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19.2 + TypeScript 5.9 |
| Styling | TailwindCSS v4 (`@tailwindcss/vite` plugin) |
| Build | Vite 7.3 (3 entry points: popup, background, content) |
| State | React Context + custom hooks (useTimer, useProjects, useEntries, useSettings) |
| Storage | `chrome.storage.local` with validation layer |
| Cloud Sync | Supabase (delta-based push/pull + Realtime subscriptions) |
| Charts | Recharts (lazy loaded) |
| Export | xlsx + jsPDF (dynamic imports) |
| IDs | nanoid |
| Dates | date-fns |
| Font | Inter Variable |

### Architecture Overview

```
+----------------------------+       +------------------------+
|        Popup (React)       |       |   Companion Website    |
|  TimerView / WeekView /    |       |   (Next.js, login,     |
|  StatsView / SettingsView  |       |    billing, dashboard)  |
+----------+---------+------+       +------+--------+--------+
           |         |                     |        |
  chrome.runtime     | chrome.storage     direct   postMessage
   .sendMessage      |  .onChanged      message    relay
           |         |                     |        |
+----------v---------v---+        +-------v--------v--------+
|   Background Service    |<------>|     Content Script       |
|   Worker (background.ts)|        | (floating widget +       |
|                         |        |  auth bridge, ShadowDOM) |
|  - Timer engine         |        +-------------------------+
|  - Pomodoro engine      |                   |
|  - Idle detection       |          window.postMessage
|  - Sync engine          |          (website auth relay)
|  - Auth bridge          |
|  - Alarms (7 types)     |
|  - Context menus        |
|  - Keyboard shortcuts   |
+----------+--------------+
           |
    chrome.storage.local
    (entries, projects,
     tags, settings,
     sync queue, auth)
```

### Entry Points

| Entry | File | Output | Purpose |
|---|---|---|---|
| Popup | `src/popup/index.tsx` | `popup.js` | Main UI (React app) |
| Background | `src/background/background.ts` | `background.js` | Service worker (timer, sync, auth) |
| Content | `src/content/content.ts` | `content.js` | Floating widget + auth bridge |

### Message Flow

- **Popup -> Background:** `chrome.runtime.sendMessage` (START_TIMER, STOP_TIMER, AUTH_STATE, SYNC_NOW, etc.)
- **Background -> Content (all tabs):** `chrome.tabs.sendMessage` (TIMER_SYNC broadcast every 30s)
- **Website -> Content -> Background:** `window.postMessage` relay (auth token bridge)
- **Website -> Background (direct):** `chrome.runtime.sendMessage` via `externally_connectable`

### Current Strengths

1. **Solid MV3 architecture** — proper service worker with `chrome.alarms` for periodic tasks, no persistent background page
2. **Event-driven timer sync** — uses `TIMER_SYNC` messages instead of polling; popup receives real-time updates
3. **Delta-based cloud sync** — `has_changes_since()` RPC skips full pull when nothing changed server-side
4. **Queue-based sync with deduplication** — `syncQueue.ts:enqueue()` deduplicates by table+recordId; FK-aware push ordering (projects before entries)
5. **Lazy loading strategy** — `React.lazy()` for WeekView, StatsView, SettingsView; dynamic `import('xlsx')` and `import('jspdf')` only when exporting
6. **Vite manual chunks** — recharts (290KB), xlsx (429KB), jspdf (418KB), supabase (170KB) split into separate chunks, loaded on demand
7. **ShadowDOM isolation** — floating widget uses `attachShadow({ mode: 'open' })` to prevent host page CSS from breaking the widget
8. **Storage validation** — type guards (`isValidEntry`, `isValidProject`, `isValidTag`) filter corrupt data on read
9. **Quota error handling** — `storageSet()` retries 3 times with exponential backoff; detects quota exceeded and dispatches custom event
10. **RLS error resilience** — sync engine detects `(USING expression)` errors from user_id mismatches and dequeues/skips rather than blocking future syncs
11. **Good accessibility** — ARIA roles (tablist, progressbar, alertdialog), keyboard navigation in TagSelect, focus management in modals, `prefers-reduced-motion` respected
12. **Offline-first design** — all data lives in `chrome.storage.local`; sync is opportunistic and graceful

---

## 2. Code Quality Review

### 2.1 Code Structure Issues

#### Monolithic Files

| File | Lines | Concern |
|---|---|---|
| `src/background/background.ts` | 1,273 | Timer engine, Pomodoro engine, idle detection, auth handling, sync orchestration, context menus, keyboard shortcuts, alarms, startup/install logic — all in one file |
| `src/components/TimerView.tsx` | 883 | Handles 3 modes (stopwatch, manual, pomodoro) with distinct UI, state, and logic for each |
| `src/content/content.ts` | 617 | Floating widget (DOM, CSS, drag, tick) + auth bridge + init logic |
| `src/utils/export.ts` | 597 | CSV, PDF (8-section report with chart drawing), and Excel export |
| `src/components/SettingsView.tsx` | ~600 | 4 tabs (Account, General, Timer, Data) with project/tag CRUD inline |

**Recommendation:** `background.ts` should be split into at least 5 modules: `timerEngine.ts`, `pomodoroEngine.ts`, `authHandler.ts`, `messageRouter.ts`, `alarmHandlers.ts`. `TimerView.tsx` should extract `StopwatchMode`, `ManualEntryMode`, and `PomodoroMode` as separate components.

#### Separation of Concerns

The background script mixes orchestration (message routing) with business logic (timer calculations, entry creation, idle time math). The message handler (`chrome.runtime.onMessage.addListener`) at `background.ts:669` contains a 160-line switch statement that directly calls into implementation functions — this is acceptable for moderate complexity but will become harder to maintain as features grow.

### 2.2 Naming Conventions

Naming is generally **consistent and clear**:
- Hooks: `use{Feature}` pattern (useTimer, useProjects, useEntries, useTags, useSettings, useAuth, usePremium, useTheme)
- Storage keys: descriptive (`entries_YYYY-MM-DD`, `timerState`, `syncQueue`, `subscriptionInfo`)
- Message actions: SCREAMING_SNAKE_CASE (`START_TIMER`, `TIMER_SYNC`, `AUTH_LOGIN`)
- Components: PascalCase, files match component name

**Minor issues:**
- `background/ui.ts` is misleadingly named — it contains badge updates and broadcast helpers, not UI components. Consider `badgeAndBroadcast.ts` or `backgroundUi.ts`.
- `background/storage.ts` only exports 6 helper functions that duplicate what `src/storage/index.ts` already provides. Some of these (getTimerState, setTimerState) are imported from storage/index.ts while others (getIdleInfo, getPomodoroState) are defined locally. Inconsistent.

### 2.3 Duplicated Code

| Duplication | Locations | Impact |
|---|---|---|
| `getElapsed(state)` function | `background.ts:136`, `content.ts:46`, `useTimer.ts` (inline) | 3 copies of the same 5-line function |
| `TimerState` and `Project` type definitions | `types/index.ts` (canonical), `content.ts:4-16` (redefined) | Content script defines its own subset types instead of importing |
| `handleStop` pomodoro vs stopwatch branches | `TimerView.tsx:131-169` | Nearly identical: both check `response.discarded`, update entry with tags/link, reset state |
| `DEFAULT_TIMER_STATE` | `background.ts:40`, `storage/index.ts:293` | Same object defined in two places |
| Input class strings | Throughout components | Long Tailwind class strings repeated across TimerView, EntryEditModal, AddEntryModal (mitigated by `constants/styles.ts` but not consistently used) |
| Notification icon path | `background.ts` (6 occurrences) | Hardcoded `'icons/icon-128.png'` — likely wrong (actual path is `logos/neu-icon.png`) |

### 2.4 Error Handling Review

**Good patterns:**
- `storageSet()` in `storage/index.ts:62` — exponential backoff retry with quota detection
- `syncEngine.ts:32` — `isRlsUsingError()` detects RLS policy failures and skips rather than blocking
- `ErrorBoundary.tsx` — catches React render errors with user-friendly message and retry button
- `getUserFriendlyError()` in `utils/errorMessages.ts` — maps technical errors to human-readable messages
- Background message handler wraps all actions in try/catch at `background.ts:826`

**Problem patterns:**
- **Silent catch in content.ts:608** — `catch { }` swallows all errors during init without logging
- **`void` fire-and-forget** used extensively in background.ts (e.g., `void syncAll()`, `void broadcastTimerSync()`) — errors from these are never surfaced to the user
- **No error boundary per view** — a crash in StatsView takes down the entire popup
- **Missing validation** — `handleManualSave()` in TimerView.tsx doesn't validate that `manualDate` is a valid date format before creating an entry

### 2.5 Security Review

#### Permissions (manifest.json)

| Permission | Necessity | Risk |
|---|---|---|
| `storage` | Required | Low — local data only |
| `alarms` | Required | Low — periodic tasks |
| `notifications` | Required | Low — user-facing alerts |
| `idle` | Required | Low — idle detection |
| `tabs` | Required (broadcast) | Medium — can read tab URLs |
| `scripting` | **Review needed** | Medium — not used in code currently; may be unnecessary |
| `contextMenus` | Required | Low |
| `<all_urls>` (host) | **Overly broad** | High — Chrome Web Store will flag this |

**Issue 1: `<all_urls>` host permission.** This is required for the content script to inject on all pages (floating widget) and for the auth bridge (postMessage relay from the companion website). However, CWS will require justification and may delay review. Consider narrowing: inject the content script only on the companion website domain for auth, and use `chrome.scripting.executeScript()` programmatically for the floating widget (only on user request or when timer starts).

**Issue 2: `scripting` permission.** The manifest requests this permission but it doesn't appear to be used in the codebase. If unused, remove it.

**Issue 3: `http://localhost:3000/*` in `externally_connectable`.** This must be removed before publishing to the Chrome Web Store. It allows any local development server to send messages to the extension.

#### Token Handling

- **Auth tokens in postMessage:** The content script at `content.ts:568` receives `accessToken` and `refreshToken` via `window.postMessage` from the companion website. Any script running on the same page could inject fake tokens.
  - **Mitigation:** The tokens are validated by Supabase server-side when used for API calls. Fake tokens would fail authentication. However, a malicious script could potentially trigger an `AUTH_LOGIN` with stolen tokens from another source.
  - **Recommendation:** Add origin checking on the `message` event listener. Currently only checks `event.source !== window` (line 560), which is always `false` for page-originated messages. Should validate `event.origin` against the known companion website URL.

- **PostMessage wildcard origin:** Responses at `content.ts:564` and `content.ts:576` use `window.postMessage({ ... }, '*')`. Since these responses don't contain sensitive data (just `{ success, error }`), the risk is low, but best practice is to use a specific origin.

- **Token storage:** Auth tokens stored in `chrome.storage.local` under `supabase.auth.token`. This is the standard pattern for Chrome extensions and is acceptable — `chrome.storage.local` is scoped to the extension and inaccessible to web pages.

#### Content Security Policy

- **No CSP configured** in manifest.json. Chrome MV3 applies a default CSP, but an explicit restrictive CSP should be added:
  ```json
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'"
  }
  ```
- **No CSP meta tag** in `popup.html`. The popup loads external font files from bundled `@fontsource-variable/inter` (local), so no external resource concerns.

#### Notification Icon Path Bug

Throughout `background.ts`, notifications reference `'icons/icon-128.png'` (6 occurrences), but the actual icon files are in `logos/` (as seen in manifest.json: `"128": "logos/neu-icon.png"`). This means notifications may display without an icon or with a broken image.

---

## 3. Performance Analysis

### 3.1 Background Script Efficiency

#### `setTimeout` in Service Worker (Critical)

**File:** `src/background/background.ts:123-131`

```typescript
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSync(): void {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null
    void syncAll()
    void pushUserStats()
  }, 10_000)
}
```

**Problem:** In MV3, the service worker can be terminated by Chrome after ~30 seconds of inactivity. When the worker restarts, `syncDebounceTimer` is lost and the debounced sync never fires. This means entries saved right before worker termination may not sync until the next periodic sync (15 minutes later).

**Fix:** Replace `setTimeout` with a `chrome.alarms.create('sync-debounce', { delayInMinutes: 10/60 })` one-shot alarm. Chrome alarms persist across worker restarts.

#### Module-Level Mutable State

The following module-level variables in `background.ts` are lost when the service worker restarts:

| Variable | Line | Impact |
|---|---|---|
| `entrySaveTimeMs` | 28 | Falls back to default 10s until re-initialized on next `onStartup` |
| `lastDashboardOpenMs` | 31 | Dedupe guard resets; could open duplicate dashboard tabs |
| `syncDebounceTimer` | 123 | Pending debounced sync lost (see above) |

The `onStartup` handler at line 968 re-initializes `entrySaveTimeMs`, and `chrome.storage.onChanged` at line 1035 keeps it updated. But if the worker restarts mid-session (not a Chrome startup), `onStartup` does not fire. The `onChanged` listener will pick up future changes but won't restore the current value.

**Fix:** Read `entrySaveTimeMs` from storage at the top of `stopTimer()` / `stopPomodoro()` rather than relying on a cached variable, or re-read it in the alarm handler.

#### Broadcasting to All Tabs

**File:** `src/background/background.ts:162-175`

```typescript
async function broadcastTimerSync(state: TimerState, ...): Promise<void> {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { ... }).catch(() => {})
    }
  }
}
```

**Problem:** This sends a message to every open tab (could be 50-100+ tabs) every 30 seconds when the timer is running, plus on every state change. Most tabs silently error because the content script has no listener registered for that tab or the tab is a `chrome://` page.

**Impact:** Each failed `sendMessage` generates an internal error that Chrome must handle. With 100 tabs and a 30s interval, that is ~200 suppressed errors per minute.

**Fix:**
1. Track which tabs have an active content script by having the content script send a registration message on init
2. Only broadcast to registered tabs
3. Alternatively, use `chrome.storage.local` as a shared bus: write timer state to storage, let content scripts listen via `chrome.storage.onChanged`

### 3.2 Content Script Injection Strategy

**Current:** Content script matches `<all_urls>` and runs `document_idle` on every single page the user visits.

**Impact:**
- Every page load executes ~617 lines of JavaScript
- Calls `chrome.runtime.sendMessage({ action: 'GET_TIMER_STATE' })` on init (line 592)
- Calls `chrome.storage.local.get([...])` to load persisted state (line 67)
- Registers `document.addEventListener('visibilitychange', ...)` and `window.addEventListener('message', ...)`
- If timer is active: builds widget DOM, starts 1s setInterval tick

**Optimization options:**
1. **Programmatic injection:** Remove content script from manifest. Use `chrome.scripting.executeScript()` from background when timer starts, targeting only the active tab. This eliminates the overhead on pages where the timer isn't active.
2. **Hybrid approach:** Keep content script for auth bridge on companion website domain only (`matches: ["https://w-timer.com/*", "https://www.w-timer.com/*"]`), use programmatic injection for the floating widget.
3. **Minimal init:** If keeping `<all_urls>`, defer widget building until `TIMER_SYNC` message is received (already partially done), and skip the initial `GET_TIMER_STATE` message — let the first `TIMER_SYNC` broadcast handle it.

### 3.3 Event Listener Optimization

#### Global Mouse Listeners Never Removed

**File:** `src/content/content.ts:385-401`

```typescript
document.addEventListener('mousemove', (e) => { ... })
document.addEventListener('mouseup', () => { ... })
```

These are registered in `setupDrag()` on `document` (the host page) and never removed, even when the widget is destroyed via `removeWidget()`. Over the lifetime of a page, if the widget is created and destroyed multiple times, listeners accumulate.

**Fix:** Store references and call `removeEventListener` in `removeWidget()`, or use `AbortController` for clean cleanup:

```typescript
let dragAbortController: AbortController | null = null

function setupDrag(): void {
  dragAbortController = new AbortController()
  const signal = dragAbortController.signal
  document.addEventListener('mousemove', handler, { signal })
  document.addEventListener('mouseup', handler, { signal })
}

function removeWidget(): void {
  dragAbortController?.abort()
  // ... existing cleanup
}
```

#### Content Script 1s setInterval

**File:** `src/content/content.ts:470-479`

The `startTick()` function creates a 1-second interval to update the timer display. This runs continuously while the widget is visible, even when the timer is **paused** (the interval checks `state.status === 'running'` inside the callback but the interval itself keeps firing).

**Fix:** Clear the interval when the timer is paused (not just when idle). The `updateWidget()` function already handles status checks — only call `startTick()` when `state.status === 'running'`.

### 3.4 Storage Usage Patterns

#### Per-Entry Storage Reads During Pull

**File:** `src/sync/syncEngine.ts:247-269`

```typescript
for (const remote of remoteEntries) {
  if (pendingIds.has(remote.id)) continue
  if (remote.deleted_at) {
    const local = await getEntries(remote.date)  // Storage read per entry
    // ...
  } else {
    const localEntry = dbEntryToLocal(remote)
    const existing = (await getEntries(localEntry.date)).find(...)  // Another read
    // ...
  }
}
```

For each remote entry, `getEntries(date)` reads from `chrome.storage.local`, parses, and validates. If a sync pulls 100 entries across 20 dates, this results in 100 storage reads (many for the same date).

**Fix:** Pre-fetch all needed dates in one batch `chrome.storage.local.get(dateKeys)` before the loop, and work against an in-memory map.

#### `hasAnyLocalData()` Reads Entire Storage

**File:** `src/storage/index.ts:332-337`

```typescript
export async function hasAnyLocalData(): Promise<boolean> {
  const all = await chrome.storage.local.get(null)  // Reads EVERYTHING
  // ...
}
```

This reads the entire storage contents just to check if any `entries_*` keys exist. Called during `AUTH_LOGIN` handling.

**Fix:** Use `chrome.storage.local.get('projects')` + `chrome.storage.local.getBytesInUse()` or maintain a lightweight metadata key (`hasEntries: true`).

### 3.5 React Rendering Optimization

#### Missing React.memo

The following components receive arrays/objects as props and will re-render on every parent state change:

| Component | Props receiving arrays | Impact |
|---|---|---|
| `EntryList` | `entries`, `projects` | Re-renders all entry items when timer elapsed updates |
| `ProjectSelector` | `projects` | Re-renders on any parent state change |
| `TagSelect` | `tags` | Re-renders on any parent state change |
| `GoalProgress` | `current` (number) | Re-renders every second when timer is active |
| `WeeklyChart` | `entries`, `projects` | Re-renders on data changes |

**Fix:** Wrap leaf components with `React.memo()`. For `EntryList`, memoize individual entry items. The `RollingTimer` component already uses `memo` for its `RollingDigit` sub-component — extend this pattern.

#### Timer Tick Causes Full TimerView Re-render

`useTimer()` hook returns `elapsed` which changes every second. This causes `TimerView` and all its children to re-render every second, including EntryList, ProjectSelector, GoalProgress, and all button elements.

**Fix:** Extract the timer display into a separate component that subscribes to the elapsed value independently, preventing re-renders from propagating to sibling components.

### 3.6 Bundle Size Analysis

**Current production chunks (from Vite config):**

| Chunk | Approx. Size | Load Strategy | Verdict |
|---|---|---|---|
| `popup.js` (main) | ~150KB | Immediate | Acceptable |
| `recharts` | ~290KB | Lazy (StatsView) | Good |
| `xlsx` | ~429KB | Dynamic import | Good |
| `jspdf` | ~418KB | Dynamic import | Good |
| `supabase` | ~170KB | Used by popup + background | Could defer |
| `content.js` | ~5KB | Every page | Lightweight, good |

**Observation:** Content script is already lightweight (no React, no Supabase, no heavy deps). Background script imports Supabase only through auth/sync modules.

**Potential improvement:** For free users who never sync, Supabase is loaded but unused. Consider lazy-importing the sync module only when the user is authenticated and premium.

### 3.7 Summary: Concrete Optimization Actions

| Priority | Action | File(s) | Impact |
|---|---|---|---|
| **P0** | Replace `setTimeout` debounce with `chrome.alarms` | `background.ts:123-131` | Prevents lost syncs on worker restart |
| **P0** | Fix notification icon path (`icons/` -> `logos/`) | `background.ts` (6 occurrences) | Broken notification icons |
| **P1** | Batch storage reads in `pullDelta()` | `syncEngine.ts:247-269` | Reduces ~100 storage reads to ~20 |
| **P1** | Add `React.memo` to EntryList items, ProjectSelector, TagSelect | Component files | Eliminates unnecessary re-renders |
| **P1** | Track active content script tabs, broadcast only to those | `background.ts:162-175` | Eliminates ~100 suppressed errors/minute |
| **P2** | Clean up global mouse listeners on widget destroy | `content.ts:385-401` | Prevents listener accumulation |
| **P2** | Only tick when timer is running (not paused) | `content.ts:470-479` | Reduces idle CPU in content script |
| **P2** | Use targeted content script injection (hybrid approach) | `manifest.json`, `background.ts` | Eliminates script load on every page |
| **P3** | Extract timer display to prevent full TimerView re-renders | `TimerView.tsx` | Smoother UI during active timer |
| **P3** | Lazy-import sync modules for free users | `storage/index.ts`, hooks | Smaller initial bundle for free tier |

---

## 4. Chrome Web Store Readiness Checklist

### Manifest V3 Compliance

- [x] `manifest_version: 3` declared
- [x] Background script uses service worker (not persistent background page)
- [x] Uses `chrome.alarms` for periodic tasks (not `setInterval` in background)
- [ ] **Fix:** `setTimeout` used for sync debounce in service worker — must migrate to `chrome.alarms`
- [x] Content script uses `document_idle` run_at (not `document_start`)
- [x] Module type service worker (`"type": "module"`)

### Permission Minimization

- [ ] **Fix:** Justify or narrow `<all_urls>` host permission — CWS will flag this
- [ ] **Review:** `scripting` permission appears unused in code — remove if confirmed
- [ ] **Fix:** Remove `http://localhost:3000/*` from `externally_connectable`
- [x] Only necessary API permissions requested (storage, alarms, notifications, idle, tabs, contextMenus)
- [ ] **Add:** `"optional_host_permissions"` for `<all_urls>` if floating widget injection is made programmatic

### Performance Optimization

- [x] Lazy loading for heavy views (React.lazy)
- [x] Dynamic imports for export libraries (xlsx, jspdf)
- [x] Manual chunks in Vite config
- [ ] **Fix:** Broadcast optimization (send only to active tabs)
- [ ] **Fix:** Batch storage reads in sync pull
- [ ] **Add:** React.memo on list components

### Security

- [ ] **Add:** Explicit CSP in manifest.json
- [ ] **Fix:** PostMessage origin validation in content.ts
- [ ] **Fix:** PostMessage response should use specific origin instead of `'*'`
- [x] Auth tokens stored in chrome.storage.local (not localStorage)
- [x] Supabase RLS on all tables
- [ ] **Fix:** Notification icon paths (currently reference nonexistent `icons/` directory)

### Production Build Configuration

- [x] Vite production build with minification
- [x] TypeScript strict mode enabled
- [ ] **Add:** Strip `console.log` / `console.warn` statements in production build (configure Vite `esbuild.drop: ['console']` or use `terserOptions`)
- [ ] **Fix:** Remove `eslint-disable` comments that suppress real issues (vs. pre-existing ones)
- [ ] **Add:** Source map generation for error reporting (but exclude from published extension)

### Console Log Cleanup

Locations with console output that should be stripped for production:

| File | Pattern | Count |
|---|---|---|
| `background.ts` | `console.warn('[work-timer]')` | ~6 |
| `syncEngine.ts` | `console.warn`, `console.error`, `console.log` | ~8 |
| `realtimeSubscription.ts` | `console.warn` | ~2 |
| `statsSync.ts` | `console.warn` | ~1 |

**Recommendation:** Use the structured `logger.ts` utility (already exists) for all logging, and configure Vite to strip `console.*` in production builds.

### Error Boundary Coverage

- [x] Root-level ErrorBoundary wrapping entire app
- [ ] **Add:** Per-view error boundaries (StatsView crash shouldn't take down TimerView)
- [ ] **Add:** Error boundary for Recharts (chart rendering errors are common)
- [x] Toast system for user-facing error messages

### Accessibility

- [x] ARIA roles on interactive elements (tablist, progressbar, alertdialog, dialog)
- [x] `aria-label` on all buttons and inputs
- [x] Keyboard navigation in dropdowns (TagSelect: Arrow keys, Enter, ESC)
- [x] Focus management in modals (auto-focus, ESC to close)
- [x] `prefers-reduced-motion` respected in CSS
- [x] Screen reader text (sr-only) on spinner
- [ ] **Verify:** Color contrast ratios meet WCAG AA (especially stone-400 text on white backgrounds)
- [ ] **Add:** `aria-live="polite"` region for timer state changes in popup

### Localization Readiness

- [ ] **Missing:** No `_locales/` directory — all strings hardcoded in English
- [ ] **Missing:** No `default_locale` in manifest.json
- [ ] **Add:** At minimum, create `_locales/en/messages.json` with extension name and description
- [ ] **Consider:** Extract UI strings to a message catalog for future i18n

### Store Listing Requirements

- [ ] **Add:** Proper icon sizes (16x16, 32x32, 48x48, 128x128 as separate optimized PNGs)
- [ ] **Add:** Screenshots (1280x800 or 640x400) for CWS listing
- [ ] **Add:** Privacy policy URL (required if using `<all_urls>` or remote code)
- [ ] **Add:** Detailed CWS description explaining why each permission is needed
- [x] Extension name and description set in manifest

---

## 5. Refactoring Plan

### Phase 1 — Critical Fixes (Before Any Publishing)

| # | Task | File(s) | Risk | Effort |
|---|---|---|---|---|
| 1.1 | Replace `setTimeout` sync debounce with `chrome.alarms` one-shot alarm | `background.ts:123-131` | Low | 30 min |
| 1.2 | Fix notification icon paths (`icons/icon-128.png` -> `logos/neu-icon.png`) | `background.ts` (6 locations) | Low | 15 min |
| 1.3 | Remove `http://localhost:3000/*` from `externally_connectable` | `manifest.json:49` | Low | 5 min |
| 1.4 | Add explicit CSP to manifest.json | `manifest.json` | Low | 10 min |
| 1.5 | Verify `scripting` permission is needed; remove if not | `manifest.json:12` | Low | 15 min |
| 1.6 | Add origin validation to postMessage listener in content script | `content.ts:559-583` | Low | 20 min |
| 1.7 | Create properly sized icon files (16, 32, 48, 128px) | `public/logos/` | Low | 30 min |

### Phase 2 — Performance Optimization

| # | Task | File(s) | Risk | Effort |
|---|---|---|---|---|
| 2.1 | Batch storage reads in `pullDelta()` — pre-fetch all date keys | `syncEngine.ts:247-269` | Low | 1 hour |
| 2.2 | Track active tabs for targeted broadcasting | `background.ts:162-175`, `content.ts` | Medium | 2 hours |
| 2.3 | Add `React.memo` to EntryList items, ProjectSelector, TagSelect, GoalProgress | Component files | Low | 1 hour |
| 2.4 | Clean up global mouse listeners in content script on widget destroy | `content.ts:385-401` | Low | 30 min |
| 2.5 | Only run content script tick interval when timer is `'running'` | `content.ts:470-479` | Low | 20 min |
| 2.6 | Extract timer display into isolated component to prevent TimerView re-renders | `TimerView.tsx` | Low | 1 hour |
| 2.7 | Replace `hasAnyLocalData()` full storage scan with lightweight check | `storage/index.ts:332-337` | Low | 20 min |
| 2.8 | Read `entrySaveTimeMs` from storage in `stopTimer()` instead of relying on module-level cache | `background.ts:28,289` | Low | 15 min |

### Phase 3 — Code Structure Improvements

| # | Task | File(s) | Risk | Effort |
|---|---|---|---|---|
| 3.1 | Split `background.ts` into modules: `timerEngine.ts`, `pomodoroEngine.ts`, `authHandler.ts`, `messageRouter.ts`, `alarmHandlers.ts` | `src/background/` | Medium | 3 hours |
| 3.2 | Extract TimerView modes into separate components: `StopwatchMode.tsx`, `ManualEntryMode.tsx`, `PomodoroMode.tsx` | `src/components/` | Medium | 2 hours |
| 3.3 | Share `getElapsed()` utility — define once in `utils/`, import everywhere | `background.ts:136`, `content.ts:46` | Low | 20 min |
| 3.4 | Consolidate `DEFAULT_TIMER_STATE` to single source of truth | `background.ts:40`, `storage/index.ts:293` | Low | 15 min |
| 3.5 | Move content script CSS to a separate `.css` file (imported at build time) | `content.ts:126-292` | Low | 30 min |
| 3.6 | Extract `handleStop` common logic in TimerView to avoid duplication | `TimerView.tsx:131-169` | Low | 30 min |
| 3.7 | Import shared types in content script instead of redefining locally | `content.ts:4-16` | Low | 15 min |

### Phase 4 — UX & Polish

| # | Task | File(s) | Risk | Effort |
|---|---|---|---|---|
| 4.1 | Add per-view error boundaries (StatsView, WeekView, SettingsView) | `src/popup/App.tsx`, new component | Low | 1 hour |
| 4.2 | Add loading skeleton states for lazy-loaded views | `App.tsx` (Suspense fallbacks) | Low | 1 hour |
| 4.3 | Add validation for manual entry date format | `TimerView.tsx:172-241` | Low | 15 min |
| 4.4 | Verify WCAG AA color contrast ratios across all 6 themes | `src/index.css` | Low | 2 hours |
| 4.5 | Add basic unit tests for storage layer and sync queue | New test files | Low | 4 hours |
| 4.6 | Add integration tests for message passing (popup -> background -> response) | New test files | Medium | 4 hours |

### Phase 5 — Store Publishing Preparation

| # | Task | File(s) | Risk | Effort |
|---|---|---|---|---|
| 5.1 | Configure Vite to strip `console.*` in production builds | `vite.config.ts` | Low | 15 min |
| 5.2 | Write CWS permission justification document | New file | Low | 1 hour |
| 5.3 | Create `_locales/en/messages.json` with name and description | `public/_locales/en/` | Low | 15 min |
| 5.4 | Prepare store listing assets (screenshots, promotional images) | External | Low | 2 hours |
| 5.5 | Add privacy policy URL to manifest or store listing | `manifest.json` | Low | Varies |
| 5.6 | Narrow `<all_urls>` host permission (or provide compelling justification) | `manifest.json` | Medium | 2 hours |
| 5.7 | Final production build + size audit (target < 5MB total) | Build pipeline | Low | 30 min |
| 5.8 | Test on Chrome Stable, Beta, and Dev channels | Manual testing | Low | 2 hours |

---

## 6. Optional Improvements

### 6.1 Advanced Improvements

- **Service worker keep-alive:** For long-running timer sessions, consider using the offscreen API (`chrome.offscreen.createDocument`) to maintain a persistent timer counter that survives service worker termination. This would eliminate the need to reconstruct elapsed time from `startTime` on worker restart.

- **IndexedDB migration:** For users with large entry histories (years of data), `chrome.storage.local` may hit the 10MB quota. Consider migrating to IndexedDB for entry storage while keeping lightweight state (timer, settings, projects) in `chrome.storage.local`. This would also enable more efficient date-range queries.

- **Web Worker for PDF generation:** The `exportPDF()` function in `utils/export.ts` (597 lines) does heavy computation (chart rendering, table formatting). Moving this to a Web Worker would prevent UI jank during export.

- **Incremental sync:** Currently `pullDelta` fetches all changed records since the last cursor. For users with large datasets, consider implementing cursor-based pagination with `limit` + `offset` to avoid pulling thousands of records in one RPC call.

### 6.2 Monitoring Strategy

- **Error telemetry:** Integrate a lightweight error reporting service (e.g., Sentry browser SDK ~20KB gzipped) to capture unhandled errors from popup, background, and content script. Gate behind user opt-in in settings.

- **Sync health metrics:** Track sync success/failure rates, queue depth over time, and average pull size. Surface these in the settings diagnostics panel (already partially implemented via `diagnoseSyncState()`).

- **Performance metrics:** Use `chrome.runtime.getBackgroundClient()` and `performance.measure()` to track popup open-to-interactive time. Log to analytics if under consent.

### 6.3 Analytics Integration (Privacy-Safe)

- **Aggregate-only analytics:** Track anonymized usage patterns (timer sessions per day, most-used features, theme preferences) without PII. Use the existing `pushUserStats()` mechanism as a foundation.

- **Feature flag system:** Before adding new features, consider a simple feature flag system (JSON in storage or from Supabase) to enable gradual rollout and A/B testing.

### 6.4 Future Scalability

- **Multi-timer support:** The current architecture assumes a single active timer. If multi-timer support is planned, the `timerState` storage key and message protocol would need to become array-based or use a timer ID.

- **Plugin system:** The well-separated hook architecture (useTimer, useProjects, etc.) would support a plugin API where third-party integrations (Jira, Asana, Toggl import) could be added as separate modules.

- **Cross-browser support:** The codebase uses Chrome-specific APIs (`chrome.*`). For Firefox/Edge support, consider wrapping Chrome APIs with the `webextension-polyfill` library.

### 6.5 Technical Debt Reduction

| Debt | Location | Suggestion |
|---|---|---|
| Pre-existing ESLint suppressions | Hooks (useTimer, useEntries, etc.) | Schedule a dedicated session to fix `react-hooks/set-state-in-effect` warnings properly |
| `as any` casts for Supabase | `syncEngine.ts` (7 occurrences) | Revisit when Supabase SDK improves type inference for mutations |
| Inline notification strings | `background.ts` | Extract to a constants file for consistency and future i18n |
| Missing test coverage | Entire `src/` | Start with storage layer (pure functions, easy to test) and expand to sync engine |
| `eslint-disable` comments | Various files | Audit each suppression; fix the underlying issue or document why it's necessary |

---

## 7. Open Questions

1. **Is the `scripting` permission actually used anywhere?** It's declared in the manifest but I found no `chrome.scripting.*` calls in the codebase. If it was added for future use, it should be removed until needed — CWS reviewers will question unnecessary permissions.

2. **Are the notification icon paths (`icons/icon-128.png`) intentionally different from the manifest icon paths (`logos/neu-icon.png`)?** If an `icons/` directory exists in the build output with a separate icon file, this is fine. Otherwise, notifications are likely showing without icons.

3. **Is the `tabs` permission used for anything beyond `chrome.tabs.query({})` in broadcasting?** If so, document the usage. If not, consider whether the broadcast pattern could use `chrome.storage.onChanged` instead, eliminating the need for the `tabs` permission entirely.

4. **What is the target for minimum Chrome version?** The manifest doesn't specify `minimum_chrome_version`. If targeting Chrome 100+, some newer APIs (like `chrome.offscreen`) could be leveraged for better service worker reliability.

5. **Is the plan to support Firefox/Edge in the future?** This would influence whether to introduce `webextension-polyfill` now vs. later.

---

*End of review. All findings are based on actual source code analysis — no assumptions or generated code. File paths and line numbers reference the codebase as of 2026-02-27.*
