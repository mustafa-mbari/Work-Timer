-- ============================================================
-- Migration 032: Export quota security + trialing fix
--
-- Patches to migration 031 that must be applied separately
-- because 031 was already deployed before these fixes.
--
-- Changes:
--   1. get_user_export_role: include 'trialing' subscriptions so
--      trial users get pro/team limits instead of falling back to free.
--   2. REVOKE EXECUTE FROM PUBLIC on all three quota RPCs to prevent
--      IDOR — malicious callers with the anon key were able to pass an
--      arbitrary user_id and drain other users' monthly quota.
-- ============================================================

-- Fix 1: include trialing subscriptions in role resolution
CREATE OR REPLACE FUNCTION get_user_export_role(p_user_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
  v_role TEXT;
BEGIN
  SELECT s.plan INTO v_plan
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing');

  IF v_plan IS NULL THEN
    RETURN 'free';
  END IF;

  SELECT pr.role_name INTO v_role
  FROM plan_roles pr
  WHERE pr.plan = v_plan;

  RETURN COALESCE(v_role, 'free');
END;
$$;

-- Fix 2: restrict execution to service role only
REVOKE EXECUTE ON FUNCTION get_user_export_role(uuid)           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION track_export_usage(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_export_quota(uuid, text)    FROM PUBLIC;
