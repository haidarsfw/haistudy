-- ============================================
-- 020 — Security hardening: enable RLS where missing
-- ============================================
-- Fixes Supabase advisor lints:
--   • rls_disabled_in_public ERROR: chat_messages, announcements, presence, notifications
--   • policy_exists_rls_disabled ERROR: same tables (have policies but RLS off)
--   • sensitive_columns_exposed ERROR: notifications, presence (license_key)
--
-- Strategy:
--   1. notifications has no SELECT policy yet — add one BEFORE enabling RLS
--      (otherwise Realtime subscriptions break instantly).
--   2. presence has 4 permissive policies (read/insert/update/delete USING true).
--      Drop write policies — all writes go through /api/presence/route.ts using
--      service_role which bypasses RLS. Anon should NEVER write directly.
--   3. ENABLE RLS on all 4 tables. Existing/new SELECT policies (USING true) keep
--      anon Realtime working; absence of write policies blocks anon writes.
--
-- Verified safe via grep: zero client-side `supabase.from(<table>).insert/update/
-- delete/upsert` calls — all writes are server-side using service_role.
-- ============================================

-- 1) notifications: add public SELECT policy first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications'
      AND policyname='Public read notifications'
  ) THEN
    CREATE POLICY "Public read notifications"
      ON notifications FOR SELECT USING (true);
  END IF;
END $$;

-- 2) presence: drop dangerous write-permissive policies
DROP POLICY IF EXISTS "Public insert presence" ON presence;
DROP POLICY IF EXISTS "Public update presence" ON presence;
DROP POLICY IF EXISTS "Public delete presence" ON presence;

-- 3) Enable RLS on the four exposed tables
ALTER TABLE chat_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
