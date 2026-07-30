-- ============================================================
-- 068 — Identity migration, STAGE 1 correction: narrow the surface
-- ============================================================
--
-- 066 and 067 added `account_id` to twenty tables. Seven of them were a mistake,
-- and this removes those seven before any code depends on them.
--
-- The test each column has to pass is simple: will anything ever READ it? A
-- column that is backfilled once and never written again ends up permanently
-- part-filled — and a part-filled column is worse than a missing one, because
-- the next person to see it will reasonably query by it and get an answer that
-- is quietly wrong for most rows.
--
-- These seven fail that test:
--
--   notifications            A notification is about one exam period. "Semester
--                            2 UAS announcement" means nothing in Semester 3, so
--                            there is no continuity to preserve. 3863 rows, nine
--                            separate fan-out insert sites, no payoff.
--   presence                 Rewritten every 60 seconds and deleted after 7
--                            days. Realtime write volume already took this
--                            database down once (migration 057), so adding an
--                            ownership lookup per heartbeat is a cost with a
--                            negative return.
--   chat_read_positions      Where someone had read up to, in a room that
--   support_read_receipts    belongs to one cohort. Meaningless once the period
--   support_reactions        ends, and none of it is worth carrying forward.
--   support_pinned_messages
--   voice_participants       Ephemeral by construction.
--
-- Kept, and dual-written from stage 2 on: user_settings, user_profiles,
-- user_notes, bookmarks, exam_attempts, snippet_library, ai_conversations,
-- analytics_sessions, feedback, chat_messages, support_messages, dm_reads,
-- push_subscriptions. Every one of those either holds something a person should
-- keep across periods, or records who wrote something that should stay
-- attributable after their licence lapses.
--
-- NOT DESTRUCTIVE: every one of these rows still carries the license_key it has
-- always had. Dropping account_id here removes a value that was derived from
-- that licence a few minutes ago and can be derived again at any time.
--
-- TO REVERT: re-run 067 — it is written to be idempotent, so it will re-add and
-- re-backfill these columns exactly as before.
-- ============================================================

alter table notifications            drop column if exists account_id;
alter table presence                 drop column if exists account_id;
alter table chat_read_positions      drop column if exists account_id;
alter table support_read_receipts    drop column if exists account_id;
alter table support_reactions        drop column if exists account_id;
alter table support_pinned_messages  drop column if exists account_id;
alter table voice_participants       drop column if exists account_id;
