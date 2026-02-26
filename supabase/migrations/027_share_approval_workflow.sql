-- Migration 027: Share Approval Workflow
--
-- Adds timesheet-style approval flow to group_shares:
--   Open → Submitted → Approved / Denied → Open (resubmit)
-- Adds recurring schedule settings to groups table.

-- 1. Add approval columns to group_shares
ALTER TABLE group_shares
  ADD COLUMN status        TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('open', 'submitted', 'approved', 'denied')),
  ADD COLUMN admin_comment TEXT DEFAULT NULL,
  ADD COLUMN submitted_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN reviewed_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN reviewed_by   UUID DEFAULT NULL REFERENCES auth.users(id),
  ADD COLUMN due_date      TEXT DEFAULT NULL;

CREATE INDEX idx_group_shares_status ON group_shares(group_id, status);

-- 2. Add schedule settings to groups
ALTER TABLE groups
  ADD COLUMN share_frequency    TEXT DEFAULT NULL
    CHECK (share_frequency IN ('daily', 'weekly', 'monthly')),
  ADD COLUMN share_deadline_day INT DEFAULT NULL;

-- 3. Admin can update shares in their group (approve/deny)
CREATE POLICY "group_shares_admin_update" ON group_shares
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_shares.group_id
        AND gm.user_id  = auth.uid()
        AND gm.role      = 'admin'
    )
  );
