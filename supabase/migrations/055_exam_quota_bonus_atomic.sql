-- 055_exam_quota_bonus_atomic.sql
-- Atomic credit of exam-quota top-up bonus. Replaces the read-modify-write in
-- /api/admin/purchase (approve) which could lose an update if two approvals for
-- the same (license_key, scope_key, subject_id) ran concurrently.
--
-- SECURITY INVOKER: the only caller is the approve route via the service_role
-- key (which bypasses RLS), so the upsert succeeds; anon/authenticated have no
-- RLS policy on exam_quota_overrides and EXECUTE is revoked from PUBLIC anyway.
-- INVOKER (not DEFINER) keeps it off the SECURITY DEFINER advisor (lint 0029).
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.add_exam_quota_bonus(text, text, text, integer);

CREATE OR REPLACE FUNCTION public.add_exam_quota_bonus(
  p_license_key text,
  p_scope_key   text,
  p_subject_id  text,
  p_qty         integer
) RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO public.exam_quota_overrides AS o
    (license_key, scope_key, subject_id, bonus, updated_at, updated_by)
  VALUES (p_license_key, p_scope_key, p_subject_id, GREATEST(0, p_qty), now(), 'purchase-approve')
  ON CONFLICT (license_key, scope_key, subject_id)
  DO UPDATE SET bonus = o.bonus + EXCLUDED.bonus,
                updated_at = now(),
                updated_by = 'purchase-approve'
  RETURNING bonus;
$$;

REVOKE EXECUTE ON FUNCTION public.add_exam_quota_bonus(text, text, text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.add_exam_quota_bonus(text, text, text, integer) TO service_role;
