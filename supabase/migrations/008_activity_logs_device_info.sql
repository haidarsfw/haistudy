ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS device_label TEXT;
