-- 064_nickname_rules.sql
--
-- The nickname becomes a real identifier.
--
-- Until now it was free text: any length, any characters, duplicates allowed,
-- changeable at will. That was fine while it was only a greeting. It is now
-- three things at once — the name everyone sees in chat, the thing the personal
-- referral code is built from, and the label on a leaderboard — and each of
-- those breaks in a different way when two people share one.
--
-- Four changes, in order:
--   1. Tidy what is already stored, and break the one collision that exists.
--   2. Make collisions impossible from here on.
--   3. Give renaming a budget: one per exam period bought.
--   4. Rebuild personal referral codes on top of nicknames, keeping every old
--      code alive so nothing anyone has already shared stops working.
--
-- Measured against production before writing this: 32 accounts, none with
-- spaces, none with punctuation, none too short or too long, and exactly one
-- duplicated name ("haidar", three accounts, all belonging to the owner).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Tidy the existing names
-- ─────────────────────────────────────────────────────────────────────────
-- Every word gets a capital, the rest go lowercase: "fathan rizqi" becomes
-- "Fathan Rizqi". Decided for people rather than policed — "FATHAN", "fathan"
-- and "FaThAn" are one person's intent. `initcap` does exactly this.
update accounts
set nickname = initcap(regexp_replace(trim(nickname), '\s+', ' ', 'g'))
where nickname <> ''
  and nickname <> initcap(regexp_replace(trim(nickname), '\s+', ' ', 'g'));

-- Break duplicates, oldest account keeps the name it has been using.
--
-- The replacement is built entirely from the person's OWN full name: growing
-- prefixes of the name that follows the one they took, so "Haidar" becomes
-- "Haidar S", then "Haidar Sh", then "Haidar Sho". No counters — a number says
-- nothing true about anyone.
--
-- If nothing free can be built, the name is left alone and the unique index
-- below refuses to create, which rolls the whole migration back. That is the
-- correct outcome: better a failed migration than silently renamed people.
do $$
declare
  r         record;
  words     text[];
  at_pos    int;
  candidate text;
  w         text;
  i         int;
  len       int;
begin
  for r in
    select a.id, a.nickname, a.full_name
    from accounts a
    join (
      select lower(nickname) as ln
      from accounts
      where nickname <> ''
      group by 1
      having count(*) > 1
    ) d on d.ln = lower(a.nickname)
    where a.id <> (
      select a2.id from accounts a2
      where lower(a2.nickname) = lower(a.nickname)
      order by a2.created_at asc, a2.id asc
      limit 1
    )
  loop
    words := array_remove(
      string_to_array(regexp_replace(coalesce(r.full_name, ''), '[^A-Za-z ]', '', 'g'), ' '),
      ''
    );
    -- Where in their full name the nickname's FIRST word sits, so someone
    -- called "Muhammad Fathan Umari" asking for "Fathan" is offered the U, not
    -- the M.
    at_pos := coalesce(array_position(
      array(select lower(x) from unnest(words) x),
      lower(split_part(r.nickname, ' ', 1))
    ), 1);

    candidate := null;

    for i in (at_pos + 1)..coalesce(array_length(words, 1), 0) loop
      w := words[i];
      for len in 1..length(w) loop
        candidate := split_part(r.nickname, ' ', 1) || ' ' || left(w, len);
        exit when not exists (
          select 1 from accounts where lower(nickname) = lower(candidate)
        );
        candidate := null;
      end loop;
      exit when candidate is not null;
    end loop;

    if candidate is not null then
      candidate := initcap(left(candidate, 20));
      update accounts set nickname = candidate where id = r.id;
      raise notice 'nickname collision: % -> %', r.nickname, candidate;
    else
      raise notice 'nickname collision UNRESOLVED for account % (%)', r.id, r.nickname;
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. No two people share a name
-- ─────────────────────────────────────────────────────────────────────────
-- Partial, because an account created before its first checkout genuinely has
-- no nickname yet, and empty strings must not fight each other over it.
create unique index if not exists accounts_nickname_unique
  on accounts (lower(nickname))
  where nickname <> '';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Renaming has a budget
-- ─────────────────────────────────────────────────────────────────────────
alter table accounts
  add column if not exists nickname_changes_left integer not null default 0;

comment on column accounts.nickname_changes_left is
  'Renames still owed. +1 per approved purchase, -1 per rename. Never frozen: a
   typo at a first checkout should not follow someone for a year.';

-- Ledger, so approving the same purchase twice cannot hand out two renames.
-- A counter column alone would have no way to know it had already paid out.
create table if not exists nickname_change_grants (
  purchase_id uuid primary key references purchase_requests(id) on delete cascade,
  account_id  uuid not null references accounts(id) on delete cascade,
  granted_at  timestamptz not null default now()
);

alter table nickname_change_grants enable row level security;
revoke all on nickname_change_grants from anon, authenticated;

create or replace function grant_nickname_change(
  p_account_id uuid,
  p_purchase_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into nickname_change_grants (purchase_id, account_id)
  values (p_purchase_id, p_account_id)
  on conflict (purchase_id) do nothing;

  -- Only when the insert actually happened. `found` is false on a conflict,
  -- which is exactly what makes a second approval a no-op.
  if found then
    update accounts
    set nickname_changes_left = nickname_changes_left + 1
    where id = p_account_id;
  end if;
end $$;

revoke all on function grant_nickname_change(uuid, uuid) from public, anon, authenticated;

-- Backfill: everyone who has already bought something is owed one, and the
-- purchases that earned it are recorded so the ledger is not lying about how
-- the number got there.
insert into nickname_change_grants (purchase_id, account_id)
select distinct on (pr.account_id) pr.id, pr.account_id
from purchase_requests pr
where pr.status = 'approved'
  and pr.account_id is not null
order by pr.account_id, pr.created_at asc
on conflict (purchase_id) do nothing;

update accounts a
set nickname_changes_left = 1
where nickname_changes_left = 0
  and exists (select 1 from nickname_change_grants g where g.account_id = a.id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Personal referral codes get rebuilt on the nickname
-- ─────────────────────────────────────────────────────────────────────────
-- REF-4CCB-WERC works fine when it is copied and pasted and not at all when it
-- is spoken across a table or retyped from a WhatsApp message. HAIDAR42 does
-- both. The two trailing characters are what let two people called Haidar each
-- have one, and what keeps a code valid after its owner renames themselves.
--
-- Nothing is deleted. The old string stays in the table as a `legacy` row
-- pointing at the same account, so it still resolves, still credits the same
-- person, and still blocks self-referral. Anyone who wrote the old code down
-- keeps a working code forever, and nobody has to be told anything.
do $$
declare
  r       record;
  stem    text;
  newcode text;
  n       int;
begin
  for r in
    select rc.code as oldcode, rc.account_id, a.nickname
    from referral_codes rc
    join accounts a on a.id = rc.account_id
    where rc.kind = 'account'
  loop
    -- Spaces dropped: "Fathan R" becomes the stem FATHANR, so the code stays
    -- one token that can be typed without a space bar.
    stem := upper(regexp_replace(coalesce(r.nickname, ''), '[^A-Za-z0-9]', '', 'g'));
    stem := left(stem, 16);
    -- Nothing usable to build on. A code invented from nothing would be worse
    -- than the random one it replaced, so that account keeps what it has.
    continue when length(stem) < 3;

    newcode := null;
    for n in 1..12 loop
      -- Same alphabet as the licence generator: no 0/O/1/I/L, because these
      -- get read off a phone screen and retyped by hand.
      newcode := stem || (
        select string_agg(
          substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1),
          ''
        )
        from generate_series(1, 2)
      );
      exit when not exists (select 1 from referral_codes where code = newcode);
      newcode := null;
    end loop;

    if newcode is null then
      raise notice 'could not mint a code for %, left as is', r.oldcode;
      continue;
    end if;

    -- Retire first, then mint. The one-personal-code-per-account index only
    -- looks at kind = 'account', so the order here is what keeps it satisfied.
    update referral_codes set kind = 'legacy' where code = r.oldcode;
    insert into referral_codes (code, kind, account_id, label)
    values (newcode, 'account', r.account_id, '');

    raise notice 'referral code: % -> %', r.oldcode, newcode;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. The nickname availability check needs somewhere to be counted
-- ─────────────────────────────────────────────────────────────────────────
alter table account_rate_events drop constraint if exists account_rate_events_kind_check;
alter table account_rate_events add  constraint account_rate_events_kind_check
  check (kind in ('login_fail', 'reset_request', 'verify_resend', 'referral_check', 'nickname_check'));
