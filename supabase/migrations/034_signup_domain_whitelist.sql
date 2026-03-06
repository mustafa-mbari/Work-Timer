-- ============================================================
-- Migration 034: Domain whitelist check on user signup
-- Updates handle_new_user_subscription() to check if the new
-- user's email domain is in whitelisted_domains. If so, grants
-- the whitelisted plan instead of 'free'.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_whitelisted_plan text;
BEGIN
  -- Check if user's email domain is whitelisted
  SELECT plan INTO v_whitelisted_plan
  FROM whitelisted_domains
  WHERE active = true
    AND domain = split_part(NEW.email, '@', 2)
  LIMIT 1;

  IF v_whitelisted_plan IS NOT NULL THEN
    -- Grant whitelisted plan
    INSERT INTO subscriptions (user_id, plan, status, granted_by, updated_at)
    VALUES (NEW.id, v_whitelisted_plan, 'active', 'domain', now())
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Standard free account
    INSERT INTO subscriptions (user_id, plan, status, updated_at)
    VALUES (NEW.id, 'free', 'active', now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
