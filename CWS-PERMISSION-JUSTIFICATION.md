# Chrome Web Store — Permission Justification

Extension: **Work Timer** (v1.0.0)

This document explains why each Chrome API permission and host permission is required, as requested by Chrome Web Store review guidelines.

---

## API Permissions

### `storage`
**Used for:** Persisting all user data locally — time entries, projects, tags, settings, timer state, and sync queue.
**Code references:** `src/storage/index.ts`, `src/background/storage.ts`, `src/sync/syncQueue.ts`
**Justification:** Core data storage. The extension is offline-first; all data lives in `chrome.storage.local` as the primary store. Without this permission the extension cannot save any user data.

### `alarms`
**Used for:** Scheduling periodic and deferred background tasks in the service worker.
**Code references:** `src/background/background.ts`, `src/background/timerEngine.ts`, `src/background/pomodoroEngine.ts`, `src/background/reminders.ts`
**Specific alarms:**
- `timer-tick` — update badge text at minute boundaries while timer is running
- `pomodoro-tick` — advance pomodoro phases (work → break → work)
- `sync-periodic` — cloud sync every 15 minutes (premium users)
- `sync-debounce` — debounced sync after entry saves (10 seconds)
- `subscription-refresh` — refresh subscription status every 6 hours
- `stats-sync` — push usage stats every 60 minutes
- `weekly-reminder` — optional weekly timesheet reminder notification

**Justification:** MV3 service workers do not support `setTimeout`/`setInterval` across wake cycles. `chrome.alarms` is the only reliable way to schedule recurring work.

### `notifications`
**Used for:** Displaying user-facing notifications for timer events.
**Code references:** `src/background/background.ts`, `src/background/pomodoroEngine.ts`, `src/background/reminders.ts`
**Specific notifications:**
- Pomodoro phase transitions (work → break, break → work)
- Entry discarded (too short to save)
- Weekly timesheet reminder
- Keyboard shortcut feedback (timer started/paused/stopped)

**Justification:** Users need feedback when timer state changes happen in the background (e.g., pomodoro phase ends while user is in another tab).

### `idle`
**Used for:** Detecting when the user goes idle so the extension can prompt them about what to do with tracked time.
**Code references:** `src/background/idleDetection.ts`, `src/background/background.ts`
**Justification:** If a user starts a timer and walks away, the extension detects idle state and presents options: keep the idle time, discard it, or split the entry. This prevents inaccurate time tracking.

### `tabs`
**Used for:** Sending `TIMER_SYNC` messages to content scripts in specific tabs (targeted broadcast to registered tabs, not all tabs).
**Code references:** `src/background/ui.ts` (broadcastTimerSync)
**Justification:** The floating timer widget in content scripts needs real-time state updates when the timer starts, pauses, or stops.

### `contextMenus`
**Used for:** Adding right-click menu items for quick timer control.
**Code references:** `src/background/contextMenus.ts`, `src/background/background.ts`
**Menu items:**
- "Start/Stop Timer" — toggle timer from any page
- "Pause/Resume Timer" — pause or resume
- "Show Floating Timer" — toggle the floating widget visibility

**Justification:** Provides convenient timer controls without requiring the user to open the popup.

---

## Content Script Injection (`content_scripts.matches`)

### `<all_urls>` (content script only — NOT `host_permissions`)

**Used for:** Two features that need to work on every website:
1. **Floating timer widget** — An always-visible mini timer that overlays any page, allowing users to see elapsed time and control the timer without opening the popup
2. **Auth bridge relay** — Content script relays authentication tokens from the companion website (w-timer.com) to the extension via `postMessage`

**Code references:** `src/content/content.ts`
**Justification:** The floating timer widget is a core UX feature — users can track time while working on any website. The content script renders in a Shadow DOM to avoid CSS conflicts and only creates DOM elements when the timer is active.

> **Note:** This extension does NOT request `host_permissions`. The content script uses the declarative `content_scripts` manifest field. The auth bridge only activates on w-timer.com pages. The floating widget is user-dismissible and respects the `floatingTimerAutoShow` setting.

---

## External Messaging

### `externally_connectable.matches`
```json
["https://w-timer.com/*", "https://www.w-timer.com/*"]
```
**Used for:** Direct `chrome.runtime.sendMessage` from the companion website for authentication.
**Code references:** `src/background/background.ts` (onMessageExternal handler)
**Justification:** The companion website sends auth tokens (login/logout) directly to the extension. This is more reliable than the content script relay and is restricted to the official website domain only.

---

## Content Security Policy

```json
"script-src 'self'; object-src 'none'"
```
**Justification:** Restricts extension pages to only run scripts bundled with the extension. No inline scripts, no eval, no external script sources. This is the strictest practical CSP for MV3.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+O` | Open popup |
| `Alt+Shift+Up` | Start or stop timer |
| `Alt+Shift+Down` | Pause or resume timer |

These are user-configurable via `chrome://extensions/shortcuts`.
