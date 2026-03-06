-- Migration 025: Optimize group member summary RPC and indexing (REFINED)
-- 1. Optimized indexes for time_entries
-- 2. Faster get_group_members_summary using joined CTE
-- 3. New RPC for user own stats to avoid large row fetches

-- Covering index for summary queries
CREATE INDEX IF NOT EXISTS idx_time_entries_summary_lookup 
ON time_entries (user_id, date, duration, project_id) 
WHERE deleted_at IS NULL;

-- Redefine get_group_members_summary with optimized logic
CREATE OR REPLACE FUNCTION get_group_members_summary(
  p_group_id TEXT,
  p_admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_now TIMESTAMPTZ := now();
  v_week_start TEXT;
  v_last_week_start TEXT;
  v_last_week_end TEXT;
  v_month_start TEXT;
  v_last_month_start TEXT;
  v_last_month_end TEXT;
BEGIN
  -- Verify caller is admin of this group
  SELECT role INTO v_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = p_admin_id;

  IF v_role IS NULL OR v_role != 'admin' THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  -- Use TEXT for dates to match time_entries.date column exactly
  v_week_start := (date_trunc('week', v_now)::DATE)::TEXT;
  v_last_week_start := (date_trunc('week', v_now)::DATE - INTERVAL '7 days')::TEXT;
  v_last_week_end := (date_trunc('week', v_now)::DATE - INTERVAL '1 day')::TEXT;
  v_month_start := (date_trunc('month', v_now)::DATE)::TEXT;
  v_last_month_start := ((date_trunc('month', v_now) - INTERVAL '1 month')::DATE)::TEXT;
  v_last_month_end := (date_trunc('month', v_now)::DATE - INTERVAL '1 day')::TEXT;

  RETURN (
    SELECT json_build_object(
      'members', COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
    )
    FROM (
      WITH member_list AS (
        -- Pre-fetch members and their sharing settings
        SELECT 
          gm.user_id,
          gm.role,
          p.display_name,
          p.email,
          COALESCE(gs.sharing_enabled, false) as sharing_enabled,
          gs.shared_project_ids
        FROM group_members gm
        JOIN profiles p ON p.id = gm.user_id
        LEFT JOIN group_sharing_settings gs ON gs.group_id = gm.group_id AND gs.user_id = gm.user_id
        WHERE gm.group_id = p_group_id
      ),
      stats AS (
        -- Aggregate entries only for users with sharing enabled
        SELECT 
          te.user_id,
          SUM(CASE WHEN te.date >= v_week_start THEN te.duration ELSE 0 END) / 3600000.0 AS current_week,
          SUM(CASE WHEN te.date >= v_last_week_start AND te.date <= v_last_week_end THEN te.duration ELSE 0 END) / 3600000.0 AS last_week,
          SUM(CASE WHEN te.date >= v_month_start THEN te.duration ELSE 0 END) / 3600000.0 AS current_month,
          SUM(CASE WHEN te.date >= v_last_month_start AND te.date <= v_last_month_end THEN te.duration ELSE 0 END) / 3600000.0 AS last_month
        FROM time_entries te
        JOIN member_list ml ON ml.user_id = te.user_id
        WHERE ml.sharing_enabled = true
          AND te.date >= v_last_month_start
          AND te.deleted_at IS NULL
          AND (ml.shared_project_ids IS NULL OR te.project_id = ANY(ml.shared_project_ids))
        GROUP BY te.user_id
      )
      SELECT
        ml.user_id,
        COALESCE(ml.display_name, ml.email) AS display_name,
        ml.email,
        ml.role,
        ml.sharing_enabled,
        COALESCE(s.current_week, 0) AS current_week_hours,
        COALESCE(s.last_week, 0) AS last_week_hours,
        COALESCE(s.current_month, 0) AS current_month_hours,
        COALESCE(s.last_month, 0) AS last_month_hours
      FROM member_list ml
      LEFT JOIN stats s ON s.user_id = ml.user_id
      ORDER BY ml.role DESC, ml.display_name NULLS LAST, ml.email
    ) t
  );
END;
$$;

-- New RPC: get_user_own_stats
-- Faster than fetching raw rows to JS
CREATE OR REPLACE FUNCTION get_user_own_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_today TEXT;
  v_week_start TEXT;
  v_month_start TEXT;
  v_result JSON;
BEGIN
  v_today := (v_now::DATE)::TEXT;
  v_week_start := (date_trunc('week', v_now)::DATE)::TEXT;
  v_month_start := (date_trunc('month', v_now)::DATE)::TEXT;

  SELECT json_build_object(
    'today_hours', ROUND(COALESCE(SUM(CASE WHEN date = v_today THEN duration ELSE 0 END) / 3600000.0, 0)::NUMERIC, 2),
    'week_hours',  ROUND(COALESCE(SUM(CASE WHEN date >= v_week_start THEN duration ELSE 0 END) / 3600000.0, 0)::NUMERIC, 2),
    'month_hours', ROUND(COALESCE(SUM(CASE WHEN date >= v_month_start THEN duration ELSE 0 END) / 3600000.0, 0)::NUMERIC, 2)
  ) INTO v_result
  FROM time_entries
  WHERE user_id = p_user_id 
    AND date >= v_month_start
    AND deleted_at IS NULL;

  RETURN v_result;
END;
$$;
