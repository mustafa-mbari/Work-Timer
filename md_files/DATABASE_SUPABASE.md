# DATABASE_SUPABASE.md

Current state of the Supabase PostgreSQL database for Work-Timer.
All migrations applied through `supabase/migrations/`.

---

## Tables Overview

| Table | Primary Key | RLS | Description |
|---|---|---|---|
| `profiles` | `id` (UUID) | Yes | User profile data, mirrors `auth.users` |
| `subscriptions` | `id` (UUID) | Yes | Stripe + manual subscription records |
| `projects` | `id` (nanoid) | Yes | User-created projects |
| `tags` | `id` (nanoid) | Yes | User-created tags |
| `time_entries` | `id` (nanoid) | Yes | Individual time tracking records |
| `user_settings` | `user_id` (UUID) | Yes | Per-user app settings |
| `sync_cursors` | `id` (UUID) | Yes | Device-level sync state |
| `promo_codes` | `id` (UUID) | No (admin-only) | Promotional codes |
| `promo_redemptions` | `id` (UUID) | No (admin-only) | Promo usage records |
| `user_stats` | `user_id` (UUID) | Yes | Lightweight aggregate stats (all users) |
| `whitelisted_domains` | `id` (UUID) | No (admin-only) | Domain-based premium grants |
| `stripe_events` | `event_id` (TEXT) | No | Stripe webhook idempotency records |

---

## Table Schemas

### `profiles`
Mirrors `auth.users`. Created on sign-up via trigger or explicit insert.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | No | — | FK → `auth.users(id)`, PK |
| `email` | TEXT | No | — | |
| `display_name` | TEXT | Yes | NULL | |
| `avatar_url` | TEXT | Yes | NULL | |
| `role` | TEXT | No | `'user'` | `'user'` or `'admin'` |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

---

### `subscriptions`
One row per user. Tracks Stripe and manually-granted premium status.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `user_id` | UUID | No | — | FK → `auth.users(id)`, UNIQUE |
| `stripe_customer_id` | TEXT | Yes | NULL | |
| `stripe_subscription_id` | TEXT | Yes | NULL | |
| `plan` | TEXT | No | `'free'` | `'free'` \| `'premium_monthly'` \| `'premium_yearly'` \| `'premium_lifetime'` |
| `status` | TEXT | No | `'active'` | `'active'` \| `'trialing'` \| `'past_due'` \| `'canceled'` \| `'unpaid'` \| `'incomplete'` |
| `current_period_start` | TIMESTAMPTZ | Yes | NULL | |
| `current_period_end` | TIMESTAMPTZ | Yes | NULL | |
| `cancel_at_period_end` | BOOLEAN | No | `false` | |
| `granted_by` | TEXT | Yes | NULL | `'stripe'` \| `'domain'` \| `'promo'` \| `'admin_manual'` |
| `promo_code_id` | UUID | Yes | NULL | FK → `promo_codes(id)` |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

---

### `projects`
User-owned projects. Soft-deleted via `deleted_at`.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT | No | — | nanoid, PK |
| `user_id` | UUID | No | — | FK → `auth.users(id)` |
| `name` | TEXT | No | — | |
| `color` | TEXT | No | — | Hex color string |
| `target_hours` | NUMERIC | Yes | NULL | |
| `archived` | BOOLEAN | No | `false` | |
| `is_default` | BOOLEAN | No | `false` | Added in migration 011 |
| `sort_order` | INT | Yes | NULL | Added in migration 011 |
| `created_at` | BIGINT | No | — | Unix ms timestamp |
| `updated_at` | TIMESTAMPTZ | No | `now()` | Used for sync cursors |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | Soft delete |

---

### `tags`
User-owned tags. Soft-deleted via `deleted_at`.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT | No | — | nanoid, PK |
| `user_id` | UUID | No | — | FK → `auth.users(id)` |
| `name` | TEXT | No | — | |
| `is_default` | BOOLEAN | No | `false` | Added in migration 011 |
| `sort_order` | INT | Yes | NULL | Added in migration 011 |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | Used for sync cursors |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | Soft delete |

---

### `time_entries`
Individual tracked time sessions. Soft-deleted via `deleted_at`.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT | No | — | nanoid, PK |
| `user_id` | UUID | No | — | FK → `auth.users(id)` |
| `date` | TEXT | No | — | `YYYY-MM-DD` string |
| `start_time` | BIGINT | No | — | Unix ms |
| `end_time` | BIGINT | No | — | Unix ms |
| `duration` | BIGINT | No | — | Milliseconds |
| `project_id` | TEXT | Yes | NULL | Logical FK → `projects(id)` (no DB constraint) |
| `task_id` | TEXT | Yes | NULL | Logical FK → future tasks table |
| `description` | TEXT | No | `''` | |
| `type` | TEXT | No | — | `'manual'` \| `'stopwatch'` \| `'pomodoro'` |
| `tags` | TEXT[] | No | `'{}'` | Array of tag names (denormalized) |
| `link` | TEXT | Yes | NULL | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | Used for sync cursors |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | Soft delete |

---

### `user_settings`
One row per user. Created or upserted on first sync.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `user_id` | UUID | No | — | FK → `auth.users(id)`, PK |
| `working_days` | INT | No | `31` | Bitmask (Mon=1, Tue=2, ... Sun=64) |
| `week_start_day` | INT | No | `1` | `0` (Sun) or `1` (Mon) |
| `idle_timeout` | INT | No | `300` | Seconds |
| `theme` | TEXT | No | `'light-soft'` | |
| `language` | TEXT | No | `'en'` | |
| `notifications` | BOOLEAN | No | `true` | |
| `daily_target` | INT | Yes | NULL | Minutes |
| `weekly_target` | INT | Yes | NULL | Minutes |
| `pomodoro_config` | JSONB | No | — | `{workMinutes, shortBreakMinutes, longBreakMinutes, sessionsBeforeLongBreak, soundEnabled}` |
| `floating_timer_auto` | BOOLEAN | No | `false` | |
| `reminder` | JSONB | Yes | `{"enabled":true,"dayOfWeek":5,"hour":14,"minute":0}` | Added in migration 009 |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

---

### `sync_cursors`
Tracks the last sync timestamp per user per device.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `user_id` | UUID | No | — | FK → `auth.users(id)` |
| `device_id` | TEXT | No | — | Client-generated device identifier |
| `last_sync` | TIMESTAMPTZ | No | `now()` | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |

Unique constraint: `(user_id, device_id)` — added in migration 001.

---

### `promo_codes`
Admin-managed promotional codes. No RLS (service role only).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `code` | TEXT | No | — | UNIQUE (uppercase) |
| `discount_pct` | INT | No | — | 1–100. 100 = free premium grant |
| `plan` | TEXT | No | — | `'premium_monthly'` \| `'premium_yearly'` \| `'premium_lifetime'` |
| `max_uses` | INT | Yes | NULL | NULL = unlimited |
| `current_uses` | INT | No | `0` | Incremented atomically via `redeem_promo` RPC |
| `valid_from` | TIMESTAMPTZ | No | — | **Required on insert** — no DB default |
| `valid_until` | TIMESTAMPTZ | Yes | NULL | NULL = no expiry |
| `active` | BOOLEAN | No | `true` | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `created_by` | UUID | Yes | NULL | Admin user ID |

---

### `promo_redemptions`
Records each user's use of a promo code. Prevents double redemption.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `promo_code_id` | UUID | No | — | FK → `promo_codes(id)` |
| `user_id` | UUID | No | — | FK → `auth.users(id)` |
| `redeemed_at` | TIMESTAMPTZ | No | `now()` | |

Unique constraint: `(promo_code_id, user_id)` — added in migration 001.

---

### `user_stats`
Lightweight aggregate stats for all users (free and premium). Used for admin dashboards without querying raw entries.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `user_id` | UUID | No | — | FK → `auth.users(id)` ON DELETE CASCADE, PK |
| `total_hours` | NUMERIC | No | `0` | |
| `total_entries` | INT | No | `0` | |
| `total_projects` | INT | No | `0` | |
| `active_days` | INT | No | `0` | |
| `last_active_date` | DATE | Yes | NULL | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

---

### `whitelisted_domains`
Email domains that automatically receive premium access. No RLS (admin/service role only).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK |
| `domain` | TEXT | No | — | e.g. `company.com` |
| `plan` | TEXT | No | — | `'premium_monthly'` \| `'premium_yearly'` \| `'premium_lifetime'` |
| `notes` | TEXT | Yes | NULL | Admin notes |
| `active` | BOOLEAN | No | `true` | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `created_by` | UUID | Yes | NULL | Admin user ID |

---

### `stripe_events`
Webhook idempotency table. Prevents duplicate Stripe event processing.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `event_id` | TEXT | No | — | Stripe event ID, PK |
| `event_type` | TEXT | No | — | e.g. `customer.subscription.updated` |
| `processed_at` | TIMESTAMPTZ | No | `now()` | |

---

## Table Relationships

```
auth.users (Supabase managed)
│
├── profiles.id ──────────────── 1:1  (user profile)
├── subscriptions.user_id ─────── 1:1  (one sub per user, UNIQUE constraint)
│     └── promo_codes.id ←── subscriptions.promo_code_id  (nullable FK)
├── projects.user_id ─────────── 1:N  (many projects per user)
├── tags.user_id ─────────────── 1:N  (many tags per user)
├── time_entries.user_id ─────── 1:N  (many entries per user)
│     └── projects.id ←── time_entries.project_id  (logical FK, no DB constraint)
├── user_settings.user_id ─────── 1:1  (one settings row per user)
├── sync_cursors.user_id ─────── 1:N  (one row per device per user)
├── user_stats.user_id ─────────  1:1  (ON DELETE CASCADE)
└── promo_redemptions.user_id ── 1:N  (one per promo code)
      └── promo_codes.id ←── promo_redemptions.promo_code_id  (FK)
```

### Relationship Notes

- `time_entries.project_id` → `projects.id` is a **logical FK only** (no DB-level constraint). The extension uses nanoid IDs that are created locally before sync.
- `time_entries.tags` is a **denormalized `TEXT[]`** column storing tag names, not IDs. There is no DB join between entries and the `tags` table.
- `time_entries.task_id` is reserved for a future tasks feature; no tasks table exists yet.
- `subscriptions.user_id` has a UNIQUE constraint (migration 001), enabling upsert via `ON CONFLICT (user_id)`.
- `sync_cursors` has a UNIQUE constraint on `(user_id, device_id)` (migration 001), enabling upsert.
- `promo_redemptions` has a UNIQUE constraint on `(promo_code_id, user_id)` (migration 001), preventing double redemption.

---

## Indexes

| Table | Index Name | Columns | Type |
|---|---|---|---|
| `time_entries` | `idx_time_entries_user_deleted` | `(user_id, deleted_at)` | BTREE |
| `time_entries` | `idx_time_entries_user_date` | `(user_id, date)` | BTREE |
| `time_entries` | `idx_time_entries_user_updated` | `(user_id, updated_at)` | BTREE |
| `time_entries` | `idx_time_entries_user_created` | `(user_id, created_at)` | BTREE |
| `projects` | `idx_projects_user_deleted` | `(user_id, deleted_at)` | BTREE |
| `projects` | `idx_projects_user_updated` | `(user_id, updated_at)` | BTREE |
| `tags` | `idx_tags_user_deleted` | `(user_id, deleted_at)` | BTREE |
| `tags` | `idx_tags_user_updated` | `(user_id, updated_at)` | BTREE |
| `promo_codes` | `idx_promo_codes_code` | `(code)` | UNIQUE |
| `promo_redemptions` | `idx_promo_redemptions_code_user` | `(promo_code_id, user_id)` | UNIQUE |
| `stripe_events` | `idx_stripe_events_processed` | `(processed_at)` | BTREE |

---

## Row-Level Security (RLS) Policies

### Tables with RLS enabled

All user-data tables have RLS enabled. Users can only access their own rows (`auth.uid() = user_id`). Admin and service-role operations bypass RLS.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | `auth.uid() = id` | `auth.uid() = id` | `auth.uid() = id` | — |
| `subscriptions` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | — |
| `projects` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `tags` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `time_entries` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `user_settings` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | — |
| `sync_cursors` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | — |
| `user_stats` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | — |

### Tables WITHOUT RLS (admin / service role only)

- `promo_codes` — managed via admin panel using service role client
- `promo_redemptions` — written by `redeem_promo` RPC (`SECURITY DEFINER`)
- `whitelisted_domains` — managed via admin panel using service role client
- `stripe_events` — written by webhook handler using service role client

> **Note:** Projects and tags had broken `FOR ALL` policies replaced in migrations 007 and 008 with separate per-operation policies. Upserts require `WITH CHECK` on INSERT, not just `USING`.

---

## RPC Functions

All functions use `SECURITY DEFINER` to run with elevated privileges. Called via Supabase client as `supabase.rpc('function_name', args)`.

### User Functions

| Function | Args | Returns | Description |
|---|---|---|---|
| `is_premium` | `check_user_id uuid` | `boolean` | True if user has active non-free subscription |
| `check_domain_whitelist` | `user_email text` | `{domain, plan}[]` | Returns matching whitelisted domains for an email |
| `get_user_analytics` | `p_user_id uuid`, `p_date_from text?`, `p_date_to text?` | `json` | Full analytics for one user (see below) |
| `redeem_promo` | `p_code text`, `p_user_id uuid` | `json` | Atomic promo redemption (see below) |

#### `get_user_analytics` response shape

```json
{
  "total_hours": 123.45,
  "total_entries": 456,
  "unique_days": 78,
  "avg_session_ms": 3600000,
  "streak": 5,
  "weekly_data":    [{ "week": "Jan 06", "hours": 12.5 }, ...],
  "type_data":      [{ "name": "Manual", "hours": 10.0, "count": 20 }, ...],
  "day_of_week_data": [{ "name": "Mon", "hours": 8.2 }, ...],
  "daily_data":     [{ "date": "Jan 01", "hours": 3.5 }, ...],
  "peak_hours_data":[{ "hour": "09:00", "count": 42 }, ...],
  "project_stats":  [{ "name": "...", "color": "#...", "hours": 10, "entries": 5, "target_hours": 20 }, ...]
}
```

Date range is optional. When omitted: weekly = last 12 weeks, daily = last 30 days. Streak is always calculated from today regardless of date filter.

#### `redeem_promo` response shape

```json
// Success — 100% discount (premium granted immediately)
{ "success": true, "granted": true, "plan": "premium_lifetime", "discount_pct": 100 }

// Success — partial discount (use promo_id for Stripe checkout)
{ "success": true, "granted": false, "plan": "premium_monthly", "discount_pct": 20, "promo_id": "...", "promo_code": "SAVE20" }

// Failure
{ "success": false, "error": "Promo code has expired" }
```

Redemption is atomic via `FOR UPDATE` row lock. Prevents race conditions on `current_uses`.

### Admin Functions

| Function | Args | Returns | Description |
|---|---|---|---|
| `get_platform_stats` | — | `json` | Total entries, hours, 30d count, project count, avg session |
| `get_active_users` | `period interval` | `integer` | Distinct users with entries in the period (DAU/WAU/MAU) |
| `get_user_growth` | `weeks integer = 8` | `{week_start, signup_count}[]` | Weekly signup counts from `auth.users` |
| `get_top_users` | `lim integer = 5` | `{user_id, email, total_hours}[]` | Top N users by total hours |
| `get_entry_type_breakdown` | — | `{entry_type, entry_count, total_hours}[]` | Entries grouped by type |
| `get_premium_breakdown` | — | `json` | Premium counts by plan and grant source |
| `get_promo_stats` | — | `json` | Active promo count, total uses |
| `get_domain_stats` | — | `json` | Active whitelisted domain count |

---

## Migration History

| File | Description |
|---|---|
| `001_add_indexes.sql` | Indexes on time_entries, projects, tags; unique constraints on promo_redemptions, sync_cursors, subscriptions |
| `002_admin_rpc.sql` | Admin RPC functions: `get_platform_stats`, `get_active_users`, `get_user_growth`, `get_top_users`, `get_entry_type_breakdown`, `get_premium_breakdown`, `get_promo_stats`, `get_domain_stats` |
| `003_user_analytics_rpc.sql` | Initial `get_user_analytics(p_user_id)` RPC |
| `004_atomic_promo.sql` | `redeem_promo` RPC replacing race-condition-prone two-query pattern |
| `005_stripe_events.sql` | `stripe_events` table for webhook idempotency |
| `006_user_stats.sql` | `user_stats` table + RLS policies |
| `007_tags_rls.sql` | Fixes tags RLS: drop old FOR ALL policy, recreate separate SELECT/INSERT/UPDATE/DELETE policies |
| `008_projects_entries_rls.sql` | Same RLS fix for `projects` and `time_entries` |
| `009_add_reminder_to_settings.sql` | Adds `reminder` JSONB column to `user_settings` |
| `010_analytics_date_filter.sql` | Adds optional `p_date_from` / `p_date_to` params to `get_user_analytics` (creates second overload) |
| `011_drop_old_analytics_overload.sql` | Drops the single-param `get_user_analytics(uuid)` overload to resolve ambiguity |
| `011_projects_tags_default_order.sql` | Adds `is_default` and `sort_order` columns to `projects` and `tags` |

> Note: Two migrations share the number `011`. Apply both. The `drop_old_analytics_overload` must run before or alongside `analytics_date_filter` for clean RPC resolution.

---

## Client Usage Notes

- **Service role client** must use `createClient` from `@supabase/supabase-js`, NOT `createServerClient` from `@supabase/ssr`. SSR client passes cookies, causing RLS to apply even with the service role key.
- **Mutations** (`insert`, `update`, `upsert`) use `(supabase.from('table') as any)` to work around supabase-js v2.97+ type inference issues.
- **RPC calls** use `(supabase.rpc as Function)('name', args)` pattern for the same reason.
- **Row limits**: PostgREST defaults to 1000 rows. Use `.range(0, 49999)` on queries that may return large datasets.
- **`get_active_users`** accepts a Postgres interval string: `'1 day'` (DAU), `'7 days'` (WAU), `'30 days'` (MAU).
