-- Returns true if any user data has been modified since the given timestamp.
-- Used by the extension sync engine to skip full pull when nothing changed.
CREATE OR REPLACE FUNCTION has_changes_since(
  p_user_id UUID,
  p_since TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
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
