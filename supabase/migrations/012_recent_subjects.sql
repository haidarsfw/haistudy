-- Add recent_subjects column for "Lanjut Belajar" dashboard feature
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS recent_subjects text[] DEFAULT '{}';
