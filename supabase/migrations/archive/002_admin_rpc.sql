-- ============================================================
-- Migration 002: Admin RPC functions for platform stats
-- Replaces 11 parallel queries + 80 lines of JS aggregation
-- in web/app/admin/stats/page.tsx
-- ============================================================

-- 1. Platform-wide aggregate stats (single query)
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_entries', (SELECT count(*) FROM time_entries WHERE deleted_at IS NULL),
    'total_hours', (SELECT COALESCE(sum(duration) / 3600000.0, 0) FROM time_entries WHERE deleted_at IS NULL),
    'entry_count_30d', (SELECT count(*) FROM time_entries WHERE deleted_at IS NULL AND date >= (current_date - interval '30 days')::text),
    'project_count', (SELECT count(*) FROM projects WHERE deleted_at IS NULL),
    'avg_session_ms', (SELECT COALESCE(avg(duration), 0) FROM time_entries WHERE deleted_at IS NULL)
  ) INTO result;
  RETURN result;
END;
$$;

-- 2. Active user counts (DAU/WAU/MAU)
CREATE OR REPLACE FUNCTION get_active_users(period interval)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT count(DISTINCT user_id)::integer
  FROM time_entries
  WHERE deleted_at IS NULL
    AND created_at >= (now() - period);
$$;

-- 3. User growth: weekly signup counts over N weeks
CREATE OR REPLACE FUNCTION get_user_growth(weeks integer DEFAULT 8)
RETURNS TABLE(week_start timestamptz, signup_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH week_series AS (
    SELECT generate_series(
      date_trunc('week', now() - (weeks * interval '1 week')),
      date_trunc('week', now()),
      interval '1 week'
    ) AS week_start
  )
  SELECT
    ws.week_start,
    count(u.id) AS signup_count
  FROM week_series ws
  LEFT JOIN auth.users u
    ON u.created_at >= ws.week_start
    AND u.created_at < ws.week_start + interval '1 week'
  GROUP BY ws.week_start
  ORDER BY ws.week_start;
$$;

-- 4. Top N users by total hours tracked
CREATE OR REPLACE FUNCTION get_top_users(lim integer DEFAULT 5)
RETURNS TABLE(user_id uuid, email text, total_hours numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    te.user_id,
    COALESCE(u.email, 'Unknown') AS email,
    round(sum(te.duration) / 3600000.0, 1) AS total_hours
  FROM time_entries te
  LEFT JOIN auth.users u ON u.id = te.user_id
  WHERE te.deleted_at IS NULL
  GROUP BY te.user_id, u.email
  ORDER BY total_hours DESC
  LIMIT lim;
$$;

-- 5. Entry type breakdown (counts and hours)
CREATE OR REPLACE FUNCTION get_entry_type_breakdown()
RETURNS TABLE(entry_type text, entry_count bigint, total_hours numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    type AS entry_type,
    count(*) AS entry_count,
    round(sum(duration) / 3600000.0, 1) AS total_hours
  FROM time_entries
  WHERE deleted_at IS NULL
  GROUP BY type;
$$;

-- 6. Premium breakdown by plan type and granted_by source
CREATE OR REPLACE FUNCTION get_premium_breakdown()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_premium', (
      SELECT count(*) FROM subscriptions
      WHERE plan != 'free' AND status = 'active'
    ),
    'by_plan', (
      SELECT json_object_agg(plan, cnt)
      FROM (
        SELECT plan, count(*) AS cnt
        FROM subscriptions
        WHERE plan != 'free' AND status = 'active'
        GROUP BY plan
      ) sub
    ),
    'by_source', (
      SELECT json_object_agg(COALESCE(granted_by, 'unknown'), cnt)
      FROM (
        SELECT granted_by, count(*) AS cnt
        FROM subscriptions
        WHERE plan != 'free' AND status = 'active'
        GROUP BY granted_by
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- 7. Promo stats
CREATE OR REPLACE FUNCTION get_promo_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'active_promos', (SELECT count(*) FROM promo_codes WHERE active = true),
    'total_uses', (SELECT COALESCE(sum(current_uses), 0) FROM promo_codes)
  ) INTO result;
  RETURN result;
END;
$$;

-- 8. Domain stats
CREATE OR REPLACE FUNCTION get_domain_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'active_domains', (SELECT count(*) FROM whitelisted_domains WHERE active = true)
  ) INTO result;
  RETURN result;
END;
$$;
