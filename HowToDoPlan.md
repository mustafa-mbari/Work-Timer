# How to Update Plans in Stripe

This guide covers all Stripe setup needed after the pricing redesign (Free / Pro / Team).

---

## New Pricing Summary

| Plan        | Monthly | Yearly | DB plan name            |
|-------------|---------|--------|-------------------------|
| Free        | $0      | —      | `free`                  |
| Pro         | $1.99   | $17.99 | `premium_monthly/yearly`|
| Team (≤10)  | $29     | $260   | `team_10_monthly/yearly`|
| Team (≤20)  | $49     | $440   | `team_20_monthly/yearly`|
| Team (more) | Contact | —      | — (email link)          |

Legacy `allin_monthly` / `allin_yearly` subscribers keep their existing plan — no action needed on their subscriptions.

---

## Step 1 — Create New Stripe Prices

> Go to: **Stripe Dashboard → Products → Create product** (or reuse existing products and add new prices).

### Pro Yearly — $17.99/yr  *(replaces old $9.99/yr)*

1. Open your existing **Pro** product (or create one named "Work Timer Pro").
2. Click **Add price**.
3. Set: Recurring · Yearly · **$17.99 USD**.
4. Copy the new Price ID → paste into env var `STRIPE_PRICE_YEARLY`.

> **Note:** Do NOT archive the old $9.99 price yet — existing subscribers still reference it. Only update the env var so new checkouts use the new price.

### Team — Up to 10 members

Create a product named **"Work Timer Team (10)"** with two prices:

| Billing | Amount | Env var |
|---------|--------|---------|
| Monthly | $29.00 | `STRIPE_PRICE_TEAM_10_MONTHLY` |
| Yearly  | $260.00| `STRIPE_PRICE_TEAM_10_YEARLY`  |

Steps for each price:
1. **Add price** → Recurring → Monthly or Yearly → enter amount → Save.
2. Copy the Price ID → set the corresponding env var.

### Team — Up to 20 members

Create a product named **"Work Timer Team (20)"** with two prices:

| Billing | Amount | Env var |
|---------|--------|---------|
| Monthly | $49.00 | `STRIPE_PRICE_TEAM_20_MONTHLY` |
| Yearly  | $440.00| `STRIPE_PRICE_TEAM_20_YEARLY`  |

Same steps as above.

---

## Step 2 — Update Environment Variables

### `.env.local` (local development)

```env
# Pro
STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx   # $1.99/mo — unchanged
STRIPE_PRICE_YEARLY=price_xxxxxxxxxxxxx    # $17.99/yr — UPDATE to new price ID

# Team
STRIPE_PRICE_TEAM_10_MONTHLY=price_xxxxxxxxxxxxx   # $29/mo — NEW
STRIPE_PRICE_TEAM_10_YEARLY=price_xxxxxxxxxxxxx    # $260/yr — NEW
STRIPE_PRICE_TEAM_20_MONTHLY=price_xxxxxxxxxxxxx   # $49/mo — NEW
STRIPE_PRICE_TEAM_20_YEARLY=price_xxxxxxxxxxxxx    # $440/yr — NEW

# Legacy (keep for existing allin subscribers)
STRIPE_PRICE_ALLIN_MONTHLY=price_xxxxxxxxxxxxx     # keep existing
STRIPE_PRICE_ALLIN_YEARLY=price_xxxxxxxxxxxxx      # keep existing
```

### Vercel (production)

Go to **Vercel → Project → Settings → Environment Variables** and set the same variables.
After saving, trigger a **Redeploy** for the new price IDs to take effect.

---

## Step 3 — Verify Webhook Events

The Stripe webhook handler (`web/app/api/webhooks/stripe/route.ts`) already handles all new plan keys via `buildPlanMap()` and `resolveCheckoutPlan()`. No webhook changes are needed once env vars are set.

Ensure the webhook endpoint is registered in Stripe Dashboard:
- **URL:** `https://your-domain.com/api/webhooks/stripe`
- **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

---

## Step 4 — Test Checkout Flow

Use Stripe test mode before going live:

1. Set env vars to **test mode** Price IDs (prefix `price_test_...`).
2. Click **Get Pro** or **Get Team** on the pricing page.
3. Use Stripe test card `4242 4242 4242 4242` · any future expiry · any CVC.
4. Confirm: subscription row in `subscriptions` table shows the correct plan name (`team_10_monthly`, etc.).
5. Confirm: team feature gates work — user with `team_10_monthly` plan can create groups.

---

## Step 5 — Legacy Plan Backward Compatibility

No action required for existing `allin_monthly` / `allin_yearly` subscribers:
- DB plan names remain unchanged.
- `isTeamPlan()` in `web/lib/services/billing.ts` covers both `allin_*` and `team_*`.
- Billing page shows "(Legacy)" label for old subscribers.
- Group feature access continues to work seamlessly.

---

## Quick Reference — Plan Name Mapping

| Checkout `plan` param | Stripe env var | DB plan name |
|-----------------------|----------------|--------------|
| `monthly` | `STRIPE_PRICE_MONTHLY` | `premium_monthly` |
| `yearly` | `STRIPE_PRICE_YEARLY` | `premium_yearly` |
| `team_10_monthly` | `STRIPE_PRICE_TEAM_10_MONTHLY` | `team_10_monthly` |
| `team_10_yearly` | `STRIPE_PRICE_TEAM_10_YEARLY` | `team_10_yearly` |
| `team_20_monthly` | `STRIPE_PRICE_TEAM_20_MONTHLY` | `team_20_monthly` |
| `team_20_yearly` | `STRIPE_PRICE_TEAM_20_YEARLY` | `team_20_yearly` |
| `allin_monthly` *(legacy)* | `STRIPE_PRICE_ALLIN_MONTHLY` | `allin_monthly` |
| `allin_yearly` *(legacy)* | `STRIPE_PRICE_ALLIN_YEARLY` | `allin_yearly` |
