-- 053_exam_attempts_lock.sql — close a quota/score-integrity hole.
--
-- 050 created exam_attempts with fully permissive RLS (select/insert/update all
-- `true`), so the PUBLIC anon key could insert attempts (bypassing the quota
-- check in /api/exam/start) and update any attempt (tamper score_pct/status,
-- e.g. mark attempts 'abandoned' to refund quota or inflate scores).
--
-- Every exam_attempts access goes through the service_role in /api/exam/* and
-- /api/admin/* (which bypasses RLS), so no anon access is needed. Drop the
-- permissive policies → RLS stays ON with no policies → anon is fully denied,
-- service_role still works. Matches the locked-table pattern from 043/044.

drop policy if exists exam_attempts_select on public.exam_attempts;
drop policy if exists exam_attempts_insert on public.exam_attempts;
drop policy if exists exam_attempts_update on public.exam_attempts;
