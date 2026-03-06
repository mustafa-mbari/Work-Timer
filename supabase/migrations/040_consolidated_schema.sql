-- ============================================================
-- CONSOLIDATED MIGRATION 040: Full schema for migrations 001–039
-- Generated: 2026-03-06
--
-- PURPOSE: Apply this single file to a fresh database instead of
-- running the 39 incremental files in sequence.
--
-- PREREQUISITE: The base schema tables must already exist:
--   profiles, subscriptions, projects, tags, time_entries,
--   user_settings, promo_codes, promo_redemptions,
--   sync_cursors, whitelisted_domains
--
-- The individual files are preserved in archive/ for history.
-- ============================================================


-- ============================================================
-- SECTION 1: NEW TABLES (dependency order)
-- ============================================================

-- stripe_events: webhook idempotency (005)
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id       TEXT PRIMARY KEY,
  event_type     TEXT NOT NULL,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_stats: lightweight platform aggregates (006)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_hours    NUMERIC DEFAULT 0,
  total_entries  INTEGER DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  active_days    INTEGER DEFAULT 0,
  last_active_date DATE,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- email_logs: transactional email tracking (029)
CREATE TABLE IF NOT EXISTS email_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient   TEXT NOT NULL,
  type        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'sent',
  message_id  TEXT,
  error       TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  sent_by     UUID REFERENCES auth.users(id)
);

-- plan_roles: subscription plan → role bucket mapping (031)
CREATE TABLE IF NOT EXISTS plan_roles (
  plan       TEXT PRIMARY KEY,
  role_name  TEXT NOT NULL CHECK (role_name IN ('free', 'pro', 'team'))
);

INSERT INTO plan_roles (plan, role_name) VALUES
  ('free',             'free'),
  ('premium_monthly',  'pro'),
  ('premium_yearly',   'pro'),
  ('premium_lifetime', 'pro'),
  ('allin_monthly',    'team'),
  ('allin_yearly',     'team'),
  ('team_10_monthly',  'team'),
  ('team_10_yearly',   'team'),
  ('team_20_monthly',  'team'),
  ('team_20_yearly',   'team')
ON CONFLICT (plan) DO NOTHING;

-- role_export_limits: monthly export caps per role/type (031)
CREATE TABLE IF NOT EXISTS role_export_limits (
  role_name     TEXT NOT NULL CHECK (role_name IN ('free', 'pro', 'team')),
  export_type   TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel', 'csv')),
  monthly_limit INT  NOT NULL,
  PRIMARY KEY (role_name, export_type)
);

INSERT INTO role_export_limits (role_name, export_type, monthly_limit) VALUES
  ('free',  'pdf',    1),
  ('free',  'excel',  1),
  ('free',  'csv',    1),
  ('pro',   'pdf',   10),
  ('pro',   'excel', 20),
  ('pro',   'csv',   30),
  ('team',  'pdf',   20),
  ('team',  'excel', 30),
  ('team',  'csv',   30)
ON CONFLICT (role_name, export_type) DO NOTHING;

-- export_usage: per-user monthly export counters (031)
CREATE TABLE IF NOT EXISTS export_usage (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel', 'csv')),
  year_month  TEXT NOT NULL,
  count       INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, export_type, year_month)
);

-- groups: team groups with optional share schedule (013 + 027)
CREATE TABLE IF NOT EXISTS groups (
  id                 TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(10), 'hex'),
  name               TEXT NOT NULL,
  owner_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code          TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  max_members        INT NOT NULL DEFAULT 10,
  share_frequency    TEXT DEFAULT NULL
    CHECK (share_frequency IN ('daily', 'weekly', 'monthly')),
  share_deadline_day INT DEFAULT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- group_members: membership + roles (013)
CREATE TABLE IF NOT EXISTS group_members (
  group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- group_invitations: email-based invites with 7-day expiry (013)
CREATE TABLE IF NOT EXISTS group_invitations (
  id          TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(10), 'hex'),
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  invited_by  UUID NOT NULL REFERENCES auth.users(id),
  status      TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- group_sharing_settings: per-member sharing toggle (018)
CREATE TABLE IF NOT EXISTS group_sharing_settings (
  group_id           TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sharing_enabled    BOOLEAN NOT NULL DEFAULT false,
  shared_project_ids TEXT[] DEFAULT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- group_shares: snapshot-based timesheet approval workflow (026 + 027)
CREATE TABLE IF NOT EXISTS group_shares (
  id            TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(10), 'hex'),
  group_id      TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type   TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month')),
  date_from     TEXT NOT NULL,
  date_to       TEXT NOT NULL,
  project_ids   TEXT[] DEFAULT NULL,
  tag_ids       TEXT[] DEFAULT NULL,
  entry_count   INT NOT NULL DEFAULT 0,
  total_hours   NUMERIC(8,2) NOT NULL DEFAULT 0,
  entries       JSONB NOT NULL DEFAULT '[]',
  note          TEXT DEFAULT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'submitted', 'approved', 'denied')),
  admin_comment TEXT DEFAULT NULL,
  submitted_at  TIMESTAMPTZ DEFAULT NULL,
  reviewed_at   TIMESTAMPTZ DEFAULT NULL,
  reviewed_by   UUID DEFAULT NULL REFERENCES auth.users(id),
  due_date      TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- support_tickets: user-submitted support requests (030)
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  TEXT NOT NULL,
  user_name   TEXT,
  issue_type  TEXT NOT NULL CHECK (issue_type IN ('bug', 'account', 'billing', 'sync', 'performance', 'other')),
  subject     TEXT NOT NULL,
  description TEXT NOT NULL,
  priority    TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  platform    TEXT NOT NULL CHECK (platform IN ('chrome_extension', 'web_app', 'both')) DEFAULT 'web_app',
  issue_time  TIMESTAMPTZ,
  status      TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- feature_suggestions: user-submitted feature ideas (030)
CREATE TABLE IF NOT EXISTS feature_suggestions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email        TEXT NOT NULL,
  user_name         TEXT,
  suggestion_type   TEXT NOT NULL CHECK (suggestion_type IN ('feature', 'improvement', 'integration', 'ui_ux', 'other')),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  importance        TEXT NOT NULL CHECK (importance IN ('nice_to_have', 'important', 'critical')) DEFAULT 'important',
  target_platform   TEXT NOT NULL CHECK (target_platform IN ('chrome_extension', 'web_app', 'both')) DEFAULT 'both',
  notify_on_release BOOLEAN NOT NULL DEFAULT false,
  status            TEXT NOT NULL CHECK (status IN ('new', 'under_review', 'planned', 'in_progress', 'implemented', 'declined')) DEFAULT 'new',
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- webhook_logs: Stripe webhook monitoring (035)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id            BIGSERIAL PRIMARY KEY,
  event_id      TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  user_id       TEXT,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- api_quota_limits: configurable API mutation limits per role/resource (039)
CREATE TABLE IF NOT EXISTS api_quota_limits (
  role_name      TEXT NOT NULL CHECK (role_name IN ('free', 'pro', 'team')),
  resource_type  TEXT NOT NULL,
  monthly_limit  INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (role_name, resource_type)
);

INSERT INTO api_quota_limits (role_name, resource_type, monthly_limit) VALUES
  ('free',  'entries',      100),
  ('pro',   'entries',     1500),
  ('team',  'entries',     2000),
  ('free',  'projects',      30),
  ('pro',   'projects',     150),
  ('team',  'projects',     200),
  ('free',  'tags',          30),
  ('pro',   'tags',         150),
  ('team',  'tags',         200),
  ('free',  'settings',      20),
  ('pro',   'settings',     100),
  ('team',  'settings',     100),
  ('free',  'groups',        10),
  ('pro',   'groups',        50),
  ('team',  'groups',       100),
  ('free',  'support',        5),
  ('pro',   'support',       20),
  ('team',  'support',       30),
  ('free',  'suggestions',    5),
  ('pro',   'suggestions',   20),
  ('team',  'suggestions',   30)
ON CONFLICT (role_name, resource_type) DO NOTHING;

-- api_quota_usage: per-user monthly API mutation counters (039)
CREATE TABLE IF NOT EXISTS api_quota_usage (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  year_month    TEXT NOT NULL,
  count         INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, resource_type, year_month)
);


-- ============================================================
-- SECTION 2: COLUMNS ADDED TO PRE-EXISTING TABLES
-- ============================================================

-- subscriptions: group membership link (013)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS group_id TEXT REFERENCES groups(id);

-- user_settings: reminder config (009)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS reminder JSONB
    DEFAULT '{"enabled":true,"dayOfWeek":5,"hour":14,"minute":0}'::jsonb;

-- user_settings: earnings/billing fields (012, 020, 023)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS default_hourly_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS min_billable_minutes INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS entry_save_time INTEGER DEFAULT 10;

-- projects: ordering + pricing + earnings + tag link (011, 012, 017, 024)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_default     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order     INT,
  ADD COLUMN IF NOT EXISTS hourly_rate    NUMERIC,
  ADD COLUMN IF NOT EXISTS earnings_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_tag_id TEXT;

-- tags: ordering + earnings support (011, 024)
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order       INT,
  ADD COLUMN IF NOT EXISTS color            TEXT NOT NULL DEFAULT '#6366F1',
  ADD COLUMN IF NOT EXISTS hourly_rate      NUMERIC,
  ADD COLUMN IF NOT EXISTS earnings_enabled BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- SECTION 3: CONSTRAINTS
-- ============================================================

-- sync_cursors: unique (user_id, device_id) for upsert correctness (001)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_sync_cursors_user_device'
  ) THEN
    ALTER TABLE sync_cursors ADD CONSTRAINT uq_sync_cursors_user_device UNIQUE (user_id, device_id);
  END IF;
END
$$;

-- subscriptions: unique user_id for upsert (001)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END
$$;


-- ============================================================
-- SECTION 4: INDEXES
-- ============================================================

-- time_entries (001, 025)
CREATE INDEX IF NOT EXISTS idx_time_entries_user_deleted    ON time_entries(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date       ON time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_updated    ON time_entries(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_created    ON time_entries(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_summary_lookup  ON time_entries(user_id, date, duration, project_id) WHERE deleted_at IS NULL;

-- projects (001, 012)
CREATE INDEX IF NOT EXISTS idx_projects_user_deleted        ON projects(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_user_updated        ON projects(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_user_hourly_rate    ON projects(user_id, hourly_rate);

-- tags (001, 024)
CREATE INDEX IF NOT EXISTS idx_tags_user_deleted            ON tags(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_tags_user_updated            ON tags(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tags_user_earnings           ON tags(user_id, earnings_enabled) WHERE deleted_at IS NULL;

-- promo codes (001)
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_code            ON promo_codes(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_redemptions_code_user ON promo_redemptions(promo_code_id, user_id);

-- stripe_events (005)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed      ON stripe_events(processed_at);

-- groups (013)
CREATE INDEX IF NOT EXISTS idx_group_members_user           ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email      ON group_invitations(email);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group      ON group_invitations(group_id);

-- group_sharing_settings (018)
CREATE INDEX IF NOT EXISTS idx_group_sharing_user           ON group_sharing_settings(user_id);

-- group_shares (026, 027, 042)
CREATE INDEX IF NOT EXISTS idx_group_shares_group           ON group_shares(group_id);
CREATE INDEX IF NOT EXISTS idx_group_shares_user            ON group_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_group_shares_created         ON group_shares(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_shares_status          ON group_shares(group_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_shares_unique_active_period
  ON group_shares(group_id, user_id, date_from, date_to)
  WHERE status IN ('open', 'submitted');

-- email_logs (029)
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at        ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_type              ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient         ON email_logs(recipient);

-- support_tickets (030)
CREATE INDEX IF NOT EXISTS idx_support_tickets_user         ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status       ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created      ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority     ON support_tickets(priority);

-- feature_suggestions (030)
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_user     ON feature_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_status   ON feature_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_created  ON feature_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_type     ON feature_suggestions(suggestion_type);

-- export_usage (031)
CREATE INDEX IF NOT EXISTS idx_export_usage_user_month      ON export_usage(user_id, year_month);

-- webhook_logs (035)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created         ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status          ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type      ON webhook_logs(event_type);

-- api_quota_usage (039)
CREATE INDEX IF NOT EXISTS idx_api_quota_usage_user_month   ON api_quota_usage(user_id, year_month);


-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY
-- ============================================================

-- user_stats (006)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can read own stats"
  ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own stats"
  ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own stats"
  ON user_stats FOR UPDATE USING (auth.uid() = user_id);

-- tags: drop any pre-existing policies, recreate cleanly (007)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tags' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON tags', pol.policyname);
  END LOOP;
END $$;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own tags"   ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON tags FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON tags FOR DELETE USING (auth.uid() = user_id);

-- projects: drop any pre-existing policies, recreate cleanly (008)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'projects' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
  END LOOP;
END $$;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own projects"   ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- time_entries: drop any pre-existing policies, recreate cleanly (008)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'time_entries' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON time_entries', pol.policyname);
  END LOOP;
END $$;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own entries"   ON time_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON time_entries FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON time_entries FOR DELETE USING (auth.uid() = user_id);

-- subscriptions (033)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "subscriptions_select_own"
  ON subscriptions FOR SELECT USING (user_id = auth.uid());

-- groups (013)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "groups_select" ON groups FOR SELECT USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid())
);
CREATE POLICY IF NOT EXISTS "groups_insert" ON groups FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY IF NOT EXISTS "groups_update" ON groups FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY IF NOT EXISTS "groups_delete" ON groups FOR DELETE USING (owner_id = auth.uid());

-- group_members (013 + fix from 025)
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "group_members_select" ON group_members FOR SELECT USING (
  user_id = auth.uid()  -- direct: always see own membership row
  OR EXISTS (
    SELECT 1 FROM group_members gm2
    WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()
  )
);
CREATE POLICY IF NOT EXISTS "group_members_insert" ON group_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
  )
  OR group_members.user_id = auth.uid()  -- self-insert: join via code or accept invite
);
CREATE POLICY IF NOT EXISTS "group_members_delete" ON group_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
  )
  OR group_members.user_id = auth.uid()  -- members can leave
);
CREATE POLICY IF NOT EXISTS "group_members_update" ON group_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
  )
);

-- group_invitations (013)
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "group_invitations_select" ON group_invitations FOR SELECT USING (
  invited_by = auth.uid()
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_invitations.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
  )
);
CREATE POLICY IF NOT EXISTS "group_invitations_insert" ON group_invitations FOR INSERT WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_invitations.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
  )
);
CREATE POLICY IF NOT EXISTS "group_invitations_update" ON group_invitations FOR UPDATE USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR invited_by = auth.uid()
);

-- group_sharing_settings (018)
ALTER TABLE group_sharing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "sharing_own" ON group_sharing_settings
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "sharing_admin_read" ON group_sharing_settings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_sharing_settings.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
  )
);

-- group_shares (026 + 027 + 042 refined policies)
ALTER TABLE group_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "group_shares_select_own" ON group_shares
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "group_shares_admin_read" ON group_shares FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_shares.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
  )
);
CREATE POLICY IF NOT EXISTS "group_shares_insert_member" ON group_shares
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_shares.group_id AND gm.user_id = auth.uid()
    )
  );
CREATE POLICY IF NOT EXISTS "group_shares_update_own_open" ON group_shares
  FOR UPDATE USING (user_id = auth.uid() AND status = 'open');
CREATE POLICY IF NOT EXISTS "group_shares_admin_update" ON group_shares FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_shares.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
  )
);
CREATE POLICY IF NOT EXISTS "group_shares_delete_own_open" ON group_shares
  FOR DELETE USING (user_id = auth.uid() AND status = 'open');

-- email_logs (029): RLS on, no client policies — service role only
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- support_tickets (030)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "support_tickets_select" ON support_tickets FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "support_tickets_insert" ON support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- feature_suggestions (030)
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "feature_suggestions_select" ON feature_suggestions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "feature_suggestions_insert" ON feature_suggestions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- plan_roles (031): public read
ALTER TABLE plan_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "plan_roles_select" ON plan_roles FOR SELECT USING (true);

-- role_export_limits (031): public read
ALTER TABLE role_export_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "role_export_limits_select" ON role_export_limits FOR SELECT USING (true);

-- export_usage (031): own rows only; writes via RPC
ALTER TABLE export_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "export_usage_select" ON export_usage FOR SELECT
  USING (user_id = auth.uid());

-- webhook_logs (035): no client policies — service role only
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- api_quota_limits (039): public read
ALTER TABLE api_quota_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "api_quota_limits_select" ON api_quota_limits FOR SELECT USING (true);

-- api_quota_usage (039): own rows only; writes via RPC
ALTER TABLE api_quota_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "api_quota_usage_select" ON api_quota_usage FOR SELECT
  USING (user_id = auth.uid());


-- ============================================================
-- SECTION 6: FUNCTIONS (final versions only)
-- ============================================================

-- --------------------------------------------------------
-- Trigger helper: auto-set updated_at (037)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- --------------------------------------------------------
-- Admin: platform stats (002)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_entries',    (SELECT count(*) FROM time_entries WHERE deleted_at IS NULL),
    'total_hours',      (SELECT COALESCE(sum(duration) / 3600000.0, 0) FROM time_entries WHERE deleted_at IS NULL),
    'entry_count_30d',  (SELECT count(*) FROM time_entries WHERE deleted_at IS NULL AND date >= (current_date - interval '30 days')::text),
    'project_count',    (SELECT count(*) FROM projects WHERE deleted_at IS NULL),
    'avg_session_ms',   (SELECT COALESCE(avg(duration), 0) FROM time_entries WHERE deleted_at IS NULL)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_active_users(period interval)
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$
  SELECT count(DISTINCT user_id)::integer
  FROM time_entries
  WHERE deleted_at IS NULL AND created_at >= (now() - period);
$$;

CREATE OR REPLACE FUNCTION get_user_growth(weeks integer DEFAULT 8)
RETURNS TABLE(week_start timestamptz, signup_count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH week_series AS (
    SELECT generate_series(
      date_trunc('week', now() - (weeks * interval '1 week')),
      date_trunc('week', now()),
      interval '1 week'
    ) AS week_start
  )
  SELECT ws.week_start, count(u.id) AS signup_count
  FROM week_series ws
  LEFT JOIN auth.users u
    ON u.created_at >= ws.week_start AND u.created_at < ws.week_start + interval '1 week'
  GROUP BY ws.week_start
  ORDER BY ws.week_start;
$$;

CREATE OR REPLACE FUNCTION get_top_users(lim integer DEFAULT 5)
RETURNS TABLE(user_id uuid, email text, total_hours numeric)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT te.user_id,
    COALESCE(u.email, 'Unknown') AS email,
    round(sum(te.duration) / 3600000.0, 1) AS total_hours
  FROM time_entries te
  LEFT JOIN auth.users u ON u.id = te.user_id
  WHERE te.deleted_at IS NULL
  GROUP BY te.user_id, u.email
  ORDER BY total_hours DESC
  LIMIT lim;
$$;

CREATE OR REPLACE FUNCTION get_entry_type_breakdown()
RETURNS TABLE(entry_type text, entry_count bigint, total_hours numeric)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT type AS entry_type, count(*) AS entry_count,
    round(sum(duration) / 3600000.0, 1) AS total_hours
  FROM time_entries WHERE deleted_at IS NULL
  GROUP BY type;
$$;

CREATE OR REPLACE FUNCTION get_premium_breakdown()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_premium', (SELECT count(*) FROM subscriptions WHERE plan != 'free' AND status = 'active'),
    'by_plan', (
      SELECT json_object_agg(plan, cnt)
      FROM (SELECT plan, count(*) AS cnt FROM subscriptions WHERE plan != 'free' AND status = 'active' GROUP BY plan) sub
    ),
    'by_source', (
      SELECT json_object_agg(COALESCE(granted_by, 'unknown'), cnt)
      FROM (SELECT granted_by, count(*) AS cnt FROM subscriptions WHERE plan != 'free' AND status = 'active' GROUP BY granted_by) sub
    )
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_promo_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'active_promos', (SELECT count(*) FROM promo_codes WHERE active = true),
    'total_uses',    (SELECT COALESCE(sum(current_uses), 0) FROM promo_codes)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_domain_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'active_domains', (SELECT count(*) FROM whitelisted_domains WHERE active = true)
  ) INTO result;
  RETURN result;
END;
$$;


-- --------------------------------------------------------
-- User analytics with date-range filtering (021 — final)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_analytics(
  p_user_id   uuid,
  p_date_from TEXT DEFAULT NULL,
  p_date_to   TEXT DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result           json;
  v_total_hours    numeric;
  v_total_entries  integer;
  v_unique_days    integer;
  v_avg_session_ms numeric;
  v_streak         integer;
  v_from_date      date;
  v_to_date        date;
BEGIN
  v_from_date := CASE WHEN p_date_from IS NOT NULL THEN p_date_from::date ELSE NULL END;
  v_to_date   := CASE WHEN p_date_to   IS NOT NULL THEN p_date_to::date   ELSE NULL END;

  SELECT
    COALESCE(round(sum(duration) / 3600000.0, 2), 0),
    count(*)::integer,
    count(DISTINCT date)::integer,
    COALESCE(avg(duration), 0)
  INTO v_total_hours, v_total_entries, v_unique_days, v_avg_session_ms
  FROM time_entries
  WHERE user_id = p_user_id AND deleted_at IS NULL
    AND (v_from_date IS NULL OR date::date >= v_from_date)
    AND (v_to_date   IS NULL OR date::date <= v_to_date);

  WITH daily AS (
    SELECT DISTINCT date::date AS d FROM time_entries
    WHERE user_id = p_user_id AND deleted_at IS NULL ORDER BY d DESC
  ),
  streak_calc AS (
    SELECT d, d - (row_number() OVER (ORDER BY d DESC))::integer AS grp
    FROM daily WHERE d >= current_date - interval '365 days'
  )
  SELECT count(*)::integer INTO v_streak
  FROM streak_calc
  WHERE grp = (
    SELECT grp FROM streak_calc
    WHERE d = current_date OR d = current_date - 1
    ORDER BY d DESC LIMIT 1
  );

  IF v_streak IS NULL THEN v_streak := 0; END IF;

  SELECT json_build_object(
    'total_hours',    v_total_hours,
    'total_entries',  v_total_entries,
    'unique_days',    v_unique_days,
    'avg_session_ms', round(v_avg_session_ms),
    'streak',         v_streak,

    'weekly_data', (
      SELECT json_agg(json_build_object('week', sub.week_label, 'hours', sub.hours) ORDER BY sub.week_start)
      FROM (
        WITH week_series AS (
          SELECT generate_series(
            date_trunc('week', COALESCE(v_from_date, current_date - interval '11 weeks')),
            date_trunc('week', COALESCE(v_to_date,   current_date)),
            interval '1 week'
          )::date AS week_start
        )
        SELECT ws.week_start, to_char(ws.week_start, 'Mon DD') AS week_label,
          COALESCE(round(sum(te.duration) / 3600000.0, 1), 0) AS hours
        FROM week_series ws
        LEFT JOIN time_entries te
          ON te.user_id = p_user_id AND te.deleted_at IS NULL
          AND te.date::date >= ws.week_start AND te.date::date < ws.week_start + 7
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY ws.week_start
      ) sub
    ),

    'type_data', (
      SELECT json_agg(json_build_object('name', sub.type_name, 'hours', sub.hours, 'count', sub.entry_count))
      FROM (
        SELECT
          CASE type WHEN 'manual' THEN 'Manual' WHEN 'stopwatch' THEN 'Stopwatch' WHEN 'pomodoro' THEN 'Pomodoro' END AS type_name,
          round(sum(duration) / 3600000.0, 1) AS hours, count(*) AS entry_count
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY type
      ) sub
    ),

    'day_of_week_data', (
      WITH dow AS (
        SELECT extract(dow FROM date::date)::integer AS dow_num, sum(duration) / 3600000.0 AS hours
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY dow_num
      ),
      all_days AS (
        SELECT unnest(ARRAY[0,1,2,3,4,5,6]) AS dow_num,
               unnest(ARRAY['Sun','Mon','Tue','Wed','Thu','Fri','Sat']) AS name
      )
      SELECT json_agg(json_build_object('name', ad.name, 'hours', COALESCE(round(d.hours::numeric, 1), 0)) ORDER BY ad.dow_num)
      FROM all_days ad LEFT JOIN dow d ON d.dow_num = ad.dow_num
    ),

    'daily_data', (
      SELECT json_agg(json_build_object('date', sub.day_label, 'hours', sub.hours) ORDER BY sub.d)
      FROM (
        WITH day_series AS (
          SELECT generate_series(
            COALESCE(v_from_date, current_date - 29),
            COALESCE(v_to_date,   current_date),
            interval '1 day'
          )::date AS d
        )
        SELECT ds.d, to_char(ds.d, 'Mon DD') AS day_label,
          COALESCE(round(sum(te.duration) / 3600000.0, 1), 0) AS hours
        FROM day_series ds
        LEFT JOIN time_entries te
          ON te.user_id = p_user_id AND te.deleted_at IS NULL AND te.date::date = ds.d
        GROUP BY ds.d
      ) sub
    ),

    'daily_project_data', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', sub.day, 'project_id', sub.project_id,
        'project_name', sub.project_name, 'project_color', sub.project_color, 'hours', sub.day_hours
      ) ORDER BY sub.day, sub.project_name), '[]'::json)
      FROM (
        SELECT te.date::date AS day, p.id AS project_id, p.name AS project_name, p.color AS project_color,
          round(sum(te.duration) / 3600000.0, 2) AS day_hours
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL
        WHERE te.user_id = p_user_id AND te.deleted_at IS NULL
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY te.date::date, p.id, p.name, p.color
      ) sub
    ),

    'peak_hours_data', (
      WITH hour_series AS (SELECT generate_series(0, 23) AS h)
      SELECT json_agg(json_build_object('hour', lpad(hs.h::text, 2, '0') || ':00', 'count', COALESCE(cnt, 0)) ORDER BY hs.h)
      FROM hour_series hs
      LEFT JOIN (
        SELECT extract(hour FROM to_timestamp(start_time / 1000.0))::integer AS h, count(*) AS cnt
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL AND start_time > 0
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY h
      ) te ON te.h = hs.h
    ),

    'project_stats', (
      SELECT json_agg(json_build_object(
        'name', p.name, 'color', p.color,
        'hours', round(COALESCE(hours, 0)::numeric, 1),
        'entries', COALESCE(entry_count, 0), 'target_hours', p.target_hours
      ) ORDER BY hours DESC NULLS LAST)
      FROM projects p
      LEFT JOIN (
        SELECT project_id, sum(duration) / 3600000.0 AS hours, count(*) AS entry_count
        FROM time_entries
        WHERE user_id = p_user_id AND deleted_at IS NULL
          AND (v_from_date IS NULL OR date::date >= v_from_date)
          AND (v_to_date   IS NULL OR date::date <= v_to_date)
        GROUP BY project_id
      ) te ON te.project_id = p.id
      WHERE p.user_id = p_user_id AND p.deleted_at IS NULL
    )
  ) INTO result;

  RETURN result;
END;
$$;


-- --------------------------------------------------------
-- Promo redemption (033 — final: clears Stripe fields on 100% grant)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION redeem_promo(p_code text, p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_promo              record;
  v_existing_redemption uuid;
  v_now                timestamptz := now();
BEGIN
  SELECT * INTO v_promo
  FROM promo_codes WHERE code = upper(p_code) AND active = true FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid promo code');
  END IF;

  IF v_promo.valid_from IS NOT NULL AND v_promo.valid_from > v_now THEN
    RETURN json_build_object('success', false, 'error', 'Promo code is not yet valid');
  END IF;

  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < v_now THEN
    RETURN json_build_object('success', false, 'error', 'Promo code has expired');
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Promo code has reached its usage limit');
  END IF;

  SELECT id INTO v_existing_redemption
  FROM promo_redemptions WHERE promo_code_id = v_promo.id AND user_id = p_user_id;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'You have already used this promo code');
  END IF;

  INSERT INTO promo_redemptions (promo_code_id, user_id) VALUES (v_promo.id, p_user_id);
  UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;

  IF v_promo.discount_pct = 100 THEN
    INSERT INTO subscriptions (user_id, plan, status, granted_by, promo_code_id, updated_at)
    VALUES (p_user_id, v_promo.plan, 'active', 'promo', v_promo.id, v_now)
    ON CONFLICT (user_id) DO UPDATE SET
      plan = EXCLUDED.plan, status = EXCLUDED.status,
      granted_by = EXCLUDED.granted_by, promo_code_id = EXCLUDED.promo_code_id,
      stripe_subscription_id = NULL, stripe_customer_id = NULL,
      cancel_at_period_end = false, updated_at = EXCLUDED.updated_at;

    RETURN json_build_object('success', true, 'granted', true, 'plan', v_promo.plan, 'discount_pct', v_promo.discount_pct);
  END IF;

  RETURN json_build_object(
    'success', true, 'granted', false, 'plan', v_promo.plan,
    'discount_pct', v_promo.discount_pct, 'promo_id', v_promo.id, 'promo_code', v_promo.code
  );
END;
$$;


-- --------------------------------------------------------
-- Group analytics (015)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_group_analytics(
  p_group_id  TEXT,
  p_user_id   uuid,
  p_date_from TEXT DEFAULT NULL,
  p_date_to   TEXT DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result      json;
  v_from_date date;
  v_to_date   date;
  v_is_member boolean;
  v_is_allin  boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id)
  INTO v_is_member;
  IF NOT v_is_member THEN RETURN json_build_object('error', 'Not a member of this group'); END IF;

  SELECT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.user_id = p_user_id AND s.status = 'active' AND s.plan LIKE 'allin_%'
  ) INTO v_is_allin;
  IF NOT v_is_allin THEN RETURN json_build_object('error', 'All-In subscription required'); END IF;

  v_from_date := CASE WHEN p_date_from IS NOT NULL THEN p_date_from::date ELSE NULL END;
  v_to_date   := CASE WHEN p_date_to   IS NOT NULL THEN p_date_to::date   ELSE NULL END;

  SELECT json_build_object(
    'total_hours', (
      SELECT COALESCE(round(sum(te.duration) / 3600000.0, 2), 0)
      FROM time_entries te
      JOIN group_members gm ON gm.user_id = te.user_id AND gm.group_id = p_group_id
      WHERE te.deleted_at IS NULL
        AND (v_from_date IS NULL OR te.date::date >= v_from_date)
        AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
    ),
    'total_entries', (
      SELECT count(*)::integer
      FROM time_entries te
      JOIN group_members gm ON gm.user_id = te.user_id AND gm.group_id = p_group_id
      WHERE te.deleted_at IS NULL
        AND (v_from_date IS NULL OR te.date::date >= v_from_date)
        AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
    ),
    'member_count', (SELECT count(*)::integer FROM group_members WHERE group_id = p_group_id),
    'member_stats', (
      SELECT COALESCE(json_agg(json_build_object(
        'user_id', sub.user_id, 'display_name', sub.display_name, 'email', sub.email,
        'hours', sub.hours, 'entries', sub.entries
      ) ORDER BY sub.hours DESC NULLS LAST), '[]'::json)
      FROM (
        SELECT gm.user_id, COALESCE(pr.display_name, pr.email) AS display_name, pr.email,
          COALESCE(round(sum(te.duration) / 3600000.0, 2), 0) AS hours,
          count(te.id)::integer AS entries
        FROM group_members gm
        JOIN profiles pr ON pr.id = gm.user_id
        LEFT JOIN time_entries te
          ON te.user_id = gm.user_id AND te.deleted_at IS NULL
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        WHERE gm.group_id = p_group_id
        GROUP BY gm.user_id, pr.display_name, pr.email
      ) sub
    ),
    'project_stats', (
      SELECT COALESCE(json_agg(json_build_object(
        'name', sub.project_name, 'color', sub.project_color,
        'hours', sub.hours, 'entries', sub.entries
      ) ORDER BY sub.hours DESC NULLS LAST), '[]'::json)
      FROM (
        SELECT p.name AS project_name, p.color AS project_color,
          round(COALESCE(sum(te.duration) / 3600000.0, 0), 1) AS hours,
          count(te.id)::integer AS entries
        FROM time_entries te
        JOIN group_members gm ON gm.user_id = te.user_id AND gm.group_id = p_group_id
        JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL
        WHERE te.deleted_at IS NULL
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY p.name, p.color
      ) sub
    ),
    'weekly_data', (
      SELECT json_agg(json_build_object('week', sub.week_label, 'hours', sub.hours) ORDER BY sub.week_start)
      FROM (
        WITH week_series AS (
          SELECT generate_series(
            date_trunc('week', COALESCE(v_from_date, current_date - interval '11 weeks')),
            date_trunc('week', COALESCE(v_to_date,   current_date)),
            interval '1 week'
          )::date AS week_start
        )
        SELECT ws.week_start, to_char(ws.week_start, 'Mon DD') AS week_label,
          COALESCE(round(sum(te.duration) / 3600000.0, 1), 0) AS hours
        FROM week_series ws
        LEFT JOIN (
          SELECT te.date, te.duration FROM time_entries te
          JOIN group_members gm ON gm.user_id = te.user_id AND gm.group_id = p_group_id
          WHERE te.deleted_at IS NULL
        ) te
          ON te.date::date >= ws.week_start AND te.date::date < ws.week_start + 7
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
        GROUP BY ws.week_start
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;


-- --------------------------------------------------------
-- Admin group RPCs (016)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_get_groups()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id', g.id, 'name', g.name, 'owner_id', g.owner_id, 'owner_email', pr.email,
      'join_code', g.join_code, 'max_members', g.max_members,
      'member_count', COALESCE(mc.cnt, 0), 'created_at', g.created_at
    ) ORDER BY g.created_at DESC), '[]'::json)
    FROM groups g
    JOIN profiles pr ON pr.id = g.owner_id
    LEFT JOIN (SELECT group_id, count(*)::integer AS cnt FROM group_members GROUP BY group_id) mc
      ON mc.group_id = g.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_group(p_group_id TEXT, p_max_members INT)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE groups SET max_members = p_max_members WHERE id = p_group_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Group not found'); END IF;
  RETURN json_build_object('success', true);
END;
$$;


-- --------------------------------------------------------
-- Atomic group creation (042)
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- Group member entries (018)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_group_member_entries(
  p_group_id  TEXT,
  p_admin_id  UUID,
  p_member_id UUID,
  p_date_from TEXT DEFAULT NULL,
  p_date_to   TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role       TEXT;
  v_sharing    BOOLEAN;
  v_project_ids TEXT[];
BEGIN
  SELECT role INTO v_role FROM group_members WHERE group_id = p_group_id AND user_id = p_admin_id;
  IF v_role IS NULL OR v_role != 'admin' THEN RETURN json_build_object('error', 'Not authorized'); END IF;

  SELECT sharing_enabled, shared_project_ids INTO v_sharing, v_project_ids
  FROM group_sharing_settings WHERE group_id = p_group_id AND user_id = p_member_id;
  IF NOT COALESCE(v_sharing, false) THEN RETURN json_build_object('error', 'Member has not enabled sharing'); END IF;

  RETURN (
    SELECT json_build_object(
      'entries', COALESCE(json_agg(row_to_json(t) ORDER BY t.date DESC, t.start_time DESC), '[]'::JSON)
    )
    FROM (
      SELECT te.id, te.date, te.start_time, te.end_time, te.duration, te.description, te.project_id,
        COALESCE(pr.name, 'No Project') AS project_name, COALESCE(pr.color, '#94a3b8') AS project_color
      FROM time_entries te
      LEFT JOIN projects pr ON pr.id = te.project_id
      WHERE te.user_id = p_member_id
        AND (v_project_ids IS NULL OR te.project_id = ANY(v_project_ids))
        AND (p_date_from IS NULL OR te.date >= p_date_from)
        AND (p_date_to IS NULL OR te.date <= p_date_to)
      LIMIT 500
    ) t
  );
END;
$$;


-- --------------------------------------------------------
-- Group member summary — optimized (025)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_group_members_summary(p_group_id TEXT, p_admin_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role            TEXT;
  v_now             TIMESTAMPTZ := now();
  v_week_start      TEXT;
  v_last_week_start TEXT;
  v_last_week_end   TEXT;
  v_month_start     TEXT;
  v_last_month_start TEXT;
  v_last_month_end  TEXT;
BEGIN
  SELECT role INTO v_role FROM group_members WHERE group_id = p_group_id AND user_id = p_admin_id;
  IF v_role IS NULL OR v_role != 'admin' THEN RETURN json_build_object('error', 'Not authorized'); END IF;

  v_week_start       := (date_trunc('week', v_now)::DATE)::TEXT;
  v_last_week_start  := (date_trunc('week', v_now)::DATE - INTERVAL '7 days')::TEXT;
  v_last_week_end    := (date_trunc('week', v_now)::DATE - INTERVAL '1 day')::TEXT;
  v_month_start      := (date_trunc('month', v_now)::DATE)::TEXT;
  v_last_month_start := ((date_trunc('month', v_now) - INTERVAL '1 month')::DATE)::TEXT;
  v_last_month_end   := (date_trunc('month', v_now)::DATE - INTERVAL '1 day')::TEXT;

  RETURN (
    SELECT json_build_object('members', COALESCE(json_agg(row_to_json(t)), '[]'::JSON))
    FROM (
      WITH member_list AS (
        SELECT gm.user_id, gm.role, p.display_name, p.email,
          COALESCE(gs.sharing_enabled, false) AS sharing_enabled, gs.shared_project_ids
        FROM group_members gm
        JOIN profiles p ON p.id = gm.user_id
        LEFT JOIN group_sharing_settings gs ON gs.group_id = gm.group_id AND gs.user_id = gm.user_id
        WHERE gm.group_id = p_group_id
      ),
      stats AS (
        SELECT te.user_id,
          SUM(CASE WHEN te.date >= v_week_start       THEN te.duration ELSE 0 END) / 3600000.0 AS current_week,
          SUM(CASE WHEN te.date >= v_last_week_start AND te.date <= v_last_week_end THEN te.duration ELSE 0 END) / 3600000.0 AS last_week,
          SUM(CASE WHEN te.date >= v_month_start      THEN te.duration ELSE 0 END) / 3600000.0 AS current_month,
          SUM(CASE WHEN te.date >= v_last_month_start AND te.date <= v_last_month_end THEN te.duration ELSE 0 END) / 3600000.0 AS last_month
        FROM time_entries te
        JOIN member_list ml ON ml.user_id = te.user_id
        WHERE ml.sharing_enabled = true AND te.date >= v_last_month_start AND te.deleted_at IS NULL
          AND (ml.shared_project_ids IS NULL OR te.project_id = ANY(ml.shared_project_ids))
        GROUP BY te.user_id
      )
      SELECT ml.user_id, COALESCE(ml.display_name, ml.email) AS display_name, ml.email, ml.role,
        ml.sharing_enabled,
        COALESCE(s.current_week,  0) AS current_week_hours,
        COALESCE(s.last_week,     0) AS last_week_hours,
        COALESCE(s.current_month, 0) AS current_month_hours,
        COALESCE(s.last_month,    0) AS last_month_hours
      FROM member_list ml
      LEFT JOIN stats s ON s.user_id = ml.user_id
      ORDER BY ml.role DESC, ml.display_name NULLS LAST, ml.email
    ) t
  );
END;
$$;

-- User's own stats (025)
CREATE OR REPLACE FUNCTION get_user_own_stats(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_now        TIMESTAMPTZ := now();
  v_today      TEXT;
  v_week_start TEXT;
  v_month_start TEXT;
  v_result     JSON;
BEGIN
  v_today       := (v_now::DATE)::TEXT;
  v_week_start  := (date_trunc('week', v_now)::DATE)::TEXT;
  v_month_start := (date_trunc('month', v_now)::DATE)::TEXT;

  SELECT json_build_object(
    'today_hours', ROUND(COALESCE(SUM(CASE WHEN date = v_today       THEN duration ELSE 0 END) / 3600000.0, 0)::NUMERIC, 2),
    'week_hours',  ROUND(COALESCE(SUM(CASE WHEN date >= v_week_start  THEN duration ELSE 0 END) / 3600000.0, 0)::NUMERIC, 2),
    'month_hours', ROUND(COALESCE(SUM(CASE WHEN date >= v_month_start THEN duration ELSE 0 END) / 3600000.0, 0)::NUMERIC, 2)
  ) INTO v_result
  FROM time_entries
  WHERE user_id = p_user_id AND date >= v_month_start AND deleted_at IS NULL;

  RETURN v_result;
END;
$$;


-- --------------------------------------------------------
-- Conditional sync check (022)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION has_changes_since(p_user_id UUID, p_since TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM time_entries WHERE user_id = p_user_id AND updated_at > p_since
    UNION ALL
    SELECT 1 FROM projects WHERE user_id = p_user_id AND updated_at > p_since
    UNION ALL
    SELECT 1 FROM tags WHERE user_id = p_user_id AND updated_at > p_since
    UNION ALL
    SELECT 1 FROM user_settings WHERE user_id = p_user_id AND updated_at > p_since
    LIMIT 1
  );
$$;


-- --------------------------------------------------------
-- Earnings report: tag-based + project-based (024 — final)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_earnings_report(
  p_user_id    uuid,
  p_date_from  TEXT DEFAULT NULL,
  p_date_to    TEXT DEFAULT NULL,
  p_group_by   TEXT DEFAULT 'tag'
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result         json;
  v_from_date    date;
  v_to_date      date;
  v_currency     text;
  v_default_rate numeric;
  v_min_duration bigint;
BEGIN
  v_from_date := CASE WHEN p_date_from IS NOT NULL THEN p_date_from::date ELSE NULL END;
  v_to_date   := CASE WHEN p_date_to   IS NOT NULL THEN p_date_to::date   ELSE NULL END;

  SELECT
    COALESCE(us.default_hourly_rate, 0),
    COALESCE(us.currency, 'USD'),
    COALESCE(us.min_billable_minutes, 1) * 60000
  INTO v_default_rate, v_currency, v_min_duration
  FROM user_settings us WHERE us.user_id = p_user_id;

  IF v_default_rate IS NULL THEN v_default_rate := 0; END IF;
  IF v_currency IS NULL THEN v_currency := 'USD'; END IF;
  IF v_min_duration IS NULL THEN v_min_duration := 60000; END IF;

  IF p_group_by = 'tag' THEN
    SELECT json_build_object(
      'currency', v_currency, 'default_rate', v_default_rate, 'group_by', 'tag',
      'items', (
        SELECT COALESCE(json_agg(json_build_object(
          'id', sub.tag_id, 'name', sub.tag_name, 'color', sub.tag_color,
          'hours', sub.hours, 'rate', sub.effective_rate, 'total', sub.total
        ) ORDER BY sub.total DESC NULLS LAST), '[]'::json)
        FROM (
          SELECT t.id AS tag_id, t.name AS tag_name, t.color AS tag_color,
            round(COALESCE(sum(te.duration) / 3600000.0, 0), 2) AS hours,
            COALESCE(t.hourly_rate, v_default_rate) AS effective_rate,
            round(COALESCE(sum(te.duration) / 3600000.0, 0) * COALESCE(t.hourly_rate, v_default_rate), 2) AS total
          FROM tags t
          LEFT JOIN time_entries te
            ON t.id = ANY(te.tags) AND te.user_id = p_user_id AND te.deleted_at IS NULL
            AND te.duration >= v_min_duration
            AND (v_from_date IS NULL OR te.date::date >= v_from_date)
            AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
          WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND t.earnings_enabled = true
          GROUP BY t.id, t.name, t.color, t.hourly_rate
        ) sub
      ),
      'grand_total', (
        SELECT COALESCE(round(sum((te.duration / 3600000.0) * COALESCE(t.hourly_rate, v_default_rate)), 2), 0)
        FROM time_entries te
        CROSS JOIN LATERAL unnest(te.tags) AS utag_id
        JOIN tags t ON t.id = utag_id AND t.deleted_at IS NULL AND t.earnings_enabled = true
        WHERE te.user_id = p_user_id AND te.deleted_at IS NULL AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
      ),
      'total_hours', (
        SELECT COALESCE(round(sum(te.duration) / 3600000.0, 2), 0)
        FROM time_entries te
        CROSS JOIN LATERAL unnest(te.tags) AS utag_id
        JOIN tags t ON t.id = utag_id AND t.deleted_at IS NULL AND t.earnings_enabled = true
        WHERE te.user_id = p_user_id AND te.deleted_at IS NULL AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
      ),
      'total_items', (
        SELECT count(*) FROM tags t WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND t.earnings_enabled = true
      ),
      'daily_earnings', (
        SELECT COALESCE(json_agg(json_build_object(
          'date', sub.day, 'item_id', sub.tag_id, 'item_name', sub.tag_name,
          'item_color', sub.tag_color, 'total', sub.day_total
        ) ORDER BY sub.day, sub.tag_name), '[]'::json)
        FROM (
          SELECT te.date::date AS day, t.id AS tag_id, t.name AS tag_name, t.color AS tag_color,
            round(sum((te.duration / 3600000.0) * COALESCE(t.hourly_rate, v_default_rate)), 2) AS day_total
          FROM time_entries te
          CROSS JOIN LATERAL unnest(te.tags) AS utag_id
          JOIN tags t ON t.id = utag_id AND t.deleted_at IS NULL AND t.earnings_enabled = true
          WHERE te.user_id = p_user_id AND te.deleted_at IS NULL AND te.duration >= v_min_duration
            AND (v_from_date IS NULL OR te.date::date >= v_from_date)
            AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
          GROUP BY te.date::date, t.id, t.name, t.color
        ) sub
      )
    ) INTO result;
  ELSE
    -- Project-based earnings (backward compatible)
    SELECT json_build_object(
      'currency', v_currency, 'default_rate', v_default_rate, 'group_by', 'project',
      'items', (
        SELECT COALESCE(json_agg(json_build_object(
          'id', sub.project_id, 'name', sub.project_name, 'color', sub.project_color,
          'hours', sub.hours, 'rate', sub.effective_rate, 'total', sub.total
        ) ORDER BY sub.total DESC NULLS LAST), '[]'::json)
        FROM (
          SELECT p.id AS project_id, p.name AS project_name, p.color AS project_color,
            round(COALESCE(sum(te.duration) / 3600000.0, 0), 2) AS hours,
            COALESCE(p.hourly_rate, v_default_rate) AS effective_rate,
            round(COALESCE(sum(te.duration) / 3600000.0, 0) * COALESCE(p.hourly_rate, v_default_rate), 2) AS total
          FROM projects p
          LEFT JOIN time_entries te
            ON te.project_id = p.id AND te.user_id = p_user_id AND te.deleted_at IS NULL
            AND te.duration >= v_min_duration
            AND (v_from_date IS NULL OR te.date::date >= v_from_date)
            AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
          WHERE p.user_id = p_user_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
          GROUP BY p.id, p.name, p.color, p.hourly_rate
        ) sub
      ),
      'grand_total', (
        SELECT COALESCE(round(sum(COALESCE(te.duration / 3600000.0, 0) * COALESCE(p.hourly_rate, v_default_rate)), 2), 0)
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
        WHERE te.user_id = p_user_id AND te.deleted_at IS NULL AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
      ),
      'total_hours', (
        SELECT COALESCE(round(sum(te.duration) / 3600000.0, 2), 0)
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
        WHERE te.user_id = p_user_id AND te.deleted_at IS NULL AND te.duration >= v_min_duration
          AND (v_from_date IS NULL OR te.date::date >= v_from_date)
          AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
      ),
      'total_items', (
        SELECT count(*) FROM projects p
        WHERE p.user_id = p_user_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
      ),
      'daily_earnings', (
        SELECT COALESCE(json_agg(json_build_object(
          'date', sub.day, 'item_id', sub.project_id, 'item_name', sub.project_name,
          'item_color', sub.project_color, 'total', sub.day_total
        ) ORDER BY sub.day, sub.project_name), '[]'::json)
        FROM (
          SELECT te.date::date AS day, p.id AS project_id, p.name AS project_name, p.color AS project_color,
            round(sum((te.duration / 3600000.0) * COALESCE(p.hourly_rate, v_default_rate)), 2) AS day_total
          FROM time_entries te
          JOIN projects p ON p.id = te.project_id AND p.deleted_at IS NULL AND p.earnings_enabled = true
          WHERE te.user_id = p_user_id AND te.deleted_at IS NULL AND te.duration >= v_min_duration
            AND (v_from_date IS NULL OR te.date::date >= v_from_date)
            AND (v_to_date   IS NULL OR te.date::date <= v_to_date)
          GROUP BY te.date::date, p.id, p.name, p.color
        ) sub
      )
    ) INTO result;
  END IF;

  RETURN result;
END;
$$;


-- --------------------------------------------------------
-- Export quota functions (031 + 032 — final)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_export_role(p_user_id uuid)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan TEXT;
  v_role TEXT;
BEGIN
  SELECT s.plan INTO v_plan
  FROM subscriptions s WHERE s.user_id = p_user_id AND s.status IN ('active', 'trialing');
  IF v_plan IS NULL THEN RETURN 'free'; END IF;
  SELECT pr.role_name INTO v_role FROM plan_roles pr WHERE pr.plan = v_plan;
  RETURN COALESCE(v_role, 'free');
END;
$$;

CREATE OR REPLACE FUNCTION track_export_usage(p_user_id uuid, p_export_type text, p_year_month text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role      TEXT;
  v_limit     INT;
  v_current   INT;
  v_new_count INT;
BEGIN
  v_role := get_user_export_role(p_user_id);
  SELECT rel.monthly_limit INTO v_limit FROM role_export_limits rel
  WHERE rel.role_name = v_role AND rel.export_type = p_export_type;

  IF v_limit IS NULL THEN
    RETURN json_build_object('allowed', false, 'used', 0, 'limit', 0, 'error', 'Unknown export type or role');
  END IF;

  INSERT INTO export_usage (user_id, export_type, year_month, count)
  VALUES (p_user_id, p_export_type, p_year_month, 0)
  ON CONFLICT (user_id, export_type, year_month) DO NOTHING;

  SELECT eu.count INTO v_current FROM export_usage eu
  WHERE eu.user_id = p_user_id AND eu.export_type = p_export_type AND eu.year_month = p_year_month
  FOR UPDATE;

  IF v_current >= v_limit THEN
    RETURN json_build_object('allowed', false, 'used', v_current, 'limit', v_limit);
  END IF;

  UPDATE export_usage SET count = count + 1
  WHERE user_id = p_user_id AND export_type = p_export_type AND year_month = p_year_month;
  v_new_count := v_current + 1;

  RETURN json_build_object('allowed', true, 'used', v_new_count, 'limit', v_limit);
END;
$$;

CREATE OR REPLACE FUNCTION get_user_export_quota(p_user_id uuid, p_year_month text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
  v_role := get_user_export_role(p_user_id);
  RETURN (
    SELECT json_agg(row_to_json(q) ORDER BY q.export_type)
    FROM (
      SELECT rel.export_type, rel.monthly_limit AS "limit",
        COALESCE(eu.count, 0) AS "used",
        GREATEST(rel.monthly_limit - COALESCE(eu.count, 0), 0) AS "remaining"
      FROM role_export_limits rel
      LEFT JOIN export_usage eu
        ON eu.user_id = p_user_id AND eu.export_type = rel.export_type AND eu.year_month = p_year_month
      WHERE rel.role_name = v_role
    ) q
  );
END;
$$;


-- --------------------------------------------------------
-- Email log aggregations (036)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_daily_email_counts(p_days INTEGER DEFAULT 30)
RETURNS TABLE(day DATE, sent BIGINT, failed BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DATE(created_at) AS day,
    COUNT(*) FILTER (WHERE status = 'sent') AS sent,
    COUNT(*) FILTER (WHERE status != 'sent') AS failed
  FROM email_logs
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at) ORDER BY day;
$$;

CREATE OR REPLACE FUNCTION get_email_count_by_type()
RETURNS TABLE(type TEXT, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT type, COUNT(*) AS count FROM email_logs GROUP BY type ORDER BY count DESC;
$$;


-- --------------------------------------------------------
-- Today total duration — server-side aggregation (038)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION get_today_total_duration(p_user_id UUID, p_date TEXT)
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(SUM(duration), 0)::BIGINT
  FROM time_entries
  WHERE user_id = p_user_id AND date = p_date AND deleted_at IS NULL;
$$;


-- --------------------------------------------------------
-- API quota functions (039)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION check_api_quota(
  p_user_id       uuid,
  p_resource_type text,
  p_year_month    text
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role    TEXT;
  v_limit   INT;
  v_current INT;
BEGIN
  v_role := get_user_export_role(p_user_id);
  SELECT aql.monthly_limit INTO v_limit FROM api_quota_limits aql
  WHERE aql.role_name = v_role AND aql.resource_type = p_resource_type;

  IF v_limit IS NULL THEN
    RETURN json_build_object('allowed', true, 'used', 0, 'limit', -1, 'remaining', -1);
  END IF;

  INSERT INTO api_quota_usage (user_id, resource_type, year_month, count)
  VALUES (p_user_id, p_resource_type, p_year_month, 0)
  ON CONFLICT (user_id, resource_type, year_month) DO NOTHING;

  SELECT aqu.count INTO v_current FROM api_quota_usage aqu
  WHERE aqu.user_id = p_user_id AND aqu.resource_type = p_resource_type AND aqu.year_month = p_year_month
  FOR UPDATE;

  IF v_current >= v_limit THEN
    RETURN json_build_object('allowed', false, 'used', v_current, 'limit', v_limit, 'remaining', 0);
  END IF;

  UPDATE api_quota_usage SET count = count + 1
  WHERE user_id = p_user_id AND resource_type = p_resource_type AND year_month = p_year_month;

  RETURN json_build_object('allowed', true, 'used', v_current + 1, 'limit', v_limit, 'remaining', v_limit - v_current - 1);
END;
$$;

CREATE OR REPLACE FUNCTION get_user_api_quotas(p_user_id uuid, p_year_month text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
  v_role := get_user_export_role(p_user_id);
  RETURN (
    SELECT json_agg(row_to_json(q) ORDER BY q.resource_type)
    FROM (
      SELECT aql.resource_type, aql.monthly_limit AS "limit",
        COALESCE(aqu.count, 0) AS "used",
        GREATEST(aql.monthly_limit - COALESCE(aqu.count, 0), 0) AS "remaining"
      FROM api_quota_limits aql
      LEFT JOIN api_quota_usage aqu
        ON aqu.user_id = p_user_id AND aqu.resource_type = aql.resource_type AND aqu.year_month = p_year_month
      WHERE aql.role_name = v_role
    ) q
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_all_api_quota_limits()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_agg(row_to_json(aql) ORDER BY aql.resource_type, aql.role_name) FROM api_quota_limits aql;
$$;

CREATE OR REPLACE FUNCTION upsert_api_quota_limit(p_role_name text, p_resource_type text, p_monthly_limit int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO api_quota_limits (role_name, resource_type, monthly_limit)
  VALUES (p_role_name, p_resource_type, p_monthly_limit)
  ON CONFLICT (role_name, resource_type) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit;
END;
$$;


-- --------------------------------------------------------
-- User signup handler (034 — final: includes domain whitelist)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_whitelisted_plan text;
BEGIN
  SELECT plan INTO v_whitelisted_plan
  FROM whitelisted_domains
  WHERE active = true AND domain = split_part(NEW.email, '@', 2)
  LIMIT 1;

  IF v_whitelisted_plan IS NOT NULL THEN
    INSERT INTO subscriptions (user_id, plan, status, granted_by, updated_at)
    VALUES (NEW.id, v_whitelisted_plan, 'active', 'domain', now())
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO subscriptions (user_id, plan, status, updated_at)
    VALUES (NEW.id, 'free', 'active', now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- SECTION 7: TRIGGERS
-- ============================================================

-- Auto-timestamp triggers (037)
DROP TRIGGER IF EXISTS trg_time_entries_updated_at ON time_entries;
CREATE TRIGGER trg_time_entries_updated_at
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tags_updated_at ON tags;
CREATE TRIGGER trg_tags_updated_at
  BEFORE INSERT OR UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE INSERT OR UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- New user subscription (033 + 034)
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();


-- ============================================================
-- SECTION 8: REVOKE PUBLIC EXECUTE (security hardening)
-- ============================================================

-- Export quota RPCs: service role only (031/032)
REVOKE EXECUTE ON FUNCTION get_user_export_role(uuid)           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION track_export_usage(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_export_quota(uuid, text)    FROM PUBLIC;

-- API quota RPCs: service role only (039)
REVOKE EXECUTE ON FUNCTION check_api_quota(uuid, text, text)       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_api_quotas(uuid, text)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_all_api_quota_limits()              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION upsert_api_quota_limit(text, text, int) FROM PUBLIC;
