-- ============================================================================
-- 072 — "Kabari saya" for a period that is not on sale yet
--
-- Why this exists: a B29 buyer used to be moved silently onto Semester 2 UAS,
-- a period that had already happened and was never theirs. That is now fixed —
-- they land on their own Semester 3 UTS, which is marked "Segera" and cannot be
-- bought because the material has not been written.
--
-- Honest, but it ends the conversation. The people hitting that wall are the
-- exact cohort the mentor programme needs, and they arrive already signed in
-- and already interested. This table is the list to write to when the period
-- opens, instead of hoping they come back on their own.
--
-- One row per account per period. Asking twice updates nothing and errors on
-- nothing — the unique constraint makes the button idempotent, so a double tap
-- is not two rows and not an error the buyer has to read.
--
-- Contact details are deliberately NOT copied here. The account already holds
-- the e-mail and WhatsApp, and duplicating them would turn a "who is waiting"
-- list into a second place PII has to be protected.
--
-- RLS on, no policies, service_role only. Not in the realtime publication:
-- nothing subscribes to it, and the publication is the free tier's WAL bill.
-- ============================================================================

create table if not exists scope_interest (
  id          uuid primary key default uuid_generate_v4(),
  account_id  uuid not null references accounts(id) on delete cascade,
  semester    int  not null check (semester between 1 and 14),
  exam_period text not null check (exam_period in ('uts','uas')),
  jurusan     text not null check (jurusan ~ '^[a-z0-9-]{1,16}$'),
  -- What they were holding when they hit the wall, so the eventual message can
  -- say "the package you were looking at" rather than starting from scratch.
  package     text check (package in ('share','normal','vip','diamond')),
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (account_id, semester, exam_period, jurusan)
);

create index if not exists scope_interest_scope_idx
  on scope_interest (semester, exam_period, jurusan)
  where notified_at is null;

alter table scope_interest enable row level security;

revoke all on scope_interest from anon, authenticated;
