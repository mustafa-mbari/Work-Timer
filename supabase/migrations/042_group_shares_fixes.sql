-- 042_group_shares_fixes.sql
-- Fixes from Groups Workflow Production Readiness Review:
-- 1. Unique partial index to prevent duplicate open/submitted shares (race condition)
-- 2. Atomic group creation RPC (prevents orphan groups)
-- 3. Refined RLS policies on group_shares (granular per-operation)

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. UNIQUE PARTIAL INDEX — prevent duplicate open/submitted shares
-- ═══════════════════════════════════════════════════════════════════════════════

-- Clean up any existing duplicates before adding constraint.
-- Keep the newest share per (group_id, user_id, date_from, date_to) for active statuses.
DELETE FROM group_shares gs1
WHERE gs1.status IN ('open', 'submitted')
  AND gs1.id NOT IN (
    SELECT DISTINCT ON (group_id, user_id, date_from, date_to) id
    FROM group_shares
    WHERE status IN ('open', 'submitted')
    ORDER BY group_id, user_id, date_from, date_to, created_at DESC
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_shares_unique_active_period
  ON group_shares(group_id, user_id, date_from, date_to)
  WHERE status IN ('open', 'submitted');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ATOMIC GROUP CREATION RPC
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_group_atomic(
  p_name     TEXT,
  p_owner_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row groups%ROWTYPE;
BEGIN
  INSERT INTO groups (name, owner_id)
  VALUES (p_name, p_owner_id)
  RETURNING * INTO v_row;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_row.id, p_owner_id, 'admin');

  RETURN json_build_object(
    'id',                 v_row.id,
    'name',               v_row.name,
    'owner_id',           v_row.owner_id,
    'join_code',          v_row.join_code,
    'max_members',        v_row.max_members,
    'share_frequency',    v_row.share_frequency,
    'share_deadline_day', v_row.share_deadline_day,
    'created_at',         v_row.created_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION create_group_atomic FROM PUBLIC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. REFINED RLS POLICIES ON group_shares
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop the overly permissive FOR ALL policy
DROP POLICY IF EXISTS "group_shares_own" ON group_shares;

-- SELECT: users can read their own shares
CREATE POLICY "group_shares_select_own" ON group_shares
  FOR SELECT USING (user_id = auth.uid());
-- Note: "group_shares_admin_read" already exists for admin SELECT

-- INSERT: only if user is a member of the group
CREATE POLICY "group_shares_insert_member" ON group_shares
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_shares.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- UPDATE: own shares only when status is 'open' (members can edit drafts)
-- Note: "group_shares_admin_update" already exists for admin reviews
CREATE POLICY "group_shares_update_own_open" ON group_shares
  FOR UPDATE USING (
    user_id = auth.uid()
    AND status = 'open'
  );

-- DELETE: own shares only when status is 'open'
CREATE POLICY "group_shares_delete_own_open" ON group_shares
  FOR DELETE USING (
    user_id = auth.uid()
    AND status = 'open'
  );
