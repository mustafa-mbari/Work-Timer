-- Webhook event logging for monitoring and debugging
CREATE TABLE webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',  -- success | error | signature_failed
  error_message TEXT,
  user_id TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);

-- No RLS needed — only service role writes, admin reads via service role
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
-- No policies = only service role can access
