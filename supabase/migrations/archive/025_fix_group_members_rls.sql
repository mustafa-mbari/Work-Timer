-- Migration 025: Fix group_members_select RLS policy
--
-- The original policy was purely self-referential:
--   EXISTS (SELECT 1 FROM group_members gm2 WHERE gm2.group_id = ... AND gm2.user_id = auth.uid())
--
-- PostgreSQL's recursion guard handles this, but in some Supabase configurations the
-- guard can silently return empty results for the inner query, causing the outer query
-- to see no rows even when the membership row exists.
--
-- Fix: add `user_id = auth.uid()` as a direct, non-recursive primary condition so that
-- users can always read their OWN membership rows without relying on the circular check.
-- The EXISTS clause is kept so that group members can still see OTHER members' rows.

DROP POLICY IF EXISTS "group_members_select" ON group_members;

CREATE POLICY "group_members_select" ON group_members FOR SELECT USING (
  user_id = auth.uid()   -- Direct: users can always see their own membership rows
  OR EXISTS (
    SELECT 1 FROM group_members gm2
    WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()
  )
);
