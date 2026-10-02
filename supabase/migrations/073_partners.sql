-- ============================================================================
-- 073 — Partners: the people who earn cash for bringing buyers
--
-- ✅ APPLIED to production 2026-10-02. Nothing reads these tables yet —
-- the partner UI is still to be built.
--
-- Why a table and not a boolean on `accounts`: a partner is a RELATIONSHIP with
-- a history, not a property of a person. It is applied for, approved by someone
-- on a date, can be paused, and carries where the money goes. A single
-- `is_partner` column answers none of that, and the first question after the
-- first payout is "who approved this, and when".
--
-- Two tables, because they answer two different questions:
--   partners             — who is one, and is it still true
--   partner_commissions  — what was earned on which purchase, and was it paid
--
-- The commission ledger is deliberately NOT derivable. The rate depends on how
-- many people the partner had already brought AT THE TIME, and the price of the
-- package THEN. Recomputing it later from today's ladder or today's prices
-- would quietly rewrite what someone is owed. So the rate and the amount are
-- written down once, at the moment they are decided, and never recalculated.
--
-- PII: payout details live here and nowhere else. RLS on, no policies,
-- revoked from anon and authenticated — service_role only, same as
-- purchase_requests. Neither table is in the realtime publication.
-- ============================================================================

-- ─── 1. Who is a partner ───

create table if not exists partners (
  id          uuid primary key default uuid_generate_v4(),
  -- One partnership per account, ever. Re-applying updates this row rather
  -- than creating a second one, so the history stays in one place.
  account_id  uuid not null unique references accounts(id) on delete cascade,

  -- 'pending'  — applied, waiting for the owner to decide
  -- 'active'   — earning
  -- 'paused'   — kept, not earning (a season off, a dispute)
  -- 'rejected' — declined; the row stays so the same person is not re-reviewed
  --              from scratch and so a decision is never silently forgotten
  status      text not null default 'pending'
              check (status in ('pending', 'active', 'paused', 'rejected')),

  -- Free text from the application form: who they mentor, which class, why.
  pitch       text,
  -- The owner's own note. Never shown to the partner.
  admin_note  text,

  applied_at   timestamptz not null default now(),
  decided_at   timestamptz,
  -- The admin licence key that decided it. A key, not a name, because that is
  -- what validateAdmin actually knows.
  decided_by   text,

  -- Where a payout goes. Filled by the partner, not at application time —
  -- there is no reason to hold bank details for someone who was never approved.
  payout_method  text check (payout_method in ('bank', 'ewallet')),
  payout_bank    text,
  payout_number  text,
  payout_name    text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The list the owner actually opens: everyone still waiting on a decision.
create index if not exists partners_pending_idx
  on partners (applied_at)
  where status = 'pending';

create index if not exists partners_active_idx
  on partners (account_id)
  where status = 'active';

-- ─── 2. What each partner earned ───

create table if not exists partner_commissions (
  id            uuid primary key default uuid_generate_v4(),
  partner_id    uuid not null references partners(id) on delete cascade,

  -- The purchase that earned it, as TEXT rather than a foreign key: deleting an
  -- order must not erase the record of money already owed or paid. Same reason
  -- referral_credits.spent_on is text (migration 063).
  purchase_id   text not null,
  -- The account that bought. Kept for the ledger view; the purchase row may go.
  buyer_account uuid references accounts(id) on delete set null,

  -- Frozen at the moment of approval, never recomputed. `nth` is which person
  -- this was for that partner, which is what decided the rate.
  nth           int  not null check (nth > 0),
  rate_percent  int  not null check (rate_percent > 0 and rate_percent <= 100),
  base_amount   int  not null check (base_amount >= 0),
  amount        int  not null check (amount >= 0),

  paid_at       timestamptz,
  -- Whatever identifies the transfer: a reference number, a date, a note.
  paid_note     text,

  created_at    timestamptz not null default now(),

  -- One commission per purchase, ever. Approving the same order twice cannot
  -- pay twice — the same guarantee referral_credits_one_per_use gives.
  unique (purchase_id)
);

create index if not exists partner_commissions_partner_idx
  on partner_commissions (partner_id, created_at desc);

-- The payout queue: everything earned and not yet handed over.
create index if not exists partner_commissions_unpaid_idx
  on partner_commissions (partner_id)
  where paid_at is null;

-- ─── 3. Locked down ───

alter table partners            enable row level security;
alter table partner_commissions enable row level security;

revoke all on partners            from anon, authenticated;
revoke all on partner_commissions from anon, authenticated;
