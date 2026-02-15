-- Stripe webhook idempotency table.
-- Stores processed event IDs to prevent duplicate processing.

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup old events (older than 30 days) via a simple index for queries
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed_at);
