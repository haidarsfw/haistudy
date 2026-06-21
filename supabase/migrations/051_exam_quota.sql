-- 051_exam_quota.sql — Exam quota credit model (Round-3 B1/B2)
--
-- Decouples consumable quota from raw attempt history so quota can be reset and
-- topped-up without deleting attempts:
--   * exam_quota_overrides: per (license_key, scope_key, subject_id) bonus
--     credits (admin adjust + IAP top-up) and an optional reset_at marker.
--     Consumption counts only attempts started at/after the LATER of a global
--     epoch (EXAM_QUOTA_EPOCH in src/lib/exam/quota.ts) and this reset_at.
--   * purchase_requests.package gains 'exam_quota' for in-app top-up orders.
--   * notifications.type gains 'exam_quota' for the top-up confirmation.

create table if not exists exam_quota_overrides (
  license_key text not null,
  scope_key   text not null,
  subject_id  text not null,
  bonus       integer not null default 0,
  reset_at    timestamptz,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (license_key, scope_key, subject_id)
);

-- Writes flow through the service_role key in API routes (admin guard / approve).
-- service_role bypasses RLS, so enable RLS with NO policies → the public anon key
-- can neither read nor write quota overrides.
alter table exam_quota_overrides enable row level security;

-- purchase_requests.package: add the IAP top-up kind (keep every legacy value).
alter table purchase_requests drop constraint if exists purchase_requests_package_check;
alter table purchase_requests add constraint purchase_requests_package_check
  check (package in ('share','normal','vip','diamond','discount','free','exam_quota'));

-- notifications.type: add the quota top-up confirmation (keep every LIVE value;
-- mirrors the production constraint as of migration 049 + 'exam_quota').
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'mention','mention_all','thread_reply','announcement','forum_thread',
    'poll_vote','poll_result','comment_reply','support_message','dm_message',
    'patch_note','exam_quota'
  ));
