-- Add composite index on (user_id, start_time) for analytics RPC queries
-- that compute hour-of-day distribution via extract(hour FROM to_timestamp(start_time / 1000.0))
CREATE INDEX IF NOT EXISTS idx_time_entries_user_start_time
  ON time_entries(user_id, start_time)
  WHERE deleted_at IS NULL AND start_time > 0;
