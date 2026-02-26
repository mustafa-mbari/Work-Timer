-- Migration 026: Group Shares (Snapshot Sharing)
--
-- Replaces the live sharing model (group_sharing_settings) with explicit
-- snapshot-based sharing. Members choose a time period + filters, and the
-- resulting entries are frozen into a JSONB snapshot visible only to admins.

CREATE TABLE group_shares (
  id          TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(10), 'hex'),
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month')),
  date_from   TEXT NOT NULL,            -- YYYY-MM-DD
  date_to     TEXT NOT NULL,            -- YYYY-MM-DD
  project_ids TEXT[]   DEFAULT NULL,    -- NULL = all projects
  tag_ids     TEXT[]   DEFAULT NULL,    -- NULL = all tags
  entry_count INT      NOT NULL DEFAULT 0,
  total_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  entries     JSONB    NOT NULL DEFAULT '[]',  -- frozen snapshot of time entries
  note        TEXT     DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_shares_group   ON group_shares(group_id);
CREATE INDEX idx_group_shares_user    ON group_shares(user_id);
CREATE INDEX idx_group_shares_created ON group_shares(group_id, created_at DESC);

-- RLS (service client is used for all operations, but keep policies as safety net)
ALTER TABLE group_shares ENABLE ROW LEVEL SECURITY;

-- Members can read and delete their own shares
CREATE POLICY "group_shares_own" ON group_shares
  FOR ALL USING (user_id = auth.uid());

-- Group admins can read all shares within their groups
CREATE POLICY "group_shares_admin_read" ON group_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_shares.group_id
        AND gm.user_id  = auth.uid()
        AND gm.role     = 'admin'
    )
  );
