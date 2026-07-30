-- ============================================================================
-- 070 — Thank-you discount for people who filled in the evaluation form
--
-- 15% off, once, no expiry. Held as an ALLOWLIST OF E-MAIL ADDRESSES rather
-- than a coupon code, for one reason: almost none of the respondents had a
-- haistudy account when they answered, so there was nothing to attach a credit
-- to. An address matches whenever they eventually buy — and there is no code
-- to leak, nothing to remember, and nothing wasted if they never come back.
--
-- A table, not a list in the code, so the owner can paste next round's
-- addresses from the admin screen without a deploy.
--
-- PII: this holds e-mail addresses. RLS is on with NO policies at all, which
-- means service_role only — the anon key cannot read a single row. Same shape
-- as purchase_requests, and for the same reason. Do NOT add a USING (true)
-- SELECT policy here. Not added to the realtime publication either; free-tier
-- WAL volume is a real constraint (see migration 057).
-- ============================================================================

create table if not exists feedback_discounts (
  id              uuid primary key default uuid_generate_v4(),
  -- Stored already-lowercased. Matched against accounts.email_lower, which is a
  -- generated column, so the two can never disagree about case.
  email_lower     text not null unique,
  percent         int  not null default 15 check (percent > 0 and percent <= 100),
  -- Which round this came from, e.g. "Evaluasi UAS Semester 2 — Juli 2026".
  note            text,
  created_at      timestamptz not null default now(),
  -- Once per address, forever. Set the moment it is applied to an order, so a
  -- second order cannot quote the same discount again.
  used_at         timestamptz,
  used_by_account uuid references accounts(id) on delete set null,
  used_amount     int
);

alter table feedback_discounts enable row level security;

-- Seed: the 16 people who answered the post-UAS evaluation, July 2026.
-- Idempotent — re-running changes nothing, and an address already used keeps
-- its used_at rather than being reset.
insert into feedback_discounts (email_lower, percent, note) values
  ('umar26dr@gmail.com',            15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('nafrisqaintan14@gmail.com',     15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('keizaalmabs3@gmail.com',        15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('axeltjio123@gmail.com',         15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('andrewmarveldamanik@gmail.com', 15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('amelia.ulfi06@gmail.com',       15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('cindygracia3107@gmail.com',     15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('devancafy10@gmail.com',         15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('hanifhanif2340@gmail.com',      15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('dafiardian6@gmail.com',         15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('kheisyaauliazein@gmail.com',    15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('nabilanovenlia123@gmail.com',   15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('queenysansiviera@gmail.com',    15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('reia.avrileamori.id@gmail.com', 15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('wandapuspitasari2301@gmail.com',15, 'Evaluasi UAS Semester 2 - Juli 2026'),
  ('safirahestinuraini@gmail.com',  15, 'Evaluasi UAS Semester 2 - Juli 2026')
on conflict (email_lower) do nothing;
