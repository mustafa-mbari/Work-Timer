-- 043_dashboard_analytics_fixes.sql
-- Fixes from Dashboard & Analytics Workflow Production Readiness Review
--
-- Issues addressed:
-- #1  [Critical] Admin loads all auth users into memory → new get_admin_overview() RPC
-- #3  [High]     get_user_analytics missing auth.uid() check → added guard + timezone param
-- #5  [High]     get_platform_stats 5 subqueries → consolidated single scan
-- #7  [Medium]   LIKE 'allin_%' hardcoded plan check → uses plan_roles table
-- #10 [Medium]   PII exposure (full emails) in group analytics → emails masked
-- #11 [Medium]   current_date without timezone → timezone-aware v_today


-- ============================================================
-- 1. Index for admin overview recent users query
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc ON profiles(created_at DESC);


-- ============================================================
-- 2. get_admin_overview() — replaces getAllAuthUsers() in admin app
--    Returns total user count, new users this week, and 10 recent sign-ups
--    from the profiles table (no more paginating all auth users into memory)
-- ============================================================
CREATE OR REPLACE FUNCTION get_admin_overview()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT count(*)::integer FROM profiles),
    'new_users_this_week', (
      SELECT count(*)::integer FROM profiles
      WHERE created_at >= (now() - interval '7 days')
    ),
    'recent_users', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT email, display_name, created_at
        FROM profiles
        ORDER BY created_at DESC
        LIMIT 10
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;


-- ============================================================
-- 3. get_platform_stats() — consolidated single-scan optimization
--    Old version had 5 correlated subqueries each scanning time_entries.
--    New version uses a single scan with FILTER clauses.
-- ============================================================
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_entries',   COALESCE(te.total_entries, 0),
    'total_hours',     COALESCE(te.total_hours, 0),
    'entry_count_30d', COALESCE(te.entry_count_30d, 0),
    'project_count',   COALESCE(pc.cnt, 0),
    'avg_session_ms',  COALESCE(te.avg_session_ms, 0)
  ) INTO result
  FROM (
    SELECT
      count(*)            AS total_entries,
      sum(duration) / 3600000.0 AS total_hours,
      count(*) FILTER (WHERE date >= (current_date - interval '30 days')::text) AS entry_count_30d,
      avg(duration)       AS avg_session_ms
    FROM time_entries
    WHERE deleted_at IS NULL
  ) te
  CROSS JOIN (
    SELECT count(*) AS cnt FROM projects WHERE deleted_at IS NULL
  ) pc;
  RETURN result;
END;
$$;


-- ============================================================
-- 4. get_user_analytics() — hardened with auth.uid() check + timezone
--    - Added p_timezone parameter (default 'UTC')
--    - All current_date references replaced with timezone-aware v_today
--    - auth.uid() = p_user_id guard prevents cross-user data access
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_analytics(
  p_user_id   uuid,
  p_date_from TEXT DEFAULT NULL,
  p_date_to   TEXT DEFAULT NULL,
  p_timezone  TEXT DEFAULT 'UTC'
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result           json;
  v_total_hours    numeric;
  v_total_entries  integer;
  v_unique_days    integer;
  v_avg_session_ms numeric;
  v_streak         integer;
  v_from_date      date;
  v_to_date        date;
  v_today          date;
BEGIN
  -- Security: only allow users to query their own analytics
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot access another user''s analytics';
  END IF;

  -- Timezone-aware "today"
  v_today := (current_timestamp AT TIME ZONE p_timezone)::date;

  v_from_date := CASE WHEN p_date_from IS NOT NULL THEN p_date_from::date ELSE NULL END;
  v_to_date   := CASE WHEN p_date_to   IS NOT NULL THEN p_date_to::date   ELSE NULL END;

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

  -- Streak calculation (timezone-aware)
  WITH daily AS (
    SELECT DISTINCT date::date AS d FROM time_entries
    WHERE user_id = p_user_id AND deleted_at IS NULL ORDER BY d DESC
  ),
  streak_calc AS (
    SELECT d, d - (row_number() OVER (ORDER BY d DESC))::integer AS grp
    FROM daily WHERE d >= v_today - interval '365 days'
  )
  SELECT count(*)::integer INTO v_streak
  FROM streak_calc
  WHERE grp = (
    SELECT grp FROM streak_calc
    WHERE d = v_today OR d = v_today - 1
    ORDER BY d DESC LIMIT 1
  );

  IF v_streak IS NULL THEN v_streak := 0; END IF;

  SELECT json_build_object(
    'total_hours',    v_total_hours,
    'total_entries',  v_total_entries,
    'unique_days',    v_unique_days,
    'avg_session_ms', round(v_avg_session_ms),
    'streak',         v_streak,

    'weekly_data', (
      SELECT json_agg(json_build_object('week', sub.week_label, 'hours', sub.hours) ORDER BY sub.week_start)
      FROM (
        WITH week_series AS (
          SELECT generate_series(
            date_trunc('week', COALESCE(v_from_date, v_today - interval '11 weeks')),
            date_trunc('week', COALESCE(v_to_date,   v_today)),
            interval '1 week'
          )::date AS week_start
        )
        SELECT ws.week_start, to_char(ws.week_start, 'Mon DD') AS week_label,
          COALESCE(round(sum(te.duration) / 3600000.0, 1), 0) AS hours
        FROM week_series ws
        LEFT JOIN time_entries te
          ON te.user_id = p_user_id AND te.deleted_at IS NULL
          AND te.date::date >= ws.week_start AND te.date::date < ws.week_start + 7
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY ws.week_start
      ) sub
    ),

    'type_data', (
      SELECT json_agg(json_build_object('name', sub.type_name, 'hours', sub.hours, 'count', sub.entry_count))
      FROM (
        SELECT
          CASE type WHEN 'manual' THEN 'Manual' WHEN 'stopwatch' THEN 'Stopwatch' WHEN 'pomodoro' THEN 'Pomodoro' END AS type_name,
          round(sum(duration) / 3600000.0, 1) AS hours, count(*) AS entry_count
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY type
      ) sub
    ),

    'day_of_week_data', (
      WITH dow AS (
        SELECT extract(dow FROM date::date)::integer AS dow_num, sum(duration) / 3600000.0 AS hours
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
      SELECT json_agg(json_build_object('name', ad.name, 'hours', COALESCE(round(d.hours::numeric, 1), 0)) ORDER BY ad.dow_num)
      FROM all_days ad LEFT JOIN dow d ON d.dow_num = ad.dow_num
    ),

    'daily_data', (
      SELECT json_agg(json_build_object('date', sub.day_label, 'hours', sub.hours) ORDER BY sub.d)
      FROM (
        WITH day_series AS (
          SELECT generate_series(
            COALESCE(v_from_date, v_today - 29),
            COALESCE(v_to_date,   v_today),
            interval '1 day'
          )::date AS d
        )
        SELECT ds.d, to_char(ds.d, 'Mon DD') AS day_label,
          COALESCE(round(sum(te.duration) / 3600000.0, 1), 0) AS hours
        FROM day_series ds
        LEFT JOIN time_entries te
          ON te.user_id = p_user_id AND te.deleted_at IS NULL AND te.date::date = ds.d
        GROUP BY ds.d
      ) sub
    ),

    'daily_project_data', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', sub.day, 'project_id', sub.project_id,
        'project_name', sub.project_name, 'project_color', sub.project_color, 'hours', sub.day_hours
      ) ORDER BY sub.day, sub.project_name), '[]'::json)
      FROM (
        SELECT te.date::date AS day, p.id AS project_id, p.name AS project_name, p.color AS project_color,
          round(sum(te.duration) / 3600000.0, 2) AS day_hours
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL
        WHERE te.user_id = p_user_id AND te.deleted_at IS NULL
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY te.date::date, p.id, p.name, p.color
      ) sub
    ),

    'peak_hours_data', (
      WITH hour_series AS (SELECT generate_series(0, 23) AS h)
      SELECT json_agg(json_build_object('hour', lpad(hs.h::text, 2, '0') || ':00', 'count', COALESCE(cnt, 0)) ORDER BY hs.h)
      FROM hour_series hs
      LEFT JOIN (
        SELECT extract(hour FROM to_timestamp(start_time / 1000.0))::integer AS h, count(*) AS cnt
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL AND start_time > 0
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY h
      ) te ON te.h = hs.h
    ),

    'project_stats', (
      SELECT json_agg(json_build_object(
        'name', p.name, 'color', p.color,
        'hours', round(COALESCE(hours, 0)::numeric, 1),
        'entries', COALESCE(entry_count, 0), 'target_hours', p.target_hours
      ) ORDER BY hours DESC NULLS LAST)
      FROM projects p
      LEFT JOIN (
        SELECT project_id, sum(duration) / 3600000.0 AS hours, count(*) AS entry_count
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


-- ============================================================
-- 5. get_group_analytics() — plan_roles join + email masking
--    - Replaced LIKE 'allin_%' with plan_roles table join
--    - Masked member emails: j***@company.com
-- ============================================================
CREATE OR REPLACE FUNCTION get_group_analytics(
  p_group_id  TEXT,
  p_user_id   uuid,
  p_date_from TEXT DEFAULT NULL,
  p_date_to   TEXT DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result      json;
  v_from_date date;
  v_to_date   date;
  v_is_member boolean;
  v_is_team   boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id)
  INTO v_is_member;
  IF NOT v_is_member THEN RETURN json_build_object('error', 'Not a member of this group'); END IF;

  -- Use plan_roles table instead of hardcoded LIKE 'allin_%'
  SELECT EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN plan_roles pr_role ON pr_role.plan = s.plan
    WHERE s.user_id = p_user_id AND s.status = 'active' AND pr_role.role_name = 'team'
  ) INTO v_is_team;
  IF NOT v_is_team THEN RETURN json_build_object('error', 'Team subscription required'); END IF;

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
    'member_count', (SELECT count(*)::integer FROM group_members WHERE group_id = p_group_id),
    'member_stats', (
      SELECT COALESCE(json_agg(json_build_object(
        'user_id', sub.user_id, 'display_name', sub.display_name, 'email', sub.masked_email,
        'hours', sub.hours, 'entries', sub.entries
      ) ORDER BY sub.hours DESC NULLS LAST), '[]'::json)
      FROM (
        SELECT gm.user_id,
          COALESCE(pr.display_name, LEFT(pr.email, 1) || '***@' || SPLIT_PART(pr.email, '@', 2)) AS display_name,
          LEFT(pr.email, 1) || '***@' || SPLIT_PART(pr.email, '@', 2) AS masked_email,
          COALESCE(round(sum(te.duration) / 3600000.0, 2), 0) AS hours,
          count(te.id)::integer AS entries
        FROM group_members gm
        JOIN profiles pr ON pr.id = gm.user_id
        LEFT JOIN time_entries te
          ON te.user_id = gm.user_id AND te.deleted_at IS NULL
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        WHERE gm.group_id = p_group_id
        GROUP BY gm.user_id, pr.display_name, pr.email
      ) sub
    ),
    'project_stats', (
      SELECT COALESCE(json_agg(json_build_object(
        'name', sub.project_name, 'color', sub.project_color,
        'hours', sub.hours, 'entries', sub.entries
      ) ORDER BY sub.hours DESC NULLS LAST), '[]'::json)
      FROM (
        SELECT p.name AS project_name, p.color AS project_color,
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
    'weekly_data', (
      SELECT json_agg(json_build_object('week', sub.week_label, 'hours', sub.hours) ORDER BY sub.week_start)
      FROM (
        WITH week_series AS (
          SELECT generate_series(
            date_trunc('week', COALESCE(v_from_date, current_date - interval '11 weeks')),
            date_trunc('week', COALESCE(v_to_date,   current_date)),
            interval '1 week'
          )::date AS week_start
        )
        SELECT ws.week_start, to_char(ws.week_start, 'Mon DD') AS week_label,
          COALESCE(round(sum(te.duration) / 3600000.0, 1), 0) AS hours
        FROM week_series ws
        LEFT JOIN (
          SELECT te.date, te.duration FROM time_entries te
          JOIN group_members gm ON gm.user_id = te.user_id AND gm.group_id = p_group_id
          WHERE te.deleted_at IS NULL
        ) te
          ON te.date::date >= ws.week_start AND te.date::date < ws.week_start + 7
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY ws.week_start
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;
