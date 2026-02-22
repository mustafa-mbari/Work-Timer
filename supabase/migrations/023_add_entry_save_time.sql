-- Add configurable minimum entry duration (in seconds)
-- Entries shorter than this threshold are discarded (not saved)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS entry_save_time integer DEFAULT 10;
