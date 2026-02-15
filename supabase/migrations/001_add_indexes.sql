-- ============================================================
-- Migration 001: Add indexes for frequently queried columns
-- ============================================================

-- Time entries: most common query patterns
CREATE INDEX IF NOT EXISTS idx_time_entries_user_deleted ON time_entries(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_updated ON time_entries(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_created ON time_entries(user_id, created_at);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_user_deleted ON projects(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at);

-- Tags
CREATE INDEX IF NOT EXISTS idx_tags_user_deleted ON tags(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_tags_user_updated ON tags(user_id, updated_at);

-- Promo codes: lookup by code (unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- Promo redemptions: prevent duplicate redemptions
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_redemptions_code_user ON promo_redemptions(promo_code_id, user_id);

-- Sync cursors: unique constraint for upsert correctness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_sync_cursors_user_device'
  ) THEN
    ALTER TABLE sync_cursors ADD CONSTRAINT uq_sync_cursors_user_device UNIQUE (user_id, device_id);
  END IF;
END
$$;

-- Subscriptions: verify user_id uniqueness (used by upsert onConflict)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END
$$;
