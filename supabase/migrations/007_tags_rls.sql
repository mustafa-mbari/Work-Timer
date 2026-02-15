-- ============================================================
-- Migration 007: Fix RLS policies for tags table
-- Drops all existing policies first, then recreates them.
-- The tags table has RLS enabled but may have broken/missing
-- policies causing "new row violates row-level security policy"
-- on upsert.
-- ============================================================

-- Drop any existing policies (names may vary)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'tags' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON tags', pol.policyname);
  END LOOP;
END
$$;

-- Ensure RLS is enabled
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Recreate clean policies
CREATE POLICY "Users can read own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);
