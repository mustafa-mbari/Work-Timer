-- Migration 030: Support Tickets & Feature Suggestions
-- Creates support_tickets and feature_suggestions tables

-- Support Tickets table
CREATE TABLE support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('bug', 'account', 'billing', 'sync', 'performance', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  platform TEXT NOT NULL CHECK (platform IN ('chrome_extension', 'web_app', 'both')) DEFAULT 'web_app',
  issue_time TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can see their own tickets
CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT USING (
  user_id = auth.uid()
);

-- Users can create their own tickets
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- Feature Suggestions table
CREATE TABLE feature_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('feature', 'improvement', 'integration', 'ui_ux', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  importance TEXT NOT NULL CHECK (importance IN ('nice_to_have', 'important', 'critical')) DEFAULT 'important',
  target_platform TEXT NOT NULL CHECK (target_platform IN ('chrome_extension', 'web_app', 'both')) DEFAULT 'both',
  notify_on_release BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('new', 'under_review', 'planned', 'in_progress', 'implemented', 'declined')) DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feature_suggestions_user ON feature_suggestions(user_id);
CREATE INDEX idx_feature_suggestions_status ON feature_suggestions(status);
CREATE INDEX idx_feature_suggestions_created ON feature_suggestions(created_at DESC);
CREATE INDEX idx_feature_suggestions_type ON feature_suggestions(suggestion_type);

ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can see their own suggestions
CREATE POLICY "feature_suggestions_select" ON feature_suggestions FOR SELECT USING (
  user_id = auth.uid()
);

-- Users can create their own suggestions
CREATE POLICY "feature_suggestions_insert" ON feature_suggestions FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
