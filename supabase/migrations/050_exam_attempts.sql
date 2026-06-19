-- 050: Latihan Soal (Practice Exam) - per-user exam attempts with tiered quotas
-- Stores exam attempt state, user answers, and AI grading results.
-- Quota enforcement: count non-abandoned attempts per user+scope+subject.

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  license_key text not null references public.license_keys(key) on delete cascade,
  scope_key text not null,
  subject_id text not null,
  exam_id text not null,
  answers jsonb not null default '[]',
  grading_results jsonb,
  total_score numeric(5,1),
  max_score integer not null default 100,
  score_pct numeric(5,1),
  started_at timestamptz not null,
  submitted_at timestamptz,
  duration_used_seconds integer,
  exam_language text not null default 'id',
  auto_submitted boolean not null default false,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'graded', 'abandoned')),
  created_at timestamptz not null default now()
);

-- Quota enforcement: fast count of non-abandoned attempts per user+scope+subject
create index if not exists idx_exam_attempts_quota
  on public.exam_attempts(license_key, scope_key, subject_id)
  where status != 'abandoned';

-- History: fetch user's attempts ordered by date
create index if not exists idx_exam_attempts_history
  on public.exam_attempts(license_key, scope_key, subject_id, created_at desc);

-- RLS
alter table public.exam_attempts enable row level security;

create policy exam_attempts_select on public.exam_attempts
  for select using (true);

create policy exam_attempts_insert on public.exam_attempts
  for insert with check (true);

create policy exam_attempts_update on public.exam_attempts
  for update using (true);
