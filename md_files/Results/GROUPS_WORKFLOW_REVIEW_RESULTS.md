# Production Readiness Engineering Review: Groups Workflow

**Review Date:** March 6, 2026  
**Status:** Deep Technical Audit Complete  
**System Assumptions:** Vercel (Serverless), Supabase (Managed Backend), Real users at scale.

---

## 1. System Architecture

**Severity:** Medium  
**Location:** `web/lib/repositories/groups.ts` and `web/lib/repositories/groupShares.ts`  
**Problem:** Excessive use of `createServiceClient` (service role) for all operations, bypassing Supabase RLS.  
**Impact:** Authorization logic is manually implemented in repository/API code. A single bug in a manual check (e.g., forgetting to check `group_id` membership) leads to data exposure.  
**Recommended Fix:** Migrate to using the anon client (with user token) wherever possible and rely on Supabase RLS for row-level protection. Use service role only for operations that strictly cannot be performed by a user (e.g., bulk system-wide audits).

**Severity:** Low  
**Location:** `web/app/api/groups/route.ts`  
**Problem:** Business logic (quota checking, subscription checking) is tightly coupled with API handlers.  
**Impact:** Difficult to reuse logic for background jobs or other interfaces.  
**Recommended Fix:** Extract quota and subscription checks into a dedicated `GroupService` domain layer.

---

## 2. Production Safety & Data Integrity

**Severity: Critical**  
**Location:** `web/app/api/groups/[id]/shares/route.ts` (GET method)  
**Problem:** Non-atomic, non-idempotent "lazy" resource creation.  
**Impact:** Concurrent GET requests (e.g., from two UI components or two tabs) will result in multiple "open" share requests for the same period. Since there is no UNIQUE constraint in the database, data corruption (duplicate shares) will occur.  
**Recommended Fix:** 
1. Add a unique constraint to `group_shares` on `(group_id, user_id, date_from, date_to, period_type)` for 'open' shares.
2. Remove side-effects from GET handlers. Use a dedicated POST or background worker to create share requests.

**Severity: High**  
**Location:** `web/lib/repositories/groups.ts` (createGroup)  
**Problem:** Partial writes/Atomic failure.  
**Impact:** If inserting a group succeeds but adding the owner to `group_members` fails (e.g., DB connection drop), an "orphan" group is created with no owner.  
**Recommended Fix:** Wrap group creation in a Postgres Transaction or use a Supabase RPC to ensure atomicity.

**Severity: High**  
**Location:** Supabase RLS Policies (`026_group_shares.sql`)  
**Problem:** Insecure RLS policies (`FOR ALL USING (user_id = auth.uid())`).  
**Impact:** Users can delete their own shares AFTER they are approved/submitted, or insert shares into groups they don't belong to. This destroys the audit trail and allows for data pollution.  
**Recommended Fix:** Refine RLS policies:
- `INSERT`: Check if user is a member of the group.
- `DELETE`: Only allow if status is 'open'.
- `UPDATE`: Only allow specific fields (e.g., entries, project_ids) and only if status is 'open'.

---

## 3. Serverless Constraints & Performance

**Severity: High**  
**Location:** `web/lib/repositories/groupShares.ts` (createGroupShare, submitShare)  
**Problem:** Loading potentially large datasets into memory.  
**Impact:** Fetching ALL `time_entries` for a month into a Vercel function's memory. If a user has thousands of entries, this will exceed memory limits (128MB/256MB default) and crash the request.  
**Recommended Fix:** Implement stream-based processing or, preferably, use an RPC to perform the snapshot/aggregation entirely inside the database.

**Severity: High**  
**Location:** `web/lib/repositories/groupShares.ts` (getGroupShares)  
**Problem:** "Select *" on large JSONB snapshots.  
**Impact:** Fetching the full `entries` JSON for ALL shares in a group. As a group grows, this response will reach many MBs, causing slow response times, bandwidth costs, and client-side memory lag.  
**Recommended Fix:** Modify list endpoints to exclude the large `entries` field. Provide a detail-only endpoint for viewing the full snapshot.

---

## 4. Scalability

**Severity: Medium**  
**Location:** `web/lib/repositories/groups.ts` (getUserGroups)  
**Problem:** N+1-like behavior for member counts.  
**Impact:** Fetches all members of all groups a user belongs to just to count them. If a user is in many large groups, this query becomes slow.  
**Recommended Fix:** Use a View or an RPC with `count(*)` grouped by `group_id` to fetch counts efficiently.

**Severity: Medium**  
**Location:** `web/lib/repositories/groupShares.ts` (adminBulkCreateOpenShares)  
**Problem:** Memory-heavy check before bulk insert.  
**Impact:** Fetches all member settings and existing shares into memory to find "skipped" entries. This scales poorly as group size increases.  
**Recommended Fix:** Use `INSERT INTO ... SELECT ... WHERE NOT EXISTS` or a single RPC to handle bulk creation entirely in Postgres.

---

## 5. Security & Authorization

**Severity: Medium**  
**Location:** `web/lib/repositories/groupShares.ts` (submitShare / reviewShare)  
**Problem:** Inconsistent internal authorization.  
**Impact:** Repositories assume the caller has checked permissions. If a new API route or background job calls these without explicit checks, authorization bypass occurs.  
**Recommended Fix:** Ensure repositories or a service layer verify that the `userId` is still a member/admin of the `groupId` before allowing updates.

**Severity: Low**  
**Location:** `web/lib/repositories/groups.ts`  
**Problem:** Plaintext Join Codes.  
**Impact:** While short-lived, join codes are stored in plain text. If the database is leaked, any group can be joined.  
**Recommended Fix:** Add expiration dates to join codes or move to a more secure invitation-only model.

---

## 6. Background Jobs & Operational Reliability

**Severity: Medium**  
**Location:** `web/app/api/groups/[id]/shares/route.ts`  
**Problem:** Lack of automated scheduling (Lazy triggering).  
**Impact:** If a user doesn't log in, their "open share" isn't created, leading to missing data in admin dashboards/reports.  
**Recommended Fix:** Implement a real Cron job (via Vercel Cron or GitHub Actions) that calls `adminBulkCreateOpenShares` for groups with active schedules.

---

## 7. Testing & Reliability

**Severity: High**  
**Location:** Entire `groups` functionality.  
**Problem:** Zero automated test coverage.  
**Impact:** High regression risk. Complex sharing/snapshot logic is not verified against edge cases (e.g., date boundaries, empty entries, permission changes).  
**Recommended Fix:** 
1. Add integration tests for `submitShare` and `reviewShare`.
2. Add unit tests for `getCurrentPeriodDates` logic.
3. Add API tests for permission boundaries.

---

## Final Engineering Assessment

### 1. Top Critical Risks
- **Duplicate Share Corruption:** The race condition in share creation will lead to messy data that is hard to clean up.
- **Memory Exhaustion:** Fetching all entries into serverless memory is a ticking time bomb for power users.
- **RLS Bypassing:** Over-reliance on the service role and manual checks increases the chance of security leaks.

### 2. Architectural Improvements
- **Domain Layer:** Move from "API calls Repository" to "API calls Service calls Repository" to centralize auth and quota logic.
- **RPC Usage:** Move snapshot creation and aggregation logic into Postgres RPCs to save memory and bandwidth.

### 3. Performance Improvements
- **Proactive Fetching:** Use Cron jobs instead of lazy-loading share requests.
- **Payload Optimization:** Remove the `entries` blob from all list-view API responses.

### 4. Security Hardening
- **Refine RLS:** Limit DELETE and UPDATE on `group_shares` based on status.
- **Verified Repositories:** Ensure all data modification methods check current membership status.

### 5. Serverless Optimization
- **Timeouts:** Long-running queries (e.g., bulk fetching entries) should be moved to background jobs or optimized with RPCs to avoid function timeouts.

### 6. Refactoring Opportunities
- **Shared Date Logic:** Centralize period calculation logic used by both the UI and the API.
- **Consolidated Summary:** Add "today's hours" to the main `get_group_members_summary` RPC to avoid the extra API call on the admin dashboard.

---
**Reviewer Note:** This system is functional but fragile. It is optimized for the initial launch but will face significant stability and performance issues as soon as groups grow beyond 10-20 members or users accumulate several months of data. **Fixing the duplicate share race condition and payload sizes is mandatory before scaling to production.**
