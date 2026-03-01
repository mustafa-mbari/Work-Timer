-- Email logs table for tracking all transactional emails sent by the application
CREATE TABLE email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  message_id TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_email_logs_created_at ON email_logs (created_at DESC);
CREATE INDEX idx_email_logs_type ON email_logs (type);
CREATE INDEX idx_email_logs_recipient ON email_logs (recipient);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
