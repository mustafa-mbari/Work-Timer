# Work-Timer — Project Improvements

> Full audit of source code, architecture, UI/UX, and feature gaps.
> Severity: 🔴 High · 🟡 Medium · 🟢 Low

---

## 1. Code Quality Issues

### 1.1 Duplicated Constants (🔴 High)

`PROJECT_COLORS` array is copy-pasted in three components:
- `src/components/EntryEditModal.tsx`
- `src/components/AddEntryModal.tsx`
- `src/components/SettingsView.tsx`

**Fix:** Create `src/constants/colors.ts` and import everywhere.

---

### 1.2 Duplicated CSS Class Strings (🟡 Medium)

`inputClass`, `labelClass`, `addInputClass` are re-defined identically in:
- `EntryEditModal.tsx`
- `AddEntryModal.tsx`
- `SettingsView.tsx`

**Fix:** Export from `src/constants/styles.ts`:
```ts
export const inputClass = "w-full border border-stone-200 dark:border-dark-border ..."
export const labelClass = "text-[11px] font-medium text-stone-500 ..."
```

---

### 1.3 Magic Numbers — Timer Durations (🔴 High)

Pomodoro durations and idle threshold appear multiple times:
- `25 * 60 * 1000` in `useTimer.ts` and `background.ts`
- `5 * 60 * 1000`, `15 * 60 * 1000` repeated in `background.ts`
- Idle threshold `60000` hardcoded

**Fix:** Create `src/constants/timers.ts`:
```ts
export const POMODORO_WORK_MS      = 25 * 60 * 1000
export const POMODORO_SHORT_MS     =  5 * 60 * 1000
export const POMODORO_LONG_MS      = 15 * 60 * 1000
export const IDLE_THRESHOLD_MS     = 60_000
```

---

### 1.4 Default Settings Defined in Two Places (🔴 High)

`DEFAULT_SETTINGS` exists in `src/storage/index.ts` **and** inline in `src/background/background.ts`.
They happen to match today but will drift.

**Fix:** Export `DEFAULT_SETTINGS` from `storage/index.ts`, import it in `background.ts`.

---

### 1.5 Time Formatting Duplicated (🟡 Medium)

`formatDuration` / time-formatting logic exists in both `src/utils/date.ts` and
inline inside `src/background/background.ts` (badge/tab-title code).

**Fix:** Import from `src/utils/date.ts` in the background worker.

---

### 1.6 Missing Error Handling in Export (🟡 Medium)

`src/utils/export.ts` — `saveAs()` and `XLSX.writeFile()` are not wrapped in
try-catch. A failure is completely silent.

**Fix:** Wrap in try-catch, dispatch a toast error on failure.

---

### 1.7 No Loading State on Save Buttons (🟡 Medium)

`EntryEditModal` and `AddEntryModal` save buttons stay enabled during the async
`saveEntry()` / `updateEntry()` call. A slow storage write can trigger a double-save.

**Fix:** Add `const [saving, setSaving] = useState(false)` and disable button while saving.

---

### 1.8 Type Safety Gaps (🟡 Medium)

- `src/background/background.ts` — raw `chrome.storage.local.get` results cast with
  `as Array<...>` without validation. Add a type-guard.
- `src/storage/index.ts` — `isValidEntry()` does not check `link` field type.
- `useTags.ts` — `getTags()` / `saveTags()` not present in the storage module's
  exported API (they may live inside the file but are not typed at the module boundary).

---

## 2. Performance Issues

### 2.1 Unsorted Array Rebuilt Every Render (🟡 Medium)

`src/components/EntryList.tsx`:
```ts
const sorted = [...entries].sort((a, b) => b.startTime - a.startTime)
```
No `useMemo` — re-sorts on every parent render.

**Fix:**
```ts
const sorted = useMemo(
  () => [...entries].sort((a, b) => b.startTime - a.startTime),
  [entries]
)
```

---

### 2.2 `days` Array Not Memoized in WeekView (🟡 Medium)

`src/components/WeekView.tsx`:
```ts
const days = getWeekDays(currentDate, weekStartsOn, workingDays)
```
Recalculated every render, causing `entriesByDay` memo to invalidate.

**Fix:**
```ts
const days = useMemo(
  () => getWeekDays(currentDate, weekStartsOn, workingDays),
  [currentDate, weekStartsOn, workingDays]
)
```

---

### 2.3 No Optimistic Updates in Hooks (🟡 Medium)

All mutations in `useEntries`, `useProjects`, `useTags` do:
```ts
await saveEntry(entry)
await fetch()          // full round-trip re-fetch
```
This adds latency on every add/edit. The data is known locally before the refetch.

**Fix:** Update state immediately, then verify via background refetch.

---

### 2.4 Background Broadcasts to All Tabs Every Tick (🟡 Medium)

`src/background/background.ts` — `TIMER_SYNC` is broadcast on every alarm tick
(approx. every 5 seconds). With 50+ open tabs, this is 50+ `sendMessage` calls per tick.

**Fix:** Only broadcast on actual state changes (start, pause, stop), not on every tick.

---

### 2.5 SettingsView Re-renders Entire Tab on Any State Change (🟢 Low)

544-line component re-renders all three tabs when any local state changes
(e.g., typing in one input re-renders all project color pickers).

**Fix:** Split into `<GeneralTab>`, `<TimerTab>`, `<DataTab>` sub-components.

---

## 3. Architecture & Structure

### 3.1 `background.ts` Is a 858-Line Monolith (🔴 High)

It mixes: timer state, pomodoro logic, idle detection, badge/title updates,
message routing, context menus, keyboard shortcuts, and alarm handling.

**Fix — proposed folder structure:**
```
src/background/
  background.ts     ← thin entry point (wires everything)
  timer.ts          ← stopwatch + state machine
  pomodoro.ts       ← pomodoro phase logic
  idle.ts           ← idle detection
  messages.ts       ← chrome.runtime.onMessage handlers
  ui.ts             ← badge, tab title, notifications
  shortcuts.ts      ← keyboard command handlers
```

---

### 3.2 `TimerView.tsx` Handles Too Many Concerns (🟡 Medium)

A single 450+ line component covering:
- Mode toggle (stopwatch / manual / pomodoro)
- Manual entry form (date, time range, duration)
- Pomodoro progress ring + controls
- Idle detection banner
- Project selector + description
- Today's entries list + goal progress

**Fix — split into:**
- `ManualEntryForm.tsx`
- `PomodoroDisplay.tsx`
- `IdleBanner.tsx`

---

### 3.3 `chrome.tabs.create()` Called Inside Component (🟡 Medium)

`src/components/EntryList.tsx`:
```ts
onClick={() => chrome.tabs.create({ url: entry.link! })}
```
Couples UI to Chrome API. Untestable.

**Fix:** Move to `src/utils/browser.ts`:
```ts
export function openLink(url: string) { chrome.tabs.create({ url }) }
```

---

### 3.4 Date/Time Parsing Duplicated in Components (🟡 Medium)

The `"HH:MM" → timestamp` conversion appears in:
- `TimerView.tsx` (manual save handler)
- `AddEntryModal.tsx` (handleSave)
- `EntryEditModal.tsx` (`timeStringToTimestamp`)

**Fix:** Extract to `src/utils/timeInput.ts`:
```ts
export function parseLocalTime(timeStr: string, baseDate: Date): Date
export function timestampToTimeString(ts: number): string
```

---

## 4. UI/UX Issues

### 4.1 No Confirmation Before Destructive Actions (🔴 High)

- Deleting a time entry in `EntryEditModal` requires only two clicks (Confirm Delete →
  Delete) but has no undo. One accidental tap is unrecoverable.
- Archiving a project is immediate with no feedback.

**Fix:** Toast with 5-second undo action, or a more prominent confirm dialog.

---

### 4.2 No Empty States (🟡 Medium)

CalendarHeatmap, WeekView, and StatsView show empty/grey UI with no guidance
when the user has no entries.

**Fix:** Add friendly empty state messages:
- _"No entries this week. Start the timer or add a manual entry."_
- _"No data yet — track time to see charts here."_

---

### 4.3 No Visual Feedback After Save (🟡 Medium)

After saving a manual entry or editing an entry in a modal, the modal closes silently.
There is no "Saved!" confirmation.

**Fix:** Dispatch a brief success toast on save.

---

### 4.4 Export Fails Silently for Empty Data (🟡 Medium)

`exportCSV()` returns early without feedback when `entries.length === 0`.
User clicks Export and nothing happens.

**Fix:** Show toast: _"No entries to export for this period."_

---

### 4.5 Idle Prompt Reappears on Popup Reopen (🟢 Low)

If the popup is closed while the idle banner is shown (neither Keep nor Discard
clicked), it reappears on the next popup open — can feel like a bug.

**Fix:** Auto-discard idle time when the popup is closed, or persist the pending state
and only show once per idle event.

---

### 4.6 Accessibility Gaps (🟡 Medium)

- Color picker buttons in Settings use `aria-label="Select color #6366F1"` — hex
  values are not screen-reader-friendly. Use color name or index.
- `<select>` in `ProjectSelector` inside `AddEntryModal` has no `htmlFor`/`id` pair.
- CalendarHeatmap day cells expose `role="gridcell"` but the parent grid has no
  `role="grid"` with `aria-label`.
- Modal close buttons use `aria-label="Close"` — include modal title:
  `aria-label="Close Add Entry modal"`.

---

### 4.7 Inconsistent Modal Behaviour (🟢 Low)

- `EntryEditModal` — bottom sheet (slides up from bottom).
- `AddEntryModal` — centered card (slides in center).

Two different patterns for the same workflow creates cognitive dissonance.

**Fix:** Standardize on the bottom-sheet pattern (already used by EntryEditModal and
consistent with mobile-friendly popup design).

---

### 4.8 Stats View Lacks Time Range Selector (🟡 Medium)

Stats only shows "today" and "this week". No way to look at last week, last month,
or a custom range.

**Fix:** Add a "This week / Last week / This month" tab or date range picker.

---

## 5. Maintainability

### 5.1 No Structured Logging (🟡 Medium)

Errors are silently swallowed in most hooks (`try { ... } catch {}`).
Only `ErrorBoundary.tsx` has a `console.error`.

**Fix:** Add `src/utils/logger.ts`:
```ts
export const log = {
  debug: (msg: string, data?: unknown) => console.debug(`[Timer] ${msg}`, data),
  warn:  (msg: string, data?: unknown) => console.warn(`[Timer] ${msg}`, data),
  error: (msg: string, err: unknown)   => console.error(`[Timer] ${msg}`, err),
}
```

---

### 5.2 No Unit Tests (🔴 High)

Zero test files in the project. Pure utility functions like `formatDuration`,
`getWeekRange`, `msToHours`, and the pomodoro phase logic are all testable in isolation.

**Fix:** Add Vitest (same build toolchain as Vite):
```
npm install -D vitest @testing-library/react
```
Start with `src/utils/date.test.ts` and `src/storage/index.test.ts`.

---

### 5.3 Pre-existing ESLint Warnings (🟢 Low)

Known issues in `useTimer`, `useEntries`, `useProjects`, `useSettings`:
- `react-hooks/set-state-in-effect`
- `react-hooks/purity` (Date.now() in render body)
- `@typescript-eslint/no-unused-vars` for `_tick`

**Fix:** Add targeted `// eslint-disable-next-line` comments with explanations
instead of tolerating unaddressed warnings.

---

## 6. Potential Bugs

| # | Location | Issue |
|---|----------|-------|
| 1 | `storage/index.ts` | Storage retry logic doesn't validate data integrity after write. Partial saves are possible. |
| 2 | `background.ts` | Idle duration calculated as `Date.now() - idleStartedAt`. If browser is suspended for hours, this could show 8h+ idle time. Cap at a sane maximum. |
| 3 | `AddEntryModal.tsx` | Duration mode sets `endTime` to noon. If duration > 12h, `startTime` goes negative. Add a guard. |
| 4 | `TimerView.tsx` | `manualDate` resets to today after save. If user is adding multiple backdated entries, they have to reselect the date each time. Consider keeping it. |
| 5 | `useEntries.ts` | `remove(id)` always uses `targetDate` (today). Calling it from a non-today context (e.g., future WeekView use) would silently fail to delete. |

---

## 7. New Feature Ideas

### Quick Wins

| Feature | Description |
|---------|-------------|
| **Save confirmation toast** | "Saved 2h 34m to Project X" with 5s undo after stopping timer |
| **Keep date on manual entry** | Don't reset `manualDate` to today after saving a backdated entry |
| **Pause reminder** | Notification if timer has been paused for >30 minutes |
| **Stats range selector** | "This week / Last week / This month" filter on Stats view |
| **Entry count badge** | Show number of entries today on the Timer tab label |

### Medium Value

| Feature | Description |
|---------|-------------|
| **Project budget tracking** | Set allocated hours per project, warn when over budget |
| **Time entry templates** | Save frequent task patterns for one-click entry |
| **Daily goal streaks** | Streak counter for consecutive days meeting daily target |
| **Richer weekly bar** | Show project breakdown stacked bars per day in Week view |
| **Keyboard-first entry** | Press `M` to open manual entry, `Enter` to save, `Esc` to close |

### Advanced

| Feature | Description |
|---------|-------------|
| **Pomodoro analytics** | Track completed sessions, interruptions, focus trends |
| **Time estimation** | Estimate task duration before starting; track accuracy over time |
| **Weekly email/PDF report** | Sunday summary: hours logged, project breakdown, goal progress |
| **Calendar integration** | Sync timer blocks to Google Calendar as events |
| **Phase 4: Cloud sync** | Firebase / Supabase sync across devices with optional encryption |

---

## 8. Recommended Action Plan

### Week 1 — Low-risk, high-impact
- [ ] Extract `PROJECT_COLORS`, timer constants, shared CSS classes to `src/constants/`
- [ ] Add `useMemo` to `EntryList` sort and `WeekView` days
- [ ] Add `saving` state to modal save buttons
- [ ] Fix silent export failure — show toast when no entries

### Week 2 — Architecture cleanup
- [ ] Unify `DEFAULT_SETTINGS` to single source
- [ ] Refactor `background.ts` into focused modules
- [ ] Extract `parseLocalTime` / `timestampToTimeString` to `src/utils/timeInput.ts`
- [ ] Add structured `logger` utility

### Week 3 — UX polish
- [ ] Add empty states to WeekView, StatsView, CalendarHeatmap
- [ ] Add save success toast after manual entry / edit
- [ ] Fix accessibility gaps (grid roles, aria-labels)
- [ ] Standardize modal pattern (bottom sheet vs centered)

### Week 4 — Testing & features
- [ ] Set up Vitest, add tests for `src/utils/date.ts`
- [ ] Implement stats range selector
- [ ] Implement session summary toast with undo
- [ ] Add project budget/allocated-hours tracking

---

*Generated: 2026-02-12*
