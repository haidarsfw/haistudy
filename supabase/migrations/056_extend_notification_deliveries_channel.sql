-- 056_extend_notification_deliveries_channel.sql — allow webpush_dm channel
--
-- Adds 'webpush_dm' to the channel check constraint in notification_deliveries
-- to avoid transaction aborts on DM push notification sends.

ALTER TABLE notification_deliveries DROP CONSTRAINT IF EXISTS notification_deliveries_channel_check;
ALTER TABLE notification_deliveries ADD CONSTRAINT notification_deliveries_channel_check CHECK (channel IN ('webpush', 'email', 'webpush_dm'));
