-- 090: clear the three security/performance advisor warnings the branch can own.
--
-- 1. gen_referral_code() and bump_referral_uses() ran with whatever
--    search_path the caller had (advisor 0011). Pin it, the same way
--    dm_is_participant / group_is_member are pinned. pg_temp goes last so a
--    temp table can never shadow a real one.
-- 2. group_messages_rt_select already evaluated auth.jwt() once, but wrote it
--    as (select (auth.jwt() ->> 'license_key')), a shape the advisor does not
--    recognise (0003). Rewritten in the ((select auth.jwt()) ->> ...) form that
--    the other 17 realtime policies use. Same rows match, before and after.
--
-- No DROP of any kind; ALTER only.

alter function public.gen_referral_code() set search_path = public, pg_temp;
alter function public.bump_referral_uses(p_code text) set search_path = public, pg_temp;

alter policy group_messages_rt_select on public.group_messages
  using (public.group_is_member(group_id, ((select auth.jwt()) ->> 'license_key')));
