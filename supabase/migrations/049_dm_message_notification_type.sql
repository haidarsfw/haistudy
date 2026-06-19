-- ============================================
-- 049 — Allow 'dm_message' notification type (DM bell + chat red dot)
-- ============================================
-- The DM notify path (src/lib/notifications/fan-out.ts → notifyOnDmMessage)
-- inserts a notifications row with type = 'dm_message'. But the
-- notifications_type_check constraint (last set in migration 021) never listed
-- 'dm_message', so every DM-notify INSERT violated the CHECK and died silently
-- inside the DM route's waitUntil(...).catch(). Result: DMs produced no bell
-- entry and no bottom-right chat red dot ("kgk ada notifnya").
--
-- Add 'dm_message', and reserve 'patch_note' for a future server-driven
-- changelog (the client-side patch-notes feature does not use it yet).
-- ============================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'mention', 'mention_all', 'thread_reply', 'announcement',
    'forum_thread', 'poll_vote', 'poll_result', 'comment_reply',
    'support_message', 'dm_message', 'patch_note'
  ));
