-- ============================================
-- 025 — Custom accent color (VIP theming)
-- ============================================
-- Adds a per-user custom accent stored as HSL: {"h":n,"s":n,"l":n} | null.
-- VIP/admin can pick a custom primary color; free users keep preset themes.
-- Idempotent: re-create on disk only; already applied to remote.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS custom_accent jsonb;
