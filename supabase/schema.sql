--
-- PostgreSQL database dump
--

\restrict 2SGYY2CPH8K3vCywetrdIidj1JMHTVazE54yEgbenKTenBu2hgsnHSYie53QQq3

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admin_get_groups(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_groups() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id',           g.id,
      'name',         g.name,
      'owner_id',     g.owner_id,
      'owner_email',  pr.email,
      'join_code',    g.join_code,
      'max_members',  g.max_members,
      'member_count', COALESCE(mc.cnt, 0),
      'created_at',   g.created_at
    ) ORDER BY g.created_at DESC), '[]'::json)
    FROM groups g
    JOIN profiles pr ON pr.id = g.owner_id
    LEFT JOIN (
      SELECT group_id, count(*)::integer AS cnt
      FROM group_members
      GROUP BY group_id
    ) mc ON mc.group_id = g.id
  );
END;
$$;


--
-- Name: admin_update_group(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_update_group(p_group_id text, p_max_members integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE groups SET max_members = p_max_members WHERE id = p_group_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Group not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: check_api_quota(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_api_quota(p_user_id uuid, p_resource_type text, p_year_month text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_role    TEXT;
  v_limit   INT;
  v_current INT;
BEGIN
  -- Resolve role via existing function
  v_role := get_user_export_role(p_user_id);

  -- Look up the limit for this role + resource
  SELECT aql.monthly_limit INTO v_limit
  FROM api_quota_limits aql
  WHERE aql.role_name = v_role
    AND aql.resource_type = p_resource_type;

  -- No limit configured = unlimited
  IF v_limit IS NULL THEN
    RETURN json_build_object(
      'allowed', true,
      'used', 0,
      'limit', -1,
      'remaining', -1
    );
  END IF;

  -- Ensure usage row exists
  INSERT INTO api_quota_usage (user_id, resource_type, year_month, count)
  VALUES (p_user_id, p_resource_type, p_year_month, 0)
  ON CONFLICT (user_id, resource_type, year_month) DO NOTHING;

  -- Lock row for atomic check-and-increment
  SELECT aqu.count INTO v_current
  FROM api_quota_usage aqu
  WHERE aqu.user_id = p_user_id
    AND aqu.resource_type = p_resource_type
    AND aqu.year_month = p_year_month
  FOR UPDATE;

  -- Check against limit
  IF v_current >= v_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'used', v_current,
      'limit', v_limit,
      'remaining', 0
    );
  END IF;

  -- Increment
  UPDATE api_quota_usage
  SET count = count + 1
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND year_month = p_year_month;

  RETURN json_build_object(
    'allowed', true,
    'used', v_current + 1,
    'limit', v_limit,
    'remaining', v_limit - v_current - 1
  );
END;
$$;


--
-- Name: check_domain_whitelist(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_domain_whitelist(user_email text) RETURNS TABLE(domain text, plan text)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT d.domain, d.plan FROM public.whitelisted_domains d
  WHERE d.active = true AND user_email LIKE '%@' || d.domain;
$$;


--
-- Name: get_active_users(interval); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_users(period interval) RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT count(DISTINCT user_id)::integer
  FROM time_entries
  WHERE deleted_at IS NULL AND created_at >= (now() - period);
$$;


--
-- Name: get_all_api_quota_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_api_quota_limits() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT json_agg(row_to_json(aql) ORDER BY aql.resource_type, aql.role_name)
  FROM api_quota_limits aql;
$$;


--
-- Name: get_daily_email_counts(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_daily_email_counts(p_days integer DEFAULT 30) RETURNS TABLE(day date, sent bigint, failed bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    DATE(created_at) AS day,
    COUNT(*) FILTER (WHERE status = 'sent') AS sent,
    COUNT(*) FILTER (WHERE status != 'sent') AS failed
  FROM email_logs
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY day;
$$;


--
-- Name: get_domain_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_domain_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'active_domains', (SELECT count(*) FROM whitelisted_domains WHERE active = true)
  ) INTO result;
  RETURN result;
END;
$$;


--
-- Name: get_earnings_report(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_earnings_report(p_user_id uuid, p_date_from text DEFAULT NULL::text, p_date_to text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result         json;
  v_from_date    date;
  v_to_date      date;
  v_currency     text;
  v_default_rate numeric;
  v_min_duration bigint;
BEGIN
  v_from_date := CASE WHEN p_date_from IS NOT NULL THEN p_date_from::date ELSE NULL END;
  v_to_date   := CASE WHEN p_date_to   IS NOT NULL THEN p_date_to::date   ELSE NULL END;

  SELECT
    COALESCE(us.default_hourly_rate, 0),
    COALESCE(us.currency, 'USD'),
    COALESCE(us.min_billable_minutes, 1) * 60000
  INTO v_default_rate, v_currency, v_min_duration
  FROM user_settings us
  WHERE us.user_id = p_user_id;

  IF v_default_rate IS NULL THEN v_default_rate := 0; END IF;
  IF v_currency IS NULL THEN v_currency := 'USD'; END IF;
  IF v_min_duration IS NULL THEN v_min_duration := 60000; END IF;

  SELECT json_build_object(
    'currency', v_currency,
    'default_rate', v_default_rate,
    'projects', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', sub.project_id, 'name', sub.project_name, 'color', sub.project_color,
        'hours', sub.hours, 'rate', sub.effective_rate, 'total', sub.total
      ) ORDER BY sub.total DESC NULLS LAST), '[]'::json)
      FROM (
        SELECT p.id AS project_id, p.name AS project_name, p.color AS project_color,
          round(COALESCE(sum(te.duration) / 3600000.0, 0), 2) AS hours,
          COALESCE(p.hourly_rate, v_default_rate) AS effective_rate,
          round(COALESCE(sum(te.duration) / 3600000.0, 0) * COALESCE(p.hourly_rate, v_default_rate), 2) AS total
        FROM projects p
        LEFT JOIN time_entries te ON te.project_id = p.id AND te.user_id = p_user_id
          AND te.deleted_at IS NULL AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date IS NULL OR te.date::date <= v_to_date)
        WHERE p.user_id = p_user_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
        GROUP BY p.id, p.name, p.color, p.hourly_rate
      ) sub
    ),
    'grand_total', (
      SELECT COALESCE(round(sum(COALESCE(te.duration / 3600000.0, 0) * COALESCE(p.hourly_rate, v_default_rate)), 2), 0)
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
      WHERE te.user_id = p_user_id AND te.deleted_at IS NULL AND te.duration >= v_min_duration
        AND (v_from_date IS NULL OR te.date::date >= v_from_date)
        AND (v_to_date IS NULL OR te.date::date <= v_to_date)
    ),
    'total_hours', (
      SELECT COALESCE(round(sum(te.duration) / 3600000.0, 2), 0)
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
      WHERE te.user_id = p_user_id AND te.deleted_at IS NULL AND te.duration >= v_min_duration
        AND (v_from_date IS NULL OR te.date::date >= v_from_date)
        AND (v_to_date IS NULL OR te.date::date <= v_to_date)
    ),
    'total_projects', (
      SELECT count(*) FROM projects p
      WHERE p.user_id = p_user_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
    ),
    'daily_earnings', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', sub.day, 'project_id', sub.project_id,
        'project_name', sub.project_name, 'project_color', sub.project_color,
        'total', sub.day_total
      ) ORDER BY sub.day, sub.project_name), '[]'::json)
      FROM (
        SELECT te.date::date AS day, p.id AS project_id, p.name AS project_name, p.color AS project_color,
          round(sum((te.duration / 3600000.0) * COALESCE(p.hourly_rate, v_default_rate)), 2) AS day_total
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
        WHERE te.user_id = p_user_id AND te.deleted_at IS NULL AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date IS NULL OR te.date::date <= v_to_date)
        GROUP BY te.date::date, p.id, p.name, p.color
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;


--
-- Name: get_earnings_report(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_earnings_report(p_user_id uuid, p_date_from text DEFAULT NULL::text, p_date_to text DEFAULT NULL::text, p_group_by text DEFAULT 'tag'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result         json;
  v_from_date    date;
  v_to_date      date;
  v_currency     text;
  v_default_rate numeric;
  v_min_duration bigint;
BEGIN
  v_from_date := CASE WHEN p_date_from IS NOT NULL THEN p_date_from::date ELSE NULL END;
  v_to_date   := CASE WHEN p_date_to   IS NOT NULL THEN p_date_to::date   ELSE NULL END;

  SELECT
    COALESCE(us.default_hourly_rate, 0),
    COALESCE(us.currency, 'USD'),
    COALESCE(us.min_billable_minutes, 1) * 60000
  INTO v_default_rate, v_currency, v_min_duration
  FROM user_settings us
  WHERE us.user_id = p_user_id;

  IF v_default_rate IS NULL THEN v_default_rate := 0; END IF;
  IF v_currency IS NULL THEN v_currency := 'USD'; END IF;
  IF v_min_duration IS NULL THEN v_min_duration := 60000; END IF;

  IF p_group_by = 'tag' THEN
    -- Tag-based earnings
    SELECT json_build_object(
      'currency', v_currency,
      'default_rate', v_default_rate,
      'group_by', 'tag',
      'items', (
        SELECT COALESCE(json_agg(json_build_object(
          'id',    sub.tag_id,
          'name',  sub.tag_name,
          'color', sub.tag_color,
          'hours', sub.hours,
          'rate',  sub.effective_rate,
          'total', sub.total
        ) ORDER BY sub.total DESC NULLS LAST), '[]'::json)
        FROM (
          SELECT
            t.id    AS tag_id,
            t.name  AS tag_name,
            t.color AS tag_color,
            round(COALESCE(sum(te.duration) / 3600000.0, 0), 2) AS hours,
            COALESCE(t.hourly_rate, v_default_rate) AS effective_rate,
            round(COALESCE(sum(te.duration) / 3600000.0, 0) * COALESCE(t.hourly_rate, v_default_rate), 2) AS total
          FROM tags t
          LEFT JOIN time_entries te
            ON t.id = ANY(te.tags)
            AND te.user_id = p_user_id
            AND te.deleted_at IS NULL
            AND te.duration >= v_min_duration
            AND (v_from_date IS NULL OR te.date::date >= v_from_date)
            AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
          WHERE t.user_id = p_user_id
            AND t.deleted_at IS NULL
            AND t.earnings_enabled = true
          GROUP BY t.id, t.name, t.color, t.hourly_rate
        ) sub
      ),
      'grand_total', (
        SELECT COALESCE(round(sum(
          (te.duration / 3600000.0) * COALESCE(t.hourly_rate, v_default_rate)
        ), 2), 0)
        FROM time_entries te
        CROSS JOIN LATERAL unnest(te.tags) AS utag_id
        JOIN tags t ON t.id = utag_id AND t.deleted_at IS NULL AND t.earnings_enabled = true
        WHERE te.user_id = p_user_id
          AND te.deleted_at IS NULL
          AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
      ),
      'total_hours', (
        SELECT COALESCE(round(sum(te.duration) / 3600000.0, 2), 0)
        FROM time_entries te
        CROSS JOIN LATERAL unnest(te.tags) AS utag_id
        JOIN tags t ON t.id = utag_id AND t.deleted_at IS NULL AND t.earnings_enabled = true
        WHERE te.user_id = p_user_id
          AND te.deleted_at IS NULL
          AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
      ),
      'total_items', (
        SELECT count(*)
        FROM tags t
        WHERE t.user_id = p_user_id
          AND t.deleted_at IS NULL
          AND t.earnings_enabled = true
      ),
      'daily_earnings', (
        SELECT COALESCE(json_agg(json_build_object(
          'date',       sub.day,
          'item_id',    sub.tag_id,
          'item_name',  sub.tag_name,
          'item_color', sub.tag_color,
          'total',      sub.day_total
        ) ORDER BY sub.day, sub.tag_name), '[]'::json)
        FROM (
          SELECT
            te.date::date AS day,
            t.id    AS tag_id,
            t.name  AS tag_name,
            t.color AS tag_color,
            round(sum(
              (te.duration / 3600000.0) * COALESCE(t.hourly_rate, v_default_rate)
            ), 2) AS day_total
          FROM time_entries te
          CROSS JOIN LATERAL unnest(te.tags) AS utag_id
          JOIN tags t ON t.id = utag_id AND t.deleted_at IS NULL AND t.earnings_enabled = true
          WHERE te.user_id = p_user_id
            AND te.deleted_at IS NULL
            AND te.duration >= v_min_duration
            AND (v_from_date IS NULL OR te.date::date >= v_from_date)
            AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
          GROUP BY te.date::date, t.id, t.name, t.color
        ) sub
      )
    ) INTO result;
  ELSE
    -- Project-based earnings (backward compatible)
    SELECT json_build_object(
      'currency', v_currency,
      'default_rate', v_default_rate,
      'group_by', 'project',
      'items', (
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
      'total_items', (
        SELECT count(*)
        FROM projects p
        WHERE p.user_id = p_user_id
          AND p.deleted_at IS NULL
          AND p.earnings_enabled = true
      ),
      'daily_earnings', (
        SELECT COALESCE(json_agg(json_build_object(
          'date',       sub.day,
          'item_id',    sub.project_id,
          'item_name',  sub.project_name,
          'item_color', sub.project_color,
          'total',      sub.day_total
        ) ORDER BY sub.day, sub.project_name), '[]'::json)
        FROM (
          SELECT
            te.date::date AS day,
            p.id    AS project_id,
            p.name  AS project_name,
            p.color AS project_color,
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
          GROUP BY te.date::date, p.id, p.name, p.color
        ) sub
      )
    ) INTO result;
  END IF;

  RETURN result;
END;
$$;


--
-- Name: get_email_count_by_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_email_count_by_type() RETURNS TABLE(type text, count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT type, COUNT(*) AS count
  FROM email_logs
  GROUP BY type
  ORDER BY count DESC;
$$;


--
-- Name: get_entry_type_breakdown(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_entry_type_breakdown() RETURNS TABLE(entry_type text, entry_count bigint, total_hours numeric)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT type AS entry_type, count(*) AS entry_count, round(sum(duration) / 3600000.0, 1) AS total_hours
  FROM time_entries WHERE deleted_at IS NULL GROUP BY type;
$$;


--
-- Name: get_group_analytics(text, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_analytics(p_group_id text, p_user_id uuid, p_date_from text DEFAULT NULL::text, p_date_to text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_group_member_entries(text, uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_member_entries(p_group_id text, p_admin_id uuid, p_member_id uuid, p_date_from text DEFAULT NULL::text, p_date_to text DEFAULT NULL::text) RETURNS json
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


--
-- Name: get_group_members_summary(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_members_summary(p_group_id text, p_admin_id uuid) RETURNS json
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


--
-- Name: get_platform_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_platform_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_entries', (SELECT count(*) FROM time_entries WHERE deleted_at IS NULL),
    'total_hours', (SELECT COALESCE(sum(duration) / 3600000.0, 0) FROM time_entries WHERE deleted_at IS NULL),
    'entry_count_30d', (SELECT count(*) FROM time_entries WHERE deleted_at IS NULL AND date >= (current_date - interval '30 days')::text),
    'project_count', (SELECT count(*) FROM projects WHERE deleted_at IS NULL),
    'avg_session_ms', (SELECT COALESCE(avg(duration), 0) FROM time_entries WHERE deleted_at IS NULL)
  ) INTO result;
  RETURN result;
END;
$$;


--
-- Name: get_premium_breakdown(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_premium_breakdown() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_premium', (SELECT count(*) FROM subscriptions WHERE plan != 'free' AND status = 'active'),
    'by_plan', (SELECT json_object_agg(plan, cnt) FROM (SELECT plan, count(*) AS cnt FROM subscriptions WHERE plan != 'free' AND status = 'active' GROUP BY plan) sub),
    'by_source', (SELECT json_object_agg(COALESCE(granted_by, 'unknown'), cnt) FROM (SELECT granted_by, count(*) AS cnt FROM subscriptions WHERE plan != 'free' AND status = 'active' GROUP BY granted_by) sub)
  ) INTO result;
  RETURN result;
END;
$$;


--
-- Name: get_promo_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_promo_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'active_promos', (SELECT count(*) FROM promo_codes WHERE active = true),
    'total_uses', (SELECT COALESCE(sum(current_uses), 0) FROM promo_codes)
  ) INTO result;
  RETURN result;
END;
$$;


--
-- Name: get_today_total_duration(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_today_total_duration(p_user_id uuid, p_date text) RETURNS bigint
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(SUM(duration), 0)::BIGINT
  FROM time_entries
  WHERE user_id = p_user_id
    AND date = p_date
    AND deleted_at IS NULL;
$$;


--
-- Name: get_top_users(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_users(lim integer DEFAULT 5) RETURNS TABLE(user_id uuid, email text, total_hours numeric)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT te.user_id, COALESCE(u.email, 'Unknown') AS email, round(sum(te.duration) / 3600000.0, 1) AS total_hours
  FROM time_entries te
  LEFT JOIN auth.users u ON u.id = te.user_id
  WHERE te.deleted_at IS NULL
  GROUP BY te.user_id, u.email
  ORDER BY total_hours DESC
  LIMIT lim;
$$;


--
-- Name: get_user_analytics(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_analytics(p_user_id uuid, p_date_from text DEFAULT NULL::text, p_date_to text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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

  -- Basic metrics
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

  -- Calculate streak (not date-filtered)
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

    -- NEW: Per-project daily breakdown for time chart
    'daily_project_data', (
      SELECT COALESCE(json_agg(json_build_object(
        'date',          sub.day,
        'project_id',    sub.project_id,
        'project_name',  sub.project_name,
        'project_color', sub.project_color,
        'hours',         sub.day_hours
      ) ORDER BY sub.day, sub.project_name), '[]'::json)
      FROM (
        SELECT
          te.date::date AS day,
          p.id    AS project_id,
          p.name  AS project_name,
          p.color AS project_color,
          round(sum(te.duration) / 3600000.0, 2) AS day_hours
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL
        WHERE te.user_id = p_user_id
          AND te.deleted_at IS NULL
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY te.date::date, p.id, p.name, p.color
      ) sub
    ),

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


--
-- Name: get_user_api_quotas(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_api_quotas(p_user_id uuid, p_year_month text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := get_user_export_role(p_user_id);

  RETURN (
    SELECT json_agg(row_to_json(q) ORDER BY q.resource_type)
    FROM (
      SELECT
        aql.resource_type,
        aql.monthly_limit                                           AS "limit",
        COALESCE(aqu.count, 0)                                     AS "used",
        GREATEST(aql.monthly_limit - COALESCE(aqu.count, 0), 0)   AS "remaining"
      FROM api_quota_limits aql
      LEFT JOIN api_quota_usage aqu
        ON  aqu.user_id       = p_user_id
        AND aqu.resource_type = aql.resource_type
        AND aqu.year_month    = p_year_month
      WHERE aql.role_name = v_role
    ) q
  );
END;
$$;


--
-- Name: get_user_export_quota(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_export_quota(p_user_id uuid, p_year_month text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := get_user_export_role(p_user_id);

  RETURN (
    SELECT json_agg(row_to_json(q) ORDER BY q.export_type)
    FROM (
      SELECT
        rel.export_type,
        rel.monthly_limit                                         AS "limit",
        COALESCE(eu.count, 0)                                     AS "used",
        GREATEST(rel.monthly_limit - COALESCE(eu.count, 0), 0)   AS "remaining"
      FROM role_export_limits rel
      LEFT JOIN export_usage eu
        ON  eu.user_id     = p_user_id
        AND eu.export_type = rel.export_type
        AND eu.year_month  = p_year_month
      WHERE rel.role_name = v_role
    ) q
  );
END;
$$;


--
-- Name: get_user_export_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_export_role(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_plan TEXT;
  v_role TEXT;
BEGIN
  SELECT s.plan INTO v_plan
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing');

  IF v_plan IS NULL THEN
    RETURN 'free';
  END IF;

  SELECT pr.role_name INTO v_role
  FROM plan_roles pr
  WHERE pr.plan = v_plan;

  RETURN COALESCE(v_role, 'free');
END;
$$;


--
-- Name: get_user_growth(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_growth(weeks integer DEFAULT 8) RETURNS TABLE(week_start timestamp with time zone, signup_count bigint)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  WITH week_series AS (
    SELECT generate_series(
      date_trunc('week', now() - (weeks * interval '1 week')),
      date_trunc('week', now()),
      interval '1 week'
    ) AS week_start
  )
  SELECT ws.week_start, count(u.id) AS signup_count
  FROM week_series ws
  LEFT JOIN auth.users u ON u.created_at >= ws.week_start AND u.created_at < ws.week_start + interval '1 week'
  GROUP BY ws.week_start
  ORDER BY ws.week_start;
$$;


--
-- Name: get_user_own_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_own_stats(p_user_id uuid) RETURNS json
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE domain_match RECORD;
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  SELECT * INTO domain_match FROM public.check_domain_whitelist(NEW.email) LIMIT 1;
  IF domain_match IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan, status, granted_by)
    VALUES (NEW.id, domain_match.plan, 'active', 'domain');
  ELSE
    INSERT INTO public.subscriptions (user_id, plan, status, granted_by)
    VALUES (NEW.id, 'free', 'active', NULL);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_subscription(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_subscription() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_whitelisted_plan text;
BEGIN
  -- Check if user's email domain is whitelisted
  SELECT plan INTO v_whitelisted_plan
  FROM whitelisted_domains
  WHERE active = true
    AND domain = split_part(NEW.email, '@', 2)
  LIMIT 1;

  IF v_whitelisted_plan IS NOT NULL THEN
    -- Grant whitelisted plan
    INSERT INTO subscriptions (user_id, plan, status, granted_by, updated_at)
    VALUES (NEW.id, v_whitelisted_plan, 'active', 'domain', now())
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Standard free account
    INSERT INTO subscriptions (user_id, plan, status, updated_at)
    VALUES (NEW.id, 'free', 'active', now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: has_changes_since(uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_changes_since(p_user_id uuid, p_since timestamp with time zone) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM time_entries WHERE user_id = p_user_id AND updated_at > p_since
    UNION ALL
    SELECT 1 FROM projects WHERE user_id = p_user_id AND updated_at > p_since
    UNION ALL
    SELECT 1 FROM tags WHERE user_id = p_user_id AND updated_at > p_since
    UNION ALL
    SELECT 1 FROM user_settings WHERE user_id = p_user_id AND updated_at > p_since
    LIMIT 1
  );
$$;


--
-- Name: is_premium(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_premium(check_user_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = check_user_id
      AND status IN ('active', 'trialing')
      AND plan != 'free'
      AND (plan = 'premium_lifetime' OR current_period_end IS NULL OR current_period_end > now())
  );
$$;


--
-- Name: redeem_promo(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_promo(p_code text, p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_promo record;
  v_existing_redemption uuid;
  v_now timestamptz := now();
BEGIN
  -- Lock and fetch promo code (FOR UPDATE prevents concurrent reads)
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE code = upper(p_code) AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid promo code');
  END IF;

  -- Check validity period
  IF v_promo.valid_from IS NOT NULL AND v_promo.valid_from > v_now THEN
    RETURN json_build_object('success', false, 'error', 'Promo code is not yet valid');
  END IF;

  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < v_now THEN
    RETURN json_build_object('success', false, 'error', 'Promo code has expired');
  END IF;

  -- Check max uses
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Promo code has reached its usage limit');
  END IF;

  -- Check if user already redeemed
  SELECT id INTO v_existing_redemption
  FROM promo_redemptions
  WHERE promo_code_id = v_promo.id AND user_id = p_user_id;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'You have already used this promo code');
  END IF;

  -- Record redemption
  INSERT INTO promo_redemptions (promo_code_id, user_id)
  VALUES (v_promo.id, p_user_id);

  -- Increment usage count atomically
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo.id;

  -- If 100% discount, grant premium directly
  IF v_promo.discount_pct = 100 THEN
    INSERT INTO subscriptions (user_id, plan, status, granted_by, promo_code_id, updated_at)
    VALUES (p_user_id, v_promo.plan, 'active', 'promo', v_promo.id, v_now)
    ON CONFLICT (user_id) DO UPDATE SET
      plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      granted_by = EXCLUDED.granted_by,
      promo_code_id = EXCLUDED.promo_code_id,
      stripe_subscription_id = NULL,
      stripe_customer_id = NULL,
      cancel_at_period_end = false,
      updated_at = EXCLUDED.updated_at;

    RETURN json_build_object(
      'success', true,
      'granted', true,
      'plan', v_promo.plan,
      'discount_pct', v_promo.discount_pct
    );
  END IF;

  -- Partial discount — return info for Stripe checkout
  RETURN json_build_object(
    'success', true,
    'granted', false,
    'plan', v_promo.plan,
    'discount_pct', v_promo.discount_pct,
    'promo_id', v_promo.id,
    'promo_code', v_promo.code
  );
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: track_export_usage(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_export_usage(p_user_id uuid, p_export_type text, p_year_month text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_role        TEXT;
  v_limit       INT;
  v_current     INT;
  v_new_count   INT;
BEGIN
  -- Resolve role and limit (static config tables, no lock needed)
  v_role := get_user_export_role(p_user_id);

  SELECT rel.monthly_limit INTO v_limit
  FROM role_export_limits rel
  WHERE rel.role_name   = v_role
    AND rel.export_type = p_export_type;

  IF v_limit IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'used',    0,
      'limit',   0,
      'error',   'Unknown export type or role'
    );
  END IF;

  -- Ensure the usage row exists before locking it
  INSERT INTO export_usage (user_id, export_type, year_month, count)
  VALUES (p_user_id, p_export_type, p_year_month, 0)
  ON CONFLICT (user_id, export_type, year_month) DO NOTHING;

  -- Lock the specific row to serialize concurrent requests
  SELECT eu.count INTO v_current
  FROM export_usage eu
  WHERE eu.user_id     = p_user_id
    AND eu.export_type = p_export_type
    AND eu.year_month  = p_year_month
  FOR UPDATE;

  -- Check against limit
  IF v_current >= v_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'used',    v_current,
      'limit',   v_limit
    );
  END IF;

  -- Atomically increment
  UPDATE export_usage
  SET count = count + 1
  WHERE user_id     = p_user_id
    AND export_type = p_export_type
    AND year_month  = p_year_month;

  v_new_count := v_current + 1;

  RETURN json_build_object(
    'allowed', true,
    'used',    v_new_count,
    'limit',   v_limit
  );
END;
$$;


--
-- Name: upsert_api_quota_limit(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_api_quota_limit(p_role_name text, p_resource_type text, p_monthly_limit integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO api_quota_limits (role_name, resource_type, monthly_limit)
  VALUES (p_role_name, p_resource_type, p_monthly_limit)
  ON CONFLICT (role_name, resource_type)
  DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_quota_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_quota_limits (
    role_name text NOT NULL,
    resource_type text NOT NULL,
    monthly_limit integer DEFAULT 0 NOT NULL,
    CONSTRAINT api_quota_limits_role_name_check CHECK ((role_name = ANY (ARRAY['free'::text, 'pro'::text, 'team'::text])))
);


--
-- Name: api_quota_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_quota_usage (
    user_id uuid NOT NULL,
    resource_type text NOT NULL,
    year_month text NOT NULL,
    count integer DEFAULT 0 NOT NULL
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient text NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    message_id text,
    error text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    sent_by uuid
);


--
-- Name: export_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_usage (
    user_id uuid NOT NULL,
    export_type text NOT NULL,
    year_month text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    CONSTRAINT export_usage_export_type_check CHECK ((export_type = ANY (ARRAY['pdf'::text, 'excel'::text, 'csv'::text])))
);


--
-- Name: feature_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_email text NOT NULL,
    user_name text,
    suggestion_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    importance text DEFAULT 'important'::text NOT NULL,
    target_platform text DEFAULT 'both'::text NOT NULL,
    notify_on_release boolean DEFAULT false NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT feature_suggestions_importance_check CHECK ((importance = ANY (ARRAY['nice_to_have'::text, 'important'::text, 'critical'::text]))),
    CONSTRAINT feature_suggestions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'under_review'::text, 'planned'::text, 'in_progress'::text, 'implemented'::text, 'declined'::text]))),
    CONSTRAINT feature_suggestions_suggestion_type_check CHECK ((suggestion_type = ANY (ARRAY['feature'::text, 'improvement'::text, 'integration'::text, 'ui_ux'::text, 'other'::text]))),
    CONSTRAINT feature_suggestions_target_platform_check CHECK ((target_platform = ANY (ARRAY['chrome_extension'::text, 'web_app'::text, 'both'::text])))
);


--
-- Name: group_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_invitations (
    id text DEFAULT encode(extensions.gen_random_bytes(10), 'hex'::text) NOT NULL,
    group_id text NOT NULL,
    email text NOT NULL,
    invited_by uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    CONSTRAINT group_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])))
);


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    group_id text NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT group_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
);


--
-- Name: group_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_shares (
    id text DEFAULT encode(extensions.gen_random_bytes(10), 'hex'::text) NOT NULL,
    group_id text NOT NULL,
    user_id uuid NOT NULL,
    period_type text NOT NULL,
    date_from text NOT NULL,
    date_to text NOT NULL,
    project_ids text[],
    tag_ids text[],
    entry_count integer DEFAULT 0 NOT NULL,
    total_hours numeric(8,2) DEFAULT 0 NOT NULL,
    entries jsonb DEFAULT '[]'::jsonb NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'approved'::text NOT NULL,
    admin_comment text,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    due_date text,
    CONSTRAINT group_shares_period_type_check CHECK ((period_type = ANY (ARRAY['day'::text, 'week'::text, 'month'::text]))),
    CONSTRAINT group_shares_status_check CHECK ((status = ANY (ARRAY['open'::text, 'submitted'::text, 'approved'::text, 'denied'::text])))
);


--
-- Name: group_sharing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_sharing_settings (
    group_id text NOT NULL,
    user_id uuid NOT NULL,
    sharing_enabled boolean DEFAULT false NOT NULL,
    shared_project_ids text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id text DEFAULT encode(extensions.gen_random_bytes(10), 'hex'::text) NOT NULL,
    name text NOT NULL,
    owner_id uuid NOT NULL,
    join_code text DEFAULT encode(extensions.gen_random_bytes(4), 'hex'::text),
    max_members integer DEFAULT 10 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    share_frequency text,
    share_deadline_day integer,
    CONSTRAINT groups_share_frequency_check CHECK ((share_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])))
);


--
-- Name: plan_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_roles (
    plan text NOT NULL,
    role_name text NOT NULL,
    CONSTRAINT plan_roles_role_name_check CHECK ((role_name = ANY (ARRAY['free'::text, 'pro'::text, 'team'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    avatar_url text,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id text NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    target_hours real,
    archived boolean DEFAULT false NOT NULL,
    created_at bigint NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_default boolean DEFAULT false NOT NULL,
    sort_order integer,
    hourly_rate numeric,
    earnings_enabled boolean DEFAULT true NOT NULL,
    default_tag_id text
);


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    discount_pct integer NOT NULL,
    plan text DEFAULT 'premium_monthly'::text NOT NULL,
    max_uses integer,
    current_uses integer DEFAULT 0 NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT promo_codes_discount_pct_check CHECK (((discount_pct >= 1) AND (discount_pct <= 100))),
    CONSTRAINT promo_codes_plan_check CHECK ((plan = ANY (ARRAY['premium_monthly'::text, 'premium_yearly'::text, 'premium_lifetime'::text])))
);


--
-- Name: promo_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promo_code_id uuid NOT NULL,
    user_id uuid NOT NULL,
    redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_export_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_export_limits (
    role_name text NOT NULL,
    export_type text NOT NULL,
    monthly_limit integer NOT NULL,
    CONSTRAINT role_export_limits_export_type_check CHECK ((export_type = ANY (ARRAY['pdf'::text, 'excel'::text, 'csv'::text]))),
    CONSTRAINT role_export_limits_role_name_check CHECK ((role_name = ANY (ARRAY['free'::text, 'pro'::text, 'team'::text])))
);


--
-- Name: stripe_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_events (
    event_id text NOT NULL,
    event_type text NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    plan text DEFAULT 'free'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    granted_by text,
    promo_code_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    group_id text,
    CONSTRAINT subscriptions_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'premium_monthly'::text, 'premium_yearly'::text, 'premium_lifetime'::text, 'allin_monthly'::text, 'allin_yearly'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'unpaid'::text, 'incomplete'::text])))
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_email text NOT NULL,
    user_name text,
    issue_type text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    platform text DEFAULT 'web_app'::text NOT NULL,
    issue_time timestamp with time zone,
    status text DEFAULT 'open'::text NOT NULL,
    admin_notes text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT support_tickets_issue_type_check CHECK ((issue_type = ANY (ARRAY['bug'::text, 'account'::text, 'billing'::text, 'sync'::text, 'performance'::text, 'other'::text]))),
    CONSTRAINT support_tickets_platform_check CHECK ((platform = ANY (ARRAY['chrome_extension'::text, 'web_app'::text, 'both'::text]))),
    CONSTRAINT support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: sync_cursors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_cursors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_id text NOT NULL,
    last_sync timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id text NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_default boolean DEFAULT false NOT NULL,
    sort_order integer,
    color text DEFAULT '#6366F1'::text NOT NULL,
    hourly_rate numeric,
    earnings_enabled boolean DEFAULT false NOT NULL
);


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_entries (
    id text NOT NULL,
    user_id uuid NOT NULL,
    date text NOT NULL,
    start_time bigint NOT NULL,
    end_time bigint NOT NULL,
    duration bigint NOT NULL,
    project_id text,
    task_id text,
    description text DEFAULT ''::text NOT NULL,
    type text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT time_entries_type_check CHECK ((type = ANY (ARRAY['manual'::text, 'stopwatch'::text, 'pomodoro'::text])))
);


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    user_id uuid NOT NULL,
    working_days integer DEFAULT 5 NOT NULL,
    week_start_day integer DEFAULT 1 NOT NULL,
    idle_timeout integer DEFAULT 5 NOT NULL,
    theme text DEFAULT 'light-soft'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    notifications boolean DEFAULT true NOT NULL,
    daily_target real,
    weekly_target real,
    pomodoro_config jsonb DEFAULT '{"workMinutes": 25, "soundEnabled": true, "longBreakMinutes": 15, "shortBreakMinutes": 5, "sessionsBeforeLongBreak": 4}'::jsonb NOT NULL,
    floating_timer_auto boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reminder jsonb DEFAULT '{"hour": 14, "minute": 0, "enabled": true, "dayOfWeek": 5}'::jsonb,
    default_hourly_rate numeric,
    currency text DEFAULT 'USD'::text NOT NULL,
    min_billable_minutes integer DEFAULT 1 NOT NULL,
    entry_save_time integer DEFAULT 10,
    CONSTRAINT user_settings_week_start_day_check CHECK ((week_start_day = ANY (ARRAY[0, 1])))
);


--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stats (
    user_id uuid NOT NULL,
    total_hours numeric DEFAULT 0,
    total_entries integer DEFAULT 0,
    total_projects integer DEFAULT 0,
    active_days integer DEFAULT 0,
    last_active_date date,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_logs (
    id bigint NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    status text DEFAULT 'success'::text NOT NULL,
    error_message text,
    user_id text,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webhook_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhook_logs_id_seq OWNED BY public.webhook_logs.id;


--
-- Name: whitelisted_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whitelisted_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain text NOT NULL,
    plan text DEFAULT 'premium_monthly'::text NOT NULL,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT whitelisted_domains_plan_check CHECK ((plan = ANY (ARRAY['premium_monthly'::text, 'premium_yearly'::text, 'premium_lifetime'::text])))
);


--
-- Name: webhook_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs ALTER COLUMN id SET DEFAULT nextval('public.webhook_logs_id_seq'::regclass);


--
-- Name: api_quota_limits api_quota_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_quota_limits
    ADD CONSTRAINT api_quota_limits_pkey PRIMARY KEY (role_name, resource_type);


--
-- Name: api_quota_usage api_quota_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_quota_usage
    ADD CONSTRAINT api_quota_usage_pkey PRIMARY KEY (user_id, resource_type, year_month);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: export_usage export_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_usage
    ADD CONSTRAINT export_usage_pkey PRIMARY KEY (user_id, export_type, year_month);


--
-- Name: feature_suggestions feature_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_suggestions
    ADD CONSTRAINT feature_suggestions_pkey PRIMARY KEY (id);


--
-- Name: group_invitations group_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: group_shares group_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_shares
    ADD CONSTRAINT group_shares_pkey PRIMARY KEY (id);


--
-- Name: group_sharing_settings group_sharing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_sharing_settings
    ADD CONSTRAINT group_sharing_settings_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: groups groups_join_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_join_code_key UNIQUE (join_code);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: plan_roles plan_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_roles
    ADD CONSTRAINT plan_roles_pkey PRIMARY KEY (plan);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: promo_redemptions promo_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_pkey PRIMARY KEY (id);


--
-- Name: promo_redemptions promo_redemptions_promo_code_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_promo_code_id_user_id_key UNIQUE (promo_code_id, user_id);


--
-- Name: role_export_limits role_export_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_export_limits
    ADD CONSTRAINT role_export_limits_pkey PRIMARY KEY (role_name, export_type);


--
-- Name: stripe_events stripe_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_events
    ADD CONSTRAINT stripe_events_pkey PRIMARY KEY (event_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: subscriptions subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: sync_cursors sync_cursors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_cursors
    ADD CONSTRAINT sync_cursors_pkey PRIMARY KEY (id);


--
-- Name: sync_cursors sync_cursors_user_id_device_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_cursors
    ADD CONSTRAINT sync_cursors_user_id_device_id_key UNIQUE (user_id, device_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: sync_cursors uq_sync_cursors_user_device; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_cursors
    ADD CONSTRAINT uq_sync_cursors_user_device UNIQUE (user_id, device_id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (user_id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: whitelisted_domains whitelisted_domains_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whitelisted_domains
    ADD CONSTRAINT whitelisted_domains_domain_key UNIQUE (domain);


--
-- Name: whitelisted_domains whitelisted_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whitelisted_domains
    ADD CONSTRAINT whitelisted_domains_pkey PRIMARY KEY (id);


--
-- Name: idx_api_quota_usage_user_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_quota_usage_user_month ON public.api_quota_usage USING btree (user_id, year_month);


--
-- Name: idx_email_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_created_at ON public.email_logs USING btree (created_at DESC);


--
-- Name: idx_email_logs_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_recipient ON public.email_logs USING btree (recipient);


--
-- Name: idx_email_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_type ON public.email_logs USING btree (type);


--
-- Name: idx_export_usage_user_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_usage_user_month ON public.export_usage USING btree (user_id, year_month);


--
-- Name: idx_feature_suggestions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_suggestions_created ON public.feature_suggestions USING btree (created_at DESC);


--
-- Name: idx_feature_suggestions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_suggestions_status ON public.feature_suggestions USING btree (status);


--
-- Name: idx_feature_suggestions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_suggestions_type ON public.feature_suggestions USING btree (suggestion_type);


--
-- Name: idx_feature_suggestions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_suggestions_user ON public.feature_suggestions USING btree (user_id);


--
-- Name: idx_group_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_email ON public.group_invitations USING btree (email);


--
-- Name: idx_group_invitations_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_group ON public.group_invitations USING btree (group_id);


--
-- Name: idx_group_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_members_user ON public.group_members USING btree (user_id);


--
-- Name: idx_group_shares_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_shares_created ON public.group_shares USING btree (group_id, created_at DESC);


--
-- Name: idx_group_shares_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_shares_group ON public.group_shares USING btree (group_id);


--
-- Name: idx_group_shares_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_shares_status ON public.group_shares USING btree (group_id, status);


--
-- Name: idx_group_shares_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_shares_user ON public.group_shares USING btree (user_id);


--
-- Name: idx_group_sharing_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_sharing_user ON public.group_sharing_settings USING btree (user_id);


--
-- Name: idx_projects_user_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user_deleted ON public.projects USING btree (user_id, deleted_at);


--
-- Name: idx_projects_user_hourly_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user_hourly_rate ON public.projects USING btree (user_id, hourly_rate);


--
-- Name: idx_projects_user_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user_updated ON public.projects USING btree (user_id, updated_at);


--
-- Name: idx_promo_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_promo_codes_code ON public.promo_codes USING btree (code);


--
-- Name: idx_promo_redemptions_code_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_promo_redemptions_code_user ON public.promo_redemptions USING btree (promo_code_id, user_id);


--
-- Name: idx_stripe_events_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_events_processed ON public.stripe_events USING btree (processed_at);


--
-- Name: idx_support_tickets_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_created ON public.support_tickets USING btree (created_at DESC);


--
-- Name: idx_support_tickets_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_priority ON public.support_tickets USING btree (priority);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_support_tickets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_user ON public.support_tickets USING btree (user_id);


--
-- Name: idx_tags_user_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_user_deleted ON public.tags USING btree (user_id, deleted_at);


--
-- Name: idx_tags_user_earnings; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_user_earnings ON public.tags USING btree (user_id, earnings_enabled) WHERE (deleted_at IS NULL);


--
-- Name: idx_tags_user_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_user_updated ON public.tags USING btree (user_id, updated_at);


--
-- Name: idx_time_entries_summary_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_summary_lookup ON public.time_entries USING btree (user_id, date, duration, project_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_time_entries_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_updated ON public.time_entries USING btree (user_id, updated_at);


--
-- Name: idx_time_entries_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_user_created ON public.time_entries USING btree (user_id, created_at);


--
-- Name: idx_time_entries_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_user_date ON public.time_entries USING btree (user_id, date);


--
-- Name: idx_time_entries_user_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_user_deleted ON public.time_entries USING btree (user_id, deleted_at);


--
-- Name: idx_time_entries_user_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_entries_user_updated ON public.time_entries USING btree (user_id, updated_at);


--
-- Name: idx_webhook_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_created ON public.webhook_logs USING btree (created_at DESC);


--
-- Name: idx_webhook_logs_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_event_type ON public.webhook_logs USING btree (event_type);


--
-- Name: idx_webhook_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_status ON public.webhook_logs USING btree (status);


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_updated_at BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: projects trg_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_projects_updated_at BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscriptions trg_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_subscriptions_updated_at BEFORE INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tags trg_tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tags_updated_at BEFORE INSERT OR UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: time_entries trg_time_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_time_entries_updated_at BEFORE INSERT OR UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_settings trg_user_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_settings_updated_at BEFORE INSERT OR UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: api_quota_usage api_quota_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_quota_usage
    ADD CONSTRAINT api_quota_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: email_logs email_logs_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id);


--
-- Name: export_usage export_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_usage
    ADD CONSTRAINT export_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: feature_suggestions feature_suggestions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_suggestions
    ADD CONSTRAINT feature_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_shares group_shares_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_shares
    ADD CONSTRAINT group_shares_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_shares group_shares_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_shares
    ADD CONSTRAINT group_shares_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: group_shares group_shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_shares
    ADD CONSTRAINT group_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_sharing_settings group_sharing_settings_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_sharing_settings
    ADD CONSTRAINT group_sharing_settings_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_sharing_settings group_sharing_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_sharing_settings
    ADD CONSTRAINT group_sharing_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: groups groups_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: promo_redemptions promo_redemptions_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id);


--
-- Name: promo_redemptions promo_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: subscriptions subscriptions_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: subscriptions subscriptions_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sync_cursors sync_cursors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_cursors
    ADD CONSTRAINT sync_cursors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tags tags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: time_entries time_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_stats user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sync_cursors Own cursors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Own cursors" ON public.sync_cursors USING ((auth.uid() = user_id));


--
-- Name: profiles Own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Own profile" ON public.profiles USING ((auth.uid() = id));


--
-- Name: user_settings Own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Own settings" ON public.user_settings USING ((auth.uid() = user_id));


--
-- Name: subscriptions Own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Own subscription" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: promo_codes Read active promos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read active promos" ON public.promo_codes FOR SELECT USING ((active = true));


--
-- Name: time_entries Users can delete own entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own entries" ON public.time_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: projects Users can delete own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tags Users can delete own tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: time_entries Users can insert own entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own entries" ON public.time_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: projects Users can insert own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_stats Users can insert own stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own stats" ON public.user_stats FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tags Users can insert own tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own tags" ON public.tags FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: time_entries Users can read own entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own entries" ON public.time_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: projects Users can read own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own projects" ON public.projects FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_stats Users can read own stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own stats" ON public.user_stats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tags Users can read own tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own tags" ON public.tags FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: time_entries Users can update own entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own entries" ON public.time_entries FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: projects Users can update own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_stats Users can update own stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own stats" ON public.user_stats FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tags Users can update own tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: api_quota_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_quota_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: api_quota_limits api_quota_limits_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY api_quota_limits_select ON public.api_quota_limits FOR SELECT USING (true);


--
-- Name: api_quota_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_quota_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: api_quota_usage api_quota_usage_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY api_quota_usage_select ON public.api_quota_usage FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: export_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.export_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: export_usage export_usage_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY export_usage_select ON public.export_usage FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: feature_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_suggestions feature_suggestions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_suggestions_insert ON public.feature_suggestions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: feature_suggestions feature_suggestions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_suggestions_select ON public.feature_suggestions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: group_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: group_invitations group_invitations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_invitations_insert ON public.group_invitations FOR INSERT WITH CHECK (((invited_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_invitations.group_id) AND (gm.user_id = auth.uid()) AND (gm.role = 'admin'::text))))));


--
-- Name: group_invitations group_invitations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_invitations_select ON public.group_invitations FOR SELECT USING (((invited_by = auth.uid()) OR (email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text) OR (EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_invitations.group_id) AND (gm.user_id = auth.uid()) AND (gm.role = 'admin'::text))))));


--
-- Name: group_invitations group_invitations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_invitations_update ON public.group_invitations FOR UPDATE USING (((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text) OR (invited_by = auth.uid())));


--
-- Name: group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: group_members group_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_delete ON public.group_members FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_members.group_id) AND (gm.user_id = auth.uid()) AND (gm.role = 'admin'::text)))) OR (user_id = auth.uid())));


--
-- Name: group_members group_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_insert ON public.group_members FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_members.group_id) AND (gm.user_id = auth.uid()) AND (gm.role = 'admin'::text)))) OR (user_id = auth.uid())));


--
-- Name: group_members group_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_select ON public.group_members FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.group_members gm2
  WHERE ((gm2.group_id = group_members.group_id) AND (gm2.user_id = auth.uid()))))));


--
-- Name: group_members group_members_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_update ON public.group_members FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_members.group_id) AND (gm.user_id = auth.uid()) AND (gm.role = 'admin'::text)))));


--
-- Name: group_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: group_shares group_shares_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_shares_admin_read ON public.group_shares FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_shares.group_id) AND (gm.user_id = auth.uid()) AND (gm.role = 'admin'::text)))));


--
-- Name: group_shares group_shares_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_shares_admin_update ON public.group_shares FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = group_shares.group_id) AND (gm.user_id = auth.uid()) AND (gm.role = 'admin'::text)))));


--
-- Name: group_shares group_shares_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_shares_own ON public.group_shares USING ((user_id = auth.uid()));


--
-- Name: group_sharing_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_sharing_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

--
-- Name: groups groups_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_delete ON public.groups FOR DELETE USING ((owner_id = auth.uid()));


--
-- Name: groups groups_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_insert ON public.groups FOR INSERT WITH CHECK ((owner_id = auth.uid()));


--
-- Name: groups groups_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_select ON public.groups FOR SELECT USING (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.group_members gm
  WHERE ((gm.group_id = groups.id) AND (gm.user_id = auth.uid()))))));


--
-- Name: groups groups_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_update ON public.groups FOR UPDATE USING ((owner_id = auth.uid()));


--
-- Name: plan_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_roles plan_roles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_roles_select ON public.plan_roles FOR SELECT USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: promo_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: role_export_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_export_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: role_export_limits role_export_limits_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY role_export_limits_select ON public.role_export_limits FOR SELECT USING (true);


--
-- Name: group_sharing_settings sharing_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sharing_admin_read ON public.group_sharing_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_sharing_settings.group_id) AND (group_members.user_id = auth.uid()) AND (group_members.role = 'admin'::text)))));


--
-- Name: group_sharing_settings sharing_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sharing_own ON public.group_sharing_settings USING ((auth.uid() = user_id));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets support_tickets_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_tickets_insert ON public.support_tickets FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: support_tickets support_tickets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_tickets_select ON public.support_tickets FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: sync_cursors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sync_cursors ENABLE ROW LEVEL SECURITY;

--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: time_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: user_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict 2SGYY2CPH8K3vCywetrdIidj1JMHTVazE54yEgbenKTenBu2hgsnHSYie53QQq3

