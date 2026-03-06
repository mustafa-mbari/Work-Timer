-- ============================================================
-- Migration 039: API monthly quotas
-- Per-resource-type monthly request limits, configurable per role.
-- Reuses plan_roles from migration 031 for role resolution.
-- ============================================================

-- 1. Configurable limits per role per resource type
CREATE TABLE api_quota_limits (
  role_name      TEXT NOT NULL CHECK (role_name IN ('free', 'pro', 'team')),
  resource_type  TEXT NOT NULL,
  monthly_limit  INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (role_name, resource_type)
);

-- Seed defaults (based on total budgets: free=200, pro=2000, team=2500)
INSERT INTO api_quota_limits (role_name, resource_type, monthly_limit) VALUES
  -- entries (highest volume)
  ('free',  'entries',     100),
  ('pro',   'entries',     1500),
  ('team',  'entries',     2000),
  -- projects
  ('free',  'projects',    30),
  ('pro',   'projects',    150),
  ('team',  'projects',    200),
  -- tags
  ('free',  'tags',        30),
  ('pro',   'tags',        150),
  ('team',  'tags',        200),
  -- settings
  ('free',  'settings',    20),
  ('pro',   'settings',    100),
  ('team',  'settings',    100),
  -- groups
  ('free',  'groups',      10),
  ('pro',   'groups',      50),
  ('team',  'groups',      100),
  -- support
  ('free',  'support',     5),
  ('pro',   'support',     20),
  ('team',  'support',     30),
  -- suggestions
  ('free',  'suggestions', 5),
  ('pro',   'suggestions', 20),
  ('team',  'suggestions', 30);

ALTER TABLE api_quota_limits ENABLE ROW LEVEL SECURITY;

-- Public read (limits are not sensitive)
CREATE POLICY "api_quota_limits_select" ON api_quota_limits FOR SELECT USING (true);


-- 2. Per-user monthly usage tracking
CREATE TABLE api_quota_usage (
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type  TEXT NOT NULL,
  year_month     TEXT NOT NULL,   -- 'YYYY-MM' in UTC
  count          INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, resource_type, year_month)
);

CREATE INDEX idx_api_quota_usage_user_month ON api_quota_usage (user_id, year_month);

ALTER TABLE api_quota_usage ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rows
CREATE POLICY "api_quota_usage_select" ON api_quota_usage
  FOR SELECT USING (user_id = auth.uid());

-- No INSERT/UPDATE policy — writes via SECURITY DEFINER RPCs only


-- ============================================================
-- FUNCTION: check_api_quota
-- Atomically checks limit and increments counter.
-- Returns JSON: { allowed, used, limit, remaining }
-- If no limit is configured for the resource, returns allowed=true
-- with limit=-1 (unlimited).
-- ============================================================
CREATE OR REPLACE FUNCTION check_api_quota(
  p_user_id       uuid,
  p_resource_type text,
  p_year_month    text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role    TEXT;
  v_limit   INT;
  v_current INT;
BEGIN
  -- Resolve role via existing function
  v_role := get_user_export_role(p_user_id);

  -- Look up the limit for this role + resource
  SELECT aql.monthly_limit INTO v_limit
  FROM api_quota_limits aql
  WHERE aql.role_name = v_role
    AND aql.resource_type = p_resource_type;

  -- No limit configured = unlimited
  IF v_limit IS NULL THEN
    RETURN json_build_object(
      'allowed', true,
      'used', 0,
      'limit', -1,
      'remaining', -1
    );
  END IF;

  -- Ensure usage row exists
  INSERT INTO api_quota_usage (user_id, resource_type, year_month, count)
  VALUES (p_user_id, p_resource_type, p_year_month, 0)
  ON CONFLICT (user_id, resource_type, year_month) DO NOTHING;

  -- Lock row for atomic check-and-increment
  SELECT aqu.count INTO v_current
  FROM api_quota_usage aqu
  WHERE aqu.user_id = p_user_id
    AND aqu.resource_type = p_resource_type
    AND aqu.year_month = p_year_month
  FOR UPDATE;

  -- Check against limit
  IF v_current >= v_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'used', v_current,
      'limit', v_limit,
      'remaining', 0
    );
  END IF;

  -- Increment
  UPDATE api_quota_usage
  SET count = count + 1
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND year_month = p_year_month;

  RETURN json_build_object(
    'allowed', true,
    'used', v_current + 1,
    'limit', v_limit,
    'remaining', v_limit - v_current - 1
  );
END;
$$;


-- ============================================================
-- FUNCTION: get_user_api_quotas
-- Read-only: returns quota per resource type for the user.
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_api_quotas(
  p_user_id    uuid,
  p_year_month text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := get_user_export_role(p_user_id);

  RETURN (
    SELECT json_agg(row_to_json(q) ORDER BY q.resource_type)
    FROM (
      SELECT
        aql.resource_type,
        aql.monthly_limit                                           AS "limit",
        COALESCE(aqu.count, 0)                                     AS "used",
        GREATEST(aql.monthly_limit - COALESCE(aqu.count, 0), 0)   AS "remaining"
      FROM api_quota_limits aql
      LEFT JOIN api_quota_usage aqu
        ON  aqu.user_id       = p_user_id
        AND aqu.resource_type = aql.resource_type
        AND aqu.year_month    = p_year_month
      WHERE aql.role_name = v_role
    ) q
  );
END;
$$;


-- ============================================================
-- FUNCTION: get_all_api_quota_limits (admin)
-- Returns all limits for all roles/resources.
-- ============================================================
CREATE OR REPLACE FUNCTION get_all_api_quota_limits()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_agg(row_to_json(aql) ORDER BY aql.resource_type, aql.role_name)
  FROM api_quota_limits aql;
$$;


-- ============================================================
-- FUNCTION: upsert_api_quota_limit (admin)
-- Insert or update a single limit.
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_api_quota_limit(
  p_role_name      text,
  p_resource_type  text,
  p_monthly_limit  int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO api_quota_limits (role_name, resource_type, monthly_limit)
  VALUES (p_role_name, p_resource_type, p_monthly_limit)
  ON CONFLICT (role_name, resource_type)
  DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit;
END;
$$;


-- ============================================================
-- Security: restrict execution to service role
-- ============================================================
REVOKE EXECUTE ON FUNCTION check_api_quota(uuid, text, text)             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_api_quotas(uuid, text)               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_all_api_quota_limits()                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION upsert_api_quota_limit(text, text, int)       FROM PUBLIC;
