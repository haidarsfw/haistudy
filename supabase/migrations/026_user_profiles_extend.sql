-- ============================================
-- 026 — User profile fields (avatar, bio, status)
-- ============================================
-- Extends user_profiles with public-facing profile data.
-- bio <= 200 chars, custom_status <= 80, custom_status_emoji <= 8.
-- Idempotent.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url          text,
  ADD COLUMN IF NOT EXISTS bio                 text,
  ADD COLUMN IF NOT EXISTS custom_status       text,
  ADD COLUMN IF NOT EXISTS custom_status_emoji text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_bio_len') THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_bio_len
      CHECK (char_length(COALESCE(bio, '')) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_status_len') THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_status_len
      CHECK (char_length(COALESCE(custom_status, '')) <= 80);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_emoji_len') THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_emoji_len
      CHECK (char_length(COALESCE(custom_status_emoji, '')) <= 8);
  END IF;
END $$;
