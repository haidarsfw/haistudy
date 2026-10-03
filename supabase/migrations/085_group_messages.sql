-- 085 · Chat grup mentoring (B fase 1).
--
-- Satu tabel pesan per grup. Menulis HANYA lewat route API (service_role), yang
-- memeriksa keanggotaan. Realtime mengantar pesan baru hanya ke anggota grup itu:
-- policy SELECT memeriksa keanggotaan lewat license_key di JWT realtime (dicetak
-- /api/auth/realtime-token), lewat fungsi SECURITY DEFINER seperti
-- dm_is_participant di 044 — group_members dan license_keys sendiri terkunci dari
-- role authenticated, jadi subquery biasa di policy tidak akan pernah lolos.
--
-- Aturan free tier (FREE-TIER-GUARDRAILS.md, mig 058): tabel yang ikut realtime
-- wajib REPLICA IDENTITY FULL, supaya filter postgres_changes `group_id=eq.…`
-- diterima Postgres dan tidak memicu loop subscribe ulang.
--
-- `quote` + `quote_source`: "Tanya mentor" dari dalam modul — teks yang disorot
-- ikut sebagai kutipan, dengan asalnya (mis. "Statistik · Modul 3").
--
-- DITERAPKAN 2026-10-03 lewat MCP dalam DUA bagian, 085a_group_messages_table dan
-- 085b_group_messages_access, TANPA baris `drop policy if exists` (tabelnya baru,
-- policy-nya belum ada). Versi utuh dengan DROP POLICY dibatalkan empat kali oleh
-- langkah konfirmasi server MCP; isi efektifnya sama.

create table if not exists group_messages (
  id            uuid primary key default uuid_generate_v4(),
  group_id      uuid not null references mentor_groups(id) on delete cascade,
  account_id    uuid references accounts(id) on delete set null,
  author_name   text not null check (char_length(author_name) between 1 and 60),
  -- Peran saat menulis, dibekukan: mentor yang belakangan keluar tetap tercatat
  -- sebagai mentor di pesan lamanya.
  is_mentor     boolean not null default false,
  content       text not null check (char_length(content) between 1 and 2000),
  quote         text check (quote is null or char_length(quote) <= 600),
  quote_source  text check (quote_source is null or char_length(quote_source) <= 120),
  deleted       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists group_messages_group_time
  on group_messages (group_id, created_at desc);

alter table group_messages replica identity full;
alter table group_messages enable row level security;

create or replace function public.group_is_member(p_group_id uuid, p_license_key text)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from license_keys l
    join group_members m on m.account_id = l.account_id
    where l.key = p_license_key
      and m.group_id = p_group_id
      and m.status = 'active'
  ) or exists (
    select 1
    from license_keys l
    join mentor_groups g on g.owner_account_id = l.account_id
    where l.key = p_license_key
      and g.id = p_group_id
  );
$$;
revoke execute on function public.group_is_member(uuid, text) from public, anon;
grant  execute on function public.group_is_member(uuid, text) to authenticated, service_role;

drop policy if exists group_messages_rt_select on group_messages;
create policy group_messages_rt_select on group_messages for select to authenticated
  using (public.group_is_member(group_id, (select auth.jwt() ->> 'license_key')));

-- Default privileges hand `authenticated` everything on a new table, TRUNCATE
-- included, and TRUNCATE ignores RLS. Take it all back, then give back only the
-- read that Realtime needs. Writes go through the API (service_role).
revoke all on group_messages from anon, authenticated;
grant select on group_messages to authenticated;

alter publication supabase_realtime add table group_messages;
