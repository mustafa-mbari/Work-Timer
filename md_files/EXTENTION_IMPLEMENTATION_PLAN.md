# Work-Timer Chrome Extension — Use Cases

> All current use cases for the Chrome Extension (`src/`).[file:1]
> Last updated: 2026-02-18.[file:1]

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
17. [Message Action Summary](#17-message-action-summary)
18. [Actor Summary](#18-actor-summary)

---

## 1. Timer — Stopwatch Mode

### UC-1.1 — Start Stopwatch Timer
**Actor:** Any user (timer idle or paused)  
**Component:** `TimerView` → `background.ts` (`START_TIMER`)  
**Flow:** User optionally selects project, enters description, tag, and/or link → clicks "Start" → background starts accumulating elapsed time → badge shows elapsed time → `TIMER_SYNC` broadcast updates popup and floating widget every second.[file:1]

### UC-1.2 — Pause Running Timer
**Actor:** Any user (timer running)  
**Component:** `TimerView` → `background.ts` (`PAUSE_TIMER`)  
**Flow:** User clicks "Pause" (amber) → elapsed time freezes → background stores accumulated duration → badge reflects paused state. Keyboard shortcut: `Alt+Shift+↓`.[file:1]

### UC-1.3 — Resume Paused Timer
**Actor:** Any user (timer paused)  
**Component:** `TimerView` → `background.ts` (`RESUME_TIMER`)  
**Flow:** User clicks "Resume" (green) → background resumes accumulating from the stored duration → `TIMER_SYNC` resumes ticking. Keyboard shortcut: `Alt+Shift+↓`.[file:1]

### UC-1.4 — Stop Timer & Save Entry
**Actor:** Any user (timer running or paused)  
**Component:** `TimerView` → `background.ts` (`STOP_TIMER`)  
**Flow:** User clicks "Stop" (red) → background creates a `TimeEntry` (startTime, endTime, duration, projectId, description, tags, link, type: `'stopwatch'`) → saved to `chrome.storage.local` under `entries_YYYY-MM-DD` → timer resets → if Premium + authenticated, entry pushed to sync queue → floating widget hides. Keyboard shortcut: `Alt+Shift+↑`.[file:1]

### UC-1.5 — Continue Previous Entry
**Actor:** Any user (timer idle)  
**Component:** `EntryList` (play icon per entry)  
**Flow:** User clicks the play icon on any today's entry → timer starts pre-filled with that entry's project and description → creates a new, separate `TimeEntry` (does not modify the original).[file:1]

### UC-1.6 — Prevent Overlapping Timers
**Actor:** Any user (multi-device, Premium with sync)  
**Component:** `background.ts` → sync + timer state  
**Flow:** When user clicks "Start" while there is a running or paused timer detected from another device → background checks latest synced timer state → if overlapping active timer found → confirmation dialog appears: "You already have an active timer on another device for [project]. Stop it and start a new one?" → options: "Stop remote & start here", "Keep remote running", "Cancel" → chosen action applied to timer state.

### UC-1.7 — Smart Continue Last Task
**Actor:** Any user (timer idle, no entries yet today)  
**Component:** `TimerView` (idle state banner)  
**Flow:** On opening popup, extension reads last non-empty `TimeEntry` (from previous day) → shows a "Resume last project" pill with project name and truncated description → clicking pill immediately starts a new stopwatch with that project and description pre-filled.

### UC-1.8 — Auto-Stop Long-Running Timers
**Actor:** System  
**Component:** `background.ts`  
**Flow:** Background periodically checks running timer duration against a configurable max duration (default 12h) → if exceeded, timer is automatically paused → Chrome notification appears: "Timer paused after a long session. Resume if you're still working." → user can resume from popup or widget; entry remains editable.

---

## 2. Timer — Manual Entry Mode

### UC-2.1 — Add Manual Entry (Time Range)
**Actor:** Any user  
**Component:** `TimerView` → mode toggle "Manual" → sub-mode "Time Range"  
**Flow:** User selects mode "Manual" → picks date (date picker, defaults to today), sets "From" and "To" times → optionally selects project, tag, description, link → clicks "Save Entry" → `TimeEntry` created with `type: 'manual'` and calculated duration → saved locally + queued for sync if Premium.[file:1]

### UC-2.2 — Add Manual Entry (Duration)
**Actor:** Any user  
**Component:** `TimerView` → mode toggle "Manual" → sub-mode "Duration"  
**Flow:** User selects sub-mode "Duration" → enters hours (0–23) and minutes (0–59) → optionally selects project, tag, description, link → clicks "Save Entry" → `TimeEntry` created with `type: 'manual'`, `endTime = now`, `startTime = now − duration`.[file:1]

### UC-2.3 — Quick-Add From Presets
**Actor:** Any user  
**Component:** `TimerView` → Manual mode → presets row  
**Flow:** Under manual mode, extension shows the last three used combinations (project + duration + tags) as clickable chips → user clicks a chip → form auto-fills with saved values (date defaults to today) → user can modify any field → clicks "Save Entry" to create new `TimeEntry`.

### UC-2.4 — Overlap Warning on Save
**Actor:** Any user  
**Component:** `TimerView` → Manual mode  
**Flow:** On clicking "Save Entry", background checks for significant overlap with existing entries on the same day → if overlap above threshold (e.g., more than 10 minutes overlapping) → inline warning appears: "This overlaps with an existing entry [project, time range]. Save anyway?" → user can confirm to save or cancel to adjust times.

---

## 3. Timer — Pomodoro Mode

### UC-3.1 — Start Pomodoro Session
**Actor:** Any user (timer idle)  
**Component:** `TimerView` → mode toggle "Pomodoro" → `background.ts` (`START_POMODORO`)  
**Flow:** User selects mode "Pomodoro" → optionally selects project and description → clicks "Start Focus" → background begins a work phase (default 25 min) → circular progress ring shows countdown (indigo for work, green for break) → session counter displayed → badge turns purple with countdown → phases cycle automatically: Work → Short Break → Work → … (every N sessions) → Long Break → Work.[file:1]

### UC-3.2 — Skip Pomodoro Phase
**Actor:** Any user (Pomodoro active)  
**Component:** `TimerView` → `background.ts` (`SKIP_POMODORO_PHASE`)  
**Flow:** During a work phase, user clicks "Break" → immediately transitions to the next break phase. During a break phase, user clicks "Focus" → immediately transitions to the next work phase. Session count adjusts accordingly.[file:1]

### UC-3.3 — Stop Pomodoro Session
**Actor:** Any user (Pomodoro active)  
**Component:** `TimerView` → `background.ts` (`STOP_POMODORO`)  
**Flow:** User clicks "Stop" → completed work-phase time is saved as a `TimeEntry` with `type: 'pomodoro'` → session ends → timer returns to idle → any in-progress break is discarded.[file:1]

### UC-3.4 — Project-Based Pomodoro Profiles
**Actor:** Any user  
**Component:** `SettingsView` → Timer tab → Pomodoro section  
**Flow:** User can save named Pomodoro profiles containing work/break/long-break durations and sessions-before-long-break → while in Pomodoro mode, choosing a project that has a preferred profile auto-selects that profile → starting Pomodoro uses that configuration.

### UC-3.5 — Daily Pomodoro Goal
**Actor:** Any user  
**Component:** `TimerView` → Pomodoro subheader  
**Flow:** User sets a daily Pomodoro sessions goal in Settings → Pomodoro view shows progress indicator (e.g., "3 / 6 sessions completed" with small ring around timer) → each completed work phase increments counter → reaching goal shows a subtle celebratory state (e.g., checkmark icon).

---

## 4. Idle Detection

### UC-4.1 — Handle Idle Time Prompt
**Actor:** Any user (timer running, user goes idle)  
**Component:** `TimerView` (idle banner) → `background.ts` (`IDLE_KEEP` / `IDLE_DISCARD`)  
**Flow:** Chrome idle API detects inactivity beyond the configured idle timeout (default 5 min) → background fires a Chrome notification → when user reopens popup, an idle banner appears: "You were idle for [duration]" with two options:  
- **"Keep Time"** → sends `IDLE_KEEP` → idle duration is included in the final entry (timer continues from original start).  
- **"Discard"** → sends `IDLE_DISCARD` → idle duration is subtracted; timer adjusts effective start time.[file:1]

### UC-4.2 — Application Ignore List
**Actor:** Any user  
**Component:** `TimerView` (idle banner) → Settings  
**Flow:** Idle banner includes option "Ignore idle for this app/site" when triggered from a known window or active tab → choosing it records rule (e.g., domain, app name) in settings → future idle events while that app/site is active are silently ignored so timer continues without prompting.

### UC-4.3 — Idle Reason Tagging
**Actor:** Any user  
**Component:** `TimerView` (idle banner)  
**Flow:** Idle banner offers dropdown for reason (Lunch, Meeting, Break, Personal, Other) before user chooses "Keep Time" → selecting a reason automatically adds a corresponding tag (e.g., `#lunch`, `#meeting`) to resulting `TimeEntry` → stats can later filter by these reasons.

---

## 5. Entry Management

### UC-5.1 — Edit a Time Entry
**Actor:** Any user  
**Component:** `EntryEditModal` (opened from `EntryList` or `WeekView`)  
**Flow:** User clicks an entry → `EntryEditModal` slides up → user can switch between "From/To" (start/end time with HH:MM:SS precision) and "Duration" (hours:minutes:seconds) edit modes → also editable: project, tag, description, link → clicks "Save" → entry updated in `chrome.storage.local` + queued for sync. Pressing Escape closes without saving.[file:1]

### UC-5.2 — Delete a Time Entry
**Actor:** Any user  
**Component:** `EntryEditModal`  
**Flow:** User clicks "Delete" inside the edit modal → a confirmation button "Confirm Delete" appears → user confirms → entry removed from `chrome.storage.local` + queued for deletion in sync.[file:1]

### UC-5.3 — Add Entry to a Past Date (Week View)
**Actor:** Any user  
**Component:** `WeekView` → `AddEntryModal` (plus icon per day row)  
**Flow:** User clicks the "+" icon next to any day in the week view → `AddEntryModal` opens pre-set to that date → same fields as manual entry (time range or duration, project, tag, description, link) → clicks "Save" → entry created for that specific date.[file:1]

### UC-5.4 — Duplicate Entry
**Actor:** Any user  
**Component:** `EntryEditModal`  
**Flow:** Inside `EntryEditModal`, user clicks "Duplicate" → extension opens a new entry form pre-filled with all fields from the original entry (project, description, tags, link, duration) but with date/time defaulting to today and "now" → user adjusts as needed → clicks "Save" to create a new `TimeEntry`.

### UC-5.5 — Bulk Delete Day
**Actor:** Any user  
**Component:** `WeekView` → day header context menu  
**Flow:** User opens context menu on a day's header (three dots) → chooses "Delete all entries for this day" → confirmation dialog shows total number of entries and total duration for that day → on confirm, all matching entries are removed locally and queued for deletion in sync engine.

---

## 6. Week View

### UC-6.1 — Browse Time Entries by Week
**Actor:** Any user  
**Component:** `WeekView` (popup tab "Week")  
**Flow:** User switches to the Week tab → sees all entries grouped by day for the current week, with each day's total duration → entries are listed chronologically per day → week total shown at the top.[file:1]

### UC-6.2 — Navigate to Previous / Next Week
**Actor:** Any user  
**Component:** `WeekView` (arrow buttons)  
**Flow:** User clicks "←" or "→" arrows → week view shifts one week back or forward → entries for the selected week are loaded from `chrome.storage.local` → free plan users can access full local history (no date restriction in the extension itself).[file:1]

### UC-6.3 — Return to Current Week
**Actor:** Any user  
**Component:** `WeekView` ("Today" / home button)  
**Flow:** User clicks the "Today" button → week view snaps back to the current week.[file:1]

### UC-6.4 — View Week Goal Progress
**Actor:** Any user (if weekly target is set)  
**Component:** `WeekView` (progress bar)  
**Flow:** If a weekly target is configured in Settings, the week view shows a progress bar comparing actual hours to the weekly target. No hard cap is enforced; it is for reference only.[file:1]

### UC-6.5 — Filter Week by Project / Tag
**Actor:** Any user  
**Component:** `WeekView` → filter controls  
**Flow:** Week view includes filter dropdowns for Project and Tag → when user selects any filter combination, only matching entries are displayed per day → day and week totals recalculate based on filtered subset → clearing filters restores full view.

### UC-6.6 — Highlight Overtime/Undertime Days
**Actor:** Any user with daily target configured  
**Component:** `WeekView`  
**Flow:** For each day, total duration is compared to configured daily target → days below target visually marked (e.g., red underline), days above target marked green → hovering or tapping shows tooltip "Target 8h, logged 5.5h (−2.5h)" or similar.

---

## 7. Stats & Analytics

### UC-7.1 — View Daily & Weekly Summary Cards
**Actor:** Any user  
**Component:** `StatsView` (popup tab "Stats")  
**Flow:** User switches to Stats tab → sees three summary cards: "Today" (total hours logged today), "This Week" (week aggregate), and "Daily Avg" (average hours on days with at least one entry).[file:1]

### UC-7.2 — View Weekly Bar Chart
**Actor:** Any user  
**Component:** `StatsView` (Recharts bar chart)  
**Flow:** Bar chart displays hours logged per day of the current week. Days with no entries show as 0. X-axis uses configurable week start day.[file:1]

### UC-7.3 — View Today by Project (Pie Chart)
**Actor:** Any user  
**Component:** `StatsView` (Recharts pie chart)  
**Flow:** Pie chart shows the proportion of today's tracked time split by project. Only rendered when today's entries exist.[file:1]

### UC-7.4 — View Monthly Calendar Heatmap
**Actor:** Premium user only  
**Component:** `StatsView` → `CalendarHeatmap`  
**Flow:** A calendar grid for the current month shows each day's intensity (color saturation proportional to hours logged). User can navigate months with "←" / "→" buttons. Free users see an upgrade prompt in place of the heatmap.[file:1]

### UC-7.5 — Navigate Heatmap Months
**Actor:** Premium user  
**Component:** `CalendarHeatmap` (arrow buttons)  
**Flow:** User clicks "←" or "→" → heatmap re-renders for the adjacent month → entries loaded from local storage for that month.[file:1]

### UC-7.6 — Compare to Previous Week
**Actor:** Any user  
**Component:** `StatsView` → Weekly bar chart  
**Flow:** User toggles "Compare previous week" option → bar chart overlays a secondary, lighter-colored bar for each day representing previous week's value → below chart, text summary appears (e.g., "+3.2h vs last week") to highlight difference.

### UC-7.7 — Streaks Overview
**Actor:** Any user  
**Component:** `StatsView` → Streaks widget  
**Flow:** Stats view displays "Current streak" and "Best streak" based on consecutive days with at least a configurable minimum of logged time (e.g., 30 minutes) → user can adjust minimum threshold in Settings → when user breaks streak, next day resets current streak counter while best streak is preserved.

---

## 8. Export (Premium)

### UC-8.1 — Export to CSV
**Actor:** Premium user  
**Component:** `ExportMenu` (dropdown, visible in Week and Stats views)  
**Flow:** User clicks "Export" → dropdown shows → user selects "CSV (.csv)" → `export.ts` collects entries for the visible date range → file downloaded as `work-timer-YYYY-MM-DD-YYYY-MM-DD.csv` with columns: date, start, end, duration, project, description, tags. Free users see an upgrade prompt instead of the export button.[file:1]

### UC-8.2 — Export to Excel
**Actor:** Premium user  
**Component:** `ExportMenu` (dropdown)  
**Flow:** User selects "Excel (.xlsx)" → `xlsx` library dynamically imported → workbook generated with entry rows (same columns as CSV) plus a summary sheet → downloaded as `work-timer-YYYY-MM-DD-YYYY-MM-DD.xlsx`. The xlsx bundle is loaded on demand (not in the initial chunk).[file:1]

### UC-8.3 — Saved Export Presets
**Actor:** Premium user  
**Component:** `ExportMenu` → "Save as preset"  
**Flow:** After configuring date range and filters (project, tag), user can click "Save as preset", name it, and save → presets appear as quick actions inside Export dropdown → selecting a preset immediately runs export with its stored configuration.

### UC-8.4 — Background Export with Notification
**Actor:** Premium user  
**Component:** `background.ts` → export engine  
**Flow:** For large export ranges (e.g., > 6 months), export runs as background job via service worker → popup shows "Export running…" state and can be closed → when export completes, Chrome notification appears with buttons "Download CSV" and/or "Download Excel" that trigger file download.

---

## 9. Projects

### UC-9.1 — Create a Project
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → Projects section  
**Flow:** User clicks the "+" icon → enters project name → selects a color from the 16-color palette → clicks "Add" → project saved to storage → immediately available in project selectors. Free plan: max 5 active projects enforced by `ProjectLimitError`; exceeding the limit shows an upgrade prompt.[file:1]

### UC-9.2 — Edit a Project
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → Projects section → edit button  
**Flow:** User clicks "Edit" on a project → inline form shows current name and color → user changes name and/or color → clicks "Save" → project updated in storage + queued for sync → all entries referencing this project reflect the new color immediately.[file:1]

### UC-9.3 — Set Project Target Hours
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → Projects section → edit form  
**Flow:** While editing a project, user enters a target hours value → saved to `Project.targetHours` → analytics views use this to display progress bars per project.[file:1]

### UC-9.4 — Archive a Project
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → Projects section → archive button  
**Flow:** User clicks "Archive" → confirmation dialog shown → user confirms → project marked `archived: true` → hidden from active project selectors → existing entries are preserved and still reference the archived project → archived projects shown in a collapsible "Show archived" section.[file:1]

### UC-9.5 — Restore an Archived Project
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → archived projects section → restore button  
**Flow:** User clicks "Restore" on an archived project → project marked `archived: false` → returns to active project list → immediately selectable in timer and entry forms.[file:1]

### UC-9.6 — Favorite Projects
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → Projects section; `TimerView` selectors  
**Flow:** User can toggle a star icon on any project to mark it as favorite → favorite projects appear pinned at top of project selectors (Timer, Manual, Pomodoro, AddEntryModal) and optionally in a "Quick Projects" row in Timer view → un-starring returns project to normal position.

### UC-9.7 — Client / Category Grouping
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → Projects section → advanced edit  
**Flow:** While editing a project, user can optionally assign a "Client" or "Category" label → stats gain "By Client" aggregation that groups hours across all projects belonging to the same client/category → Week and Export filters can also filter by these labels.

---

## 10. Tags

### UC-10.1 — Create a Tag
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → Tags section  
**Flow:** User clicks "+" → enters tag name → clicks "Add" → tag saved to storage → available in tag selectors during entry creation/editing. No limit on tag count.[file:1]

### UC-10.2 — Edit a Tag
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → Tags section → edit button  
**Flow:** User clicks "Edit" on a tag → inline text input shows current name → user modifies → clicks "Save" → tag updated in storage; all entries referencing this tag are updated via the `useTags` hook.[file:1]

### UC-10.3 — Delete a Tag
**Actor:** Any user  
**Component:** `SettingsView` → Data tab → Tags section → delete button  
**Flow:** User clicks "Delete" → confirmation required → tag removed from storage → entries that referenced this tag have the tag field cleared.[file:1]

### UC-10.4 — Suggested Tags from History
**Actor:** Any user  
**Component:** Tag selector (Timer/Manual/Edit modals)  
**Flow:** When user focuses tag input and starts typing, extension displays most frequently used tags that match typed prefix, along with a "Recently used" group for last few tags → clicking a suggestion adds it to entry.

### UC-10.5 — Tagging Shortcuts
**Actor:** Any user  
**Component:** Tag selector  
**Flow:** Tag selector supports keyboard navigation (ArrowUp/ArrowDown) and `Enter` to select highlighted suggestion → popular tags can be pinned as chips below the input for 1-click addition, improving speed for recurring workflows.

---

## 11. Settings — General

### UC-11.1 — Change Theme
**Actor:** Any user  
**Component:** `SettingsView` → General tab → Theme selector  
**Flow:** User selects one of 7 options: Light Soft, Light Paper, Light Sepia, Dark Charcoal, Dark Mocha, Dark Midnight, or System → `useTheme()` applies the corresponding `data-theme` attribute and `.dark`/`.light` class to `<html>` → change takes effect immediately and persists to storage.[file:1]

### UC-11.2 — Set Working Days
**Actor:** Any user  
**Component:** `SettingsView` → General tab → Working Days radio  
**Flow:** User selects 5, 6, or 7 days per week → affects "Daily Avg" calculation in Stats view and weekly target normalization.[file:1]

### UC-11.3 — Set Week Start Day
**Actor:** Any user  
**Component:** `SettingsView` → General tab → Week Start radio  
**Flow:** User selects "Sunday" or "Monday" → affects day ordering in Week view, Stats bar chart, and the calendar heatmap.[file:1]

### UC-11.4 — Toggle Notifications
**Actor:** Any user  
**Component:** `SettingsView` → General tab → Notifications toggle  
**Flow:** User toggles notifications on or off → when off, idle detection and weekly reminder notifications are suppressed; Pomodoro phase-change sounds still obey their own toggle.[file:1]

### UC-11.5 — Set Daily Target Hours
**Actor:** Any user  
**Component:** `SettingsView` → General tab → Daily Target input  
**Flow:** User enters a numeric daily target (e.g., 8 h) → a progress bar appears in Timer view comparing today's logged hours to the target. Clearing the field disables the progress bar.[file:1]

### UC-11.6 — Set Weekly Target Hours
**Actor:** Any user  
**Component:** `SettingsView` → General tab → Weekly Target input  
**Flow:** User enters a numeric weekly target → a progress bar appears in Week view comparing the week total to the target. Clearing the field disables it.[file:1]

### UC-11.7 — Settings Profiles (Work / Personal)
**Actor:** Any user  
**Component:** `SettingsView` → General tab → Profiles section  
**Flow:** User creates named profiles (e.g., "Office", "Freelance") each storing working days, week start, and daily/weekly targets → active profile can be switched from Settings or small dropdown in popup footer → stats and week calculations react to currently active profile.

### UC-11.8 — Import / Export Settings
**Actor:** Any user  
**Component:** `SettingsView` → General tab → Import/Export settings  
**Flow:** User can export all configuration (themes, week config, targets, Pomodoro, widget visibility rules, etc.) as a JSON file → on another browser, user imports that JSON to instantly mirror same setup (without transferring time entries).

---

## 12. Settings — Timer

### UC-12.1 — Configure Idle Detection Timeout
**Actor:** Any user  
**Component:** `SettingsView` → Timer tab → Idle Timeout input  
**Flow:** User sets the idle threshold in minutes (1–60, default 5) → background service worker uses this value when evaluating `chrome.idle` state changes.[file:1]

### UC-12.2 — Configure Pomodoro Durations
**Actor:** Any user  
**Component:** `SettingsView` → Timer tab → Pomodoro section  
**Flow:** User adjusts: work duration (1–120 min, default 25), short break (1–30 min, default 5), long break (1–60 min, default 15), sessions before long break (1–10, default 4) → saved to `Settings.pomodoroConfig` → applied on the next Pomodoro start.[file:1]

### UC-12.3 — Toggle Pomodoro Sound
**Actor:** Any user  
**Component:** `SettingsView` → Timer tab → Pomodoro → Sound toggle  
**Flow:** User toggles sound on or off → when on, an audio cue plays on every phase transition (work→break, break→work).[file:1]

### UC-12.4 — Configure Weekly Reminder
**Actor:** Any user (day/time customization requires Premium)  
**Component:** `SettingsView` → Timer tab → Weekly Reminder section  
**Flow:** User enables/disables the weekly reminder → free users get the reminder on Friday at 14:00 (fixed) → Premium users can also configure: day of week (0–6) and time (HH:MM format) → background schedules a Chrome alarm accordingly.[file:1]

### UC-12.5 — Toggle Floating Widget Auto-Show
**Actor:** Any user  
**Component:** `SettingsView` → Timer tab → Floating Widget toggle  
**Flow:** User toggles "Floating Widget" on or off → when on (default), the floating widget appears automatically on every web page when the timer is running → when off, the widget only appears via the "Show Floating Widget" context menu item on the extension icon.[file:1]

### UC-12.6 — Per-Mode Defaults
**Actor:** Any user  
**Component:** `SettingsView` → Timer tab → Default mode section  
**Flow:** User selects default timer mode (Stopwatch / Manual / Pomodoro) globally and optionally per day of week → when popup opens, Timer view starts in the mode matching current day’s default → manual switching still possible.

### UC-12.7 — Do Not Disturb Window
**Actor:** Any user  
**Component:** `SettingsView` → Timer tab → Do Not Disturb section  
**Flow:** User sets a time window (e.g., 22:00–07:00) during which time-based notifications (Pomodoro, weekly reminder, export completion) are muted → timers continue to work normally, but no sounds or system notifications are fired within that window.

---

## 13. Cloud Sync (Premium)

### UC-13.1 — Automatic Background Sync
**Actor:** System (Premium authenticated user)  
**Component:** `background.ts` → `sync/` engine  
**Flow:** A `chrome.alarms` alarm fires every 5 minutes → background processes the `syncQueue` (push local changes in batches of 500) → pulls remote records with `updated_at > last_sync_cursor` → skips records that have pending local changes (queue-based conflict resolution) → updates local storage with remote changes → broadcasts updated state.[file:1]

### UC-13.2 — Manual Sync
**Actor:** Premium authenticated user  
**Component:** `SettingsView` → Account tab → "Sync now" button  
**Flow:** User clicks "Sync now" → spinner shows → sync engine runs immediately (push then pull) → "Last synced" timestamp updates on completion → any sync errors are shown as toast notifications.[file:1]

### UC-13.3 — Re-upload All Local Data
**Actor:** Premium authenticated user (recovery scenario)  
**Component:** `SettingsView` → Account tab → "Re-upload all data" button  
**Flow:** User clicks "Re-upload all data" → all local entries, projects, and tags are force-uploaded to Supabase in batches (ignoring the queue diff) → used to recover from sync corruption or after clearing cloud data. Success/failure shown via toast.[file:1]

### UC-13.4 — Initial Sync on First Premium Login
**Actor:** New Premium user (first time authenticating with existing local data)  
**Component:** `InitialSyncDialog` (rendered by `App.tsx`)  
**Flow:** After first Premium login, if local data exists, a dialog appears showing the count of local entries/projects → user chooses "Sync Now" → data uploaded to cloud in batches (with 1 retry + 1s backoff per batch) → dialog closes → bidirectional sync begins. Alternatively, user clicks "Skip" to defer.[file:1]

### UC-13.5 — Handle Account Switch
**Actor:** User (logs in with a different account than the current local data owner)  
**Component:** `AccountSwitchModal` (rendered by `App.tsx`)  
**Flow:** Background detects a different `user_id` in the new session → modal appears with three options:  
- **"Clear"** — delete all local data, start fresh from the new account's cloud data.  
- **"Merge"** — upload existing local data to the new account, then pull cloud data.  
- **"Keep"** — retain local data as-is, disable sync (local-only mode).[file:1]

### UC-13.6 — Sync Status Indicator
**Actor:** Premium authenticated user  
**Component:** App shell → header status icon  
**Flow:** App shell shows a small sync icon with states: idle (gray), syncing (spinning), failed (red) → hovering shows tooltip "Last synced X minutes ago" or latest error → clicking opens Sync Log modal listing last N sync runs and any errors encountered.

### UC-13.7 — Conflict Resolution UI
**Actor:** Premium authenticated user  
**Component:** `SyncConflictModal`  
**Flow:** When sync engine detects conflicting edits to the same entry (local and remote both changed since last sync), extension queues them into conflict list → user sees banner "Some entries need your review" → opening `SyncConflictModal` shows per-entry comparison (local vs cloud fields) with options "Keep local", "Keep cloud", "Merge" (e.g., keep max duration and latest description) → chosen resolution applied and synced.

---

## 14. Authentication

### UC-14.1 — Sign In via Website Bridge
**Actor:** Unauthenticated user  
**Component:** `SettingsView` → Account tab → "Sign in" button → website `/login?ext=true`  
**Flow:** User clicks "Sign in" → extension opens `WEBSITE_URL/login?ext=true` in a new tab → user authenticates on the website → website sends `AUTH_LOGIN` message via `chrome.runtime.sendMessageExternal` with `accessToken` + `refreshToken` → background stores tokens via Supabase `chromeStorageAdapter` → extension is now authenticated → Premium status checked and cached.[file:1]

### UC-14.2 — Create Account via Website
**Actor:** Unauthenticated user  
**Component:** `SettingsView` → Account tab → "Create account" button  
**Flow:** User clicks "Create account" → extension opens `WEBSITE_URL/register?ext=true` → user registers on the website → same `AUTH_LOGIN` bridge flow as UC-14.1.[file:1]

### UC-14.3 — View Account & Plan Info
**Actor:** Authenticated user  
**Component:** `SettingsView` → Account tab  
**Flow:** Shows: user email, avatar initial, current plan (Free / Monthly / Yearly / Lifetime) with a "PRO" badge for Premium users, and renewal/cancellation date if applicable.[file:1]

### UC-14.4 — Upgrade to Premium
**Actor:** Free plan user  
**Component:** `SettingsView` → Account tab → "Upgrade" button  
**Flow:** User clicks "Upgrade" → extension opens `WEBSITE_URL/billing` in a new tab → user completes purchase on the website → Stripe webhook updates the subscription in Supabase → extension receives updated premium status on next sync or on re-open.[file:1]

### UC-14.5 — Sign Out
**Actor:** Authenticated user  
**Component:** `SettingsView` → Account tab → "Sign out" button  
**Flow:** User clicks "Sign out" → Supabase session cleared from `chrome.storage.local` → subscription info and sync queue cleared → extension returns to unauthenticated state → local time entry data is preserved.[file:1]

### UC-14.6 — Handle Expired / Invalid Tokens
**Actor:** Any user  
**Component:** `background.ts` → auth middleware; `SettingsView` → Account tab  
**Flow:** When Supabase returns 401 or refresh token is invalid, background marks session as "expired" but keeps all local data → Account tab shows clear banner "Session expired — sign in again to resume sync and Premium" with primary "Sign in" button leading back through website bridge.

### UC-14.7 — Multiple Browser Profiles Awareness
**Actor:** Premium user using multiple Chrome profiles  
**Component:** `SettingsView` → Account tab  
**Flow:** Sync engine stores per-profile identifier; when user logs in on another profile with same email, Account tab shows label like "Device: Work Profile" vs "Personal Profile" to clarify where data is syncing from, reducing confusion when managing multiple environments.

---

## 15. Floating Widget (Content Script)

### UC-15.1 — Auto-Show Widget When Timer Starts
**Actor:** System (when timer starts while `floatingTimerAutoShow: true`)  
**Component:** `content.ts` (injected into all pages)  
**Flow:** Background broadcasts `TIMER_SYNC` with a running state → content script receives the message → if `floatingTimerAutoShow` is enabled and the widget has not been manually dismissed in this session → widget renders in the page DOM (bottom-right by default) showing elapsed time, project name, and control buttons.[file:1]

### UC-15.2 — Drag & Reposition Widget
**Actor:** Any user (widget visible)  
**Component:** `content.ts` (drag handle)  
**Flow:** User clicks and drags the widget's handle → widget follows cursor → on mouse release, new position saved to `chrome.storage.local` → position persists across page navigations and browser restarts.[file:1]

### UC-15.3 — Minimize / Expand Widget
**Actor:** Any user (widget visible)  
**Component:** `content.ts` (minimize toggle)  
**Flow:** User clicks the minimize toggle → widget collapses to a compact pill showing only the elapsed time and a pulsing status dot → clicking again expands to full view with project name, pause, and stop buttons.[file:1]

### UC-15.4 — Pause / Resume Timer from Widget
**Actor:** Any user (widget visible, timer running or paused)  
**Component:** `content.ts` → `chrome.runtime.sendMessage` (`PAUSE_TIMER` / `RESUME_TIMER`)  
**Flow:** User clicks ⏸ → `PAUSE_TIMER` sent to background → timer pauses → widget button switches to ▶. User clicks ▶ → `RESUME_TIMER` sent → timer resumes → button switches back to ⏸.[file:1]

### UC-15.5 — Dismiss Widget
**Actor:** Any user (widget visible)  
**Component:** `content.ts` (× close button)  
**Flow:** User clicks "×" → widget removed from DOM → a session-level "dismissed" flag is set → widget will not auto-reappear for the current timer session even if `TIMER_SYNC` messages continue. The user can manually re-show it via the "Show Floating Widget" context menu item on the extension icon.[file:1]

### UC-15.6 — Per-Site Visibility Rules
**Actor:** Any user  
**Component:** `content.ts` → widget menu; `SettingsView` → Timer tab  
**Flow:** From widget menu, user can choose "Hide on this site" or "Always show on this site" → extension stores rule keyed by domain (and optionally path) → auto-show logic respects these rules, allowing users to keep widget off on distracting sites and always visible on key work tools.

### UC-15.7 — Compact Focus Mode
**Actor:** Any user  
**Component:** `content.ts` → widget layout toggle  
**Flow:** Widget provides "Focus mode" option that switches to minimal layout with only timer text and two buttons (Pause, Stop), hiding project name and metadata → mode persists per site/session and is ideal for full-screen apps where visual noise must be minimized.

---

## 16. Notifications & Keyboard

### UC-16.1 — Pomodoro Phase-Change Notification
**Actor:** System (on Pomodoro phase transition)  
**Component:** `background.ts` → `chrome.notifications`  
**Flow:** When a work phase completes → Chrome notification: "Pomodoro #N Complete! Take a X-minute break." When a break phase completes → "Break Over! Time to focus." If sound is enabled, an audio cue plays alongside the notification.[file:1]

### UC-16.2 — Idle Detection Notification
**Actor:** System (timer running, user goes idle)  
**Component:** `background.ts` → `chrome.notifications`  
**Flow:** When idle is detected → Chrome notification fires: "You were idle for X minute(s). Open the popup to keep or discard idle time." The notification persists until the user acts via the popup (UC-4.1).[file:1]

### UC-16.3 — Weekly Reminder Notification
**Actor:** System (on configured day + time)  
**Component:** `background.ts` → `chrome.alarms` + `chrome.notifications`  
**Flow:** Alarm fires on the configured day and time (default: Friday 14:00) → Chrome notification: "Have you exported or recorded your work this week?" with buttons:  
- **"✓ Done"** → dismisses and schedules the next weekly alarm.  
- **"Remind me later"** → re-queues a 1-hour follow-up alarm.[file:1]

### UC-16.4 — Keyboard Shortcuts
**Actor:** Any user (global shortcuts, works even when popup is closed)  
**Component:** `useTimer.ts` + Chrome commands API  
**Flow:**  
- `Alt+Shift+O` — Open extension popup.  
- `Alt+Shift+↑` — Start timer (if idle) or Stop timer (if running/paused).  
- `Alt+Shift+↓` — Pause timer (if running) or Resume timer (if paused).  
Shortcuts are registered in `manifest.json` and handled via `chrome.runtime` messages.[file:1]

### UC-16.5 — Per-Notification Type Controls
**Actor:** Any user  
**Component:** `SettingsView` → General tab → Notifications section  
**Flow:** Instead of a single toggle, user sees checkboxes for each notification type (Pomodoro, Idle Detection, Weekly Reminder, Export Completed) plus sound options per type → changes are persisted and notification engine respects these user-level preferences.

### UC-16.6 — Context-Aware Shortcuts in Popup
**Actor:** Any user (popup focused)  
**Component:** `TimerView` / `StatsView` / `WeekView`  
**Flow:** When popup is open, additional keyboard interactions apply locally without interfering with global shortcuts, e.g., Space toggles Start/Pause, `R` resets Pomodoro phase, Arrow keys navigate tabs between Timer/Week/Stats, `Esc` closes modals.

---

## 17. Message Action Summary

The extension uses `chrome.runtime.sendMessage` (popup/content → background) and `chrome.tabs.sendMessage` (background → content) for all real-time communication, plus `chrome.runtime.sendMessageExternal` for website → extension auth bridge.[file:1]

| Action              | Direction                        | Description                                      |
|---------------------|----------------------------------|--------------------------------------------------|
| `START_TIMER`       | Popup → Background               | Start a new stopwatch timer with entry metadata  |
| `PAUSE_TIMER`       | Popup / Content → Background     | Pause the running timer                          |
| `RESUME_TIMER`      | Popup / Content → Background     | Resume a paused timer                            |
| `STOP_TIMER`        | Popup / Content → Background     | Stop timer and save entry                        |
| `GET_TIMER_STATE`   | Popup / Content → Background     | Fetch current timer state snapshot               |
| `IDLE_KEEP`         | Popup → Background               | Accept idle time into the current entry          |
| `IDLE_DISCARD`      | Popup → Background               | Remove idle time from the current entry          |
| `START_POMODORO`    | Popup → Background               | Start a Pomodoro session with config             |
| `STOP_POMODORO`     | Popup → Background               | Stop the active Pomodoro session                 |
| `SKIP_POMODORO_PHASE` | Popup → Background             | Skip current work or break phase                 |
| `TIMER_SYNC`        | Background → Popup / Content     | Broadcast current timer state every second       |
| `AUTH_LOGIN`        | Website → Background (external)  | Receive auth tokens after website login          |

*(New UX flows above reuse the same message actions; no new low-level commands are required at this stage.)*

---

## 18. Actor Summary

| Actor                         | Access Level                    | Key Capabilities |
|------------------------------|----------------------------------|------------------|
| **Any user (no account)**    | Offline                          | Full timer (stopwatch, manual, pomodoro), entry management, projects (≤5), tags, all settings, Week/Stats view, floating widget.[file:1] |
| **Free user (authenticated)**| Authenticated, free plan         | Same as above; account tab visible; sync and export locked.[file:1] |
| **Premium user**             | Authenticated + active subscription | All features: unlimited projects, full history export (CSV/Excel), cloud sync, multi-device Realtime, monthly heatmap, customizable weekly reminder time.[file:1] |
| **System (background)**      | Service worker                   | Periodic sync, idle detection, Pomodoro phase management, weekly reminder alarms, `TIMER_SYNC` broadcast.[file:1] |
| **Website → Extension bridge** | `chrome.runtime.onMessageExternal` | Sends `AUTH_LOGIN` with access + refresh tokens after user authenticates on the companion website.[file:1] |
