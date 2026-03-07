-- 044_dashboard_bootstrap_rpc.sql
-- Optimizes dashboard load by consolidating 8+ network roundtrips into a single RPC call.

CREATE OR REPLACE FUNCTION get_dashboard_bootstrap_data(
  p_user_id   uuid,
  p_week_from text,
  p_week_to   text
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result json;
BEGIN
  -- Security: only allow users to query their own dashboard data
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot access another user''s dashboard data';
  END IF;

  SELECT json_build_object(
    'subscription', (
      SELECT row_to_json(s) FROM (
        SELECT * FROM subscriptions WHERE user_id = p_user_id LIMIT 1
      ) s
    ),
    'cursors', (
      SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
      FROM (
        SELECT * FROM sync_cursors WHERE user_id = p_user_id
      ) c
    ),
    'recent_entries', (
      SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json)
      FROM (
        SELECT * FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL
        ORDER BY date DESC, start_time DESC
        LIMIT 10
      ) e
    ),
    'projects', (
      SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json)
      FROM (
        SELECT * FROM projects WHERE user_id = p_user_id AND deleted_at IS NULL ORDER BY sort_order ASC
      ) p
    ),
    'tags', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT * FROM tags WHERE user_id = p_user_id AND deleted_at IS NULL ORDER BY sort_order ASC
      ) t
    ),
    'stats', (
      SELECT row_to_json(st) FROM (
        SELECT * FROM user_stats WHERE user_id = p_user_id LIMIT 1
      ) st
    ),
    'settings', (
      SELECT row_to_json(set) FROM (
        SELECT * FROM user_settings WHERE user_id = p_user_id LIMIT 1
      ) set
    ),
    'week_entries', (
      SELECT COALESCE(json_agg(row_to_json(we)), '[]'::json)
      FROM (
        SELECT * FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL
          AND date >= p_week_from AND date <= p_week_to
        ORDER BY date DESC, start_time DESC
        LIMIT 200
      ) we
    )
  ) INTO result;

  RETURN result;
END;
$$;
