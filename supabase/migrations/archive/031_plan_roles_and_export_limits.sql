-- ============================================================
-- Migration 031: Plan roles and export quota system
-- Maps subscription plans → role buckets (free/pro/team)
-- and enforces monthly export limits per role.
-- ============================================================

-- 1. Map every subscription plan to a role bucket
CREATE TABLE plan_roles (
  plan       TEXT PRIMARY KEY,
  role_name  TEXT NOT NULL CHECK (role_name IN ('free', 'pro', 'team'))
);

INSERT INTO plan_roles (plan, role_name) VALUES
  ('free',              'free'),
  ('premium_monthly',   'pro'),
  ('premium_yearly',    'pro'),
  ('premium_lifetime',  'pro'),
  ('allin_monthly',     'team'),
  ('allin_yearly',      'team'),
  ('team_10_monthly',   'team'),
  ('team_10_yearly',    'team'),
  ('team_20_monthly',   'team'),
  ('team_20_yearly',    'team');

ALTER TABLE plan_roles ENABLE ROW LEVEL SECURITY;

-- Public read — limits are not sensitive
CREATE POLICY "plan_roles_select" ON plan_roles FOR SELECT USING (true);


-- 2. Monthly limits per role and export type
CREATE TABLE role_export_limits (
  role_name     TEXT NOT NULL CHECK (role_name IN ('free', 'pro', 'team')),
  export_type   TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel', 'csv')),
  monthly_limit INT  NOT NULL,
  PRIMARY KEY (role_name, export_type)
);

INSERT INTO role_export_limits (role_name, export_type, monthly_limit) VALUES
  ('free',  'pdf',   1),
  ('free',  'excel', 1),
  ('free',  'csv',   1),
  ('pro',   'pdf',   10),
  ('pro',   'excel', 20),
  ('pro',   'csv',   30),
  ('team',  'pdf',   20),
  ('team',  'excel', 30),
  ('team',  'csv',   30);

ALTER TABLE role_export_limits ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "role_export_limits_select" ON role_export_limits FOR SELECT USING (true);


-- 3. Per-user monthly usage tracking
--    All writes go through SECURITY DEFINER functions; no client INSERT/UPDATE.
CREATE TABLE export_usage (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel', 'csv')),
  year_month  TEXT NOT NULL,   -- 'YYYY-MM' in UTC, e.g. '2026-03'
  count       INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, export_type, year_month)
);

CREATE INDEX idx_export_usage_user_month ON export_usage (user_id, year_month);

ALTER TABLE export_usage ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rows
CREATE POLICY "export_usage_select" ON export_usage
  FOR SELECT USING (user_id = auth.uid());

-- No INSERT / UPDATE policy — writes are via SECURITY DEFINER RPCs only


-- ============================================================
-- FUNCTION 1: get_user_export_role
-- Returns the role bucket ('free' | 'pro' | 'team') for a user
-- based on their active subscription plan.
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_export_role(p_user_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan     TEXT;
  v_role     TEXT;
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


-- ============================================================
-- FUNCTION 2: track_export_usage
-- Atomically checks the monthly limit and increments the counter.
-- Uses SELECT ... FOR UPDATE to serialize concurrent requests
-- for the same (user, type, month) tuple.
-- Returns JSON: { allowed, used, limit }
-- ============================================================
CREATE OR REPLACE FUNCTION track_export_usage(
  p_user_id     uuid,
  p_export_type text,
  p_year_month  text   -- 'YYYY-MM'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role        TEXT;
  v_limit       INT;
  v_current     INT;
  v_new_count   INT;
BEGIN
  -- Resolve role and limit (static config tables, no lock needed)
  v_role := get_user_export_role(p_user_id);

  SELECT rel.monthly_limit INTO v_limit
  FROM role_export_limits rel
  WHERE rel.role_name   = v_role
    AND rel.export_type = p_export_type;

  IF v_limit IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'used',    0,
      'limit',   0,
      'error',   'Unknown export type or role'
    );
  END IF;

  -- Ensure the usage row exists before locking it
  INSERT INTO export_usage (user_id, export_type, year_month, count)
  VALUES (p_user_id, p_export_type, p_year_month, 0)
  ON CONFLICT (user_id, export_type, year_month) DO NOTHING;

  -- Lock the specific row to serialize concurrent requests
  SELECT eu.count INTO v_current
  FROM export_usage eu
  WHERE eu.user_id     = p_user_id
    AND eu.export_type = p_export_type
    AND eu.year_month  = p_year_month
  FOR UPDATE;

  -- Check against limit
  IF v_current >= v_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'used',    v_current,
      'limit',   v_limit
    );
  END IF;

  -- Atomically increment
  UPDATE export_usage
  SET count = count + 1
  WHERE user_id     = p_user_id
    AND export_type = p_export_type
    AND year_month  = p_year_month;

  v_new_count := v_current + 1;

  RETURN json_build_object(
    'allowed', true,
    'used',    v_new_count,
    'limit',   v_limit
  );
END;
$$;


-- ============================================================
-- FUNCTION 3: get_user_export_quota
-- Read-only: returns full quota (used/limit/remaining) for each
-- export type for the given user and month.
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_export_quota(
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
    SELECT json_agg(row_to_json(q) ORDER BY q.export_type)
    FROM (
      SELECT
        rel.export_type,
        rel.monthly_limit                                         AS "limit",
        COALESCE(eu.count, 0)                                     AS "used",
        GREATEST(rel.monthly_limit - COALESCE(eu.count, 0), 0)   AS "remaining"
      FROM role_export_limits rel
      LEFT JOIN export_usage eu
        ON  eu.user_id     = p_user_id
        AND eu.export_type = rel.export_type
        AND eu.year_month  = p_year_month
      WHERE rel.role_name = v_role
    ) q
  );
END;
$$;


-- ============================================================
-- Security hardening: restrict RPC execution to service role.
-- These functions accept an arbitrary user_id; revoking PUBLIC
-- EXECUTE prevents callers with the anon/authenticated key from
-- depleting other users' quotas or reading their usage data.
-- The Next.js backend calls these via the service role client
-- which retains EXECUTE automatically.
-- ============================================================
REVOKE EXECUTE ON FUNCTION get_user_export_role(uuid)           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION track_export_usage(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_export_quota(uuid, text)    FROM PUBLIC;
