-- Group sharing settings: controls what each member shares with the group
CREATE TABLE IF NOT EXISTS group_sharing_settings (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sharing_enabled BOOLEAN NOT NULL DEFAULT false,
  shared_project_ids TEXT[] DEFAULT NULL,  -- NULL = all projects
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_sharing_user ON group_sharing_settings(user_id);

-- RLS
ALTER TABLE group_sharing_settings ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own sharing settings
CREATE POLICY sharing_own ON group_sharing_settings
  FOR ALL USING (auth.uid() = user_id);

-- Group admins can read all sharing settings in their groups
CREATE POLICY sharing_admin_read ON group_sharing_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_sharing_settings.group_id
        AND group_members.user_id = auth.uid()
        AND group_members.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------
-- RPC: get_group_members_summary
-- Returns each member with sharing status + total hours for
-- current week, last week, current month, last month.
-- -----------------------------------------------------------------------
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
      SELECT
        gm.user_id,
        COALESCE(p.display_name, p.email) AS display_name,
        p.email,
        gm.role,
        COALESCE(gs.sharing_enabled, false) AS sharing_enabled,
        -- Current week hours (only if sharing enabled)
        CASE WHEN COALESCE(gs.sharing_enabled, false) THEN
          COALESCE((
            SELECT SUM(te.duration) / 3600000.0
            FROM time_entries te
            WHERE te.user_id = gm.user_id
              AND te.date >= v_week_start::TEXT
              AND (gs.shared_project_ids IS NULL OR te.project_id = ANY(gs.shared_project_ids))
          ), 0)
        ELSE 0 END AS current_week_hours,
        -- Last week hours
        CASE WHEN COALESCE(gs.sharing_enabled, false) THEN
          COALESCE((
            SELECT SUM(te.duration) / 3600000.0
            FROM time_entries te
            WHERE te.user_id = gm.user_id
              AND te.date >= v_last_week_start::TEXT
              AND te.date <= v_last_week_end::TEXT
              AND (gs.shared_project_ids IS NULL OR te.project_id = ANY(gs.shared_project_ids))
          ), 0)
        ELSE 0 END AS last_week_hours,
        -- Current month hours
        CASE WHEN COALESCE(gs.sharing_enabled, false) THEN
          COALESCE((
            SELECT SUM(te.duration) / 3600000.0
            FROM time_entries te
            WHERE te.user_id = gm.user_id
              AND te.date >= v_month_start::TEXT
              AND (gs.shared_project_ids IS NULL OR te.project_id = ANY(gs.shared_project_ids))
          ), 0)
        ELSE 0 END AS current_month_hours,
        -- Last month hours
        CASE WHEN COALESCE(gs.sharing_enabled, false) THEN
          COALESCE((
            SELECT SUM(te.duration) / 3600000.0
            FROM time_entries te
            WHERE te.user_id = gm.user_id
              AND te.date >= v_last_month_start::TEXT
              AND te.date <= v_last_month_end::TEXT
              AND (gs.shared_project_ids IS NULL OR te.project_id = ANY(gs.shared_project_ids))
          ), 0)
        ELSE 0 END AS last_month_hours
      FROM group_members gm
      JOIN profiles p ON p.id = gm.user_id
      LEFT JOIN group_sharing_settings gs ON gs.group_id = gm.group_id AND gs.user_id = gm.user_id
      WHERE gm.group_id = p_group_id
      ORDER BY gm.role DESC, p.display_name NULLS LAST, p.email
    ) t
  );
END;
$$;

-- -----------------------------------------------------------------------
-- RPC: get_group_member_entries
-- Returns detailed time entries for a specific member (respects sharing).
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_group_member_entries(
  p_group_id TEXT,
  p_admin_id UUID,
  p_member_id UUID,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_sharing BOOLEAN;
  v_project_ids TEXT[];
BEGIN
  -- Verify caller is admin of this group
  SELECT role INTO v_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = p_admin_id;

  IF v_role IS NULL OR v_role != 'admin' THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  -- Check member's sharing settings
  SELECT sharing_enabled, shared_project_ids
  INTO v_sharing, v_project_ids
  FROM group_sharing_settings
  WHERE group_id = p_group_id AND user_id = p_member_id;

  IF NOT COALESCE(v_sharing, false) THEN
    RETURN json_build_object('error', 'Member has not enabled sharing');
  END IF;

  RETURN (
    SELECT json_build_object(
      'entries', COALESCE(json_agg(row_to_json(t) ORDER BY t.date DESC, t.start_time DESC), '[]'::JSON)
    )
    FROM (
      SELECT
        te.id,
        te.date,
        te.start_time,
        te.end_time,
        te.duration,
        te.description,
        te.project_id,
        COALESCE(pr.name, 'No Project') AS project_name,
        COALESCE(pr.color, '#94a3b8') AS project_color
      FROM time_entries te
      LEFT JOIN projects pr ON pr.id = te.project_id
      WHERE te.user_id = p_member_id
        AND (v_project_ids IS NULL OR te.project_id = ANY(v_project_ids))
        AND (p_date_from IS NULL OR te.date >= p_date_from)
        AND (p_date_to IS NULL OR te.date <= p_date_to)
      LIMIT 500
    ) t
  );
END;
$$;
