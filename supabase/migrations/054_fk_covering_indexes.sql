-- 054_fk_covering_indexes.sql
-- Add covering indexes for foreign keys flagged by the Supabase performance
-- advisor (lint 0001_unindexed_foreign_keys). Without a covering index, FK
-- lookups (joins, cascade deletes, reverse references) fall back to seq scans.
-- All additive + idempotent. Tables are small so a plain CREATE INDEX is
-- instant (no CONCURRENTLY needed, which can't run inside a migration tx).
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_chat_messages_reply_to_id;
--   DROP INDEX IF EXISTS public.idx_chat_read_positions_last_read_msg_id;
--   DROP INDEX IF EXISTS public.idx_dm_messages_sender_key;
--   DROP INDEX IF EXISTS public.idx_forum_comments_parent_comment_id;
--   DROP INDEX IF EXISTS public.idx_forum_comments_thread_id;
--   DROP INDEX IF EXISTS public.idx_support_messages_reply_to_id;

CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_id            ON public.chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_read_positions_last_read_msg_id ON public.chat_read_positions(last_read_message_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender_key               ON public.dm_messages(sender_key);
CREATE INDEX IF NOT EXISTS idx_forum_comments_parent_comment_id     ON public.forum_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_thread_id             ON public.forum_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_reply_to_id         ON public.support_messages(reply_to_id);
