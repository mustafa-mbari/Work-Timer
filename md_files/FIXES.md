# Fixes Log

## Vercel Deployment Failures (Feb 2026)

After upgrading Next.js 15 to 16.1.6 and updating all web dependencies (Stripe v17 to v20, Supabase SSR, Zod, etc.), the Vercel deployment broke with multiple cascading errors.

### Root Cause: Corrupted `package-lock.json`

The `web/` directory's `package-lock.json` had 5 packages symlinked to the root pnpm store instead of being properly installed:

```
@tailwindcss/postcss -> ../node_modules/.pnpm/@tailwindcss+postcss@4.1.18/...
postcss -> ../node_modules/.pnpm/postcss@8.5.6/...
tailwindcss -> ../node_modules/.pnpm/tailwindcss@4.1.18/...
typescript -> ../node_modules/.pnpm/typescript@5.9.3/...
@fontsource-variable/inter -> ../node_modules/.pnpm/@fontsource-variable+inter@5.2.8/...
```

This happened because the root directory uses pnpm (`pnpm-lock.yaml`) while `web/` uses npm (`package-lock.json`). Running `npm install` in `web/` created symlinks to pnpm's store instead of installing the packages properly.

On Vercel, with "Include files outside the Root Directory" disabled, the parent directory (`../node_modules/.pnpm/...`) doesn't exist, so those 5 packages were never actually installed (156 packages instead of 175).

**Fix:** Deleted `package-lock.json` and `node_modules/`, then ran `npm install` to regenerate a clean lock file with no symlinks.

### Error 1: `Cannot find module '@tailwindcss/postcss'`

- **Appeared with both Turbopack and webpack**
- Next.js's `plugins.js` uses `require.resolve()` to find PostCSS plugins, which failed because the package was a broken symlink
- Many config workarounds were tried (`require.resolve` in postcss.config.js, `--webpack` flag, `outputFileTracingRoot`) — none worked because the package simply wasn't installed

### Error 2: `Module not found: Can't resolve '@/components/ui/button'`

- **Appeared with webpack mode**
- The `@/` path alias (tsconfig `paths`) wasn't resolving on Vercel
- Initially thought to be a workspace root inference issue, but was actually caused by missing `typescript` package (also a broken symlink)
- A webpack alias (`config.resolve.alias['@'] = __dirname`) was added as a workaround but wasn't needed after fixing the lock file

### Error 3: `Cannot find name 'chrome'`

- **TypeScript error** in `ExtensionBridge.tsx` which uses `chrome.runtime.sendMessage`
- The web project didn't have Chrome extension type definitions
- Previously worked because the old lock file pulled types from the root pnpm store
- **Fix:** Added a minimal `web/chrome.d.ts` type declaration file

### Additional Changes Made

- **`web/` made self-contained:** Copied `shared/types.ts` and `shared/constants.ts` into `web/lib/shared/` and updated 10 import statements from `@shared/*` to `@/lib/shared/*`. This removed the dependency on files outside the `web/` directory.
- **Vercel setting:** Disabled "Include files outside the Root Directory" since `web/` no longer references parent files.
- **Config simplified:** `next.config.js` reduced to empty config, `postcss.config.js` uses standard string plugin format, build uses default Turbopack (no `--webpack` flag).

### Stripe v20 Breaking Changes (during upgrade)

- `Subscription.current_period_end` moved to item-level: `sub.items.data[0]?.current_period_end`
- `Invoice.subscription` moved to `invoice.parent?.subscription_details?.subscription`

### Lesson Learned

When a monorepo mixes package managers (pnpm at root, npm in subdirectory), always verify `package-lock.json` doesn't contain symlinks to the other package manager's store. If in doubt, delete `package-lock.json` and `node_modules/` and regenerate from scratch.

---

## Supabase Free Plan Sync Optimizations (Feb 2026)

The extension sync engine was consuming ~2,500 Supabase queries per premium user per day and using 4 Realtime connections per user, limiting concurrent users to ~50 on the free plan (200 connection cap). Six optimizations were applied to reduce this by ~90%.

### Problem Analysis

| Resource | Free Plan Limit | Pre-optimization Capacity |
|---|---|---|
| Concurrent connections | 200 | ~50 premium users (4 Realtime channels each) |
| Database egress | 2 GB/month | ~650 daily active users |
| Database storage | 500 MB | ~300-1,500 users over 1 year |

### Optimization 1: Consolidate Realtime Channels (4 → 1)

**File:** `src/sync/realtimeSubscription.ts`

**Before:** 4 separate Supabase Realtime channels (`time_entries:{userId}`, `projects:{userId}`, `tags:{userId}`, `user_settings:{userId}`), each consuming a connection slot.

**After:** Single multiplexed channel `sync:{userId}` with 4 `.on('postgres_changes', ...)` listeners chained on it. Same functionality, 1 connection instead of 4.

**Impact:** Concurrent user capacity raised from ~50 to ~200.

### Optimization 2: Conditional Pull via `has_changes_since()` RPC

**Files:** `src/sync/syncEngine.ts` (lines 219-230), `supabase/migrations/022_has_changes_since.sql`

**Before:** `pullDelta()` fired 5 SELECT queries (entries, projects, tags, settings, cursor upsert) every sync cycle, even when nothing changed server-side.

**After:** Before the full pull, calls `has_changes_since(p_user_id, p_since)` RPC — a single SQL function that checks `MAX(updated_at)` across all 4 tables with `UNION ALL + LIMIT 1`. If nothing changed, skips the pull entirely.

**Impact:** Saves ~1,150 queries/user/day for single-device users (the majority).

**Deployment note:** Migration `022_has_changes_since.sql` must be applied to Supabase before the extension update. If not deployed, the RPC call fails gracefully and falls through to the full pull.

### Optimization 3: Sync Interval 5 → 15 Minutes

**File:** `src/background/background.ts` (all 3 `SYNC_ALARM` creations)

**Before:** `chrome.alarms` fired `syncAll()` every 5 minutes (288 cycles/day).

**After:** Every 15 minutes (96 cycles/day). Immediate sync-on-entry-save is preserved via debounced sync, so user actions still sync promptly.

**Impact:** Periodic sync cycles reduced by 67%.

### Optimization 4: Debounce `syncAll()` on Entry Save

**File:** `src/background/background.ts` (lines 105-116, 132-143)

**Before:** Every `saveTimeEntry()` / `updateTimeEntry()` call triggered an immediate `syncAll()` + `pushUserStats()`. With 16 entries/day, that's 16 extra full sync cycles.

**After:** `debouncedSync()` with a 10-second timer. Multiple rapid entry saves batch into a single sync. The sync queue accumulates items safely during the debounce window.

**Impact:** Entry-triggered syncs reduced from ~16/day to ~5-8/day.

### Optimization 5: Selective Column Pulls

**File:** `src/sync/syncEngine.ts` (lines 235, 262, 294)

**Before:** `.select('*')` on pull queries fetching all columns including `user_id`, `created_at`, `updated_at` that the extension doesn't need.

**After:** Explicit column lists matching what `dbXxxToLocal()` converters actually use + `deleted_at` for soft-delete checks:
- Entries: `id, date, start_time, end_time, duration, project_id, task_id, description, type, tags, link, deleted_at`
- Projects: `id, name, color, target_hours, archived, created_at, is_default, sort_order, deleted_at`
- Tags: `id, name, is_default, sort_order, deleted_at`

**Impact:** ~20-30% reduction in per-query response payload size.

### Optimization 6: Deduplicate Premium Checks in Web Layout

**Files:** `web/lib/services/billing.ts`, `web/app/(authenticated)/layout.tsx`

**Before:** Layout called `isPremiumUser()` and `isAllInUser()` in parallel — each making a separate query to the `subscriptions` table for the same row (2 queries).

**After:** New `getSubscriptionFlags(userId)` function calls `getSubscriptionPlanStatus()` once and returns `{ isPremium, isAllIn }`. Layout uses this single call.

**Impact:** Saves 1 DB query per authenticated page load.

### Combined Results

| Metric | Before | After |
|---|---|---|
| Queries/user/day | ~2,500 | ~150-300 |
| Realtime connections/user | 4 | 1 |
| Max concurrent premium users | ~50 | ~200 |
| Egress/user/day | ~600-800 KB | ~97 KB |

### Per-User Data Transfer (post-optimization)

| Direction | Per user/day | Per user/month |
|---|---|---|
| Sent to Supabase | ~48 KB | ~1.4 MB |
| Egress from Supabase | ~97 KB | ~2.9 MB |
| Total both directions | ~145 KB | ~4.3 MB |

### Free Plan User Capacity (post-optimization)

| Constraint | Limit | Users Supported |
|---|---|---|
| Concurrent connections | 200 | ~200 simultaneous premium users |
| Egress | 2 GB/month | ~700 daily active users |
| Database storage | 500 MB | ~300-1,500 over 1 year |
| Auth MAU | 50,000 | 50,000 |
| Edge Functions | 500K/month | N/A (unused) |
