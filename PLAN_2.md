# PLAN 2 — Premium, Auth, Supabase & Cloud Sync

## Context

Work-Timer currently stores all data locally in `chrome.storage.local` with zero backend. This plan adds auth, Supabase backend, Stripe premium subscriptions, cloud sync, admin dashboard, promo codes, and company domain whitelisting.

The extension remains **offline-first** — local storage stays the primary data store, cloud sync is additive.

## Repo Structure (Monorepo)

```
Work-Timer/
  shared/                ← Shared types & constants (used by both)
    types.ts
    constants.ts
  src/                   ← Chrome Extension (existing)
  web/                   ← Companion Website (new)
    app/
    package.json
    next.config.ts
  package.json           ← Workspace root
  pnpm-workspace.yaml
```

---

## Current State

| Aspect | Current |
|--------|---------|
| Storage | `chrome.storage.local` only (~10MB limit) |
| Models | TimeEntry, Project, Tag, Settings, TimerState, PomodoroState, IdleInfo |
| Auth | None — single user per Chrome profile |
| Backend | None — fully offline |
| Storage layer | `src/storage/index.ts` + duplicated inline functions in `src/background/background.ts` |

---

## Shared: Supabase Database Schema

> Both extension and website interact with these tables. Schema is managed via Supabase migrations.

### Tables

```sql
-- ==========================================
-- Profiles (extends Supabase auth.users)
-- ==========================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==========================================
-- Subscriptions
-- ==========================================
CREATE TABLE public.subscriptions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  plan                    TEXT NOT NULL DEFAULT 'free'
                          CHECK (plan IN ('free', 'premium_monthly', 'premium_yearly', 'premium_lifetime')),
  status                  TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT false,
  granted_by              TEXT,          -- 'stripe', 'domain', 'promo', 'admin_manual'
  promo_code_id           UUID REFERENCES public.promo_codes(id),
  created_at              TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==========================================
-- Company Domain Whitelist
-- ==========================================
CREATE TABLE public.whitelisted_domains (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain        TEXT NOT NULL UNIQUE,     -- e.g. 'mbari.de'
  plan          TEXT NOT NULL DEFAULT 'premium_monthly'
                CHECK (plan IN ('premium_monthly', 'premium_yearly', 'premium_lifetime')),
  notes         TEXT,
  active        BOOLEAN DEFAULT true NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by    UUID REFERENCES public.profiles(id)
);

-- ==========================================
-- Promo Codes
-- ==========================================
CREATE TABLE public.promo_codes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,     -- e.g. 'LAUNCH50'
  discount_pct    INTEGER NOT NULL CHECK (discount_pct BETWEEN 1 AND 100),
  plan            TEXT NOT NULL DEFAULT 'premium_monthly'
                  CHECK (plan IN ('premium_monthly', 'premium_yearly', 'premium_lifetime')),
  max_uses        INTEGER,                  -- NULL = unlimited
  current_uses    INTEGER DEFAULT 0 NOT NULL,
  valid_from      TIMESTAMPTZ DEFAULT now() NOT NULL,
  valid_until     TIMESTAMPTZ,              -- NULL = never expires
  active          BOOLEAN DEFAULT true NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by      UUID REFERENCES public.profiles(id)
);

-- ==========================================
-- Promo Code Redemptions
-- ==========================================
CREATE TABLE public.promo_redemptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id   UUID NOT NULL REFERENCES public.promo_codes(id),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  redeemed_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(promo_code_id, user_id)
);

-- ==========================================
-- Projects
-- ==========================================
CREATE TABLE public.projects (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL,
  target_hours  REAL,
  archived      BOOLEAN DEFAULT false NOT NULL,
  created_at    BIGINT NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at    TIMESTAMPTZ
);

-- ==========================================
-- Tags
-- ==========================================
CREATE TABLE public.tags (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- ==========================================
-- Time Entries
-- ==========================================
CREATE TABLE public.time_entries (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date          TEXT NOT NULL,
  start_time    BIGINT NOT NULL,
  end_time      BIGINT NOT NULL,
  duration      BIGINT NOT NULL,
  project_id    TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id       TEXT,
  description   TEXT DEFAULT '' NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('manual', 'stopwatch', 'pomodoro')),
  tags          TEXT[] DEFAULT '{}',
  link          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_time_entries_user_date ON public.time_entries(user_id, date);
CREATE INDEX idx_time_entries_updated ON public.time_entries(user_id, updated_at);

-- ==========================================
-- User Settings
-- ==========================================
CREATE TABLE public.user_settings (
  user_id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  working_days         INTEGER DEFAULT 5 NOT NULL,
  week_start_day       INTEGER DEFAULT 1 NOT NULL CHECK (week_start_day IN (0, 1)),
  idle_timeout         INTEGER DEFAULT 5 NOT NULL,
  theme                TEXT DEFAULT 'light-soft' NOT NULL,
  language             TEXT DEFAULT 'en' NOT NULL,
  notifications        BOOLEAN DEFAULT true NOT NULL,
  daily_target         REAL,
  weekly_target        REAL,
  pomodoro_config      JSONB DEFAULT '{"workMinutes":25,"shortBreakMinutes":5,"longBreakMinutes":15,"sessionsBeforeLongBreak":4,"soundEnabled":true}' NOT NULL,
  floating_timer_auto  BOOLEAN DEFAULT true NOT NULL,
  updated_at           TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==========================================
-- Sync Cursors
-- ==========================================
CREATE TABLE public.sync_cursors (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id  TEXT NOT NULL,
  last_sync  TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, device_id)
);
```

### RLS Policies

```sql
-- User data: scoped to own user_id
CREATE POLICY "Own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own tags" ON public.tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own entries" ON public.time_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own cursors" ON public.sync_cursors FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Read active promos" ON public.promo_codes FOR SELECT USING (active = true);

-- Admin access: handled server-side with service role key (bypasses RLS)
```

### Database Functions & Triggers

```sql
-- Check premium status
CREATE OR REPLACE FUNCTION public.is_premium(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = check_user_id
      AND status IN ('active', 'trialing')
      AND plan != 'free'
      AND (plan = 'premium_lifetime' OR current_period_end IS NULL OR current_period_end > now())
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check domain whitelist on signup
CREATE OR REPLACE FUNCTION public.check_domain_whitelist(user_email TEXT)
RETURNS TABLE(domain TEXT, plan TEXT) AS $$
  SELECT d.domain, d.plan
  FROM public.whitelisted_domains d
  WHERE d.active = true
    AND user_email LIKE '%@' || d.domain;
$$ LANGUAGE sql SECURITY DEFINER;

-- Auto-create profile + settings + subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  domain_match RECORD;
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  SELECT * INTO domain_match
  FROM public.check_domain_whitelist(NEW.email)
  LIMIT 1;

  IF domain_match IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan, status, granted_by)
    VALUES (NEW.id, domain_match.plan, 'active', 'domain');
  ELSE
    INSERT INTO public.subscriptions (user_id, plan, status, granted_by)
    VALUES (NEW.id, 'free', 'active', NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Shared: Premium Tier

### Feature Matrix

| Feature | Free | Premium |
|---------|------|---------|
| Timer (stopwatch/manual/pomodoro) | Yes | Yes |
| Projects | Max 5 | Unlimited |
| History visible | 30 days | Unlimited |
| Export (CSV/Excel) | No | Yes |
| Work type (tag) editing | No | Yes |
| Cloud sync + multi-device | No | Yes |
| Advanced analytics & reports | No | Yes |
| Idle detection | Yes | Yes |
| Keyboard shortcuts | Yes | Yes |
| Themes | Yes | Yes |

### Pricing

- **Monthly**: $1.99/month
- **Yearly**: $9.99/year (saves ~58%)
- **Lifetime**: $29.99 one-time payment (premium forever, no renewals)
- Promo codes can discount or fully waive the price
- Domain whitelisted users get premium free

### Shared Constants (`shared/constants.ts`)

```typescript
export const FREE_LIMITS = {
  maxProjects: 5,
  historyDays: 30,
  allowExport: false,
  allowCloudSync: false,
  allowAdvancedStats: false,
  allowWorkTypeEdit: false,
} as const

export const PREMIUM_LIMITS = {
  maxProjects: Infinity,
  historyDays: Infinity,
  allowExport: true,
  allowCloudSync: true,
  allowAdvancedStats: true,
  allowWorkTypeEdit: true,
} as const
```

---

## Shared: Auth Flow (Website ↔ Extension)

```
Extension popup                  Website                      Supabase
     |                              |                              |
     |-- opens /login?ext=true ---->|                              |
     |                              |-- Supabase Auth ------------>|
     |                              |<-- session token ------------|
     |<-- chrome.runtime            |                              |
     |   .sendMessage(session) -----|                              |
     |-- stores in chrome.storage   |                              |
```

1. User clicks "Sign In" in extension → opens `https://w-timer.com/login?ext=true`
2. User authenticates on website (Supabase Auth)
3. Website detects `ext=true` query param
4. Website sends session to extension via `chrome.runtime.sendMessage(EXTENSION_ID, { action: 'AUTH_TOKEN', session })`
5. Extension background stores session in `chrome.storage.local`
6. Website shows "Connected!" confirmation

---

# SECTION A: Extension (`src/`)

> All changes in this section happen in the existing `src/` directory of this repo.

## A1. New Modules

```
src/
  auth/
    supabaseClient.ts         -- Supabase client with chrome.storage adapter
    authState.ts               -- Session storage/retrieval, token refresh
  sync/
    syncEngine.ts              -- Push/pull orchestrator
    syncQueue.ts               -- Local mutation queue
    conflictResolver.ts        -- Last-write-wins resolution
    realtimeSubscription.ts    -- Supabase Realtime channels
  premium/
    featureGate.ts             -- Premium check utilities (imports shared/constants)
  hooks/
    useAuth.ts                 -- Auth state hook
    usePremium.ts              -- Premium/limits hook
  components/
    UpgradePrompt.tsx          -- Modal for free users hitting limits
```

## A2. Modified Files

| File | Changes |
|------|---------|
| `public/manifest.json` | Add `externally_connectable` for website ↔ extension messaging |
| `src/types/index.ts` | Add AuthSession, SubscriptionInfo, SyncQueueItem, new MessageAction values |
| `src/storage/index.ts` | Add sync hooks after every write (saveEntry, updateEntry, deleteEntry, saveProject, etc.) |
| `src/background/background.ts` | Add `onMessageExternal` listener for auth tokens, sync alarms, Realtime setup, sync hooks on inline storage functions |
| `src/components/SettingsView.tsx` | New "Account" tab (login/logout, plan info, sync status), project limit gating |
| `src/components/ExportMenu.tsx` | Lock export buttons behind premium with UpgradePrompt |
| `src/components/StatsView.tsx` | Lock advanced analytics behind premium |

## A3. Manifest Addition

```json
"externally_connectable": {
  "matches": ["https://w-timer.com/*", "http://localhost:3000/*"]
}
```

No additional Chrome API permissions needed. Supabase uses standard `fetch()`.

## A4. New Message Actions

```typescript
type MessageAction =
  | /* existing actions */
  | 'AUTH_LOGIN'         // Open website for login
  | 'AUTH_LOGOUT'        // Clear session
  | 'AUTH_STATE'         // Get current auth state
  | 'SYNC_NOW'           // Trigger immediate sync
  | 'SYNC_STATUS'        // Get sync status
  | 'GET_SUBSCRIPTION'   // Get subscription info
```

## A5. New Dependencies

- `@supabase/supabase-js` (~40KB gzipped)

## A6. Cloud Sync Engine

### Principles
- **Local-first**: `chrome.storage.local` remains primary. Extension works 100% offline.
- **Eventual consistency**: Changes sync when online. No blocking on network.
- **Conflict resolution**: Last-write-wins (LWW) based on `updated_at`.
- **Soft deletes**: `deleted_at` so deletions propagate across devices.
- **Premium only**: Sync requires active premium subscription.

### Architecture
```
Device A                    Supabase                    Device B
   |                           |                           |
   |-- write locally --------->|                           |
   |-- queue sync item ------->|                           |
   |-- push to Supabase ------>|                           |
   |                           |-- Realtime broadcast ---->|
   |                           |                           |-- apply to local
```

### Sync Engine Details
- **Mutation queue**: Every local write adds to `syncQueue` in `chrome.storage.local`
- **Push**: Background processes queue, batches upserts to Supabase (500/batch)
- **Pull**: Fetch records with `updated_at > last_sync` from Supabase
- **Realtime**: Subscribe to Supabase Realtime channels for instant cross-device updates
- **Periodic**: `chrome.alarms` every 5 minutes triggers sync when online
- **Reconnect**: `navigator.onLine` event triggers sync on connectivity restore

### MV3 Service Worker Considerations
- Queue persisted in `chrome.storage.local` (survives worker termination)
- Realtime subscriptions re-established on worker startup
- `chrome.alarms` for periodic sync (not `setInterval`)
- All operations idempotent (upserts, not inserts)

### Initial Sync (Existing Local Data)
1. User logs in for the first time with existing local data
2. Extension shows modal: "You have X entries, Y projects locally. Upload to cloud?"
3. **Upload & Sync**: Batch upload all local data → merge with any server data
4. **Start Fresh**: Local data preserved but not synced, cloud starts empty
5. Local data is **never deleted** — upgrading to premium unlocks full history

## A7. Subscription Status in Extension
- Fetched on login from Supabase `subscriptions` table
- Cached in `chrome.storage.local` under `subscriptionInfo`
- Refreshed every 60 minutes via `chrome.alarms`
- Updated instantly via Supabase Realtime on webhook processing

## A8. Feature Gating UI
- `UpgradePrompt` component shown when free users attempt premium actions
- Export buttons show lock icon + "Premium" badge
- Project creation blocked at 5 for free users
- Work type add/edit disabled for free users
- Stats shows "Upgrade for advanced analytics" placeholder
- History clamped to 30 days for free users (local data preserved, just hidden)

---

# SECTION B: Website (`web/`)

> All changes in this section happen in the new `web/` directory of this repo.

## B1. Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: TailwindCSS v4 (same design tokens as extension)
- **Auth**: `@supabase/ssr`
- **Billing**: `stripe` (server) + `@stripe/stripe-js` (client)
- **Deploy**: Vercel

## B2. Directory Structure

```
web/
  app/
    page.tsx                       -- Landing page (features, pricing, CTA)
    login/page.tsx                 -- Email/password + Google OAuth
    register/page.tsx              -- Sign up form
    auth/callback/route.ts         -- OAuth callback handler
    dashboard/page.tsx             -- Account info, sync status, devices
    billing/page.tsx               -- Plan, upgrade/downgrade, Stripe portal
    analytics/page.tsx             -- Advanced reports (premium only)
    admin/
      page.tsx                     -- Overview: users, revenue, engagement
      users/page.tsx               -- User list, search, view details
      stats/page.tsx               -- Global statistics
      domains/page.tsx             -- Manage whitelisted company domains
      promos/page.tsx              -- Manage promo codes
      subscriptions/page.tsx       -- View/grant/revoke subscriptions
    api/
      webhooks/stripe/route.ts     -- Stripe webhook handler
      promo/validate/route.ts      -- Validate promo code
      checkout/route.ts            -- Create Stripe Checkout Session
  package.json
  next.config.ts
  tailwind.config.ts
```

## B3. Pages Overview

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Landing page: features, pricing, CTA | Public |
| `/login` | Email/password + Google OAuth | Public |
| `/register` | Sign up form | Public |
| `/auth/callback` | OAuth callback handler | Public |
| `/dashboard` | Account info, sync status, devices | User |
| `/billing` | Plan, upgrade/downgrade, Stripe portal | User |
| `/analytics` | Advanced reports, trends | Premium |
| `/admin/*` | Admin dashboard (see B6) | Admin |

## B4. Stripe Integration

### Setup
- **Product**: "Work Timer Premium"
- **Recurring prices**: Monthly ($1.99), Yearly ($9.99)
- **One-time price**: Lifetime ($29.99) — uses Stripe Checkout in `payment` mode (not `subscription`)
- **Webhook endpoint**: `https://w-timer.com/api/webhooks/stripe`

### Checkout Flow
1. User clicks "Upgrade" on billing page and selects a plan
2. `web/app/api/checkout/route.ts` creates Stripe Checkout Session:
   - Monthly/Yearly: `mode: 'subscription'` with recurring price
   - Lifetime: `mode: 'payment'` with one-time price
3. User completes payment on Stripe-hosted page
4. Stripe sends `checkout.session.completed` webhook
5. `web/app/api/webhooks/stripe/route.ts` updates `subscriptions` table:
   - Monthly/Yearly: sets `current_period_end` from Stripe subscription
   - Lifetime: sets `plan = 'premium_lifetime'`, `current_period_end = NULL` (never expires)
6. Extension picks up new status via Realtime or next refresh

### Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/activate subscription |
| `customer.subscription.updated` | Update plan/status/period |
| `customer.subscription.deleted` | Mark canceled |
| `invoice.payment_failed` | Mark past_due |

## B5. Promo Code & Domain Whitelist

### Promo Code Flow
1. Admin creates promo code in `/admin/promos` (e.g., `LAUNCH50` = 50% off)
2. User enters promo code on billing page during checkout
3. Website validates: active, not expired, uses remaining, not already redeemed by user
4. If `discount_pct = 100`: grant premium directly (no Stripe, `granted_by = 'promo'`)
5. If `discount_pct < 100`: apply as Stripe coupon during checkout session
6. Record redemption in `promo_redemptions`

### Domain Whitelist Flow
1. Admin adds domain in `/admin/domains` (e.g., `mbari.de`)
2. User with `@mbari.de` email registers → `handle_new_user` trigger detects match
3. Subscription auto-created as premium with `granted_by = 'domain'`
4. No payment required

### Example Promo Codes

| Code | Discount | Max Uses | Expiry | Use Case |
|------|----------|----------|--------|----------|
| `LAUNCH50` | 50% | 100 | 2026-06-01 | Launch promotion |
| `FRIEND20` | 20% | Unlimited | None | Referral |
| `COMPANY100` | 100% | 50 | None | Company bulk grant |
| `BETA100` | 100% | 20 | 2026-03-01 | Beta tester reward |

## B6. Admin Dashboard

Protected section at `/admin/*`, accessible only when `profiles.role = 'admin'`.

### Pages

| Route | Purpose |
|-------|---------|
| `/admin` | Overview: total users, active users, premium vs free, revenue |
| `/admin/users` | User list with search/filter, view details, manual premium grant |
| `/admin/stats` | Global statistics: total hours tracked, entries/day, retention |
| `/admin/domains` | Manage whitelisted company domains (add/edit/deactivate) |
| `/admin/promos` | Manage promo codes (create, view usage, deactivate) |
| `/admin/subscriptions` | View all subscriptions, manually grant/revoke premium |

### Admin Stats Metrics

| Metric | Description |
|--------|-------------|
| Total users | All registered accounts |
| Active users (DAU/WAU/MAU) | Users with activity in last 1/7/30 days |
| Premium subscribers | Count by type (monthly/yearly/domain/promo) |
| MRR / ARR | Monthly/annual recurring revenue from Stripe |
| Total hours tracked | Sum of all time entries globally |
| Avg entries/user/day | Engagement metric |
| Streak leaders | Longest consecutive usage days |
| Retention curve | % still active after 7/30/90 days |
| Promo code usage | Redemptions per code, conversion rate |
| Domain grants | Users with premium via domain whitelist |

### Admin Actions
- **Manual premium grant**: Give any user premium for a set period (`granted_by = 'admin_manual'`)
- **Domain whitelist**: Add/remove company domains for automatic premium
- **Promo codes**: Create with discount %, max uses, expiry date
- **User lookup**: Search by email, view entries/projects/subscription

### Security
- Middleware checks `profiles.role = 'admin'` via Supabase
- Admin API routes use Supabase **service role key** (bypasses RLS)
- Service role key is server-side only (never in client bundle)

## B7. Website Dependencies

- `next` (v15)
- `react`, `react-dom` (v19)
- `@supabase/ssr`, `@supabase/supabase-js`
- `stripe`, `@stripe/stripe-js`
- `tailwindcss` (v4)

---

# Implementation Phases

| Phase | Where | Status | Scope |
|-------|-------|--------|-------|
| **4A: Foundation** | Shared + Extension | ✅ Done | Supabase project setup, SQL migrations, `@supabase/supabase-js` in extension, auth scaffolding, `externally_connectable` in manifest |
| **4B: Website MVP** | Website | ⏳ Deferred | Scaffold Next.js, landing page, login/register, auth callback → extension messaging, minimal dashboard |
| **4C: Stripe** | Website + Extension | ⏳ Deferred | Stripe products/prices, checkout route, webhook handler, billing page, subscription fetching in extension |
| **4D: Feature Gating** | Extension | ✅ Done | `UpgradePrompt`, lock export/projects/stats/work-types for free, "Account" tab in Settings, 30-day history limit |
| **4E: Sync Engine** | Extension | ✅ Done | Sync queue, push/pull, conflict resolution, storage layer hooks, periodic sync alarm, online/offline listeners, initial sync dialog |
| **4F: Realtime** | Extension | ✅ Done | Supabase Realtime channels, instant cross-device sync, connection lifecycle |
| **4G: Admin** | Website | ⏳ Deferred | Admin layout, stats overview, user management, domain whitelist, promo codes, subscription management |
| **4H: Polish** | Both | ⏳ Deferred | Offline testing, large dataset sync, concurrent edits, subscription flows, promo/domain tests, performance audit |

---

# Security

| Area | Approach |
|------|----------|
| Supabase anon key | Public, safe in extension. RLS prevents unauthorized access |
| Access tokens | In `chrome.storage.local` (extension-only) |
| Token refresh | Background auto-refreshes via `autoRefreshToken: true` |
| Stripe webhooks | Verified via signing secret |
| RLS | Every table scoped to `auth.uid() = user_id` |
| Admin API | Server-side only, Supabase service role key (bypasses RLS) |
| Extension messaging | `externally_connectable` restricts allowed origins |
| HTTPS | All Supabase/Stripe communication over HTTPS |
