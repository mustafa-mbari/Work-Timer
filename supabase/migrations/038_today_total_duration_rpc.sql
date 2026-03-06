-- Migration: Server-side aggregation for daily total duration
-- Replaces client-side fetch-all + reduce with a single SQL SUM.

CREATE OR REPLACE FUNCTION get_today_total_duration(
  p_user_id UUID,
  p_date TEXT
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(duration), 0)::BIGINT
  FROM time_entries
  WHERE user_id = p_user_id
    AND date = p_date
    AND deleted_at IS NULL;
$$;
