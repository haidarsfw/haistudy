-- Drop duplicate indexes flagged by Supabase performance advisor.
-- All three pairs are verified identical (same table, columns, order) via pg_indexes.
-- Keeping the newer composite / _desc variants introduced in migration 014.
DROP INDEX IF EXISTS public.idx_chat_messages_created_at;       -- kept: idx_chat_messages_created_at_desc
DROP INDEX IF EXISTS public.idx_forum_comments_thread;          -- kept: idx_forum_comments_thread_created
DROP INDEX IF EXISTS public.idx_forum_threads_subject;          -- kept: idx_forum_threads_subject_created
