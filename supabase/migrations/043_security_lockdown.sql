-- ============================================
-- 043 — Security lockdown (pre-release P0)
-- ============================================
-- Root cause: license-key auth means the browser is permanently the Postgres
-- `anon` role, and NEXT_PUBLIC_SUPABASE_ANON_KEY ships in the bundle. The
-- `USING(true)` policies + broad anon GRANTs (meant for cohort content) also
-- exposed PII and allowed anon writes.
--
-- Verified safe: the client uses anon ONLY for realtime postgres_changes on the
-- 18 published tables — zero client-side .from()/.insert/.update/.upsert/.rpc.
-- All reads/writes otherwise go through service_role API routes. So we can:
--   • drop the permissive policies on API-only tables (user_profiles, ai_*, feedback)
--   • revoke ALL anon/authenticated writes
--   • revoke ALL reads, then grant SELECT back ONLY on the 18 published tables
--   • revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated
--
-- 043 is SAFE to apply independently, BEFORE the JWT-realtime code ships. It
-- leaves published-table SELECT as USING(true) (realtime keeps working); 044
-- swaps those to per-user/per-scope JWT-claim policies once the token is live.
-- Idempotent.
-- ============================================

-- 1) Drop permissive policies on API-only tables (service_role read+write only)
DROP POLICY IF EXISTS "Allow read user_profiles"   ON user_profiles;
DROP POLICY IF EXISTS "Allow insert user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow update user_profiles" ON user_profiles;

DROP POLICY IF EXISTS ai_conversations_select ON ai_conversations;
DROP POLICY IF EXISTS ai_conversations_insert ON ai_conversations;
DROP POLICY IF EXISTS ai_conversations_update ON ai_conversations;
DROP POLICY IF EXISTS ai_conversations_delete ON ai_conversations;

DROP POLICY IF EXISTS "Allow read feedback"   ON feedback;
DROP POLICY IF EXISTS "Allow insert feedback" ON feedback;
DROP POLICY IF EXISTS "Allow update feedback" ON feedback;

-- 2) Revoke ALL write privileges from anon/authenticated on every table.
--    Client never writes via anon; writes flow through service_role API routes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 3) Revoke ALL read, then grant SELECT back ONLY on the realtime-published
--    tables (needed for live subscriptions). Everything else is API-only.
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON
  announcements, chat_messages, dm_messages, forum_comments, forum_threads,
  invoice_counter, notifications, pinned_messages, presence, purchase_requests,
  scope_feature_flags, support_messages, support_mutes, support_pinned_messages,
  support_reactions, support_read_receipts, user_settings, voice_participants
TO anon, authenticated;

-- 4) Revoke EXECUTE on ALL SECURITY DEFINER functions from anon/authenticated.
--    These are called server-side via service_role (which bypasses grants);
--    none are invoked by the client (verified: zero client .rpc()). This closes
--    the anon-callable increment_license_field counter-tamper vector (S7).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    -- PUBLIC is the default EXECUTE grantee on function creation; must revoke it
    -- too. Keep service_role (server-side .rpc() callers: referral, presence, ...).
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', r.sig);
  END LOOP;
END $$;

-- 5) Perf: index the FKs flagged by the advisor (queried by these columns).
CREATE INDEX IF NOT EXISTS idx_notifications_license_key ON notifications (license_key);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender_key    ON dm_messages (sender_key);
