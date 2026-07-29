-- 061_referral_codes.sql
--
-- Referral codes become a thing in their own right.
--
-- Until now a code lived on an ACTIVATION (activations.referral_code), which
-- means it lived on a licence — and licences expire every exam period. Share
-- your code with a friend, wait a month, and the code is attached to something
-- that no longer exists. 233 codes were minted this way and exactly one was
-- ever used, which is roughly what you would expect from a code nobody could
-- find and that stopped working when the term ended.
--
-- Codes now belong to ACCOUNTS, which are permanent, and the owner can also
-- mint campaign codes that belong to nobody.
--
-- Everything here is additive. `activations.referral_code` is left exactly as
-- it is; the old codes are copied across so anything already shared keeps
-- working, and the old column can be dropped in a later migration once this
-- has been running for a while.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. The codes themselves
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists referral_codes (
  code        text primary key,
  -- account:  auto-minted, one per account, belongs to that person
  -- campaign: minted by the admin for a promo, belongs to nobody
  -- legacy:   carried over from activations.referral_code
  kind        text not null check (kind in ('account', 'campaign', 'legacy')),
  account_id  uuid references accounts(id) on delete cascade,
  label       text not null default '',
  active      boolean not null default true,
  uses        integer not null default 0,
  -- null = unlimited. Campaign codes are the reason this exists.
  max_uses    integer,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint referral_codes_account_owner_check
    check (kind <> 'account' or account_id is not null)
);

-- One personal code per account. Partial, so legacy rows that happen to carry
-- an account_id do not fight with it.
create unique index if not exists referral_codes_one_account_code
  on referral_codes (account_id)
  where kind = 'account';

create index if not exists referral_codes_account_idx
  on referral_codes (account_id)
  where account_id is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Who used whose code
-- ─────────────────────────────────────────────────────────────────────────
-- Separate from accounts.referred_by_code because that column stores whatever
-- string was typed, valid or not. This table only ever holds resolved,
-- existing codes, so counting from it cannot be inflated by someone typing
-- their own name into the box.
create table if not exists referral_uses (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null references referral_codes(code) on delete cascade,
  account_id  uuid not null references accounts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- Set when the referrer is actually rewarded. Deliberately nullable: a code
  -- is attached at signup, but nobody has earned anything until the referee
  -- pays for something.
  credited_at timestamptz,
  -- One referrer per account, permanently. Stops anyone re-attributing
  -- themselves later.
  constraint referral_uses_one_per_account unique (account_id)
);

create index if not exists referral_uses_code_idx on referral_uses (code);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Code generator
-- ─────────────────────────────────────────────────────────────────────────
-- Same alphabet as the licence generator: no 0/O/1/I/L, because these get read
-- aloud and retyped from a WhatsApp message. Eight characters from 31 symbols
-- is ~40 bits, which is far too much to guess at the rate the check endpoint
-- allows.
create or replace function gen_referral_code() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  loop
    candidate := 'REF-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := candidate || '-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from referral_codes where code = candidate);
  end loop;
  return candidate;
end $$;

-- Advisory counter bump. Atomic, so two people redeeming the same campaign
-- code at once cannot both read 4 and both write 5.
create or replace function bump_referral_uses(p_code text) returns void
language sql volatile as $$
  update referral_codes set uses = uses + 1 where code = p_code;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Carry the old codes across
-- ─────────────────────────────────────────────────────────────────────────
-- Marked 'legacy', not 'account', so they cannot collide with the one personal
-- code each account gets below. account_id is filled in where the licence is
-- already linked, so a legacy code still credits the right person.
insert into referral_codes (code, kind, account_id, label)
select distinct on (a.referral_code)
       a.referral_code,
       'legacy',
       lk.account_id,
       'dari periode sebelumnya'
  from activations a
  left join license_keys lk on lk.key = a.license_key
 where a.referral_code is not null
   and a.referral_code <> ''
 order by a.referral_code, lk.account_id nulls last
on conflict (code) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Give every existing account its own code
-- ─────────────────────────────────────────────────────────────────────────
insert into referral_codes (code, kind, account_id)
select gen_referral_code(), 'account', a.id
  from accounts a
 where not exists (
   select 1 from referral_codes rc
    where rc.account_id = a.id and rc.kind = 'account'
 );

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Rate-limit bucket for the code checker
-- ─────────────────────────────────────────────────────────────────────────
-- A public "is this code valid?" endpoint is an oracle. Without a limit it can
-- be walked until it finds live codes (OWASP OAT-002). Reuses the existing
-- ledger rather than adding another table.
alter table account_rate_events drop constraint if exists account_rate_events_kind_check;
alter table account_rate_events add  constraint account_rate_events_kind_check
  check (kind in ('login_fail', 'reset_request', 'verify_resend', 'referral_check'));

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Lock both tables to the server
-- ─────────────────────────────────────────────────────────────────────────
-- RLS on with no policies at all: service_role only, unreachable from the
-- browser. Same posture as accounts / account_sessions. A referral table is a
-- map of who recruited whom, which is exactly the sort of thing that should
-- never be readable with a public key.
alter table referral_codes enable row level security;
alter table referral_uses  enable row level security;

revoke all on referral_codes from anon, authenticated;
revoke all on referral_uses  from anon, authenticated;
revoke all on function gen_referral_code() from anon, authenticated;
revoke all on function bump_referral_uses(text) from anon, authenticated;

-- Not added to the realtime publication on purpose — nothing here needs to be
-- pushed live, and the publication is kept small to stay inside the free tier.
