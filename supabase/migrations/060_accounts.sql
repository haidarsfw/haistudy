-- ============================================================
-- 060_accounts.sql — split identity ("account") from entitlement ("access")
-- ============================================================
--
-- Until now a license key WAS the account: one key = one identity = one
-- exam period. Buying the next period meant re-typing every detail and
-- receiving a brand new identity, and there was no "my account" anywhere.
--
-- This migration introduces the identity layer:
--
--   accounts (1) ──< license_keys (N)      one account, many periods
--
-- Deliberately additive. `hs-session` keeps meaning exactly what it meant
-- before (a license key = access to the app), so every existing API route,
-- guard, presence hook and realtime channel is untouched. The account layer
-- sits above it and is carried by its own cookie.
--
-- Safe to run against production: only new tables plus two nullable columns.
-- No existing row is modified except the backfill at the bottom, which only
-- fills in the new account_id.
-- ============================================================

-- ------------------------------------------------------------
-- 1. accounts — the identity
-- ------------------------------------------------------------
-- auth_provider is fixed at registration and never changes: an account is
-- either a Google account or a password account, never both. That is a
-- product decision, not a technical limit — it removes the "I signed up with
-- Google, tried my password, and assumed my account was gone" failure.
create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  email_lower text generated always as (lower(email)) stored,

  auth_provider text not null check (auth_provider in ('google', 'password')),
  password_hash text,                     -- scrypt, src/lib/auth/password.ts
  email_verified_at timestamptz,          -- Google is verified on arrival

  -- The purchase identity. Lives here so checkout can prefill it and the
  -- buyer never types it twice.
  full_name  text not null default '',
  nickname   text not null default '',
  whatsapp   text not null default '',
  campus     text not null default '',
  class_code text not null default '',
  avatar_url text,

  language text not null default 'id' check (language in ('id', 'en')),
  status   text not null default 'active' check (status in ('active', 'blocked')),

  deletion_requested_at timestamptz,      -- danger zone; admin acts on it

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz,

  -- A password account without a hash could never sign in; a Google account
  -- with one would be a second, unreachable credential. Both are bugs, so
  -- the database refuses them outright.
  constraint accounts_provider_hash_check check (
    (auth_provider = 'password' and password_hash is not null)
    or (auth_provider = 'google' and password_hash is null)
  )
);

create unique index if not exists accounts_email_lower_key on accounts (email_lower);
create index if not exists idx_accounts_status on accounts (status) where status <> 'active';

-- ------------------------------------------------------------
-- 2. account_sessions — opaque bearer tokens, stored hashed
-- ------------------------------------------------------------
-- Opaque random token rather than a signed JWT, for one reason: revocation.
-- "Sign out everywhere" and per-device sign-out have to be instant, and a
-- stateless token cannot be taken back. The cost is one indexed read per
-- account request, and account requests are rare (profile, checkout) — never
-- on the app's hot path.
--
-- Only the SHA-256 of the token is stored, so a database dump does not hand
-- anyone a working session.
create table if not exists account_sessions (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references accounts(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  ip text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  revoked_at   timestamptz
);

create index if not exists idx_account_sessions_account on account_sessions (account_id);
create index if not exists idx_account_sessions_expires on account_sessions (expires_at);

-- ------------------------------------------------------------
-- 3. account_tokens — e-mail verification and password reset
-- ------------------------------------------------------------
-- Same rule as sessions: the raw token is e-mailed and then forgotten; only
-- its hash is kept. Supersedes 059's password_reset_tokens, which was keyed
-- to a license key and never gained a consumer. That table is left in place
-- for now and dropped in a later cleanup migration.
create table if not exists account_tokens (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references accounts(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null check (purpose in ('verify', 'reset')),
  expires_at   timestamptz not null,
  used_at      timestamptz,
  requested_ip text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_account_tokens_account on account_tokens (account_id, purpose);
create index if not exists idx_account_tokens_expires on account_tokens (expires_at);

-- ------------------------------------------------------------
-- 4. Hang licenses and purchases off an account
-- ------------------------------------------------------------
-- Nullable on purpose. Legacy key-only licenses keep account_id NULL and go
-- on working through the legacy sign-in path until they expire.
--
-- ON DELETE SET NULL, not CASCADE: deleting an account must never destroy
-- paid access or the purchase record behind it.
alter table license_keys      add column if not exists account_id uuid references accounts(id) on delete set null;
alter table purchase_requests add column if not exists account_id uuid references accounts(id) on delete set null;

create index if not exists idx_license_keys_account on license_keys (account_id);
create index if not exists idx_purchase_requests_account on purchase_requests (account_id);

-- ------------------------------------------------------------
-- 5. device_releases — the anti-rotation ledger
-- ------------------------------------------------------------
-- Self-service device removal is what stops the endless "my device slots are
-- full" messages. Unlimited self-service removal, though, turns a 3-device
-- licence into a rota three people take turns on.
--
-- The rule this table exists to enforce: the FIRST release in any 24 hours is
-- instant (someone's phone really did break, mid-exam-season, and minutes
-- matter), the SECOND within the same 24 hours is held for 12 hours. An
-- honest user never meets the second rule.
create table if not exists device_releases (
  id uuid primary key default uuid_generate_v4(),
  license_key text not null references license_keys(key) on delete cascade,
  device_id   text not null,
  released_at timestamptz not null default now(),
  released_by text                        -- account id, or 'admin'
);

create index if not exists idx_device_releases_license on device_releases (license_key, released_at desc);

-- ------------------------------------------------------------
-- 6. Sync package_tier with production
-- ------------------------------------------------------------
-- Production was widened to accept 'diamond' by hand, without a migration, so
-- a database rebuilt from this folder would reject a tier that is being sold.
-- Restated here idempotently to close that gap.
alter table license_keys drop constraint if exists license_keys_package_tier_check;
alter table license_keys add  constraint license_keys_package_tier_check
  check (package_tier in ('share', 'normal', 'vip', 'diamond'));

-- ------------------------------------------------------------
-- 7. Lock everything down
-- ------------------------------------------------------------
-- RLS on with zero policies = service_role only, matching oauth_links and
-- pending_credentials. The explicit REVOKE is belt-and-braces: these tables
-- hold password hashes, live session tokens and phone numbers, and the anon
-- key has always been public.
alter table accounts         enable row level security;
alter table account_sessions enable row level security;
alter table account_tokens   enable row level security;
alter table device_releases  enable row level security;

revoke all on accounts         from anon, authenticated;
revoke all on account_sessions from anon, authenticated;
revoke all on account_tokens   from anon, authenticated;
revoke all on device_releases  from anon, authenticated;

-- Not added to supabase_realtime. Every table in that publication costs WAL
-- decoding on every write, and migration 057 trimmed it for exactly that
-- reason. Nothing here needs to be pushed to a browser.

-- ------------------------------------------------------------
-- 8. Backfill — give existing Google users their account
-- ------------------------------------------------------------
-- 30 oauth_links rows, all provider='google', all with a verified address.
-- They become 30 accounts with their name, nickname, phone, campus and class
-- carried across, so a returning buyer opens checkout already filled in.
--
-- Key-only and legacy licenses are skipped: they have no e-mail on file, so
-- there is nothing to build an identity from.
insert into accounts (
  email, auth_provider, email_verified_at,
  full_name, nickname, whatsapp, campus, class_code,
  created_at
)
select
  o.email,
  'google',
  o.linked_at,
  coalesce(nullif(trim(l.name), ''), ''),
  coalesce(nullif(trim(l.short_name), ''), split_part(trim(l.name), ' ', 1), ''),
  coalesce(nullif(trim(p.phone), ''), ''),
  coalesce(pr.meta ->> 'campus', ''),
  coalesce(pr.meta ->> 'classCode', ''),
  o.linked_at
from oauth_links o
join license_keys l on l.key = o.license_key
left join user_profiles p on p.license_key = o.license_key
left join lateral (
  select meta
  from purchase_requests
  where license_key = o.license_key
  order by created_at desc
  limit 1
) pr on true
where o.provider = 'google'
on conflict (email_lower) do nothing;

update license_keys l
set account_id = a.id
from oauth_links o
join accounts a on a.email_lower = o.email_lower
where o.license_key = l.key
  and l.account_id is null;

-- Carry the same link onto the purchase rows those licenses came from, so
-- purchase history shows up on the account page from day one.
update purchase_requests pr
set account_id = l.account_id
from license_keys l
where pr.license_key = l.key
  and l.account_id is not null
  and pr.account_id is null;
