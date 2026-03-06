-- Migration 013: Groups & All-In Subscription
-- Creates groups, group_members, group_invitations tables and updates subscriptions

-- Groups table
CREATE TABLE groups (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(10), 'hex'),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  max_members INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group members table
CREATE TABLE group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Group invitations table
CREATE TABLE group_invitations (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(10), 'hex'),
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- Add group_id to subscriptions
ALTER TABLE subscriptions ADD COLUMN group_id TEXT REFERENCES groups(id);

-- Indexes
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_invitations_email ON group_invitations(email);
CREATE INDEX idx_group_invitations_group ON group_invitations(group_id);

-- RLS for groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_select" ON groups FOR SELECT USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "groups_insert" ON groups FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);

CREATE POLICY "groups_update" ON groups FOR UPDATE USING (
  owner_id = auth.uid()
);

CREATE POLICY "groups_delete" ON groups FOR DELETE USING (
  owner_id = auth.uid()
);

-- RLS for group_members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_members_select" ON group_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm2 WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()
  )
);

CREATE POLICY "group_members_insert" ON group_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
  OR (
    -- Allow self-insert when joining via code or accepting invite
    group_members.user_id = auth.uid()
  )
);

CREATE POLICY "group_members_delete" ON group_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
  OR group_members.user_id = auth.uid() -- members can leave
);

CREATE POLICY "group_members_update" ON group_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

-- RLS for group_invitations
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_invitations_select" ON group_invitations FOR SELECT USING (
  invited_by = auth.uid()
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_invitations.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

CREATE POLICY "group_invitations_insert" ON group_invitations FOR INSERT WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_invitations.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

CREATE POLICY "group_invitations_update" ON group_invitations FOR UPDATE USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR invited_by = auth.uid()
);
