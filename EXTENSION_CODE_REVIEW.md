# Work Timer Extension — Code Review & Bug Report

This document summarizes the technical review of the Work Timer Extension's codebase, focusing on background logic, data integrity, and UI/UX consistency.

---

## 1. High Priority: Data Integrity & Background Logic

### [BUG] Midnight Date Transition — FIXED
*   **Location:** `src/background/timerEngine.ts`
*   **Issue:** The `stopTimer` and `startTimer` functions use `getToday()` to determine which storage key (`entries_YYYY-MM-DD`) to use.
*   **Symptom:** If a timer is started at 11:59 PM and stopped at 12:01 AM, the code looks for the entry under the *new* day's key. It won't find the "continuing" entry from the previous day, resulting in a duplicate entry being created for the new day instead of updating the original.
*   **Impact:** Broken data for timers spanning midnight.
*   **Fix:** Added `dateStarted` field to `TimerState` (set on `startTimer()`). `stopTimer()` uses `state.dateStarted || getToday()` for continuing-entry lookup with fallback to `getToday()`. `startTimer()` continuing-entry lookup tries today first, then yesterday via `getYesterday()` helper.

### [BUG] Sync Duplication on Date Change — FIXED
*   **Location:** `src/sync/syncEngine.ts`
*   **Issue:** Entries are keyed by date in local storage. If an entry's date is changed on Device A and synced to Device B, the `pullDelta` logic on Device B will add the entry to the new date's key but **does not remove** the old entry from the previous date's key.
*   **Symptom:** Users see the same task twice on different days after a sync.
*   **Impact:** Persistent data corruption in the local view.
*   **Fix:** `pullDelta()` now scans all local `entries_*` keys not in the affected dates set, removes stale copies of entries whose IDs match incoming remote entries (indicating the entry moved dates).

### [BUG] Metadata Loss (Tags/Links) on External Stop — FIXED
*   **Location:** `src/components/TimerView.tsx` vs `src/background/timerEngine.ts`
*   **Issue:** Tags and Links are managed as local state in the popup and only appended to the entry *after* the background `stopTimer` returns.
*   **Symptom:** If the timer is stopped via a **Keyboard Shortcut** or the **Floating Widget**, the background logic runs without the popup's context. The entry is saved with an empty tag list and no link.
*   **Impact:** Loss of user-selected data.
*   **Fix:** Added `tags: string[]` and `link: string` fields to `TimerState`. New `UPDATE_TIMER_META` message type + `updateTimerMeta()` background function. Popup syncs metadata to background in real-time (description debounced 300ms, tags/link/project immediate). `stopTimer()` and pomodoro entry creation use `state.tags` and `state.link` from `TimerState`.

### [BUG] Idle Detection "Locked" Overwrite — FIXED
*   **Location:** `src/background/idleDetection.ts`
*   **Issue:** The `onStateChanged` listener records the start time for both `idle` and `locked` states.
*   **Symptom:** If the system goes `idle` (5 mins) and then `locked` (10 mins), the second event overwrites the `idleStartedAt` timestamp.
*   **Impact:** Incorrect (shortened) idle duration calculations.
*   **Fix:** `idle`/`locked` handler now reads existing `idleInfo` first and only sets `idleStartedAt` if it's currently `null`.

---

## 2. Architectural Issues

### Cross-Process Storage Race Conditions
*   **Observation:** The background uses `withStorageLock` for its internal operations, but the Popup UI (`src/storage/index.ts`) performs direct `chrome.storage.local` writes without any cross-process locking.
*   **Risk:** If a background sync pull and a popup manual edit happen at the exact same millisecond on the same storage key, one change will be lost.
*   **Recommendation:** Move all storage writes to the background service worker via a message-passing interface to ensure single-threaded execution.

### Fragmented State Management — MITIGATED
*   **Observation:** `TimerView` maintains its own copies of `description` and `selectedProjectId` that are not fully reactive to background changes.
*   **Risk:** Desync between the UI and the actual running timer state.
*   **Mitigation:** Popup now syncs all metadata changes (description, project, tags, link) to background `TimerState` via `UPDATE_TIMER_META` messages. On popup open with active timer, local state is restored from `TimerState`. Background is the source of truth for entry creation.

---

## 3. UI/Frontend Issues (Extension)

### Restricted Editing while Running — FIXED
*   **Location:** `src/components/StopwatchMode.tsx`, `src/components/PomodoroMode.tsx`
*   **Issue:** All input fields (Description, Project, Tags) are `disabled` when the timer status is `running`.
*   **UX Friction:** Users often realize they forgot to set a project or made a typo *after* starting the timer. Currently, they must stop, save, and then edit the entry manually.
*   **Fix:** Removed all `disabled={isActive}` constraints from ProjectSelector, tab buttons, description input, TagSelect, and link input. Changes are synced to background via `UPDATE_TIMER_META`.

### Missing "Continue" in Week View — FIXED
*   **Location:** `src/components/WeekView.tsx`
*   **Issue:** The "Continue" button (Play icon) is only implemented in the daily `EntryList`.
*   **UX Friction:** Users cannot easily resume a task from yesterday or last week via the Week View.
*   **Fix:** Added hover-reveal play button on entry chips in WeekView. Clicking starts a continuing timer with the entry's project and description. Only visible when timer is idle.

---

## 4. Recommendations for Improvements

1.  **Metadata Hoisting:** ~~Move `tags`, `link`, and `dateStarted` into the background `TimerState`.~~ DONE — `tags`, `link`, `dateStarted` added to `TimerState`. `UPDATE_TIMER_META` message + `updateTimerMeta()` function implemented.
2.  **Date-Agnostic Entry Lookups:** ~~Modify `getTimeEntry` to search across a small range of days if an ID isn't found on the current day.~~ DONE — `startTimer()` tries today then yesterday; `stopTimer()` uses `dateStarted` with fallback.
3.  **Global Lock:** Implement a "Storage API" in the background that the popup calls, ensuring all write operations are queued through the background's `withStorageLock`.
4.  **Reactive Inputs:** ~~Remove the `disabled={isActive}` constraint on the description and project fields.~~ DONE — All inputs editable while timer runs; changes synced via `UPDATE_TIMER_META`.

---

## 5. Files Modified

| File | Changes |
|------|---------|
| `src/types/index.ts` | Added `tags`, `link`, `dateStarted` to `TimerState`; `UPDATE_TIMER_META` message action |
| `src/utils/timer.ts` | Updated `DEFAULT_TIMER_STATE` with new fields |
| `src/utils/date.ts` | Added `getYesterday()` helper |
| `src/hooks/useTimer.ts` | Added `updateMeta()` method for `UPDATE_TIMER_META` messages |
| `src/background/timerEngine.ts` | Metadata in `startTimer`/`stopTimer`; new `updateTimerMeta()` function |
| `src/background/pomodoroEngine.ts` | Metadata in `startPomodoro`/`stopPomodoro`/`advancePomodoroPhase` |
| `src/background/background.ts` | Wired `UPDATE_TIMER_META` message handler |
| `src/background/idleDetection.ts` | Guard against overwriting `idleStartedAt` |
| `src/sync/syncEngine.ts` | Stale entry cleanup in `pullDelta()` for moved entries |
| `src/components/StopwatchMode.tsx` | Removed `disabled={isActive}` from all inputs |
| `src/components/PomodoroMode.tsx` | Removed `disabled={isActive}` from inputs |
| `src/components/TimerView.tsx` | Metadata sync handlers; popup state restore on mount |
| `src/components/WeekView.tsx` | Continue button on entry chips |
| `src/background/timerEngine.test.ts` | 7 new tests for metadata and `updateTimerMeta` |

## 6. Test Results

- **Build:** `pnpm build` — passes clean
- **Tests:** 189 tests pass (9 test files, 7 new tests added, 0 failures)
