-- 047_realtime_io_reduction.sql
-- Disk IO Budget reduction. Investigation (pg_stat_statements) showed the
-- dominant cost is Realtime WAL decoding (5M+ poll calls) fed by writes to
-- PUBLISHED tables, plus per-row RLS re-evaluation. Three safe, no-UX-impact
-- changes:
--   1. Drop tables from the realtime publication that NO client subscribes to
--      (they're polled/fetched via REST). Their WAL was decoded for nobody.
--   2. Rewrite *_rt_select RLS policies to wrap auth.jwt() in (select ...) so it
--      is evaluated ONCE per query instead of once per row (identical logic).
--   3. Drop redundant/unused indexes (write amplification). Scope-composite
--      indexes are KEPT (primary query path as data grows).

-- ── 1. Realtime publication: drop tables with no client subscriber ──
-- presence: clients POLL fetchOnlineUsers (no postgres_changes). Top WAL writer.
-- announcements/purchase_requests/invoice_counter/scope_feature_flags: REST only.
ALTER PUBLICATION supabase_realtime DROP TABLE public.presence;
ALTER PUBLICATION supabase_realtime DROP TABLE public.announcements;
ALTER PUBLICATION supabase_realtime DROP TABLE public.purchase_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.invoice_counter;
ALTER PUBLICATION supabase_realtime DROP TABLE public.scope_feature_flags;

-- ── 2. RLS init-plan: (select auth.jwt()) — evaluate once per query ──
-- Scope-only policies.
ALTER POLICY announcements_rt_select ON public.announcements USING (
  (semester = (((select auth.jwt()) ->> 'semester'))::integer)
  AND (exam_period = ((select auth.jwt()) ->> 'exam_period'))
  AND (jurusan = ((select auth.jwt()) ->> 'jurusan'))
);
ALTER POLICY chat_messages_rt_select ON public.chat_messages USING (
  (semester = (((select auth.jwt()) ->> 'semester'))::integer)
  AND (exam_period = ((select auth.jwt()) ->> 'exam_period'))
  AND (jurusan = ((select auth.jwt()) ->> 'jurusan'))
);
ALTER POLICY forum_comments_rt_select ON public.forum_comments USING (
  (semester = (((select auth.jwt()) ->> 'semester'))::integer)
  AND (exam_period = ((select auth.jwt()) ->> 'exam_period'))
  AND (jurusan = ((select auth.jwt()) ->> 'jurusan'))
);
ALTER POLICY forum_threads_rt_select ON public.forum_threads USING (
  (semester = (((select auth.jwt()) ->> 'semester'))::integer)
  AND (exam_period = ((select auth.jwt()) ->> 'exam_period'))
  AND (jurusan = ((select auth.jwt()) ->> 'jurusan'))
);
ALTER POLICY pinned_messages_rt_select ON public.pinned_messages USING (
  (semester = (((select auth.jwt()) ->> 'semester'))::integer)
  AND (exam_period = ((select auth.jwt()) ->> 'exam_period'))
  AND (jurusan = ((select auth.jwt()) ->> 'jurusan'))
);
ALTER POLICY presence_rt_select ON public.presence USING (
  (semester = (((select auth.jwt()) ->> 'semester'))::integer)
  AND (exam_period = ((select auth.jwt()) ->> 'exam_period'))
  AND (jurusan = ((select auth.jwt()) ->> 'jurusan'))
);
ALTER POLICY scope_feature_flags_rt_select ON public.scope_feature_flags USING (
  (semester = (((select auth.jwt()) ->> 'semester'))::integer)
  AND (exam_period = ((select auth.jwt()) ->> 'exam_period'))
  AND (jurusan = ((select auth.jwt()) ->> 'jurusan'))
);
ALTER POLICY voice_participants_rt_select ON public.voice_participants USING (
  (semester = (((select auth.jwt()) ->> 'semester'))::integer)
  AND (exam_period = ((select auth.jwt()) ->> 'exam_period'))
  AND (jurusan = ((select auth.jwt()) ->> 'jurusan'))
);

-- Per-user policies.
ALTER POLICY notifications_rt_select ON public.notifications USING (
  license_key = ((select auth.jwt()) ->> 'license_key')
);
ALTER POLICY user_settings_rt_select ON public.user_settings USING (
  license_key = ((select auth.jwt()) ->> 'license_key')
);

-- DM participant check.
ALTER POLICY dm_messages_rt_select ON public.dm_messages USING (
  dm_is_participant(conversation_id, ((select auth.jwt()) ->> 'license_key'))
);

-- Admin-or-owner support policies.
ALTER POLICY support_messages_rt_select ON public.support_messages USING (
  (license_key = ((select auth.jwt()) ->> 'license_key'))
  OR COALESCE((((select auth.jwt()) ->> 'is_admin'))::boolean, false)
);
ALTER POLICY support_pinned_messages_rt_select ON public.support_pinned_messages USING (
  (license_key = ((select auth.jwt()) ->> 'license_key'))
  OR COALESCE((((select auth.jwt()) ->> 'is_admin'))::boolean, false)
);
ALTER POLICY support_reactions_rt_select ON public.support_reactions USING (
  (license_key = ((select auth.jwt()) ->> 'license_key'))
  OR COALESCE((((select auth.jwt()) ->> 'is_admin'))::boolean, false)
);
ALTER POLICY support_read_receipts_rt_select ON public.support_read_receipts USING (
  (license_key = ((select auth.jwt()) ->> 'license_key'))
  OR COALESCE((((select auth.jwt()) ->> 'is_admin'))::boolean, false)
);
ALTER POLICY support_mutes_rt_select ON public.support_mutes USING (
  (recipient_lk = ((select auth.jwt()) ->> 'license_key'))
  OR COALESCE((((select auth.jwt()) ->> 'is_admin'))::boolean, false)
);

-- Admin-only / admin+scope.
ALTER POLICY invoice_counter_rt_select ON public.invoice_counter USING (
  COALESCE((((select auth.jwt()) ->> 'is_admin'))::boolean, false)
);
ALTER POLICY purchase_requests_rt_select ON public.purchase_requests USING (
  COALESCE((((select auth.jwt()) ->> 'is_admin'))::boolean, false)
  AND (semester = (((select auth.jwt()) ->> 'semester'))::integer)
  AND (exam_period = ((select auth.jwt()) ->> 'exam_period'))
  AND (jurusan = ((select auth.jwt()) ->> 'jurusan'))
);

-- ── 3. Drop redundant / unused indexes (write amplification) ──
-- Kept on purpose (scale query paths): idx_forum_threads_scope_subject_created,
-- idx_forum_comments_scope_thread_created, idx_support_messages_scope_key_created,
-- idx_announcements_scope_active.
DROP INDEX IF EXISTS public.idx_support_messages_content_trgm;          -- GIN, search feature unused
DROP INDEX IF EXISTS public.idx_support_messages_reply_to;
DROP INDEX IF EXISTS public.idx_support_messages_key_created_active;    -- redundant w/ idx_support_messages_key
DROP INDEX IF EXISTS public.idx_chat_messages_reply_to_id;
DROP INDEX IF EXISTS public.idx_chat_read_positions_last_read_message_id;
DROP INDEX IF EXISTS public.idx_forum_comments_parent_comment_id;
DROP INDEX IF EXISTS public.idx_forum_comments_thread_created;          -- redundant w/ scope_thread_created
DROP INDEX IF EXISTS public.idx_dm_messages_sender_key;
DROP INDEX IF EXISTS public.idx_voice_participants_room;               -- redundant w/ uq_voice_participants_room_license
DROP INDEX IF EXISTS public.idx_announcements_created_at_desc;          -- redundant w/ scope_active
