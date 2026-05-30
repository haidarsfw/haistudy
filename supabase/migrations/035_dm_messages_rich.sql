-- 035_dm_messages_rich.sql
-- Brings dm_messages to feature parity with chat_messages so DMs can carry
-- images, voice notes, replies, soft-deletes and pins (issue 6). dm_messages
-- is already in the Realtime publication, so the new columns stream to peers
-- automatically. sender_name is denormalized so the bubble can render without
-- an extra profile lookup. Pin is per-conversation (either participant).
ALTER TABLE dm_messages
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid,
  ADD COLUMN IF NOT EXISTS reply_to_name text,
  ADD COLUMN IF NOT EXISTS reply_to_body text,
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
