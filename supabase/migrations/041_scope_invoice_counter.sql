-- ────────────────────────────────────────────────────────────────────
-- 041 — Per-scope invoice counter
-- ────────────────────────────────────────────────────────────────────
-- Replaces the count(*)-based per-period order number in /api/payments with a
-- dedicated, atomic counter so the buyer invoice number is gap-free and never
-- collides under concurrent submissions. Also lets an admin RESET numbering
-- per scope (manual button) and auto-reset on "Hapus Semua Order".
--
-- Shape mirrors scope_feature_flags (022). RLS on, NO policies: the service_role
-- API bypasses RLS and the counter is never read client-side.
-- Backward-compatible: old count(*) code ignores this table, so it can be applied
-- before the new code deploys.

create table if not exists scope_invoice_counter (
  semester    int  not null,
  exam_period text not null,
  jurusan     text not null,
  value       int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (semester, exam_period, jurusan),
  check (semester between 1 and 14),
  check (exam_period in ('uts','uas')),
  check (jurusan ~ '^[a-z0-9-]{1,16}$')
);

alter table scope_invoice_counter enable row level security;
-- No policies: service_role (API) bypasses RLS; counter is never read client-side.

-- Atomic "next invoice number" for a scope. First call seeds 1; subsequent calls
-- increment. search_path pinned per the 022 hardening convention.
create or replace function next_scope_invoice(p_sem int, p_exam text, p_jur text)
returns int language sql
set search_path = public as $$
  insert into public.scope_invoice_counter (semester, exam_period, jurusan, value)
  values (p_sem, p_exam, p_jur, 1)
  on conflict (semester, exam_period, jurusan)
  do update set value = scope_invoice_counter.value + 1, updated_at = now()
  returning value;
$$;

-- Backfill: seed each existing scope's counter to its current order count so
-- the next number continues (no restart for live scopes).
insert into scope_invoice_counter (semester, exam_period, jurusan, value)
select semester, exam_period, jurusan, count(*)
from purchase_requests
group by semester, exam_period, jurusan
on conflict (semester, exam_period, jurusan) do nothing;
