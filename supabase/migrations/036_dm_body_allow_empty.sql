-- 036_dm_body_allow_empty.sql
-- dm_messages_body_check (char_length(body) >= 1) rejects media messages with no
-- caption (image without text, voice note body='') and blocks soft-delete
-- (SET body=''). chat_messages has no such constraint. Align them: allow an
-- empty body, cap only the maximum length.
--
-- IF NOT EXISTS is not valid for ADD CONSTRAINT, so DROP ... IF EXISTS first
-- (idempotent) then ADD.
ALTER TABLE dm_messages DROP CONSTRAINT IF EXISTS dm_messages_body_check;
ALTER TABLE dm_messages
  ADD CONSTRAINT dm_messages_body_check
  CHECK (char_length(body) <= 2000);
