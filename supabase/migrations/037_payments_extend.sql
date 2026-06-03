-- 037_payments_extend.sql
-- In-app purchases (/payments) + Diamond tier rollout.
--
-- The legacy CHECK on purchase_requests.package was ('discount','normal','free')
-- which would REJECT the new on-site form's packages (share/vip/diamond) and the
-- existing /api/webhooks/purchase ALLOWED_PACKAGES set. Widen it to the union of
-- old + new so historical rows survive and new submissions insert cleanly.
--
-- Adds rich form metadata + private proof-of-payment / proof-of-share file paths.
-- The bucket is PRIVATE: only the service_role (API routes) uploads, and admin
-- reads via short-lived signed URLs. No public policy is created on purpose.

-- 1) Widen package CHECK (union legacy + new, so old rows are not invalidated)
alter table purchase_requests drop constraint if exists purchase_requests_package_check;
alter table purchase_requests add constraint purchase_requests_package_check
  check (package in ('share', 'normal', 'vip', 'diamond', 'discount', 'free'));

-- 2) Rich form fields + proof paths
--    meta = { classCode, campus, deviceLimit, paymentMethod, uniqueAmount,
--             basePrice, source, sourceOther, leShareNote, scopeKey }
alter table purchase_requests
  add column if not exists meta jsonb not null default '{}'::jsonb,
  add column if not exists payment_proof_path text,
  add column if not exists share_proof_path text;

-- 3) Private bucket for payment / share proofs (within free quota, not public)
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;
