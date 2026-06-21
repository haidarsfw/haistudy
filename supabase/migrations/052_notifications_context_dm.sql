-- 052_notifications_context_dm.sql — fix DM notifications never inserting.
--
-- notifyOnDmMessage stores the sender's LICENSE KEY in notifications.context
-- (the client reads it to open the DM: openDmTo(context)). The old
-- notifications_context_check only allowed ('chat','forum','system'), so every
-- dm_message insert threw → no in-app DM notification, no red-dot count (only
-- web-push, which runs from a separate code path, appeared to work).
--
-- context is fully app-controlled (never user input), so drop the over-strict
-- CHECK rather than trying to enumerate every possible license key.

alter table notifications drop constraint if exists notifications_context_check;
