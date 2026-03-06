-- Migration 015: Group Analytics RPC
-- Aggregates time data across all members of a group

CREATE OR REPLACE FUNCTION get_group_analytics(
  p_group_id  TEXT,
  p_user_id   uuid,
  p_date_from TEXT DEFAULT NULL,
  p_date_to   TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result       json;
  v_from_date  date;
  v_to_date    date;
  v_is_member  boolean;
  v_is_allin   boolean;
BEGIN
  -- Verify caller is member of the group
  SELECT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN json_build_object('error', 'Not a member of this group');
  END IF;

  -- Verify caller has an active all-in subscription
  SELECT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND s.plan LIKE 'allin_%'
  ) INTO v_is_allin;

  IF NOT v_is_allin THEN
    RETURN json_build_object('error', 'All-In subscription required');
  END IF;

  -- Resolve date boundaries
  v_from_date := CASE WHEN p_date_from IS NOT NULL THEN p_date_from::date ELSE NULL END;
  v_to_date   := CASE WHEN p_date_to   IS NOT NULL THEN p_date_to::date   ELSE NULL END;

  SELECT json_build_object(
    'total_hours', (
      SELECT COALESCE(round(sum(te.duration) / 3600000.0, 2), 0)
      FROM time_entries te
      JOIN group_members gm ON gm.user_id = te.user_id AND gm.group_id = p_group_id
      WHERE te.deleted_at IS NULL
        AND (v_from_date IS NULL OR te.date::date >= v_from_date)
        AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
    ),
    'total_entries', (
      SELECT count(*)::integer
      FROM time_entries te
      JOIN group_members gm ON gm.user_id = te.user_id AND gm.group_id = p_group_id
      WHERE te.deleted_at IS NULL
        AND (v_from_date IS NULL OR te.date::date >= v_from_date)
        AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
    ),
    'member_count', (
      SELECT count(*)::integer FROM group_members WHERE group_id = p_group_id
    ),

    -- Per-member breakdown
    'member_stats', (
      SELECT COALESCE(json_agg(json_build_object(
        'user_id',      sub.user_id,
        'display_name', sub.display_name,
        'email',        sub.email,
        'hours',        sub.hours,
        'entries',      sub.entries
      ) ORDER BY sub.hours DESC NULLS LAST), '[]'::json)
      FROM (
        SELECT
          gm.user_id,
          COALESCE(pr.display_name, pr.email) AS display_name,
          pr.email,
          COALESCE(round(sum(te.duration) / 3600000.0, 2), 0) AS hours,
          count(te.id)::integer AS entries
        FROM group_members gm
        JOIN profiles pr ON pr.id = gm.user_id
        LEFT JOIN time_entries te
          ON te.user_id = gm.user_id
          AND te.deleted_at IS NULL
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        WHERE gm.group_id = p_group_id
        GROUP BY gm.user_id, pr.display_name, pr.email
      ) sub
    ),

    -- Project breakdown across group
    'project_stats', (
      SELECT COALESCE(json_agg(json_build_object(
        'name',    sub.project_name,
        'color',   sub.project_color,
        'hours',   sub.hours,
        'entries', sub.entries
      ) ORDER BY sub.hours DESC NULLS LAST), '[]'::json)
      FROM (
        SELECT
          p.name  AS project_name,
          p.color AS project_color,
          round(COALESCE(sum(te.duration) / 3600000.0, 0), 1) AS hours,
          count(te.id)::integer AS entries
        FROM time_entries te
        JOIN group_members gm ON gm.user_id = te.user_id AND gm.group_id = p_group_id
        JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL
        WHERE te.deleted_at IS NULL
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY p.name, p.color
      ) sub
    ),

    -- Weekly trend across group
    'weekly_data', (
      SELECT json_agg(json_build_object(
        'week',  sub.week_label,
        'hours', sub.hours
      ) ORDER BY sub.week_start)
      FROM (
        WITH week_series AS (
          SELECT generate_series(
            date_trunc('week', COALESCE(v_from_date, current_date - interval '11 weeks')),
            date_trunc('week', COALESCE(v_to_date,   current_date)),
            interval '1 week'
          )::date AS week_start
        )
        SELECT
          ws.week_start,
          to_char(ws.week_start, 'Mon DD') AS week_label,
          COALESCE(round(sum(te.duration) / 3600000.0, 1), 0) AS hours
        FROM week_series ws
        LEFT JOIN (
          SELECT te.date, te.duration
          FROM time_entries te
          JOIN group_members gm ON gm.user_id = te.user_id AND gm.group_id = p_group_id
          WHERE te.deleted_at IS NULL
        ) te
          ON te.date::date >= ws.week_start
          AND te.date::date <  ws.week_start + 7
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY ws.week_start
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;
