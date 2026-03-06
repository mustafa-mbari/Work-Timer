-- Server-side aggregation for email log dashboard (replaces client-side JS)

CREATE OR REPLACE FUNCTION get_daily_email_counts(p_days INTEGER DEFAULT 30)
RETURNS TABLE(day DATE, sent BIGINT, failed BIGINT)
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

CREATE OR REPLACE FUNCTION get_email_count_by_type()
RETURNS TABLE(type TEXT, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT type, COUNT(*) AS count
  FROM email_logs
  GROUP BY type
  ORDER BY count DESC;
$$;
