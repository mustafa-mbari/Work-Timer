-- Lightweight aggregate stats table for all authenticated users (free and premium).
-- Free users push aggregate numbers only (no individual entries/projects).
-- Used for platform-wide admin statistics.

CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_hours NUMERIC DEFAULT 0,
  total_entries INTEGER DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  active_days INTEGER DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only read/upsert their own row
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);
