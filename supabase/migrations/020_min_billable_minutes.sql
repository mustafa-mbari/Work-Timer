-- Migration 020: Add configurable minimum billable duration
-- Default 1 minute. Entries shorter than this are excluded from earnings.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS min_billable_minutes INT NOT NULL DEFAULT 1;

-- Update the earnings RPC to use this setting instead of hardcoded 60000ms
CREATE OR REPLACE FUNCTION get_earnings_report(
  p_user_id   uuid,
  p_date_from TEXT DEFAULT NULL,
  p_date_to   TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result         json;
  v_from_date    date;
  v_to_date      date;
  v_currency     text;
  v_default_rate numeric;
  v_min_duration bigint;  -- minimum duration in ms
BEGIN
  -- Resolve date boundaries
  v_from_date := CASE WHEN p_date_from IS NOT NULL THEN p_date_from::date ELSE NULL END;
  v_to_date   := CASE WHEN p_date_to   IS NOT NULL THEN p_date_to::date   ELSE NULL END;

  -- Get user's default rate, currency, and min billable minutes
  SELECT
    COALESCE(us.default_hourly_rate, 0),
    COALESCE(us.currency, 'USD'),
    COALESCE(us.min_billable_minutes, 1) * 60000  -- convert minutes to ms
  INTO v_default_rate, v_currency, v_min_duration
  FROM user_settings us
  WHERE us.user_id = p_user_id;

  -- If no settings row, use defaults
  IF v_default_rate IS NULL THEN
    v_default_rate := 0;
  END IF;
  IF v_currency IS NULL THEN
    v_currency := 'USD';
  END IF;
  IF v_min_duration IS NULL THEN
    v_min_duration := 60000;  -- 1 minute default
  END IF;

  SELECT json_build_object(
    'currency', v_currency,
    'default_rate', v_default_rate,
    'projects', (
      SELECT COALESCE(json_agg(json_build_object(
        'id',    sub.project_id,
        'name',  sub.project_name,
        'color', sub.project_color,
        'hours', sub.hours,
        'rate',  sub.effective_rate,
        'total', sub.total
      ) ORDER BY sub.total DESC NULLS LAST), '[]'::json)
      FROM (
        SELECT
          p.id    AS project_id,
          p.name  AS project_name,
          p.color AS project_color,
          round(COALESCE(sum(te.duration) / 3600000.0, 0), 2) AS hours,
          COALESCE(p.hourly_rate, v_default_rate) AS effective_rate,
          round(COALESCE(sum(te.duration) / 3600000.0, 0) * COALESCE(p.hourly_rate, v_default_rate), 2) AS total
        FROM projects p
        LEFT JOIN time_entries te
          ON te.project_id = p.id
          AND te.user_id = p_user_id
          AND te.deleted_at IS NULL
          AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        WHERE p.user_id = p_user_id
          AND p.deleted_at IS NULL
          AND p.earnings_enabled = true
        GROUP BY p.id, p.name, p.color, p.hourly_rate
      ) sub
    ),
    'grand_total', (
      SELECT COALESCE(round(sum(
        COALESCE(te.duration / 3600000.0, 0) * COALESCE(p.hourly_rate, v_default_rate)
      ), 2), 0)
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
      WHERE te.user_id = p_user_id
        AND te.deleted_at IS NULL
        AND te.duration >= v_min_duration
        AND (v_from_date IS NULL OR te.date::date >= v_from_date)
        AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
    ),
    'total_hours', (
      SELECT COALESCE(round(sum(te.duration) / 3600000.0, 2), 0)
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
      WHERE te.user_id = p_user_id
        AND te.deleted_at IS NULL
        AND te.duration >= v_min_duration
        AND (v_from_date IS NULL OR te.date::date >= v_from_date)
        AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
    ),
    'total_projects', (
      SELECT count(*)
      FROM projects p
      WHERE p.user_id = p_user_id
        AND p.deleted_at IS NULL
        AND p.earnings_enabled = true
    ),
    'daily_earnings', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', sub.day,
        'total', sub.day_total
      ) ORDER BY sub.day), '[]'::json)
      FROM (
        SELECT
          te.date::date AS day,
          round(sum(
            (te.duration / 3600000.0) * COALESCE(p.hourly_rate, v_default_rate)
          ), 2) AS day_total
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
        WHERE te.user_id = p_user_id
          AND te.deleted_at IS NULL
          AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY te.date::date
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;
