# Subscription Workflow Code Review — Addendum (V2)

This document covers **new findings only** that are not present in `SUBSCRIPTION_WORKFLOW_REVIEW.md`. All findings have been verified against the live source code. The user has confirmed **`premium_lifetime` does not exist** as a purchasable plan — all lifetime references are dead code kept for backwards compatibility.

---

## 1. Bugs

**Severity:** High
**Location:** `web/lib/services/billing.ts` lines 14 and 28 vs `src/premium/featureGate.ts` lines 9-12
**Problem:** The website's `getSubscriptionFlags()` and `isPremiumUser()` only check `status === 'active'`. The extension's `isPremiumSubscription()` checks both `'active'` and `'trialing'`. A user with `status = 'trialing'` is treated as premium in the extension but as **free** on the website.
**Impact:** Trial users get premium features in the Chrome extension but are locked out of the Entries, Analytics, and Earnings pages on the website (all return 403 / show upgrade paywall). This is a broken experience for paying users in a trial period.
**Recommended Fix:** Update both functions in `web/lib/services/billing.ts`:
```typescript
// getSubscriptionFlags (line 14)
if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) return { isPremium: false, isAllIn: false }

// isPremiumUser (line 28)
return sub.plan !== 'free' && (sub.status === 'active' || sub.status === 'trialing')
```

---

**Severity:** Medium
**Location:** `web/app/api/promo/redeem/route.ts` lines 52-55
**Problem:** The `planKey` mapping for partial-discount promo checkouts only handles `premium_yearly`, `allin_monthly`, and `allin_yearly`. Everything else falls through to `'monthly'` (i.e., `premium_monthly`). The plans `premium_monthly`, `team_10_monthly`, `team_10_yearly`, `team_20_monthly`, and `team_20_yearly` are all missing.
**Impact:** A promo code created for `team_10_monthly` with a 50% discount will silently route the user to a `premium_monthly` checkout. The user pays for the wrong plan, does not receive team features, and has no idea anything went wrong.
**Recommended Fix:**
```typescript
const PLAN_KEY_MAP: Record<string, string> = {
  premium_monthly:  'monthly',
  premium_yearly:   'yearly',
  allin_monthly:    'allin_monthly',
  allin_yearly:     'allin_yearly',
  team_10_monthly:  'team_10_monthly',
  team_10_yearly:   'team_10_yearly',
  team_20_monthly:  'team_20_monthly',
  team_20_yearly:   'team_20_yearly',
}
const planKey = PLAN_KEY_MAP[result.plan ?? ''] ?? 'monthly'
```

---

**Severity:** Medium
**Location:** `web/app/api/checkout/route.ts` line 27
**Problem:** The duplicate-subscription guard only rejects users with `status === 'active'`. It does not block `trialing` or `past_due` users from starting a new checkout.
**Impact:** A trialing user can complete a second checkout session, creating a second Stripe subscription. The webhook's `upsertSubscription` uses `onConflict: 'user_id'`, so only the last checkout wins in the DB, but **both** Stripe subscriptions continue billing. Similarly, a `past_due` user can purchase again, leaving the failed subscription orphaned.
**Recommended Fix:**
```typescript
const blockedStatuses = ['active', 'trialing', 'past_due', 'unpaid']
if (existing && existing.plan !== 'free' && blockedStatuses.includes(existing.status)) {
  return NextResponse.json({ error: 'You already have an active subscription' }, { status: 400 })
}
```

---

**Severity:** Medium
**Location:** `admin/lib/repositories/admin.ts` lines 68-72 (`getAuthUserCount`)
**Problem:** Calls `listUsers({ perPage: 1 })` and returns `data?.users?.length`, which is always 0 or 1. The actual total count is in the pagination metadata, which is ignored entirely.
**Impact:** Admin overview page always displays "1" (or "0") as the total user count.
**Recommended Fix:**
```typescript
export async function getAuthUserCount(): Promise<number> {
  const supabase = await createServiceClient()
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1 })
  return (data as any)?.total ?? data?.users?.length ?? 0
}
```

---

**Severity:** Medium
**Location:** `admin/lib/repositories/admin.ts` lines 88-91 (`findAuthUserByEmail`)
**Problem:** Fetches up to 1,000 users via `listUsers({ perPage: 1000 })` then filters with `.find()` in JavaScript. Any user beyond the first 1,000 rows will never be found.
**Impact:** Once you exceed 1,000 users, admin "Grant Premium" will fail with "User not found" for users not on page 1. No error surfaces the real cause.
**Recommended Fix:** Paginate through all users, or ideally use a Supabase admin API that supports email filtering directly. As a simpler fix, query the `profiles` table (which has email) to get the user ID:
```typescript
export async function findAuthUserByEmail(email: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase.from('profiles').select('id').eq('email', email).single()
  if (!data) return null
  const { data: userData } = await supabase.auth.admin.getUserById(data.id)
  return userData?.user ?? null
}
```

---

**Severity:** Low
**Location:** `web/app/api/billing/upgrade/route.ts` line 53
**Problem:** Returns raw `err.message` from Stripe exceptions directly in the HTTP 500 response body. Stripe error messages can include internal price IDs, object IDs, and API configuration details.
**Impact:** Information leakage. The checkout route (line 47-48) correctly uses a generic error message — this route is inconsistent.
**Recommended Fix:**
```typescript
console.error('[upgrade] Failed:', { userId: user.id, plan, error: message })
return NextResponse.json({ error: 'Failed to upgrade plan' }, { status: 500 })
```

---

**Severity:** Low
**Location:** `web/app/api/webhooks/stripe/route.ts` — lines 15, 24, 37, 46-47, 69, 132-169
**Problem:** The webhook handler contains dead code throughout for `premium_lifetime`: `buildPlanMap()` includes `STRIPE_PRICE_LIFETIME`, `VALID_PLANS` includes `'premium_lifetime'`, `resolveCheckoutPlan` maps `'lifetime'`, and lines 132-169 contain an `isLifetime` branch for lifetime checkout + old subscription cancellation. No lifetime plan exists.
**Impact:** Cognitive overhead for future developers. If `STRIPE_PRICE_LIFETIME` is accidentally set in env vars, the handler will begin treating purchases as lifetime grants with no test coverage for that path.
**Recommended Fix:** Remove all `premium_lifetime` references from the webhook handler. Keep only the `plan_roles` table entry in migration 031 for backward compatibility with any existing DB rows.

---

## 2. Security

**Severity:** Critical
**Location:** `supabase/migrations/` — **no migration file enables RLS on `subscriptions`**
**Problem:** Searching all 32 migration files shows RLS enabled for `projects`, `tags`, `time_entries`, `user_stats`, `groups`, `group_members`, `group_invitations`, `group_sharing_settings`, `group_shares`, `support_tickets`, `feature_suggestions`, `email_logs`, `plan_roles`, `role_export_limits`, and `export_usage` — but **not** `subscriptions`. If the table was created without RLS in the Supabase dashboard, any authenticated user can execute a direct Supabase API call with their JWT and the anon key (publicly embedded in the extension bundle) to update their own row: `plan: 'premium_yearly', status: 'active'`.
**Impact:** Complete subscription bypass. Any user can self-grant any plan without paying.
**Recommended Fix:** Verify actual Supabase dashboard state **immediately**. Create a migration:
```sql
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE from client — all writes go through service role
```
All existing writes (webhook, admin grant, promo grant) use the service role client and are unaffected.

---

**Severity:** Medium
**Location:** `web/app/api/webhooks/stripe/route.ts` lines 98-114 (idempotency) vs lines 147, 194, 211 (error returns)
**Problem:** The idempotency record (`stripe_events` insert) is created **before** the DB write. If the DB write then fails (returns 500), Stripe retries the webhook. On retry, the idempotency check finds the existing `event_id` and returns HTTP 200 `{ duplicate: true }` — skipping all processing permanently.
**Impact:** A single transient DB failure (connection timeout, Supabase cold start) causes the webhook event to be **permanently dropped**. For `checkout.session.completed`, this means a paying customer's subscription is never activated. For `customer.subscription.deleted`, a canceled subscription stays active forever.
**Recommended Fix:** Either:
- (A) Move the `stripe_events` insert to **after** successful processing, or
- (B) Delete the `stripe_events` row on processing failure before returning 500, or
- (C) Add a retry loop (2-3 attempts with backoff) around the DB write before giving up

Option (A) is simplest:
```typescript
// Move idempotency insert to AFTER the switch block succeeds
// At the top, only CHECK for duplicates (SELECT), don't INSERT yet
// After successful processing, INSERT the idempotency record
```

---

**Severity:** Medium
**Location:** `web/app/api/promo/validate/route.ts` and `web/app/api/promo/redeem/route.ts`
**Problem:** Neither endpoint has rate limiting. The validate endpoint provides a clear oracle (`'Invalid promo code'` vs other errors) enabling brute-force enumeration of the promo code space.
**Impact:** An attacker with a valid JWT can enumerate all promo codes in seconds. Partial-discount codes trigger `coupons.create` on each successful guess, generating garbage Stripe coupons (compounds the existing coupon-spam finding).
**Recommended Fix:** Add IP-based rate limiting: 10 requests/minute per IP on promo endpoints. Use Vercel Edge Rate Limiting or a simple in-memory counter in middleware.

---

## 3. Performance

**Severity:** High
**Location:** `admin/lib/repositories/admin.ts` lines 81-86 (`getAllAuthUsers`)
**Problem:** Requests up to 10,000 user objects in a single Supabase `listUsers` call, loading all into Node.js server memory. Each auth user object includes email, metadata, identity providers, and audit fields.
**Impact:** On Vercel's serverless environment (512 MB default), this will cause OOM crashes at scale. The function is called by admin pages on every request with no caching.
**Recommended Fix:** Paginate with a cursor loop, or restructure callers to use `getAuthUsers(page, perPage)` (which already exists and paginates correctly) instead of loading everything at once.

---

## 4. Edge Cases

**Severity:** Medium
**Location:** `admin/app/api/subscriptions/route.ts` lines 32-38
**Problem:** Admin grant upsert does not set `cancel_at_period_end`, `stripe_subscription_id`, or `stripe_customer_id`. The `ON CONFLICT DO UPDATE` preserves existing values for omitted columns. A user who previously had a canceling Stripe subscription will retain `cancel_at_period_end = true` after the admin grant.
**Impact:** User's billing page shows "Your plan will cancel at end of period" even though the admin grant is not Stripe-managed. Causes confusion and support tickets.
**Recommended Fix:**
```typescript
await upsertSubscription({
  user_id: authUser.id,
  plan,
  status: 'active',
  granted_by: 'admin_manual',
  stripe_subscription_id: null,
  stripe_customer_id: null,
  cancel_at_period_end: false,
  current_period_end: current_period_end ?? null,
})
```
Apply the same fix in `004_atomic_promo.sql` for 100% promo grants — add `stripe_subscription_id = NULL, stripe_customer_id = NULL, cancel_at_period_end = false` to the `ON CONFLICT DO UPDATE` clause.

---

**Severity:** Medium
**Location:** `web/lib/repositories/subscriptions.ts` lines 74-83 (`updateSubscriptionByStripeId`)
**Problem:** The `.update().eq('stripe_subscription_id', ...)` query does not check whether any row was actually updated. PostgREST returns `{ error: null }` for both "updated 1 row" and "updated 0 rows".
**Impact:** This function is called by `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed` webhook handlers. If the `stripe_subscription_id` doesn't match any row (e.g., admin grant cleared it), the webhook processes "successfully" but changes nothing. Subscription renewals, cancellations, and payment failures are **silently dropped**.
**Recommended Fix:**
```typescript
export async function updateSubscriptionByStripeId(stripeSubscriptionId: string, updates: Partial<Subscription>) {
  const supabase = await createServiceClient()
  const { error, count } = await (supabase.from('subscriptions') as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select('id', { count: 'exact', head: true })
  if (!error && count === 0) {
    console.warn('[subscriptions] updateByStripeId matched 0 rows for:', stripeSubscriptionId)
  }
  return { error }
}
```

---

**Severity:** Low
**Location:** No migration or application code creates a subscription row on user signup
**Problem:** New users have no `subscriptions` row until they purchase, redeem a promo, or get an admin grant. All `getSubscriptionPlanStatus` callers handle `null` gracefully, so no runtime errors occur. However, the admin subscriptions page (built from `getAllSubscriptionsWithEmail`) only shows users who have a row.
**Impact:** Free users are invisible in admin subscription management. User counts don't match between the users page and the subscriptions page.
**Recommended Fix:** Create a DB trigger that inserts a default free row on user creation:
```sql
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();
```

---

**Severity:** Low
**Location:** `web/app/api/checkout/route.ts` line 27
**Problem:** The existing subscription check only blocks `status === 'active'`. A user with `status === 'past_due'` (failed payment, Stripe still retrying) can start a new checkout.
**Impact:** The user ends up with two Stripe subscriptions — the failed one (still retrying) and the new one. Both will attempt to bill once the payment method is updated.
**Recommended Fix:** Block checkout for all non-free, non-canceled statuses (covered in Bug #3 fix above).

---

## Architectural Improvements & Suggestions

**1. Consistent `trialing` Support Across the Stack**
The `trialing` status is accepted by the extension but rejected by the website. This should be a single shared function or constant that defines which statuses count as "active premium." Consider adding it to `shared/constants.ts`:
```typescript
export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const
```
Both the extension and website should import and use this constant.

**2. Two-Phase Webhook Idempotency**
The current pattern (insert idempotency record first, then process) creates a permanent-drop risk on transient failures. Switch to:
- Phase 1: `INSERT INTO stripe_events (event_id, event_type, status) VALUES (..., 'processing')`
- Phase 2: After successful processing, `UPDATE stripe_events SET status = 'processed'`
- On retry: If status = `'processing'` and `processed_at` is older than 5 minutes, reprocess. If status = `'processed'`, skip.

**3. Default Free Subscription Row on Signup**
Creating a subscription row for every user on signup (via DB trigger) simplifies all queries, makes admin views complete, and eliminates null-handling throughout the codebase.

**4. Centralized Plan-to-Price Mapping**
Create a single `lib/shared/plans.ts` file that defines the bidirectional mapping between internal plan names and Stripe price keys. Import it in checkout, promo redeem, and webhook handler. This prevents the partial-mapping bugs found above and ensures new plans are added in exactly one place.

**5. Admin Grant Should Notify Users**
When an admin grants premium, no email is sent. Add a billing notification email (using the existing `buildBillingNotificationEmail` with `event: 'subscription_created'`) so users know their status changed.

**6. Webhook Zero-Match Alerting**
When `updateSubscriptionByStripeId` matches zero rows, this indicates a data integrity issue (admin override cleared the Stripe ID, or the subscription was never created). Log these events to a monitoring table or `admin_alerts` so admins can investigate.
