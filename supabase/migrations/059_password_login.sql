-- ============================================================
-- 059_password_login
-- ------------------------------------------------------------
-- Adds email+password as a first-class login method alongside Google.
--
-- Deliberately ADDITIVE. No existing row is rewritten:
--   login_method 'email' has meant "Google login only" since 038, and
--   production rows still carry it. Renaming those to 'google' before the
--   new code ships would loosen the binding on the LIVE site (the checks in
--   /api/auth/validate and /auth/callback compare against the old literals),
--   so 'email' stays a legacy alias for 'google' and every consumer accepts
--   both. A later cleanup migration can normalise it once the new code is
--   deployed and settled.
--
-- login_method after this migration:
--   NULL       = legacy (both license-key AND Google allowed)
--   'key'      = license-key only        (retired next exam period)
--   'email'    = Google only             (LEGACY ALIAS of 'google')
--   'google'   = Google only
--   'password' = email + password only
-- ============================================================

-- 1) Allow the two new login methods. 'key' and 'email' stay accepted so no
--    existing row violates the constraint.
alter table license_keys
  drop constraint if exists license_keys_login_method_check;

alter table license_keys
  add constraint license_keys_login_method_check
  check (
    login_method is null
    or login_method in ('key', 'email', 'google', 'password')
  );

-- 2) oauth_links already models "1 email <-> 1 license" with the uniqueness we
--    need, and 024 built its provider column to be extended. A password
--    identity is the same shape (an email that resolves to a license), so it
--    lives here rather than in a parallel table.
alter table oauth_links
  drop constraint if exists oauth_links_provider_check;

alter table oauth_links
  add constraint oauth_links_provider_check
  check (provider in ('google', 'password'));

-- The scrypt hash for provider='password' rows. NULL for Google rows: Google
-- users have no password with us at all.
alter table oauth_links
  add column if not exists password_hash text;

-- Keep the two providers honest about their own shape.
alter table oauth_links
  drop constraint if exists oauth_links_password_hash_check;

alter table oauth_links
  add constraint oauth_links_password_hash_check
  check (
    (provider = 'password' and password_hash is not null)
    or (provider <> 'password' and password_hash is null)
  );

-- 3) Where a buyer's password waits between "form submitted" and "admin
--    approved".
--
--    It is a SEPARATE TABLE on purpose. The admin purchase queue and its CSV
--    export both run `select("*")` on purchase_requests, so a password_hash
--    column there would be shipped to the admin's browser and written into the
--    export file. The owner's requirement is that the password is never visible
--    to them, and a column excluded only by convention would re-leak the first
--    time someone adds another `select("*")`.
--
--    On approval the hash moves to oauth_links and the row here is deleted.
create table if not exists pending_credentials (
  purchase_request_id uuid primary key
    references purchase_requests(id) on delete cascade,
  email_lower   text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

alter table pending_credentials enable row level security;
-- No policies: service_role only. The anon key must never reach this table.

-- 4) Self-service password reset. The emailed token is never stored — only its
--    SHA-256 — so a leak of this table cannot be replayed into an account.
create table if not exists password_reset_tokens (
  id          uuid primary key default uuid_generate_v4(),
  license_key text not null references license_keys(key) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  requested_ip text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_license
  on password_reset_tokens (license_key);
-- Supports both the "expire old tokens" sweep and cheap cleanup of used ones.
create index if not exists idx_password_reset_tokens_expires
  on password_reset_tokens (expires_at);

alter table password_reset_tokens enable row level security;
-- No policies: service_role only.

-- NOTE: neither new table is added to the supabase_realtime publication.
-- Migration 047 trimmed that publication specifically to cut WAL decode IO on
-- the free tier; nothing here needs live updates.
