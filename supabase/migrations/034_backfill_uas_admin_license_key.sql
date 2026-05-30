-- 034_backfill_uas_admin_license_key.sql
-- UAS admin chat messages created before 032_chat_messages_license_key landed
-- have license_key = NULL, so the profile popover can't resolve a PublicProfile
-- and shows no status/bio/class. The only admin key in this cohort is ADMIN1
-- (whose profile already carries bio/status), so backfill those rows. New admin
-- messages already denormalize license_key from the hs-session cookie in
-- POST /api/chat/messages, so this is a one-time historical fix.
UPDATE chat_messages
SET license_key = 'ADMIN1'
WHERE exam_period = 'uas'
  AND is_admin = true
  AND license_key IS NULL;
