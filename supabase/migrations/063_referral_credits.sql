-- 063_referral_credits.sql
--
-- Replaces the milestone-cash ladder (062) with a balance.
--
-- Why it changed: the sales report showed retention is 64% and it is
-- ACQUISITION that collapsed (95 → 57 → 10 new buyers per period), and that
-- customers are not price-sensitive — AOV rose 260% while volume grew. So cash
-- milestones aimed at loyal customers were solving a problem that does not
-- exist, and every payout needed a manual transfer.
--
-- The model now:
--   referee   Rp5.000 off, once, and ONLY on an account's first purchase
--   referrer  Rp5.000 of BALANCE per friend whose purchase is approved
--   5 friends = Rp25.000 = one Share period free
--
-- Balance, not cash, for two reasons: the owner never has to transfer anything
-- by hand, and the money never actually leaves — it can only turn into a
-- future purchase that would not otherwise have happened.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. The old ladder goes
-- ─────────────────────────────────────────────────────────────────────────
-- Verified empty before writing this: no milestone was ever reached, so
-- nothing is being thrown away.
drop table if exists referral_payouts;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. The balance, as a ledger rather than a number
-- ─────────────────────────────────────────────────────────────────────────
-- A single `balance` column would be a number nobody can audit: if it ever
-- drifts there is no way to find out why. Rows can be added up, and each one
-- points at the referral that earned it.
create table if not exists referral_credits (
  id              uuid primary key default uuid_generate_v4(),
  account_id      uuid not null references accounts(id) on delete cascade,
  amount          integer not null check (amount > 0),
  source          text not null default 'referral' check (source in ('referral', 'manual')),
  -- Which referral earned this. The unique index below is what makes
  -- crediting idempotent: approving the same purchase twice cannot pay twice.
  referral_use_id uuid references referral_uses(id) on delete set null,
  note            text not null default '',
  earned_at       timestamptz not null default now(),
  -- Owner's call: unused balance expires after a year so it does not sit on
  -- the books forever.
  expires_at      timestamptz not null default (now() + interval '12 months'),
  spent_at        timestamptz,
  -- purchase_requests.id, as text, so deleting an old order cannot erase the
  -- record that the balance was already used.
  spent_on        text
);

create unique index if not exists referral_credits_one_per_use
  on referral_credits (referral_use_id)
  where referral_use_id is not null;

-- The only query that runs on the hot path: what is this account's balance.
create index if not exists referral_credits_spendable_idx
  on referral_credits (account_id)
  where spent_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Carry across the referrals that were already credited
-- ─────────────────────────────────────────────────────────────────────────
-- Under the old model a credited referral earned nothing until a milestone.
-- Under the new one each is worth Rp5.000, so anyone already credited is owed
-- one. One row today, but the code has to be right for the next hundred.
insert into referral_credits (account_id, amount, source, referral_use_id, note)
select rc.account_id, 5000, 'referral', ru.id, 'dari periode sebelum saldo'
  from referral_uses ru
  join referral_codes rc on rc.code = ru.code
 where ru.credited_at is not null
   and rc.account_id is not null
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Server-only
-- ─────────────────────────────────────────────────────────────────────────
-- RLS on with no policies: reachable by service_role only. This is money, and
-- the anon key is public by design.
alter table referral_credits enable row level security;
revoke all on referral_credits from anon, authenticated;
