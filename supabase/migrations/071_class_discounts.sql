-- ============================================================================
-- 071 — Class promo, rebuilt as data instead of a hardcoded price
--
-- What it replaces: `LE86_SHARE_PRICE = 20000` in src/lib/payments.ts, which
-- pinned one class's Share price forever. The owner's actual rule is narrower
-- and moves every period: only the class HE IS SITTING IN, only for THAT exam
-- period, gets the discount. A class he has left keeps nothing. Written into
-- code, that rule needed a deploy every semester and silently kept paying out
-- to last year's classmates in between.
--
-- Now it is a row: (class, period) → percent. Next semester is one line in the
-- admin screen, and periods that have passed simply have no row.
--
-- 15%, Share only — both the owner's decisions on 2026-07-30. 15% to match the
-- evaluation discount, because he has already told people "15%" and two
-- different percentages that cannot stack only invite "why did I get the
-- smaller one".
--
-- Not PII, but there is nothing for a browser to read here either: the price is
-- always computed server-side. RLS on, no policies, service_role only. Not in
-- the realtime publication.
-- ============================================================================

create table if not exists class_discounts (
  id           uuid primary key default uuid_generate_v4(),
  -- Normalized the same way the checkout normalizes what a buyer types:
  -- uppercase, letters and digits only. "Lb-30" and "LB30" are one class.
  class_code   text not null check (class_code ~ '^[A-Z0-9]{1,12}$'),
  semester     int  not null check (semester between 1 and 14),
  exam_period  text not null check (exam_period in ('uts','uas')),
  jurusan      text not null check (jurusan ~ '^[a-z0-9-]{1,16}$'),
  percent      int  not null default 15 check (percent > 0 and percent <= 100),
  note         text,
  created_at   timestamptz not null default now(),
  -- One promo per class per period. Re-adding updates rather than duplicates.
  unique (class_code, semester, exam_period, jurusan)
);

alter table class_discounts enable row level security;

-- Seeded empty on purpose. The owner does not know which class he will be in
-- next semester yet, and the whole point of this table is that he says so when
-- he does. LE86's old promo is NOT carried over — that is the change.
