# Subscription Workflow Deep Code Review

I have completed a deep code review of the subscription workflow across the project. Below is a structured breakdown of the issues found, categorized by severity and type, followed by architectural recommendations.

### 1. Bugs

**A. Manual Admin Subscriptions Never Expire**
- **Severity:** Critical
- **Location:** `src/premium/featureGate.ts` (lines 8-11) & `admin/app/api/subscriptions/route.ts` (lines 35-40)
- **Problem:** When an admin manually assigns a subscription, they can set a `current_period_end`. However, the `isPremiumSubscription` check on the client only verifies if `sub.status === 'active'` and `sub.plan !== 'free'`. It does **not** check if `current_period_end` is in the past, and there is no background cron job to update the status of expired manual grants to `canceled`.
- **Impact:** Users granted temporary premium access by an admin will retain premium access forever.
- **Recommended Fix:** Update the `isPremiumSubscription` logic to check expiration:
  ```typescript
  export function isPremiumSubscription(sub: SubscriptionInfo | null): boolean {
    if (!sub) return false;
    const isActive = sub.status === 'active' || sub.status === 'trialing';
    const isUnexpired = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
    return sub.plan !== 'free' && isActive && isUnexpired;
  }
  ```

**B. Floating Promises Causing Dropped Emails**
- **Severity:** High
- **Location:** `web/app/api/webhooks/stripe/route.ts` (lines 161, 209, 230, etc.)
- **Problem:** The webhook sends emails using `.then(...)` without `await`ing the result, and immediately returns the HTTP response. In serverless environments (like Vercel), returning the response freezes or terminates the execution context, causing background promises to be silently killed.
- **Impact:** Welcome emails, cancellation notices, and trial ending emails will fail to send intermittently or entirely.
- **Recommended Fix:** `await` the email sending process before returning `NextResponse`, or use `waitUntil()` if running on Edge/Vercel.

**C. Race Condition in Webhook Idempotency**
- **Severity:** High
- **Location:** `web/app/api/webhooks/stripe/route.ts` (lines 79, 103, 277)
- **Problem:** The webhook checks for duplicates using a `SELECT` query (`isEventDuplicate`), processes the event, and then does an `INSERT` at the very end (`markEventProcessed`). If Stripe sends two concurrent requests for the same webhook event, both will pass the `SELECT` check simultaneously, process the event twice, and only one will successfully insert the idempotency key (while the other throws a logged error).
- **Impact:** Duplicate emails sent to users, duplicate database updates, and potential data corruption.
- **Recommended Fix:** Attempt to `INSERT` the idempotency key *first*. If the insert fails (due to the `PRIMARY KEY` constraint on `event_id`), abort processing immediately. 

**D. 100% Discount Promos Grant Lifetime Access**
- **Severity:** Medium
- **Location:** `supabase/migrations/033_subscription_security_fixes.sql` (lines 60-63)
- **Problem:** When a 100% discount promo code is redeemed, the RPC inserts an `active` subscription but does not set a `current_period_end`.
- **Impact:** Even if a promo code was intended for a "1-month free" campaign, a 100% discount will grant lifetime access because no expiration date is recorded.
- **Recommended Fix:** Update the `promo_codes` table to include a `duration_months` column. In the RPC, calculate and set `current_period_end` based on this duration when granting 100% discounts.

---

### 2. Security

**A. Rate Limit Bypass via Header Spoofing**
- **Severity:** Medium
- **Location:** `web/app/api/promo/redeem/route.ts` (line 9)
- **Problem:** The rate limiter relies entirely on the `x-forwarded-for` header. This header can be trivially spoofed by a malicious client sending their own `X-Forwarded-For` header in the request.
- **Impact:** Attackers can bypass rate limits to brute-force promo codes.
- **Recommended Fix:** Rate limit based on the authenticated `user.id` since the endpoint requires authentication. If IP limiting is strictly needed, use `request.ip` provided by Next.js, which safely extracts the IP depending on the hosting provider.

---

### 3. Performance

**A. Massive N+1 / Memory Leak in Admin API**
- **Severity:** High
- **Location:** `admin/lib/repositories/subscriptions.ts` (lines 14-25)
- **Problem:** `getAllSubscriptionsWithEmail` fetches up to 50,000 subscriptions and 50,000 user profiles into server memory at once, then maps them in a JavaScript array. 
- **Impact:** As the user base grows, this endpoint will become extremely slow, hit memory limits, and crash the admin server (OOM errors).
- **Recommended Fix:** Use Supabase's foreign key JOIN capabilities to let the database handle this efficiently:
  ```typescript
  const { data } = await supabase
    .from('subscriptions')
    .select(`
      *,
      profiles ( email, display_name )
    `)
    .order('updated_at', { ascending: false })
    .limit(100); // Add pagination!
  ```

---

### 4. Maintainability

**A. Duplicated Code across Apps**
- **Severity:** Low - don't do it now.
- **Location:** `web/lib/stripe.ts`, `admin/lib/stripe.ts`, and `repositories`
- **Problem:** Identical code exists in both the admin and web applications for interacting with the database and Stripe.
- **Impact:** Updating logic (like adding a new pricing plan) requires modifying multiple isolated files, increasing the risk of drifting business logic.
- **Recommended Fix:** Move database repositories, Supabase clients, and Stripe singletons into the shared workspace (`@shared/`) so both Next.js apps consume the exact same logic.

**B. Fragmented Plan Mappings**
- **Severity:** Low
- **Location:** `web/app/api/webhooks/stripe/route.ts` & `web/app/api/promo/redeem/route.ts`
- **Problem:** The mapping of Stripe Price IDs to internal plan names (`premium_monthly`, `allin_yearly`) is hardcoded multiple times across different files in awkward switch/if blocks.
- **Recommended Fix:** Centralize all Stripe mapping into a single source of truth in `shared/constants.ts` or `lib/stripe.ts` to prevent mismatch errors.

---

### 5. Edge Cases

**A. Failed Invoice Updates Lack Subscription Context**
- **Severity:** Low
- **Location:** `web/app/api/webhooks/stripe/route.ts` (lines 249-256)
- **Problem:** The `invoice.payment_failed` handler updates the DB status to `past_due`. However, if the user resolves the payment directly in Stripe, the webhook for `invoice.paid` does not update the status back to `active`.
- **Recommended Fix:** The `customer.subscription.updated` event handles status changes automatically when Stripe moves a subscription from `past_due` back to `active`. You can actually remove the `invoice.payment_failed` DB update and rely entirely on `customer.subscription.updated` to sync the `status` field reliably.

---

### Architectural Improvements & Additional Tasks

To make the subscription system more robust and scalable, I recommend the following architectural shifts:

1. **Adopt a Webhook Sync-First Architecture**
   Currently, the system attempts to write to the DB during the checkout webhook *and* updates via subscription webhooks. A more scalable approach is to treat Stripe as the absolute source of truth. The application should only ever update local subscription rows based on `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. This removes the need for complex metadata resolving during checkout completion.

2. **Implement Proper Pagination**
   The admin panel is querying the database using `.range(0, 49999)`. This is a ticking time bomb. Implement cursor-based or standard offset pagination in the Admin API to handle data retrieval responsibly.

3. **Background Sync / Cron Checks**
   Because non-Stripe subscriptions (admin grants, promos) do not emit webhooks when they expire, you need a recurring job (e.g., Supabase pg_cron, or a Vercel Cron endpoint) that runs daily to find subscriptions where `current_period_end < NOW()` and `status = 'active'`, and sets their status to `canceled` or `expired`.

4. **Missing Monitoring**
   - Add centralized error logging (e.g., Sentry) [Add new page in admin app for that] specifically for the Stripe webhook handler. If a webhook fails, you are currently only using `console.error`, meaning failed renewals will go unnoticed until users complain.
   - Implement Stripe webhook signature failure alerts. Repeated failures often indicate a misconfigured environment variable or an ongoing attack.
