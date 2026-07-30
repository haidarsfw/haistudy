-- ============================================================
-- 066 — Identity migration, STAGE 1 of 4: expand
-- ============================================================
--
-- Adds a nullable `account_id` beside the existing `license_key` on the tables
-- that hold things belonging to a PERSON, and backfills it from the licence.
--
-- WHAT THIS DOES NOT DO
--   Nothing reads these columns yet. No code changes in this stage, no
--   behaviour changes, no reads switched, nothing dropped, nothing rewritten.
--   Applying this to a live database changes what the application does by
--   exactly zero. That is the point: the risky part of an identity migration is
--   the read switch, and this stage separates the schema from it entirely.
--
-- WHY account_id AND license_key BOTH
--   A licence expires and is replaced every exam period. Progress, notes,
--   bookmarks and exam history keyed to it therefore die with it — buy Semester
--   3 and your own history from Semester 2 belongs to a key you no longer hold.
--   The account is the thing that persists, so it becomes the owner. The licence
--   column stays because it is still what proves ACCESS, and because keeping it
--   is what makes every stage of this reversible.
--
-- ON DELETE SET NULL, deliberately
--   Closing an account must not erase a class chat or a purchase record. The row
--   keeps its license_key and survives as history that is no longer attributable
--   to a person — the same choice already made for purchase_requests and
--   license_keys in migration 065.
--
-- NO INDEXES YET
--   A foreign key does not need one, and nothing queries by account_id in this
--   stage. Indexes get added per surface, when a read actually moves, so the
--   free-tier disk budget only pays for lookups that exist. (See migration 047,
--   where unused indexes were removed for exactly this reason.)
--
-- TO REVERT
--   alter table <t> drop column if exists account_id;
--   ... for each table below. No data is lost by doing so: every row still
--   carries the license_key it had before this ran.
--
-- Coverage at time of writing: 237 licences, 32 of them attached to an account.
-- The other 205 are licence holders from the Google-Forms era who never had an
-- account, so their rows keep account_id null. That is correct, not a gap.
-- ============================================================

-- ─── The ten tables that hold a person's own things ───

alter table user_settings      add column if not exists account_id uuid references accounts(id) on delete set null;
alter table user_profiles      add column if not exists account_id uuid references accounts(id) on delete set null;
alter table user_notes         add column if not exists account_id uuid references accounts(id) on delete set null;
alter table bookmarks          add column if not exists account_id uuid references accounts(id) on delete set null;
alter table exam_attempts      add column if not exists account_id uuid references accounts(id) on delete set null;
alter table snippet_library    add column if not exists account_id uuid references accounts(id) on delete set null;
alter table notifications      add column if not exists account_id uuid references accounts(id) on delete set null;
alter table ai_conversations   add column if not exists account_id uuid references accounts(id) on delete set null;
alter table analytics_sessions add column if not exists account_id uuid references accounts(id) on delete set null;
alter table feedback           add column if not exists account_id uuid references accounts(id) on delete set null;

-- ─── Backfill from the licence that owns each row ───
--
-- Guarded with `account_id is null` so re-running this cannot overwrite a value
-- that later code has already written, and so the whole migration stays
-- idempotent. Rows whose licence has no account are left alone.

update user_settings s      set account_id = lk.account_id from license_keys lk where lk.key = s.license_key and lk.account_id is not null and s.account_id is null;
update user_profiles p      set account_id = lk.account_id from license_keys lk where lk.key = p.license_key and lk.account_id is not null and p.account_id is null;
update user_notes n         set account_id = lk.account_id from license_keys lk where lk.key = n.license_key and lk.account_id is not null and n.account_id is null;
update bookmarks b          set account_id = lk.account_id from license_keys lk where lk.key = b.license_key and lk.account_id is not null and b.account_id is null;
update exam_attempts a      set account_id = lk.account_id from license_keys lk where lk.key = a.license_key and lk.account_id is not null and a.account_id is null;
update snippet_library l    set account_id = lk.account_id from license_keys lk where lk.key = l.license_key and lk.account_id is not null and l.account_id is null;
update notifications t      set account_id = lk.account_id from license_keys lk where lk.key = t.license_key and lk.account_id is not null and t.account_id is null;
update ai_conversations c   set account_id = lk.account_id from license_keys lk where lk.key = c.license_key and lk.account_id is not null and c.account_id is null;
update analytics_sessions x set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update feedback f           set account_id = lk.account_id from license_keys lk where lk.key = f.license_key and lk.account_id is not null and f.account_id is null;
