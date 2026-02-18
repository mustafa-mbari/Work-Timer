# Work-Timer Chrome Extension — Use Cases

> All current use cases for the Chrome Extension (`src/`).
> Last updated: 2026-02-18

---

## Table of Contents

1. [Timer — Stopwatch Mode](#1-timer--stopwatch-mode)
2. [Timer — Manual Entry Mode](#2-timer--manual-entry-mode)
3. [Timer — Pomodoro Mode](#3-timer--pomodoro-mode)
4. [Idle Detection](#4-idle-detection)
5. [Entry Management](#5-entry-management)
6. [Week View](#6-week-view)
7. [Stats & Analytics](#7-stats--analytics)
8. [Export (Premium)](#8-export-premium)
9. [Projects](#9-projects)
10. [Tags](#10-tags)
11. [Settings — General](#11-settings--general)
12. [Settings — Timer](#12-settings--timer)
13. [Cloud Sync (Premium)](#13-cloud-sync-premium)
14. [Authentication](#14-authentication)
15. [Floating Widget (Content Script)](#15-floating-widget-content-script)
16. [Notifications & Keyboard](#16-notifications--keyboard)

---

## 1. Timer — Stopwatch Mode

### UC-1.1 — Start Stopwatch Timer
**Actor:** Any user (timer idle or paused)
**Component:** `TimerView` → `background.ts` (`START_TIMER`)
**Flow:** User optionally selects project, enters description, tag, and/or link → clicks "Start" → background starts accumulating elapsed time → badge shows elapsed time → `TIMER_SYNC` broadcast updates popup and floating widget every second.

### UC-1.2 — Pause Running Timer
**Actor:** Any user (timer running)
**Component:** `TimerView` → `background.ts` (`PAUSE_TIMER`)
**Flow:** User clicks "Pause" (amber) → elapsed time freezes → background stores accumulated duration → badge reflects paused state. Keyboard shortcut: `Alt+Shift+↓`.

### UC-1.3 — Resume Paused Timer
**Actor:** Any user (timer paused)
**Component:** `TimerView` → `background.ts` (`RESUME_TIMER`)
**Flow:** User clicks "Resume" (green) → background resumes accumulating from the stored duration → `TIMER_SYNC` resumes ticking. Keyboard shortcut: `Alt+Shift+↓`.

### UC-1.4 — Stop Timer & Save Entry
**Actor:** Any user (timer running or paused)
**Component:** `TimerView` → `background.ts` (`STOP_TIMER`)
**Flow:** User clicks "Stop" (red) → background creates a `TimeEntry` (startTime, endTime, duration, projectId, description, tags, link, type: `'stopwatch'`) → saved to `chrome.storage.local` under `entries_YYYY-MM-DD` → timer resets → if Premium + authenticated, entry pushed to sync queue → floating widget hides. Keyboard shortcut: `Alt+Shift+↑`.

### UC-1.5 — Continue Previous Entry
**Actor:** Any user (timer idle)
**Component:** `EntryList` (play icon per entry)
**Flow:** User clicks the play icon on any today's entry → timer starts pre-filled with that entry's project and description → creates a new, separate `TimeEntry` (does not modify the original).

---

## 2. Timer — Manual Entry Mode

### UC-2.1 — Add Manual Entry (Time Range)
**Actor:** Any user
**Component:** `TimerView` → mode toggle "Manual" → sub-mode "Time Range"
**Flow:** User selects mode "Manual" → picks date (date picker, defaults to today), sets "From" and "To" times → optionally selects project, tag, description, link → clicks "Save Entry" → `TimeEntry` created with `type: 'manual'` and calculated duration → saved locally + queued for sync if Premium.

### UC-2.2 — Add Manual Entry (Duration)
**Actor:** Any user
**Component:** `TimerView` → mode toggle "Manual" → sub-mode "Duration"
**Flow:** User selects sub-mode "Duration" → enters hours (0–23) and minutes (0–59) → optionally selects project, tag, description, link → clicks "Save Entry" → `TimeEntry` created with `type: 'manual'`, `endTime = now`, `startTime = now − duration`.

---

## 3. Timer — Pomodoro Mode

### UC-3.1 — Start Pomodoro Session
**Actor:** Any user (timer idle)
**Component:** `TimerView` → mode toggle "Pomodoro" → `background.ts` (`START_POMODORO`)
**Flow:** User selects mode "Pomodoro" → optionally selects project and description → clicks "Start Focus" → background begins a work phase (default 25 min) → circular progress ring shows countdown (indigo for work, green for break) → session counter displayed → badge turns purple with countdown → phases cycle automatically: Work → Short Break → Work → … (every N sessions) → Long Break → Work.

### UC-3.2 — Skip Pomodoro Phase
**Actor:** Any user (Pomodoro active)
**Component:** `TimerView` → `background.ts` (`SKIP_POMODORO_PHASE`)
**Flow:** During a work phase, user clicks "Break" → immediately transitions to the next break phase. During a break phase, user clicks "Focus" → immediately transitions to the next work phase. Session count adjusts accordingly.

### UC-3.3 — Stop Pomodoro Session
**Actor:** Any user (Pomodoro active)
**Component:** `TimerView` → `background.ts` (`STOP_POMODORO`)
**Flow:** User clicks "Stop" → completed work-phase time is saved as a `TimeEntry` with `type: 'pomodoro'` → session ends → timer returns to idle → any in-progress break is discarded.

---

## 4. Idle Detection

### UC-4.1 — Handle Idle Time Prompt
**Actor:** Any user (timer running, user goes idle)
**Component:** `TimerView` (idle banner) → `background.ts` (`IDLE_KEEP` / `IDLE_DISCARD`)
**Flow:** Chrome idle API detects inactivity beyond the configured idle timeout (default 5 min) → background fires a Chrome notification → when user reopens popup, an idle banner appears: "You were idle for [duration]" with two options:
- **"Keep Time"** → sends `IDLE_KEEP` → idle duration is included in the final entry (timer continues from original start).
- **"Discard"** → sends `IDLE_DISCARD` → idle duration is subtracted; timer adjusts effective start time.

---

## 5. Entry Management

### UC-5.1 — Edit a Time Entry
**Actor:** Any user
**Component:** `EntryEditModal` (opened from `EntryList` or `WeekView`)
**Flow:** User clicks an entry → `EntryEditModal` slides up → user can switch between "From/To" (start/end time with HH:MM:SS precision) and "Duration" (hours:minutes:seconds) edit modes → also editable: project, tag, description, link → clicks "Save" → entry updated in `chrome.storage.local` + queued for sync. Pressing Escape closes without saving.

### UC-5.2 — Delete a Time Entry
**Actor:** Any user
**Component:** `EntryEditModal`
**Flow:** User clicks "Delete" inside the edit modal → a confirmation button "Confirm Delete" appears → user confirms → entry removed from `chrome.storage.local` + queued for deletion in sync.

### UC-5.3 — Add Entry to a Past Date (Week View)
**Actor:** Any user
**Component:** `WeekView` → `AddEntryModal` (plus icon per day row)
**Flow:** User clicks the "+" icon next to any day in the week view → `AddEntryModal` opens pre-set to that date → same fields as manual entry (time range or duration, project, tag, description, link) → clicks "Save" → entry created for that specific date.

---

## 6. Week View

### UC-6.1 — Browse Time Entries by Week
**Actor:** Any user
**Component:** `WeekView` (popup tab "Week")
**Flow:** User switches to the Week tab → sees all entries grouped by day for the current week, with each day's total duration → entries are listed chronologically per day → week total shown at the top.

### UC-6.2 — Navigate to Previous / Next Week
**Actor:** Any user
**Component:** `WeekView` (arrow buttons)
**Flow:** User clicks "←" or "→" arrows → week view shifts one week back or forward → entries for the selected week are loaded from `chrome.storage.local` → free plan users can access full local history (no date restriction in the extension itself).

### UC-6.3 — Return to Current Week
**Actor:** Any user
**Component:** `WeekView` ("Today" / home button)
**Flow:** User clicks the "Today" button → week view snaps back to the current week.

### UC-6.4 — View Week Goal Progress
**Actor:** Any user (if weekly target is set)
**Component:** `WeekView` (progress bar)
**Flow:** If a weekly target is configured in Settings, the week view shows a progress bar comparing actual hours to the weekly target. No hard cap is enforced; it is for reference only.

---

## 7. Stats & Analytics

### UC-7.1 — View Daily & Weekly Summary Cards
**Actor:** Any user
**Component:** `StatsView` (popup tab "Stats")
**Flow:** User switches to Stats tab → sees three summary cards: "Today" (total hours logged today), "This Week" (week aggregate), and "Daily Avg" (average hours on days with at least one entry).

### UC-7.2 — View Weekly Bar Chart
**Actor:** Any user
**Component:** `StatsView` (Recharts bar chart)
**Flow:** Bar chart displays hours logged per day of the current week. Days with no entries show as 0. X-axis uses configurable week start day.

### UC-7.3 — View Today by Project (Pie Chart)
**Actor:** Any user
**Component:** `StatsView` (Recharts pie chart)
**Flow:** Pie chart shows the proportion of today's tracked time split by project. Only rendered when today's entries exist.

### UC-7.4 — View Monthly Calendar Heatmap
**Actor:** Premium user only
**Component:** `StatsView` → `CalendarHeatmap`
**Flow:** A calendar grid for the current month shows each day's intensity (color saturation proportional to hours logged). User can navigate months with "←" / "→" buttons. Free users see an upgrade prompt in place of the heatmap.

### UC-7.5 — Navigate Heatmap Months
**Actor:** Premium user
**Component:** `CalendarHeatmap` (arrow buttons)
**Flow:** User clicks "←" or "→" → heatmap re-renders for the adjacent month → entries loaded from local storage for that month.

---

## 8. Export (Premium)

### UC-8.1 — Export to CSV
**Actor:** Premium user
**Component:** `ExportMenu` (dropdown, visible in Week and Stats views)
**Flow:** User clicks "Export" → dropdown shows → user selects "CSV (.csv)" → `export.ts` collects entries for the visible date range → file downloaded as `work-timer-YYYY-MM-DD-YYYY-MM-DD.csv` with columns: date, start, end, duration, project, description, tags. Free users see an upgrade prompt instead of the export button.

### UC-8.2 — Export to Excel
**Actor:** Premium user
**Component:** `ExportMenu` (dropdown)
**Flow:** User selects "Excel (.xlsx)" → `xlsx` library dynamically imported → workbook generated with entry rows (same columns as CSV) plus a summary sheet → downloaded as `work-timer-YYYY-MM-DD-YYYY-MM-DD.xlsx`. The xlsx bundle is loaded on demand (not in the initial chunk).

---

## 9. Projects

### UC-9.1 — Create a Project
**Actor:** Any user
**Component:** `SettingsView` → Data tab → Projects section
**Flow:** User clicks the "+" icon → enters project name → selects a color from the 16-color palette → clicks "Add" → project saved to storage → immediately available in project selectors. Free plan: max 5 active projects enforced by `ProjectLimitError`; exceeding the limit shows an upgrade prompt.

### UC-9.2 — Edit a Project
**Actor:** Any user
**Component:** `SettingsView` → Data tab → Projects section → edit button
**Flow:** User clicks "Edit" on a project → inline form shows current name and color → user changes name and/or color → clicks "Save" → project updated in storage + queued for sync → all entries referencing this project reflect the new color immediately.

### UC-9.3 — Set Project Target Hours
**Actor:** Any user
**Component:** `SettingsView` → Data tab → Projects section → edit form
**Flow:** While editing a project, user enters a target hours value → saved to `Project.targetHours` → analytics views use this to display progress bars per project.

### UC-9.4 — Archive a Project
**Actor:** Any user
**Component:** `SettingsView` → Data tab → Projects section → archive button
**Flow:** User clicks "Archive" → confirmation dialog shown → user confirms → project marked `archived: true` → hidden from active project selectors → existing entries are preserved and still reference the archived project → archived projects shown in a collapsible "Show archived" section.

### UC-9.5 — Restore an Archived Project
**Actor:** Any user
**Component:** `SettingsView` → Data tab → archived projects section → restore button
**Flow:** User clicks "Restore" on an archived project → project marked `archived: false` → returns to active project list → immediately selectable in timer and entry forms.

---

## 10. Tags

### UC-10.1 — Create a Tag
**Actor:** Any user
**Component:** `SettingsView` → Data tab → Tags section
**Flow:** User clicks "+" → enters tag name → clicks "Add" → tag saved to storage → available in tag selectors during entry creation/editing. No limit on tag count.

### UC-10.2 — Edit a Tag
**Actor:** Any user
**Component:** `SettingsView` → Data tab → Tags section → edit button
**Flow:** User clicks "Edit" on a tag → inline text input shows current name → user modifies → clicks "Save" → tag updated in storage; all entries referencing this tag are updated via the `useTags` hook.

### UC-10.3 — Delete a Tag
**Actor:** Any user
**Component:** `SettingsView` → Data tab → Tags section → delete button
**Flow:** User clicks "Delete" → confirmation required → tag removed from storage → entries that referenced this tag have the tag field cleared.

---

## 11. Settings — General

### UC-11.1 — Change Theme
**Actor:** Any user
**Component:** `SettingsView` → General tab → Theme selector
**Flow:** User selects one of 7 options: Light Soft, Light Paper, Light Sepia, Dark Charcoal, Dark Mocha, Dark Midnight, or System → `useTheme()` applies the corresponding `data-theme` attribute and `.dark`/`.light` class to `<html>` → change takes effect immediately and persists to storage.

### UC-11.2 — Set Working Days
**Actor:** Any user
**Component:** `SettingsView` → General tab → Working Days radio
**Flow:** User selects 5, 6, or 7 days per week → affects "Daily Avg" calculation in Stats view and weekly target normalization.

### UC-11.3 — Set Week Start Day
**Actor:** Any user
**Component:** `SettingsView` → General tab → Week Start radio
**Flow:** User selects "Sunday" or "Monday" → affects day ordering in Week view, Stats bar chart, and the calendar heatmap.

### UC-11.4 — Toggle Notifications
**Actor:** Any user
**Component:** `SettingsView` → General tab → Notifications toggle
**Flow:** User toggles notifications on or off → when off, idle detection and weekly reminder notifications are suppressed; Pomodoro phase-change sounds still obey their own toggle.

### UC-11.5 — Set Daily Target Hours
**Actor:** Any user
**Component:** `SettingsView` → General tab → Daily Target input
**Flow:** User enters a numeric daily target (e.g., 8 h) → a progress bar appears in Timer view comparing today's logged hours to the target. Clearing the field disables the progress bar.

### UC-11.6 — Set Weekly Target Hours
**Actor:** Any user
**Component:** `SettingsView` → General tab → Weekly Target input
**Flow:** User enters a numeric weekly target → a progress bar appears in Week view comparing the week total to the target. Clearing the field disables it.

---

## 12. Settings — Timer

### UC-12.1 — Configure Idle Detection Timeout
**Actor:** Any user
**Component:** `SettingsView` → Timer tab → Idle Timeout input
**Flow:** User sets the idle threshold in minutes (1–60, default 5) → background service worker uses this value when evaluating `chrome.idle` state changes.

### UC-12.2 — Configure Pomodoro Durations
**Actor:** Any user
**Component:** `SettingsView` → Timer tab → Pomodoro section
**Flow:** User adjusts: work duration (1–120 min, default 25), short break (1–30 min, default 5), long break (1–60 min, default 15), sessions before long break (1–10, default 4) → saved to `Settings.pomodoroConfig` → applied on the next Pomodoro start.

### UC-12.3 — Toggle Pomodoro Sound
**Actor:** Any user
**Component:** `SettingsView` → Timer tab → Pomodoro → Sound toggle
**Flow:** User toggles sound on or off → when on, an audio cue plays on every phase transition (work→break, break→work).

### UC-12.4 — Configure Weekly Reminder
**Actor:** Any user (day/time customization requires Premium)
**Component:** `SettingsView` → Timer tab → Weekly Reminder section
**Flow:** User enables/disables the weekly reminder → free users get the reminder on Friday at 14:00 (fixed) → Premium users can also configure: day of week (0–6) and time (HH:MM format) → background schedules a Chrome alarm accordingly.

### UC-12.5 — Toggle Floating Widget Auto-Show
**Actor:** Any user
**Component:** `SettingsView` → Timer tab → Floating Widget toggle
**Flow:** User toggles "Floating Widget" on or off → when on (default), the floating widget appears automatically on every web page when the timer is running → when off, the widget only appears via the "Show Floating Widget" context menu item on the extension icon.

---

## 13. Cloud Sync (Premium)

### UC-13.1 — Automatic Background Sync
**Actor:** System (Premium authenticated user)
**Component:** `background.ts` → `sync/` engine
**Flow:** A `chrome.alarms` alarm fires every 5 minutes → background processes the `syncQueue` (push local changes in batches of 500) → pulls remote records with `updated_at > last_sync_cursor` → skips records that have pending local changes (queue-based conflict resolution) → updates local storage with remote changes → broadcasts updated state.

### UC-13.2 — Manual Sync
**Actor:** Premium authenticated user
**Component:** `SettingsView` → Account tab → "Sync now" button
**Flow:** User clicks "Sync now" → spinner shows → sync engine runs immediately (push then pull) → "Last synced" timestamp updates on completion → any sync errors are shown as toast notifications.

### UC-13.3 — Re-upload All Local Data
**Actor:** Premium authenticated user (recovery scenario)
**Component:** `SettingsView` → Account tab → "Re-upload all data" button
**Flow:** User clicks "Re-upload all data" → all local entries, projects, and tags are force-uploaded to Supabase in batches (ignoring the queue diff) → used to recover from sync corruption or after clearing cloud data. Success/failure shown via toast.

### UC-13.4 — Initial Sync on First Premium Login
**Actor:** New Premium user (first time authenticating with existing local data)
**Component:** `InitialSyncDialog` (rendered by `App.tsx`)
**Flow:** After first Premium login, if local data exists, a dialog appears showing the count of local entries/projects → user chooses "Sync Now" → data uploaded to cloud in batches (with 1 retry + 1s backoff per batch) → dialog closes → bidirectional sync begins. Alternatively, user clicks "Skip" to defer.

### UC-13.5 — Handle Account Switch
**Actor:** User (logs in with a different account than the current local data owner)
**Component:** `AccountSwitchModal` (rendered by `App.tsx`)
**Flow:** Background detects a different `user_id` in the new session → modal appears with three options:
- **"Clear"** — delete all local data, start fresh from the new account's cloud data.
- **"Merge"** — upload existing local data to the new account, then pull cloud data.
- **"Keep"** — retain local data as-is, disable sync (local-only mode).

---

## 14. Authentication

### UC-14.1 — Sign In via Website Bridge
**Actor:** Unauthenticated user
**Component:** `SettingsView` → Account tab → "Sign in" button → website `/login?ext=true`
**Flow:** User clicks "Sign in" → extension opens `WEBSITE_URL/login?ext=true` in a new tab → user authenticates on the website → website sends `AUTH_LOGIN` message via `chrome.runtime.sendMessageExternal` with `accessToken` + `refreshToken` → background stores tokens via Supabase `chromeStorageAdapter` → extension is now authenticated → Premium status checked and cached.

### UC-14.2 — Create Account via Website
**Actor:** Unauthenticated user
**Component:** `SettingsView` → Account tab → "Create account" button
**Flow:** User clicks "Create account" → extension opens `WEBSITE_URL/register?ext=true` → user registers on the website → same `AUTH_LOGIN` bridge flow as UC-14.1.

### UC-14.3 — View Account & Plan Info
**Actor:** Authenticated user
**Component:** `SettingsView` → Account tab
**Flow:** Shows: user email, avatar initial, current plan (Free / Monthly / Yearly / Lifetime) with a "PRO" badge for Premium users, and renewal/cancellation date if applicable.

### UC-14.4 — Upgrade to Premium
**Actor:** Free plan user
**Component:** `SettingsView` → Account tab → "Upgrade" button
**Flow:** User clicks "Upgrade" → extension opens `WEBSITE_URL/billing` in a new tab → user completes purchase on the website → Stripe webhook updates the subscription in Supabase → extension receives updated premium status on next sync or on re-open.

### UC-14.5 — Sign Out
**Actor:** Authenticated user
**Component:** `SettingsView` → Account tab → "Sign out" button
**Flow:** User clicks "Sign out" → Supabase session cleared from `chrome.storage.local` → subscription info and sync queue cleared → extension returns to unauthenticated state → local time entry data is preserved.

---

## 15. Floating Widget (Content Script)

### UC-15.1 — Auto-Show Widget When Timer Starts
**Actor:** System (when timer starts while `floatingTimerAutoShow: true`)
**Component:** `content.ts` (injected into all pages)
**Flow:** Background broadcasts `TIMER_SYNC` with a running state → content script receives the message → if `floatingTimerAutoShow` is enabled and the widget has not been manually dismissed in this session → widget renders in the page DOM (bottom-right by default) showing elapsed time, project name, and control buttons.

### UC-15.2 — Drag & Reposition Widget
**Actor:** Any user (widget visible)
**Component:** `content.ts` (drag handle)
**Flow:** User clicks and drags the widget's handle → widget follows cursor → on mouse release, new position saved to `chrome.storage.local` → position persists across page navigations and browser restarts.

### UC-15.3 — Minimize / Expand Widget
**Actor:** Any user (widget visible)
**Component:** `content.ts` (minimize toggle)
**Flow:** User clicks the minimize toggle → widget collapses to a compact pill showing only the elapsed time and a pulsing status dot → clicking again expands to full view with project name, pause, and stop buttons.

### UC-15.4 — Pause / Resume Timer from Widget
**Actor:** Any user (widget visible, timer running or paused)
**Component:** `content.ts` → `chrome.runtime.sendMessage` (`PAUSE_TIMER` / `RESUME_TIMER`)
**Flow:** User clicks ⏸ → `PAUSE_TIMER` sent to background → timer pauses → widget button switches to ▶. User clicks ▶ → `RESUME_TIMER` sent → timer resumes → button switches back to ⏸.

### UC-15.5 — Dismiss Widget
**Actor:** Any user (widget visible)
**Component:** `content.ts` (× close button)
**Flow:** User clicks "×" → widget removed from DOM → a session-level "dismissed" flag is set → widget will not auto-reappear for the current timer session even if `TIMER_SYNC` messages continue. The user can manually re-show it via the "Show Floating Widget" context menu item on the extension icon.

---

## 16. Notifications & Keyboard

### UC-16.1 — Pomodoro Phase-Change Notification
**Actor:** System (on Pomodoro phase transition)
**Component:** `background.ts` → `chrome.notifications`
**Flow:** When a work phase completes → Chrome notification: "Pomodoro #N Complete! Take a X-minute break." When a break phase completes → "Break Over! Time to focus." If sound is enabled, an audio cue plays alongside the notification.

### UC-16.2 — Idle Detection Notification
**Actor:** System (timer running, user goes idle)
**Component:** `background.ts` → `chrome.notifications`
**Flow:** When idle is detected → Chrome notification fires: "You were idle for X minute(s). Open the popup to keep or discard idle time." The notification persists until the user acts via the popup (UC-4.1).

### UC-16.3 — Weekly Reminder Notification
**Actor:** System (on configured day + time)
**Component:** `background.ts` → `chrome.alarms` + `chrome.notifications`
**Flow:** Alarm fires on the configured day and time (default: Friday 14:00) → Chrome notification: "Have you exported or recorded your work this week?" with buttons:
- **"✓ Done"** → dismisses and schedules the next weekly alarm.
- **"Remind me later"** → re-queues a 1-hour follow-up alarm.

### UC-16.4 — Keyboard Shortcuts
**Actor:** Any user (global shortcuts, works even when popup is closed)
**Component:** `useTimer.ts` + Chrome commands API
**Flow:**
- `Alt+Shift+O` — Open extension popup.
- `Alt+Shift+↑` — Start timer (if idle) or Stop timer (if running/paused).
- `Alt+Shift+↓` — Pause timer (if running) or Resume timer (if paused).
Shortcuts are registered in `manifest.json` and handled via `chrome.runtime` messages.

---

## Message Action Summary

The extension uses `chrome.runtime.sendMessage` (popup/content → background) and `chrome.tabs.sendMessage` (background → content) for all real-time communication.

| Action | Direction | Description |
|--------|-----------|-------------|
| `START_TIMER` | Popup → Background | Start a new stopwatch timer with entry metadata |
| `PAUSE_TIMER` | Popup / Content → Background | Pause the running timer |
| `RESUME_TIMER` | Popup / Content → Background | Resume a paused timer |
| `STOP_TIMER` | Popup / Content → Background | Stop timer and save entry |
| `GET_TIMER_STATE` | Popup / Content → Background | Fetch current timer state snapshot |
| `IDLE_KEEP` | Popup → Background | Accept idle time into the current entry |
| `IDLE_DISCARD` | Popup → Background | Remove idle time from the current entry |
| `START_POMODORO` | Popup → Background | Start a Pomodoro session with config |
| `STOP_POMODORO` | Popup → Background | Stop the active Pomodoro session |
| `SKIP_POMODORO_PHASE` | Popup → Background | Skip current work or break phase |
| `TIMER_SYNC` | Background → Popup / Content | Broadcast current timer state every second |
| `AUTH_LOGIN` | Website → Background (external) | Receive auth tokens after website login |

---

## Actor Summary

| Actor | Access Level | Key Capabilities |
|-------|-------------|-----------------|
| **Any user (no account)** | Offline | Full timer (stopwatch, manual, pomodoro), entry management, projects (≤5), tags, all settings, Week/Stats view, floating widget |
| **Free user (authenticated)** | Authenticated, free plan | Same as above; account tab visible; sync and export locked |
| **Premium user** | Authenticated + active subscription | All features: unlimited projects, full history export (CSV/Excel), cloud sync, multi-device Realtime, monthly heatmap, customizable weekly reminder time |
| **System (background)** | Service worker | Periodic sync, idle detection, Pomodoro phase management, weekly reminder alarms, `TIMER_SYNC` broadcast |
| **Website → Extension bridge** | `chrome.runtime.onMessageExternal` | Sends `AUTH_LOGIN` with access + refresh tokens after user authenticates on the companion website |
