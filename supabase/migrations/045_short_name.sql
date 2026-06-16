-- 045_short_name.sql
-- Short name / nickname (Round-14 UX polish).
-- Users supply a short "nama panggilan" at order time (payments form) or admin
-- quick-gen. It is shown everywhere in-app instead of the full legal name.
-- Existing users / NULL fall back to the first word of the full name (resolved
-- in app code, see src/lib/name.ts). The full name stays for admin records.
-- Purchase nickname is stored in purchase_requests.meta.nickname (jsonb), so no
-- column is needed there.

alter table public.license_keys add column if not exists short_name text;
alter table public.activations  add column if not exists short_name text;
