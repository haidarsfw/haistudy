-- ============================================================================
-- 074 — "Ajak teman" nudge: remembering that someone said no
--
-- ⚠️ NOT APPLIED YET. Written ahead of the code that uses it so everything
-- pending can be applied in one sitting.
--
-- After a purchase the app shows an occasional modal: invite five friends and
-- the next period is free. Occasional is the whole design — it appears now and
-- then, not on every entry — and it carries a "jangan tampilkan lagi".
--
-- That answer belongs to the PERSON, not to the browser. localStorage would
-- forget it on their phone after they dismissed it on a laptop, and the modal
-- would come back to someone who has already declined twice. Being asked again
-- after saying no is the part people actually resent.
--
-- One nullable timestamp rather than a boolean: it answers "did they say no"
-- and "when" with the same column, which is the difference between knowing the
-- feature is unwanted and knowing it was dismissed once in June.
-- ============================================================================

alter table user_settings
  add column if not exists invite_nudge_dismissed_at timestamptz;

comment on column user_settings.invite_nudge_dismissed_at is
  'When the referral nudge modal was dismissed for good. Null = still eligible.';
