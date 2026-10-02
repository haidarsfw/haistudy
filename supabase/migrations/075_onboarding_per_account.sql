-- ============================================================================
-- 075 — The tour is a once-per-PERSON thing, so remember it on the person
--
-- ✅ APPLIED to production 2026-10-02. The reader still falls back to the old
-- per-licence flag, which is what covers anyone who finished the tour earlier.
--
-- The flag lived on user_settings.onboarding_completed_at, and user_settings is
-- keyed by license_key. A licence is ONE EXAM PERIOD. So every time someone
-- bought the next period they got a brand-new key, an empty settings row, and
-- the whole twelve-step tour again — for an app they had already been using for
-- months. The code comment above that flag even claimed it was "once per
-- ACCOUNT"; it never was.
--
-- Nothing is migrated backwards on purpose. Anyone who finished the tour under
-- an older licence still has that row, and the reader checks both: this column
-- first, then the licence's own flag. Backfilling would mean deciding on behalf
-- of people we cannot ask, for no gain — the fallback already covers them.
-- ============================================================================

alter table accounts
  add column if not exists onboarding_completed_at timestamptz;

comment on column accounts.onboarding_completed_at is
  'When this PERSON finished or skipped the intro tour. Survives buying a new period; user_settings.onboarding_completed_at is the per-licence fallback for rows written before this column existed.';
