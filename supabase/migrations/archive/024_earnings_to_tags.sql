-- Migration 024: Move earnings from projects to tags + tag colors + project-tag linking
--
-- 1. Add color, hourly_rate, earnings_enabled to tags
-- 2. Add default_tag_id to projects
-- 3. Update get_earnings_report RPC to support grouping by tag or project

-- 1. Add new columns to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#6366F1';
ALTER TABLE tags ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS earnings_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Add default_tag_id to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_tag_id TEXT;

-- 3. Index for tag earnings queries
CREATE INDEX IF NOT EXISTS idx_tags_user_earnings ON tags(user_id, earnings_enabled) WHERE deleted_at IS NULL;

-- 4. Replace get_earnings_report RPC with dual-view version
CREATE OR REPLACE FUNCTION get_earnings_report(
  p_user_id    uuid,
  p_date_from  TEXT DEFAULT NULL,
  p_date_to    TEXT DEFAULT NULL,
  p_group_by   TEXT DEFAULT 'tag'
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
