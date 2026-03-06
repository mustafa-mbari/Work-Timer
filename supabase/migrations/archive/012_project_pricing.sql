-- Migration 012: Project Hourly Pricing
-- Adds hourly_rate to projects and default_hourly_rate + currency to user_settings

ALTER TABLE projects ADD COLUMN hourly_rate NUMERIC;

ALTER TABLE user_settings ADD COLUMN default_hourly_rate NUMERIC;
ALTER TABLE user_settings ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

CREATE INDEX idx_projects_user_hourly_rate ON projects(user_id, hourly_rate);
