-- ============================================
-- 031 — Chat message type constraint + drop sticker
-- ============================================
-- Restricts chat_messages.type to ('text','image','audio') and removes the
-- legacy sticker feature column. Drop the old constraint first if present
-- so re-running stays idempotent.

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_type_check;
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_type_check CHECK (type IN ('text','image','audio'));

ALTER TABLE chat_messages DROP COLUMN IF EXISTS sticker_url;
