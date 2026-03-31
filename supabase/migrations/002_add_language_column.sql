-- Add language column to user_settings (was missing from initial schema)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'id';
