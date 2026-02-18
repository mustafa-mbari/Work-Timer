-- ============================================================
-- Migration 010: Add optional date-range filtering to
-- get_user_analytics RPC (replaces migration 003 definition)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_analytics(
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
  v_total_hours  numeric;
  v_total_entries integer;
  v_unique_days  integer;
  v_avg_session_ms numeric;
  v_streak       integer;
  v_from_date    date;
  v_to_date      date;
BEGIN
  -- Resolve date boundaries
  v_from_date := CASE WHEN p_date_from IS NOT NULL THEN p_date_from::date ELSE NULL END;
  v_to_date   := CASE WHEN p_date_to   IS NOT NULL THEN p_date_to::date   ELSE NULL END;

  -- Basic metrics (filtered by date range when provided)
  SELECT
    COALESCE(round(sum(duration) / 3600000.0, 2), 0),
    count(*)::integer,
    count(DISTINCT date)::integer,
    COALESCE(avg(duration), 0)
  INTO v_total_hours, v_total_entries, v_unique_days, v_avg_session_ms
  FROM time_entries
  WHERE user_id = p_user_id AND deleted_at IS NULL
    AND (v_from_date IS NULL OR date::date >= v_from_date)
    AND (v_to_date   IS NULL OR date::date <= v_to_date);

  -- Calculate streak (not date-filtered — always shows the current streak)
  WITH daily AS (
    SELECT DISTINCT date::date AS d
    FROM time_entries
    WHERE user_id = p_user_id AND deleted_at IS NULL
    ORDER BY d DESC
  ),
  streak_calc AS (
    SELECT d,
      d - (row_number() OVER (ORDER BY d DESC))::integer AS grp
    FROM daily
    WHERE d >= current_date - interval '365 days'
  )
  SELECT count(*)::integer INTO v_streak
  FROM streak_calc
  WHERE grp = (
    SELECT grp FROM streak_calc
    WHERE d = current_date OR d = current_date - 1
    ORDER BY d DESC
    LIMIT 1
  );

  IF v_streak IS NULL THEN
    v_streak := 0;
  END IF;

  -- Build full result
  SELECT json_build_object(
    'total_hours',    v_total_hours,
    'total_entries',  v_total_entries,
    'unique_days',    v_unique_days,
    'avg_session_ms', round(v_avg_session_ms),
    'streak',         v_streak,

    -- Weekly breakdown
    -- Series adapts to date range (defaults to last 12 weeks when unfiltered)
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
        LEFT JOIN time_entries te
          ON te.user_id    = p_user_id
          AND te.deleted_at IS NULL
          AND te.date::date >= ws.week_start
          AND te.date::date <  ws.week_start + 7
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY ws.week_start
      ) sub
    ),

    -- Entry type breakdown (date-filtered)
    'type_data', (
      SELECT json_agg(json_build_object(
        'name',  sub.type_name,
        'hours', sub.hours,
        'count', sub.entry_count
      ))
      FROM (
        SELECT
          CASE type
            WHEN 'manual'    THEN 'Manual'
            WHEN 'stopwatch' THEN 'Stopwatch'
            WHEN 'pomodoro'  THEN 'Pomodoro'
          END AS type_name,
          round(sum(duration) / 3600000.0, 1) AS hours,
          count(*) AS entry_count
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY type
      ) sub
    ),

    -- Day of week breakdown (date-filtered)
    'day_of_week_data', (
      WITH dow AS (
        SELECT
          extract(dow FROM date::date)::integer AS dow_num,
          sum(duration) / 3600000.0 AS hours
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY dow_num
      ),
      all_days AS (
        SELECT unnest(ARRAY[0,1,2,3,4,5,6]) AS dow_num,
               unnest(ARRAY['Sun','Mon','Tue','Wed','Thu','Fri','Sat']) AS name
      )
      SELECT json_agg(json_build_object(
        'name',  ad.name,
        'hours', COALESCE(round(d.hours::numeric, 1), 0)
      ) ORDER BY ad.dow_num)
      FROM all_days ad
      LEFT JOIN dow d ON d.dow_num = ad.dow_num
    ),

    -- Daily trend
    -- Series adapts to date range (defaults to last 30 days when unfiltered)
    'daily_data', (
      SELECT json_agg(json_build_object(
        'date',  sub.day_label,
        'hours', sub.hours
      ) ORDER BY sub.d)
      FROM (
        WITH day_series AS (
          SELECT generate_series(
            COALESCE(v_from_date, current_date - 29),
            COALESCE(v_to_date,   current_date),
            interval '1 day'
          )::date AS d
        )
        SELECT
          ds.d,
          to_char(ds.d, 'Mon DD') AS day_label,
          COALESCE(round(sum(te.duration) / 3600000.0, 1), 0) AS hours
        FROM day_series ds
        LEFT JOIN time_entries te
          ON te.user_id    = p_user_id
          AND te.deleted_at IS NULL
          AND te.date::date = ds.d
        GROUP BY ds.d
      ) sub
    ),

    -- Peak hours (date-filtered)
    'peak_hours_data', (
      WITH hour_series AS (
        SELECT generate_series(0, 23) AS h
      )
      SELECT json_agg(json_build_object(
        'hour',  lpad(hs.h::text, 2, '0') || ':00',
        'count', COALESCE(cnt, 0)
      ) ORDER BY hs.h)
      FROM hour_series hs
      LEFT JOIN (
        SELECT extract(hour FROM to_timestamp(start_time / 1000.0))::integer AS h,
               count(*) AS cnt
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL AND start_time > 0
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY h
      ) te ON te.h = hs.h
    ),

    -- Project breakdown (date-filtered)
    'project_stats', (
      SELECT json_agg(json_build_object(
        'name',         p.name,
        'color',        p.color,
        'hours',        round(COALESCE(hours, 0)::numeric, 1),
        'entries',      COALESCE(entry_count, 0),
        'target_hours', p.target_hours
      ) ORDER BY hours DESC NULLS LAST)
      FROM projects p
      LEFT JOIN (
        SELECT project_id,
               sum(duration) / 3600000.0 AS hours,
               count(*) AS entry_count
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY project_id
      ) te ON te.project_id = p.id
      WHERE p.user_id = p_user_id AND p.deleted_at IS NULL
    )
  ) INTO result;

  RETURN result;
END;
$$;
