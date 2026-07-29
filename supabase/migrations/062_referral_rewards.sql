-- 062_referral_rewards.sql
--
-- Turns "we know who recruited whom" into "somebody gets paid".
--
-- Two sides, deliberately different:
--
--   the REFEREE  gets Rp2.000 off, once, on their first purchase. Immediate
--                and automatic, so the code is worth typing.
--   the REFERRER gets cash at milestones (5, 10, 15, 20 … 50 people). Paid by
--                hand, because there is no payout rail here and inventing one
--                would cost more than the whole programme.
--
-- Crediting happens on APPROVAL, never on signup. A referral programme that
-- pays out on registrations pays out on throwaway addresses.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. What each side has already received
-- ─────────────────────────────────────────────────────────────────────────
-- `referral_uses.credited_at` already exists and marks the moment a referral
-- became real. What was missing is the money side of it.

alter table referral_uses
  add column if not exists discount_applied integer not null default 0;

comment on column referral_uses.discount_applied is
  'Rupiah taken off the referee''s purchase. Non-zero means the discount is spent and cannot be claimed again.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Milestone payouts to the referrer
-- ─────────────────────────────────────────────────────────────────────────
-- One row per milestone reached, so a rung can never be paid twice and the
-- admin has a ledger rather than a number to trust.
create table if not exists referral_payouts (
  id          uuid primary key default uuid_generate_v4(),
  account_id  uuid not null references accounts(id) on delete cascade,
  -- 5, 10, 15 … the number of credited referrals this rung represents.
  milestone   integer not null,
  amount      integer not null,
  paid_at     timestamptz,
  note        text not null default '',
  created_at  timestamptz not null default now(),
  constraint referral_payouts_one_per_rung unique (account_id, milestone)
);

create index if not exists referral_payouts_unpaid_idx
  on referral_payouts (account_id)
  where paid_at is null;

alter table referral_payouts enable row level security;
revoke all on referral_payouts from anon, authenticated;

-- Not in the realtime publication. Nothing here needs pushing live, and the
-- publication is kept minimal to stay inside the free tier.
