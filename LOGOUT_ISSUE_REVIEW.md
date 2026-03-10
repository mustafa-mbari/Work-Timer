# Review: Unexpected User Logout Issue

## Issue Description
User reported being logged out twice:
1.  Once at the start of the day.
2.  Again 1 hour and 45 minutes after starting a series of timers (one 1h timer, followed by a 45m timer).

**User Mandate:** Automatic logout should never happen unless the plan has ended or expired.

---

## Technical Root Cause Analysis

After reviewing `src/auth/authState.ts` and `src/background/background.ts`, I have identified the logic responsible for this behavior.

### 1. The "7-Day Free Session" Policy
In `src/auth/authState.ts`, there is a hardcoded function named `checkFreeSessionExpiry`. This function enforces a 7-day maximum session duration for users on the "Free" plan.

```typescript
// src/auth/authState.ts

const FREE_SESSION_MAX_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function checkFreeSessionExpiry(): Promise<boolean> {
  const session = await getSession()
  if (!session) return false

  // Logic to skip check for Premium users
  const sub = await getCachedSubscription()
  const isActive = sub && (sub.status === 'active' || sub.status === 'trialing') && sub.plan !== 'free'
  const isUnexpired = !sub?.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date()
  if (isActive && isUnexpired) return false

  const result = await chrome.storage.local.get(LAST_LOGIN_KEY)
  const loginAt = result[LAST_LOGIN_KEY] as number | undefined
  
  // ... (omitted migration logic)

  if (Date.now() - loginAt > FREE_SESSION_MAX_MS) {
    console.log('[work-timer] Free session expired (7 days). Auto-logging out.')
    await signOut() // This triggers the logout
    return true
  }

  return false
}
```

### 2. The Trigger Mechanism
This check is executed by an hourly alarm in the background service worker:

```typescript
// src/background/background.ts

if (alarm.name === SUBSCRIPTION_ALARM) { // Runs every 60 minutes
  const session = await getSession()
  if (session) {
    const loggedOut = await checkFreeSessionExpiry()
    if (loggedOut) {
      teardownRealtime()
      await chrome.alarms.clear(SYNC_ALARM)
      // ...
      return
    }
    // ...
  }
}
```

### 3. Why it happened after 1h 45m
The `LAST_LOGIN_KEY` is only updated when a user enters their credentials (or logs in via the website). It is **not** updated during active use of the extension or when the Supabase token is refreshed.

*   **Scenario:** If a user's last "Login" event was 6 days, 22 hours, and 15 minutes ago, they are still within the 7-day limit.
*   **Activity:** They open the app today. 1 hour and 45 minutes pass.
*   **Logout:** The `SUBSCRIPTION_ALARM` triggers. The code calculates that `Date.now() - loginAt` is now greater than 7 days. It calls `signOut()`, clearing the session while the user is actively working.

---

## Conclusion

The issue is caused by a deliberate "Auto-Logout" feature intended for free users that:
1.  **Violates the mandate** that users should remain logged in.
2.  **Does not track activity**, only the initial login timestamp, leading to logouts during active sessions.

## Recommendation

To resolve this issue according to the user mandate:
1.  **Remove the 7-day expiry logic** from `checkFreeSessionExpiry`.
2.  Ensure that the only logout trigger is a failed `refreshSession` (which happens if the account is deleted or the password changed) or an explicit plan expiration check.
3.  The check for `isUnexpired` plan should remain, as it correctly handles the "plan end/expired" condition.
