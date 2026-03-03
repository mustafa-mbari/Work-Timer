-- Migration 025: Optimize group member summary RPC and indexing
-- This migration improves the performance of the groups dashboard by:
-- 1. Using conditional aggregation in get_group_members_summary instead of 4 subqueries per member.
-- 2. Adding useful indexes for time_entries date queries.

-- First, ensure indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_time_entries_date_user_dur ON time_entries (date, user_id, duration) WHERE deleted_at IS NULL;

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
  v_week_start DATE;
  v_last_week_start DATE;
  v_last_week_end DATE;
  v_month_start DATE;
  v_last_month_start DATE;
  v_last_month_end DATE;
BEGIN
  -- Verify caller is admin of this group
  SELECT role INTO v_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = p_admin_id;

  IF v_role IS NULL OR v_role != 'admin' THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  -- Calculate date boundaries
  v_week_start := date_trunc('week', v_now)::DATE;
  v_last_week_start := v_week_start - INTERVAL '7 days';
  v_last_week_end := v_week_start - INTERVAL '1 day';
  v_month_start := date_trunc('month', v_now)::DATE;
  v_last_month_start := (date_trunc('month', v_now) - INTERVAL '1 month')::DATE;
  v_last_month_end := v_month_start - INTERVAL '1 day';

  RETURN (
    SELECT json_build_object(
      'members', COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
    )
    FROM (
      WITH stats AS (
        -- Single pass over time entries for the group members in the relevant date range
        SELECT 
          te.user_id,
          SUM(CASE WHEN te.date >= v_week_start::TEXT THEN te.duration ELSE 0 END) / 3600000.0 AS current_week,
          SUM(CASE WHEN te.date >= v_last_week_start::TEXT AND te.date <= v_last_week_end::TEXT THEN te.duration ELSE 0 END) / 3600000.0 AS last_week,
          SUM(CASE WHEN te.date >= v_month_start::TEXT THEN te.duration ELSE 0 END) / 3600000.0 AS current_month,
          SUM(CASE WHEN te.date >= v_last_month_start::TEXT AND te.date <= v_last_month_end::TEXT THEN te.duration ELSE 0 END) / 3600000.0 AS last_month
        FROM time_entries te
        JOIN group_members gm ON gm.user_id = te.user_id
        LEFT JOIN group_sharing_settings gs ON gs.group_id = gm.group_id AND gs.user_id = gm.user_id
        WHERE gm.group_id = p_group_id
          AND te.date >= v_last_month_start::TEXT
          AND te.deleted_at IS NULL
          AND COALESCE(gs.sharing_enabled, false) = true
          AND (gs.shared_project_ids IS NULL OR te.project_id = ANY(gs.shared_project_ids))
        GROUP BY te.user_id
      )
      SELECT
        gm.user_id,
        COALESCE(p.display_name, p.email) AS display_name,
        p.email,
        gm.role,
        COALESCE(gs.sharing_enabled, false) AS sharing_enabled,
        COALESCE(s.current_week, 0) AS current_week_hours,
        COALESCE(s.last_week, 0) AS last_week_hours,
        COALESCE(s.current_month, 0) AS current_month_hours,
        COALESCE(s.last_month, 0) AS last_month_hours
      FROM group_members gm
      JOIN profiles p ON p.id = gm.user_id
      LEFT JOIN group_sharing_settings gs ON gs.group_id = gm.group_id AND gs.user_id = gm.user_id
      LEFT JOIN stats s ON s.user_id = gm.user_id
      WHERE gm.group_id = p_group_id
      ORDER BY gm.role DESC, p.display_name NULLS LAST, p.email
    ) t
  );
END;
$$;
