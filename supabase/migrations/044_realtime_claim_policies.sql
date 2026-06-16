-- ============================================
-- 044 — Per-user / per-scope realtime RLS via JWT claims
-- ============================================
-- PREREQUISITE: the JWT-realtime code must be LIVE before applying this.
-- Clients send a Supabase-signed JWT (minted by /api/auth/realtime-token) with
-- claims: role=authenticated, license_key, semester, exam_period, jurusan,
-- is_admin. This replaces the USING(true) SELECT policies on the 18 published
-- tables with claim-scoped policies, so:
--   • anon-key REST dumps of dm_messages / notifications / support_* return nothing
--   • realtime delivers only the user's own rows (private) or own-scope rows (cohort)
--   • scope isolation becomes DB-enforced (was client-side filtering)
--
-- Rollback (if realtime regresses): re-grant anon SELECT on the 18 tables and
-- recreate the USING(true) policies (see bottom of file). Idempotent.
-- ============================================

-- ── DM participant check (SECURITY DEFINER to read dm_conversations cleanly) ──
CREATE OR REPLACE FUNCTION public.dm_is_participant(p_conversation_id uuid, p_license_key text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM dm_conversations c
    WHERE c.id = p_conversation_id
      AND p_license_key = ANY (c.participants)
  );
$$;
-- RLS policy evaluation needs EXECUTE as the querying role (authenticated):
REVOKE EXECUTE ON FUNCTION public.dm_is_participant(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.dm_is_participant(uuid, text) TO authenticated, service_role;

-- ── Per-user PRIVATE tables (owner = JWT license_key; admin sees all) ──
DROP POLICY IF EXISTS "Public read notifications" ON notifications;
CREATE POLICY notifications_rt_select ON notifications FOR SELECT TO authenticated
  USING (license_key = (auth.jwt() ->> 'license_key'));

-- user_settings had NO select policy (realtime sync was silently broken) — add one
DROP POLICY IF EXISTS user_settings_rt_select ON user_settings;
CREATE POLICY user_settings_rt_select ON user_settings FOR SELECT TO authenticated
  USING (license_key = (auth.jwt() ->> 'license_key'));

DROP POLICY IF EXISTS "Public read support_messages" ON support_messages;
CREATE POLICY support_messages_rt_select ON support_messages FOR SELECT TO authenticated
  USING (license_key = (auth.jwt() ->> 'license_key')
         OR coalesce((auth.jwt() ->> 'is_admin')::boolean, false));

DROP POLICY IF EXISTS "Public read support_reactions" ON support_reactions;
CREATE POLICY support_reactions_rt_select ON support_reactions FOR SELECT TO authenticated
  USING (license_key = (auth.jwt() ->> 'license_key')
         OR coalesce((auth.jwt() ->> 'is_admin')::boolean, false));

DROP POLICY IF EXISTS "Public read support_read_receipts" ON support_read_receipts;
CREATE POLICY support_read_receipts_rt_select ON support_read_receipts FOR SELECT TO authenticated
  USING (license_key = (auth.jwt() ->> 'license_key')
         OR coalesce((auth.jwt() ->> 'is_admin')::boolean, false));

DROP POLICY IF EXISTS "Public read support_pinned_messages" ON support_pinned_messages;
CREATE POLICY support_pinned_messages_rt_select ON support_pinned_messages FOR SELECT TO authenticated
  USING (license_key = (auth.jwt() ->> 'license_key')
         OR coalesce((auth.jwt() ->> 'is_admin')::boolean, false));

-- support_mutes keys the owner on recipient_lk (no license_key column)
DROP POLICY IF EXISTS "Public read support_mutes" ON support_mutes;
CREATE POLICY support_mutes_rt_select ON support_mutes FOR SELECT TO authenticated
  USING (recipient_lk = (auth.jwt() ->> 'license_key')
         OR coalesce((auth.jwt() ->> 'is_admin')::boolean, false));

-- DM: only conversation participants
DROP POLICY IF EXISTS "Allow select for all" ON dm_messages;
CREATE POLICY dm_messages_rt_select ON dm_messages FOR SELECT TO authenticated
  USING (public.dm_is_participant(conversation_id, (auth.jwt() ->> 'license_key')));

-- ── Cohort-SHARED tables (everyone in the same scope; DB-enforced isolation) ──
DROP POLICY IF EXISTS "Public read announcements" ON announcements;
CREATE POLICY announcements_rt_select ON announcements FOR SELECT TO authenticated
  USING (semester = (auth.jwt() ->> 'semester')::int
         AND exam_period = (auth.jwt() ->> 'exam_period')
         AND jurusan = (auth.jwt() ->> 'jurusan'));

DROP POLICY IF EXISTS "Public read chat_messages" ON chat_messages;
CREATE POLICY chat_messages_rt_select ON chat_messages FOR SELECT TO authenticated
  USING (semester = (auth.jwt() ->> 'semester')::int
         AND exam_period = (auth.jwt() ->> 'exam_period')
         AND jurusan = (auth.jwt() ->> 'jurusan'));

DROP POLICY IF EXISTS "Public read forum_comments" ON forum_comments;
CREATE POLICY forum_comments_rt_select ON forum_comments FOR SELECT TO authenticated
  USING (semester = (auth.jwt() ->> 'semester')::int
         AND exam_period = (auth.jwt() ->> 'exam_period')
         AND jurusan = (auth.jwt() ->> 'jurusan'));

DROP POLICY IF EXISTS "Public read forum_threads" ON forum_threads;
CREATE POLICY forum_threads_rt_select ON forum_threads FOR SELECT TO authenticated
  USING (semester = (auth.jwt() ->> 'semester')::int
         AND exam_period = (auth.jwt() ->> 'exam_period')
         AND jurusan = (auth.jwt() ->> 'jurusan'));

DROP POLICY IF EXISTS "Public read pinned_messages" ON pinned_messages;
CREATE POLICY pinned_messages_rt_select ON pinned_messages FOR SELECT TO authenticated
  USING (semester = (auth.jwt() ->> 'semester')::int
         AND exam_period = (auth.jwt() ->> 'exam_period')
         AND jurusan = (auth.jwt() ->> 'jurusan'));

DROP POLICY IF EXISTS "Public read presence" ON presence;
CREATE POLICY presence_rt_select ON presence FOR SELECT TO authenticated
  USING (semester = (auth.jwt() ->> 'semester')::int
         AND exam_period = (auth.jwt() ->> 'exam_period')
         AND jurusan = (auth.jwt() ->> 'jurusan'));

DROP POLICY IF EXISTS "Public read scope_feature_flags" ON scope_feature_flags;
CREATE POLICY scope_feature_flags_rt_select ON scope_feature_flags FOR SELECT TO authenticated
  USING (semester = (auth.jwt() ->> 'semester')::int
         AND exam_period = (auth.jwt() ->> 'exam_period')
         AND jurusan = (auth.jwt() ->> 'jurusan'));

DROP POLICY IF EXISTS "Public read voice_participants" ON voice_participants;
CREATE POLICY voice_participants_rt_select ON voice_participants FOR SELECT TO authenticated
  USING (semester = (auth.jwt() ->> 'semester')::int
         AND exam_period = (auth.jwt() ->> 'exam_period')
         AND jurusan = (auth.jwt() ->> 'jurusan'));

-- ── ADMIN-only realtime tables ──
DROP POLICY IF EXISTS "Allow select for realtime sync" ON invoice_counter;
CREATE POLICY invoice_counter_rt_select ON invoice_counter FOR SELECT TO authenticated
  USING (coalesce((auth.jwt() ->> 'is_admin')::boolean, false));

-- purchase_requests: in publication, had no SELECT policy (admin realtime). Add one.
DROP POLICY IF EXISTS purchase_requests_rt_select ON purchase_requests;
CREATE POLICY purchase_requests_rt_select ON purchase_requests FOR SELECT TO authenticated
  USING (coalesce((auth.jwt() ->> 'is_admin')::boolean, false)
         AND semester = (auth.jwt() ->> 'semester')::int
         AND exam_period = (auth.jwt() ->> 'exam_period')
         AND jurusan = (auth.jwt() ->> 'jurusan'));

-- ── Lock SELECT to the authenticated (JWT) role; anon can no longer read ──
REVOKE SELECT ON
  announcements, chat_messages, dm_messages, forum_comments, forum_threads,
  invoice_counter, notifications, pinned_messages, presence, purchase_requests,
  scope_feature_flags, support_messages, support_mutes, support_pinned_messages,
  support_reactions, support_read_receipts, user_settings, voice_participants
FROM anon;
GRANT SELECT ON
  announcements, chat_messages, dm_messages, forum_comments, forum_threads,
  invoice_counter, notifications, pinned_messages, presence, purchase_requests,
  scope_feature_flags, support_messages, support_mutes, support_pinned_messages,
  support_reactions, support_read_receipts, user_settings, voice_participants
TO authenticated;

-- ============================================
-- ROLLBACK (run manually only if realtime breaks at launch):
--   GRANT SELECT ON <the 18 tables> TO anon;
--   For each table: DROP POLICY <table>_rt_select; CREATE POLICY "Public read <table>"
--     ON <table> FOR SELECT USING (true);  -- (dm_messages: "Allow select for all")
--   (notifications keeps working; user_settings can stay denied as it was.)
-- ============================================
