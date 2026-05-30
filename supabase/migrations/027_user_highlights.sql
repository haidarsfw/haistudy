-- ============================================
-- 027 — Rangkuman highlights (per-user JSONB)
-- ============================================
-- Stores text highlights keyed by scopeKey:subjectId:moduleKey -> UserHighlight[].
-- Default '{}' so existing rows are valid without backfill.
-- Idempotent.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '{}'::jsonb;
