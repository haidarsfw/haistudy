-- Pin search_path on SECURITY-relevant functions.
-- Prevents a role with CREATE on a schema earlier in search_path from hijacking
-- function resolution (search_path injection). All three functions were flagged
-- by Supabase security advisor lint 0011_function_search_path_mutable.
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.update_thread_comment_count() SET search_path = public;
ALTER FUNCTION public.increment_license_field(text, text, integer) SET search_path = public;
