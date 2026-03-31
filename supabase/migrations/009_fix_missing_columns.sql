-- ============================================
-- Fix missing columns, defaults, and constraints
-- ============================================

-- 1. Add package_tier to chat_messages (fixes chat 500 error)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS package_tier text;

-- 2. Add missing columns to forum_threads
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS is_tester boolean NOT NULL DEFAULT false;
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS package_tier text;

-- 3. Add missing columns to forum_comments
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS is_tester boolean NOT NULL DEFAULT false;
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS package_tier text;
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS image_url text;

-- 4. Fix user_settings defaults to dark mode + forest theme
ALTER TABLE user_settings ALTER COLUMN dark_mode SET DEFAULT true;
ALTER TABLE user_settings ALTER COLUMN theme SET DEFAULT 'forest';
ALTER TABLE user_settings ALTER COLUMN font SET DEFAULT 'jakarta';

-- 5. Fix notification type CHECK constraint (allow new types from Phase 5)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('mention', 'mention_all', 'thread_reply', 'announcement', 'forum_thread', 'poll_vote', 'poll_result', 'comment_reply'));

-- 6. Fix notification context CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_context_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_context_check
  CHECK (context IN ('chat', 'forum', 'system'));

-- 7. Add unique constraint for voice participants (fixes race condition)
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_participants_room_license
  ON voice_participants(room_id, license_key);

-- 8. Utility function for atomic field increments
CREATE OR REPLACE FUNCTION increment_license_field(p_key text, p_field text, p_amount integer)
RETURNS void AS $$
BEGIN
  EXECUTE format('UPDATE license_keys SET %I = %I + $1, updated_at = now() WHERE key = $2', p_field, p_field)
  USING p_amount, p_key;
END;
$$ LANGUAGE plpgsql;
