-- Migration 025: Optimize group member summary RPC and indexing (REVISED)
-- 1. Optimized indexes for time_entries
-- 2. Faster get_group_members_summary using local variable filtering for the join

-- This index is crucial for the large-scale scan in the group summary
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date_dur ON time_entries (user_id, date, duration) WHERE deleted_at IS NULL;

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
  v_member_ids UUID[];
BEGIN
  -- Verify caller is admin of this group
  SELECT role INTO v_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = p_admin_id;

  IF v_role IS NULL OR v_role != 'admin' THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  -- Get list of member IDs once to make subsequent queries much faster by hitting user_id index
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM group_members
  WHERE group_id = p_group_id;

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
        -- Narrow the scan to only members of this group and entries since last month start
        SELECT 
          te.user_id,
          SUM(CASE WHEN te.date >= v_week_start::TEXT THEN te.duration ELSE 0 END) / 3600000.0 AS current_week,
          SUM(CASE WHEN te.date >= v_last_week_start::TEXT AND te.date <= v_last_week_end::TEXT THEN te.duration ELSE 0 END) / 3600000.0 AS last_week,
          SUM(CASE WHEN te.date >= v_month_start::TEXT THEN te.duration ELSE 0 END) / 3600000.0 AS current_month,
          SUM(CASE WHEN te.date >= v_last_month_start::TEXT AND te.date <= v_last_month_end::TEXT THEN te.duration ELSE 0 END) / 3600000.0 AS last_month
        FROM time_entries te
        -- Use the pre-fetched member IDs for a very fast index scan on time_entries
        WHERE te.user_id = ANY(v_member_ids)
          AND te.date >= v_last_month_start::TEXT
          AND te.deleted_at IS NULL
          AND EXISTS (
            -- Ensure sharing is enabled for this specific group
            SELECT 1 FROM group_sharing_settings gs 
            WHERE gs.group_id = p_group_id 
              AND gs.user_id = te.user_id 
              AND gs.sharing_enabled = true
              AND (gs.shared_project_ids IS NULL OR te.project_id = ANY(gs.shared_project_ids))
          )
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
