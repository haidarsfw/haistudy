-- 048_dm_read_state.sql
-- Per-participant last-read pointer for DM read receipts + unread counts.
-- Light by design (free-tier Disk IO aware):
--   * one row per (conversation, participant) — 2 rows per 1:1 chat
--   * written only when a user OPENS / focuses a conversation (not per message)
--   * NOT added to the realtime publication (no WAL-decode overhead)
--   * accessed only via service_role API routes (RLS on, no public policy)

create table if not exists public.dm_reads (
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  license_key text not null,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, license_key)
);

alter table public.dm_reads enable row level security;
-- No anon/authenticated policy: reads/writes go through service_role API routes
-- (validated by requireScope + participant check), matching the app's threat model.
