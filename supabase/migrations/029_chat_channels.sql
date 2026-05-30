-- ============================================
-- 029 — Chat channels (global + vip-lounge)
-- ============================================
-- Adds channel discriminator to chat_messages: 'global' (everyone) and
-- 'vip-lounge' (VIP/admin only, gated in API). Default 'global' keeps
-- existing rows valid. Scope+channel composite index for room queries.
-- Idempotent.

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'global';

CREATE INDEX IF NOT EXISTS idx_chat_messages_scope_channel_created
  ON chat_messages (semester, exam_period, jurusan, channel, created_at DESC);
