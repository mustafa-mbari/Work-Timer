# Production Readiness Engineering Review: Entry Workflow

**Reviewer:** Principal / Staff Software Engineer
**Date:** March 6, 2026
**Focus:** Entry Workflow (Stopwatch, Manual, Pomodoro), Sync Engine, and API Security.

---

## 1. Non-Atomic Storage Operations (Extension)

**Severity**
Critical

**Location**
`src/background/storage.ts` -> `saveTimeEntry`, `updateTimeEntry`, `setTimerState`

**Problem**
The extension uses a "Read-Modify-Write" pattern for storage. It fetches an array from `chrome.storage.local`, modifies it in memory, and writes it back. This is not atomic.

**Impact**
High risk of data corruption or loss during concurrent operations. For example, if a timer stops (saving an entry) at the same millisecond a sync completes (updating entries), one write will overwrite the other.

**Recommended Fix**
Implement a lock/mutex for storage operations or move to a "Command Queue" pattern where all storage writes are serialized through a single worker. Alternatively, store each entry under its own unique key (e.g., `entry:{id}`) to eliminate array-level collisions.

---

## 2. Manual Timestamp Management

**Severity**
High

**Location**
`web/lib/repositories/timeEntries.ts` -> `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntries`

**Problem**
`updated_at` and `created_at` timestamps are manually set in JavaScript code rather than by the database.

**Impact**
If a developer forgets to update `updated_at` in a new repository method, the Sync Engine (which relies on `updated_at > lastSyncAt`) will never pull that change to other devices, causing permanent state divergence.

**Recommended Fix**
Implement PostgreSQL triggers in Supabase to automatically manage `updated_at`. Remove manual timestamp logic from all repository functions to ensure consistency.

---

## 3. Unprotected API Endpoints

**Severity**
High

**Location**
`web/app/api/entries/route.ts`

**Problem**
The core Time Entry API endpoints lack rate limiting. While the extension uses a debounced sync, a malicious actor or a bug (infinite loop) in the extension could flood the API.

**Impact**
Database exhaustion, increased Supabase costs, and potential denial of service for other users. The current in-memory `rateLimit.ts` is ineffective in a serverless (Vercel) environment.

**Recommended Fix**
Implement global, distributed rate limiting in `middleware.ts` using a service like **Upstash Redis** or **Vercel KV**.
Also we needd to add rate limiting based on the plan type (free, pro, etc.), like free users can only make 200 requests per month. pro users can make 2000 requests per month. and premium users can make 2500 requests per month.

---

## 4. Unbounded Delta Pulling

**Severity**
Medium

**Location**
`src/sync/syncEngine.ts` -> `pullDelta`

**Problem**
The sync engine attempts to fetch up to 50,000 entries in a single range query (`range(0, 49999)`).

**Impact**
For power users with years of data, a "clear cache" or new device login could trigger a payload that exceeds Vercel's response limits or crashes the Extension Service Worker due to memory exhaustion.

**Recommended Fix**
Implement chunked pagination in the pull logic. Fetch and process deltas in batches (e.g., 1000 items) and update the local `syncCursor` incrementally.

---

## 5. Lack of Centralized Observability

**Severity**
High

**Location**
Global / Extension & Web

**Problem**
There is no centralized logging or error tracking. Errors are logged to the local console, which is inaccessible for production debugging.

**Impact**
Critical failures (sync loops, Stripe webhook errors, RLS violations) go unnoticed until users complain. Root cause analysis is nearly impossible without user-provided logs.

**Recommended Fix**
Integrate **Sentry** for error tracking across both Web and Extension. Use a structured logging provider like **Axiom** for server-side logs to enable rapid querying of production incidents.

---

## 6. Inefficient Data Aggregation

**Severity**
Medium

**Location**
`web/lib/repositories/timeEntries.ts` -> `getTodayTotalDuration`

**Problem**
The system fetches all individual row data and performs a `.reduce()` in JavaScript to calculate totals.

**Impact**
Inefficient bandwidth and CPU usage. As a user's daily entries grow (e.g., many short Pomodoro sessions), the overhead increases linearly.

**Recommended Fix**
Use SQL `SUM()` aggregation or a dedicated RPC to perform the calculation on the database side.

---

## 7. Pomodoro Phase Edge Cases

**Severity**
Medium

**Location**
`src/background/pomodoroEngine.ts` -> `advancePomodoroPhase`

**Problem**
The phase logic for `accumWork` and `remainingWork` is complex and relies heavily on the volatile state of the Service Worker.

**Impact**
Service Worker restarts or browser crashes during a "remaining work" segment (after a manual skip) can lead to lost "accumulated" time if the state isn't perfectly persisted and recovered.

**Recommended Fix**
Refactor the Pomodoro state to be more "stateless." Store the "Target End Time" and "Total Expected Work" rather than tracking "Accumulated" time in a running counter. Increase unit test coverage for SW restart scenarios.

---

# Final Engineering Assessment

### 1. Top Critical Risks
- **Race Conditions in Storage:** The non-atomic array updates in the extension are the most likely source of reported "missing data" bugs.
- **API Vulnerability:** Lack of rate limiting on the entries API is a significant operational risk.

### 2. Architectural Improvements
- **Unified Domain Library:** Create a shared package for date/time logic (Stopwatch/Pomodoro math) to ensure identical behavior in the Extension (Client) and Web Dashboard (Server).
- **Event-Driven Sync:** Consider moving from periodic polling to a more reactive sync pattern for Premium users to reduce Supabase load.

### 3. Performance Improvements
- **SQL Aggregations:** Offload all duration summing and analytics to Supabase RPCs.
- **Lazy Loading:** Ensure the Dashboard only fetches the data visible in the active tab to reduce cold-start latency.

### 4. Security Hardening
- **DB-Enforced Constraints:** Use PostgreSQL triggers for timestamps and RLS for all "Group Share" operations to prevent cross-user data leakage.
- **Service Role Audit:** Ensure `createServiceClient` is only used in strictly necessary webhook/admin paths.

### 5. Serverless Optimization
- **Edge Runtime:** Evaluate if the Entries API can run on the Edge Runtime to reduce cold starts and latency for global users.
- **Metadata Caching:** Cache Stripe Price IDs to avoid environment variable lookups on every webhook hit.

### 6. Refactoring Opportunities
- **Type Consolidation:** Merge the Extension `src/types` and Web `lib/shared/types` into a single shared TypeScript library.
- **Repository Pattern:** Standardize all Admin and Web data access through the same repository layer to avoid logic duplication.
