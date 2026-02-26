-- Migration 028: Reset Group Data (Start Fresh)
--
-- Deletes all existing group-related data so the timesheet approval
-- workflow starts with a clean slate. Tables/schema are preserved.

-- Delete in dependency order (children first)
DELETE FROM group_shares;
DELETE FROM group_sharing_settings;
DELETE FROM group_invitations;
DELETE FROM group_members;

-- Clear group_id references from subscriptions before deleting groups
UPDATE subscriptions SET group_id = NULL WHERE group_id IS NOT NULL;

DELETE FROM groups;
