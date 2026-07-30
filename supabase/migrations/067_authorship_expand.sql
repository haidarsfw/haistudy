-- ============================================================
-- 067 — Identity migration, STAGE 1 of 4 (part two): authorship
-- ============================================================
--
-- Same shape as 066 and the same guarantees: nullable column, backfilled,
-- nothing reads it, nothing dropped, revert by dropping the column.
--
-- 066 covered the things a person OWNS. This covers the things a person WROTE
-- in a shared room — class chat, support threads, reactions, read positions,
-- presence. The licence is the wrong author for all of them: it expires, and
-- when it does, every message that person ever sent stops being traceable to
-- anyone. Authorship should outlive access.
--
-- These stay keyed on license_key as well, because a room is scoped to a cohort
-- and the licence is what proves someone belonged to it.
--
-- NOT INCLUDED, on purpose — the licence is the correct owner here, and moving
-- these would be wrong rather than merely unnecessary:
--   activations           an activation is of a licence, by definition
--   device_releases       a device slot belongs to a licence's quota
--   exam_quota_overrides  a quota granted against one licence
--   oauth_links           legacy sign-in bridge, being retired
--   password_reset_tokens legacy, superseded by account_tokens
--
-- TO REVERT
--   alter table <t> drop column if exists account_id;   -- for each table below
-- ============================================================

alter table chat_messages           add column if not exists account_id uuid references accounts(id) on delete set null;
alter table chat_read_positions     add column if not exists account_id uuid references accounts(id) on delete set null;
alter table support_messages        add column if not exists account_id uuid references accounts(id) on delete set null;
alter table support_read_receipts   add column if not exists account_id uuid references accounts(id) on delete set null;
alter table support_reactions       add column if not exists account_id uuid references accounts(id) on delete set null;
alter table support_pinned_messages add column if not exists account_id uuid references accounts(id) on delete set null;
alter table dm_reads                add column if not exists account_id uuid references accounts(id) on delete set null;
alter table presence                add column if not exists account_id uuid references accounts(id) on delete set null;
alter table voice_participants      add column if not exists account_id uuid references accounts(id) on delete set null;
alter table push_subscriptions      add column if not exists account_id uuid references accounts(id) on delete set null;

-- Backfill, idempotent and guarded exactly as in 066.

update chat_messages x           set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update chat_read_positions x     set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update support_messages x        set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update support_read_receipts x   set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update support_reactions x       set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update support_pinned_messages x set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update dm_reads x                set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update presence x                set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update voice_participants x      set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
update push_subscriptions x      set account_id = lk.account_id from license_keys lk where lk.key = x.license_key and lk.account_id is not null and x.account_id is null;
