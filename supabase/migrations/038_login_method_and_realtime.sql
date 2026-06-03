-- ============================================================
-- 038_login_method_and_realtime
-- ------------------------------------------------------------
-- 1) license_keys.login_method: how this key's owner authenticates.
--      NULL  = legacy (both license-key AND Google login allowed)
--      'key' = license-key login only  (Google login blocked)
--      'email' = Google login only      (license-key login blocked)
--    Bound at admin approval time. Existing rows stay NULL so no current
--    user is locked out. Enforced in /api/auth/validate (key path) and
--    /auth/callback (Google path).
--
-- 2) Add purchase_requests to the supabase_realtime publication so the
--    admin pending-purchase red-dot updates live (INSERT/UPDATE).
-- ============================================================

alter table license_keys
  add column if not exists login_method text;

alter table license_keys
  drop constraint if exists license_keys_login_method_check;

alter table license_keys
  add constraint license_keys_login_method_check
  check (login_method is null or login_method in ('key', 'email'));

-- Live red-dot for admins (guarded: add only if not already published).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'purchase_requests'
  ) then
    alter publication supabase_realtime add table purchase_requests;
  end if;
end $$;
