-- ============================================================
-- Migration 011: Add is_default and sort_order columns to
-- projects and tags tables for bidirectional sync of default
-- project/tag selection and drag-drop ordering.
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order  INT;

ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order  INT;
