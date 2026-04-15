-- Part D1 — Performance indexes for hot query paths (Vercel Pro / Supabase Pro).
--
-- Adds indexes for the four most-read / paginated query patterns that currently
-- rely on sequential scans + sort. Follows the 013 pattern: `IF NOT EXISTS`,
-- no `CONCURRENTLY` (Supabase migrations run inside a transaction).
--
-- Query-pattern mapping:
--   chat_messages   : ORDER BY created_at DESC LIMIT N (+ WHERE created_at < before)
--                     → src/app/api/chat/messages/route.ts:115
--   forum_threads   : WHERE subject_id = X ORDER BY created_at DESC
--                     → src/app/api/forum/threads/route.ts:37-38
--   forum_comments  : WHERE thread_id = X ORDER BY created_at ASC
--                     → src/app/api/forum/comments/route.ts:37-38
--   notifications   : WHERE license_key = X AND read = false  (unread count)
--                     → src/app/api/notifications/route.ts:168-171
--   pinned_messages : ORDER BY pinned_at DESC
--                     → src/app/api/chat/pins/route.ts:24

-- Chat: global ORDER BY created_at DESC + cursor pagination on created_at.
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at_desc
  ON public.chat_messages (created_at DESC);

-- Forum threads: WHERE subject_id = X ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_forum_threads_subject_created
  ON public.forum_threads (subject_id, created_at DESC);

-- Forum comments: WHERE thread_id = X ORDER BY created_at ASC.
CREATE INDEX IF NOT EXISTS idx_forum_comments_thread_created
  ON public.forum_comments (thread_id, created_at);

-- Notifications: partial index for the hot unread-count path.
-- Tiny footprint (only unread rows), cheap to maintain — matches the
-- `mark all as read` query `.eq("license_key", X).eq("read", false)`.
CREATE INDEX IF NOT EXISTS idx_notifications_license_unread
  ON public.notifications (license_key)
  WHERE read = false;

-- Pinned messages: ORDER BY pinned_at DESC.
CREATE INDEX IF NOT EXISTS idx_pinned_messages_pinned_at_desc
  ON public.pinned_messages (pinned_at DESC);

-- ────────────────────────────────────────────────────────────────────
-- Foreign-key covering indexes (flagged by Supabase performance advisor,
-- lint 0001_unindexed_foreign_keys). Helps cascade operations + joins.
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_bookmarks_license_key
  ON public.bookmarks (license_key);

CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_id
  ON public.chat_messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_read_positions_last_read_message_id
  ON public.chat_read_positions (last_read_message_id);

CREATE INDEX IF NOT EXISTS idx_forum_comments_parent_comment_id
  ON public.forum_comments (parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_referred_key
  ON public.referrals (referred_key);
