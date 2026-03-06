-- ============================================================
-- Migration 033: Subscription security & integrity fixes
-- 1. Enable RLS on subscriptions table (Critical security fix)
-- 2. Fix redeem_promo to clear Stripe fields on 100% grants
-- 3. Auto-create free subscription row on user signup
-- ============================================================

-- ============================================================
-- 1. SUBSCRIPTIONS TABLE RLS
-- Only users can read their own subscription. All writes go
-- through service role (webhooks, admin grants, promo grants).
-- ============================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for authenticated role.
-- All mutations use service_role client which bypasses RLS.


-- ============================================================
-- 2. FIX redeem_promo: Clear Stripe fields on 100% grants
-- When a 100% promo is redeemed, any previous Stripe subscription
-- IDs must be cleared to prevent a future webhook from overwriting
-- the promo grant.
-- ============================================================

CREATE OR REPLACE FUNCTION redeem_promo(p_code text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo record;
  v_existing_redemption uuid;
  v_now timestamptz := now();
BEGIN
  -- Lock and fetch promo code (FOR UPDATE prevents concurrent reads)
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE code = upper(p_code) AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid promo code');
  END IF;

  -- Check validity period
  IF v_promo.valid_from IS NOT NULL AND v_promo.valid_from > v_now THEN
    RETURN json_build_object('success', false, 'error', 'Promo code is not yet valid');
  END IF;

  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < v_now THEN
    RETURN json_build_object('success', false, 'error', 'Promo code has expired');
  END IF;

  -- Check max uses
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Promo code has reached its usage limit');
  END IF;

  -- Check if user already redeemed
  SELECT id INTO v_existing_redemption
  FROM promo_redemptions
  WHERE promo_code_id = v_promo.id AND user_id = p_user_id;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'You have already used this promo code');
  END IF;

  -- Record redemption
  INSERT INTO promo_redemptions (promo_code_id, user_id)
  VALUES (v_promo.id, p_user_id);

  -- Increment usage count atomically
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo.id;

  -- If 100% discount, grant premium directly
  IF v_promo.discount_pct = 100 THEN
    INSERT INTO subscriptions (user_id, plan, status, granted_by, promo_code_id, updated_at)
    VALUES (p_user_id, v_promo.plan, 'active', 'promo', v_promo.id, v_now)
    ON CONFLICT (user_id) DO UPDATE SET
      plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      granted_by = EXCLUDED.granted_by,
      promo_code_id = EXCLUDED.promo_code_id,
      stripe_subscription_id = NULL,
      stripe_customer_id = NULL,
      cancel_at_period_end = false,
      updated_at = EXCLUDED.updated_at;

    RETURN json_build_object(
      'success', true,
      'granted', true,
      'plan', v_promo.plan,
      'discount_pct', v_promo.discount_pct
    );
  END IF;

  -- Partial discount — return info for Stripe checkout
  RETURN json_build_object(
    'success', true,
    'granted', false,
    'plan', v_promo.plan,
    'discount_pct', v_promo.discount_pct,
    'promo_id', v_promo.id,
    'promo_code', v_promo.code
  );
END;
$$;


-- ============================================================
-- 3. AUTO-CREATE FREE SUBSCRIPTION ON USER SIGNUP
-- Ensures every user has a subscription row for consistent
-- admin views and eliminates null-handling edge cases.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, updated_at)
  VALUES (NEW.id, 'free', 'active', now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop if exists to make migration re-runnable
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();
