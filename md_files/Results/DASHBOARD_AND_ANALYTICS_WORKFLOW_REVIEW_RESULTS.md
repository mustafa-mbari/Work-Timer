# Production Readiness Engineering Review: Dashboard & Analytics Workflow

**Reviewer:** Principal Software Engineer (Gemini CLI)  
**Date:** March 6, 2026  
**Status:** Action Required

---

## 1. System Architecture

### [Medium] Hardcoded Plan Tiers in SQL Logic
**Location:** `supabase/migrations/040_consolidated_schema.sql` (Lines 1005, 1083)  
**Problem:** The `get_group_analytics` function contains hardcoded logic checking for plans using `LIKE 'allin_%'`.  
**Impact:** If the marketing team changes plan names or introduces new tiers, the group analytics will silently break.  
**Recommended Fix:** Use the `plan_roles` table to map plans to role buckets (e.g., `team`) and check for the required role instead.

### [Low] Tight Coupling of Admin Repository and Auth Service
**Location:** `admin/lib/repositories/admin.ts` -> `getAllAuthUsers`  
**Problem:** The admin repository relies on paginating through the internal Supabase Auth user list for platform-wide aggregates.  
**Impact:** Poor separation of concerns; the repository should query the `profiles` table for metadata.  
**Recommended Fix:** Migrate user count and "new users this week" logic to a single SQL query on the `profiles` table.

### [High] Sequential Data Fetching in Web Dashboard
**Location:** `web/app/(authenticated)/dashboard/page.tsx`  
**Problem:** The dashboard performs a large `Promise.all` for basic data, but then *awaits* that before making a second `getUserTimeEntries` call for the weekly data.  
**Impact:** This adds a sequential waterfall delay to the page load. The total time to interactive is the sum of the longest request in the first batch plus the second request.  
**Recommended Fix:** Determine the date range *before* the first batch of requests and include the weekly entries fetch in the initial `Promise.all`.

---

## 2. Production Safety

### [High] Security Definer and Service Role Risk
**Location:** `web/lib/repositories/analytics.ts` and `supabase/migrations/040_consolidated_schema.sql`  
**Problem:** The `get_user_analytics` RPC is `SECURITY DEFINER` and uses `createServiceClient()` (service_role key).  
**Impact:** These functions bypass RLS and will fetch data for *any* UUID passed to them. If exposed via a public endpoint without strict validation, it leads to full data exposure.  
**Recommended Fix:** Move `auth.uid() = p_user_id` validation *inside* the SQL functions.

### [Medium] Non-Atomic Dashboard Stats
**Location:** `admin/app/(admin)/page.tsx`  
**Problem:** Recent users are sorted and sliced *in-memory* after fetching the entire user list.  
**Impact:** Inconsistent state if the user list is large or if the fetch is partial. More importantly, it's a massive performance sink.  
**Recommended Fix:** Use a dedicated SQL query with `ORDER BY created_at DESC LIMIT 10`.

---

## 3. Serverless Constraints

### [Critical] Memory Exhaustion & Timeout in Admin Dashboard
**Location:** `admin/app/(admin)/page.tsx` & `admin/lib/repositories/admin.ts`  
**Problem:** Both the Admin Overview and Admin Stats fetch *every auth user* into memory to calculate simple counts and "Recent Sign-ups".  
**Impact:** At 10,000 users, the Vercel function will crash with an "Out of Memory" error or timeout. This is a critical failure point for platform growth.  
**Recommended Fix:**  
1.  Replace `authUsers.length` with a `COUNT(*)` query on the `profiles` table.  
2.  Replace the in-memory sort/slice for "Recent Sign-ups" with a limited SQL query.

---

## 4. Performance & Scalability

### [High] N+1 (7+) Roundtrips for Dashboard Load
**Location:** `web/app/(authenticated)/dashboard/page.tsx`  
**Problem:** Each dashboard load triggers 7-8 separate database requests (Subscriptions, Cursors, Entries, Projects, Tags, Stats, Settings).  
**Impact:** High connection overhead and latency. Each request has its own cold-start risk and network roundtrip.  
**Recommended Fix:** Consolidate these into a single `get_dashboard_bootstrap_data(user_id)` RPC that returns a combined JSON object.

### [High] Inefficient Platform Stats Aggregation
**Location:** `supabase/migrations/040_consolidated_schema.sql` -> `get_platform_stats()`  
**Problem:** The function runs 5 independent subqueries on the `time_entries` table.  
**Impact:** Triggers 5 separate table scans/index lookups.  
**Recommended Fix:** Use a single `SELECT` statement with multiple aggregates.

---

## 5. Memory & Resource Usage

### [Medium] Over-fetching in Web Dashboard
**Location:** `web/app/(authenticated)/dashboard/page.tsx`  
**Problem:** The `getUserTimeEntries` for the week fetches up to 500 entries at once.  
**Impact:** For heavy users, this transfers a significant amount of JSON data that may not even be visible on the "Overview" tab.  
**Recommended Fix:** Implement virtualization or stricter limits on the number of entries returned for the initial dashboard view.

---

## 6. Rate Limiting & Abuse Protection

### [High] Missing Protection on Expensive Dashboard/Analytics RPCs
**Location:** `web/lib/repositories/analytics.ts`  
**Problem:** Resource-intensive RPCs lack rate limiting in the Next.js layer.  
**Impact:** Potential for DoS via script-based spamming of these endpoints.  
**Recommended Fix:** Apply the existing Upstash Redis rate limiter to all analytics and dashboard bootstrap endpoints.

---

## 7. Security Review

### [Medium] Exposure of PII in Group Analytics
**Location:** `supabase/migrations/040_consolidated_schema.sql` -> `get_group_analytics`  
**Problem:** Returns full emails for all group members.  
**Impact:** Potential privacy violation for team members.  
**Recommended Fix:** Mask emails (e.g., `j***@company.com`) for non-admin group members.

---

## 8. Background Jobs & Async Workflows
*No specific background jobs found; dashboard data is fetched synchronously.*

---

## 9. Edge Cases & Failure Modes

### [Medium] UTC vs. Local Time Discrepancy
**Location:** `supabase/migrations/040_consolidated_schema.sql`  
**Problem:** SQL functions use `current_date` without timezone awareness.  
**Impact:** Streaks and daily charts shift at midnight UTC, which is confusing for users in other timezones.  
**Recommended Fix:** Pass the user's timezone to the RPC and use it for date calculations.

---

## Final Engineering Assessment

### 1. Top Critical Risks
*   **Admin Platform Growth:** The Admin dashboard will crash once the user base exceeds memory limits (est. 5k-10k users).
*   **Security Bypass:** `SECURITY DEFINER` functions lack internal `auth.uid()` checks.

### 2. Architectural Improvements
*   **Consolidation:** Move from 7+ sequential dashboard fetches to a single "Bootstrap" RPC.
*   **Logic Migration:** Move "Recent Sign-ups" and "Conversion Rate" logic from the Node.js layer to SQL.

### 3. Performance Improvements
*   Eliminate the sequential waterfall in `DashboardPage` by calculating dates first.
*   Optimize `get_platform_stats` to use a single scan.

### 4. Security Hardening
*   Enforce `auth.uid()` checks inside all `SECURITY DEFINER` functions.
*   Apply rate limits to all data-heavy authenticated endpoints.
