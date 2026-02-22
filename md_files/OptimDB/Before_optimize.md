The sync optimization plan is ready. It covers 6 optimizations prioritized by impact:

Realtime consolidation (4 channels → 1) — lifts concurrent user cap from ~50 to ~200
Conditional pull — new has_changes_since() RPC to skip unchanged pulls, saves ~1,150 queries/user/day
15-min sync interval — trivial config change, cuts periodic queries by 67%
Debounce entry syncs — batch rapid saves into fewer sync cycles
Selective columns — bandwidth polish
Deduplicate premium checks — quick win in web layout
Combined effect: ~4x more users on the free plan (from ~50 to ~200 concurrent premium users, ~150–300 queries/user/day instead of ~2,500).

Claude’s Plan
Sync Optimization Plan — Supabase Free Tier Longevity
Context
The Work-Timer Chrome extension syncs to Supabase every 5 minutes via chrome.alarms, making ~1,600–2,800 database queries per premium user per day. The Supabase free plan allows 200 concurrent connections and 2 GB/month egress. Current architecture supports ~50 simultaneous premium users before hitting connection limits. These optimizations aim to extend that to ~150–200 concurrent users without upgrading to Pro.

Optimization 1: Conditional Pull (Skip When Nothing Changed)
Problem: pullDelta() fires 5 queries every 5 minutes even when no server-side changes exist. This is the single largest query source (~1,440 queries/user/day).

Solution: Before running the full 4-table pull, make a single lightweight query to check if anything changed since last sync. If nothing changed, skip the pull entirely.

Approach options:

A) Single RPC function — Create a PostgreSQL function has_changes_since(p_user_id, p_since) that returns a boolean. Checks MAX(updated_at) across all 4 tables in one query. Cost: 1 query instead of 5 when nothing changed.
B) Sync cursor comparison — Store a server-side last_modified timestamp. Pull only checks this single value first.
Impact: For a user with no cross-device activity (the majority), this reduces pull from 5 queries to 1 query per cycle. Saves ~1,152 queries/user/day (80% reduction in pull volume).

Files involved:

src/sync/syncEngine.ts — pullDelta() function (lines 211–344)
New SQL migration — has_changes_since() RPC function
web/lib/repositories/ — optional wrapper if web app uses it
Optimization 2: Increase Sync Interval (5 min → 15 min)
Problem: 5-minute sync interval is aggressive for a time-tracking app where entries change a few times per hour at most.

Solution: Change SYNC_ALARM period from 5 minutes to 15 minutes. Keep the immediate sync-on-entry-save behavior so user actions still sync instantly.

Impact: Reduces periodic sync cycles from 288/day to 96/day. Combined with Optimization 1, idle polling drops from ~1,440 queries/day to ~96 queries/day per user. ~93% reduction.

Files involved:

src/background/background.ts — alarm creation (lines 654–656, 835, 1053)
Consider making this configurable in settings for power users
Optimization 3: Consolidate Realtime Channels (4 → 1)
Problem: Each premium user opens 4 Realtime WebSocket channels (time_entries, projects, tags, user_settings), consuming 4 of the 200 concurrent connection slots. This limits concurrent users to ~50.

Solution: Use a single multiplexed channel that listens to all 4 tables via Supabase's schema filter or a single channel with multiple .on() handlers on one subscription.

Approach: Supabase Realtime supports multiple .on('postgres_changes', ...) listeners on a single channel. Combine all 4 table listeners onto one channel.

Impact: Reduces Realtime connections from 4 per user to 1 per user. Concurrent user capacity jumps from ~50 to ~200.

Files involved:

src/sync/realtimeSubscription.ts — setupRealtime() function (lines 142–202)
Optimization 4: Debounce syncAll() on Entry Save
Problem: Every saveTimeEntry() call triggers a full syncAll() (lines 121–122 in background.ts). If a user creates 16 entries/day, that's 16 extra full sync cycles (~144 queries) on top of the periodic alarm.

Solution: Debounce syncAll() calls triggered by entry saves. If multiple entries are saved within a short window (e.g., 30 seconds), batch them into a single sync. The sync queue already accumulates items, so delaying the push doesn't lose data.

Impact: Reduces entry-triggered syncs from 16/day to ~5–8/day. Saves ~70–100 queries/day.

Files involved:

src/background/background.ts — saveTimeEntry() function (lines 119–133)
Optimization 5: Selective Column Pulls
Problem: Pull queries use .select('*') (syncEngine.ts lines 222, 262, 294), fetching all columns including user_id, deleted_at, and other metadata that the extension already knows or doesn't need.

Solution: Replace .select('*') with explicit column lists matching what the extension actually uses.

Impact: ~20–30% reduction in per-query response payload size. Minor bandwidth savings but adds up at scale.

Files involved:

src/sync/syncEngine.ts — pull queries (lines 220–225, 260–265, 292–297)
Optimization 6: Deduplicate Premium Checks in Web Layout
Problem: The authenticated layout (layout.tsx:31-38) calls both isPremiumUser() and isAllInUser(), each making a separate query to the subscriptions table for the same row.

Solution: Create a single getSubscriptionStatus(userId) function that returns both isPremium and isAllIn from one query.

Impact: Saves 1 query per authenticated page load. Minor but trivial to fix.

Files involved:

web/app/(authenticated)/layout.tsx — lines 31–38
web/lib/services/billing.ts — isPremiumUser() and isAllInUser()
Combined Impact Summary
Optimization	Queries Saved/User/Day	Connection Slots Saved
Conditional pull	~1,152	—
15-min interval	~1,200 (from baseline)	—
Realtime consolidation	—	3 per user
Debounce entry syncs	~70–100	—
Selective columns	(bandwidth only)	—
Deduplicate premium checks	~4–8	—
Before: ~2,500 queries/user/day, 4 connections/user, ~50 concurrent users max
After: ~150–300 queries/user/day, 1 connection/user, ~200 concurrent users max

Free plan capacity increase: ~4x users

Priority Order
Realtime consolidation (biggest impact on concurrent user limit, straightforward)
Conditional pull (biggest query reduction, requires new RPC)
Increase sync interval (trivial change, large impact)
Debounce entry syncs (moderate impact, straightforward)
Selective columns (minor, polish)
Deduplicate premium checks (minor, quick win)
