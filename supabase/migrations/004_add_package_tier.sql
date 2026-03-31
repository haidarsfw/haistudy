-- Add package_tier column to license_keys for AI tier routing
ALTER TABLE license_keys
  ADD COLUMN package_tier text NOT NULL DEFAULT 'normal'
  CHECK (package_tier IN ('share', 'normal', 'vip'));
