-- Add reminder column to user_settings for settings sync support
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS reminder jsonb
DEFAULT '{"enabled":true,"dayOfWeek":5,"hour":14,"minute":0}'::jsonb;
