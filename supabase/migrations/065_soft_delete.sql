-- 065_soft_delete.sql
--
-- Closing an account stops being instant and irreversible.
--
-- What it was: type "HAPUS AKUN SAYA" into a box and the row was gone on the
-- next request. No confirmation to the address that owns the account, no way
-- back, and blocked outright for anyone still holding paid access — which sent
-- exactly the people with the most to lose to the admin instead.
--
-- What it becomes: type your own e-mail, get a link sent to it, and the
-- deletion is only SCHEDULED — seven days, cancellable from a second link, and
-- carried out by the weekly-turned-daily cleanup job.
--
-- Additive only. Two CHECK constraints widen, one index appears. Nothing is
-- dropped and no row is touched.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Two more kinds of one-time link
-- ─────────────────────────────────────────────────────────────────────────
-- `delete` proves the request came from the mailbox that owns the account.
-- `delete_cancel` is the way back, and outlives the grace period on purpose:
-- a link that expires before the deletion happens is not an undo.
alter table account_tokens drop constraint if exists account_tokens_purpose_check;
alter table account_tokens add  constraint account_tokens_purpose_check
  check (purpose in ('verify', 'reset', 'delete', 'delete_cancel'));

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Somewhere to count deletion requests
-- ─────────────────────────────────────────────────────────────────────────
-- Rate-limited like every other e-mail-sending endpoint. Without it, one form
-- can be used to post mail to an address over and over.
alter table account_rate_events drop constraint if exists account_rate_events_kind_check;
alter table account_rate_events add  constraint account_rate_events_kind_check
  check (kind in (
    'login_fail', 'reset_request', 'verify_resend',
    'referral_check', 'nickname_check', 'delete_request'
  ));

-- ─────────────────────────────────────────────────────────────────────────
-- 3. The purge has to find its work cheaply
-- ─────────────────────────────────────────────────────────────────────────
-- Partial: almost every row has this column null, and the job only ever asks
-- for the handful that do not.
create index if not exists accounts_deletion_requested_idx
  on accounts (deletion_requested_at)
  where deletion_requested_at is not null;

comment on column accounts.deletion_requested_at is
  'Set when the holder confirms deletion by e-mail. The row is purged by
   /api/cron/cleanup-presence once this is more than 7 days old. Null means no
   deletion pending — cancelling writes null back.';
