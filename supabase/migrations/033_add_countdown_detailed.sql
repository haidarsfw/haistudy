-- 033_add_countdown_detailed.sql
-- Adds user_settings.countdown_detailed. The settings API (PUT /api/settings)
-- already writes this column (row.countdown_detailed) but the column never
-- existed, so every settings upsert failed with a 500 and cascaded to theme /
-- class / notes saves. Default true preserves the existing UI default
-- (Hari > Jam > Menit > Detik).
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS countdown_detailed boolean NOT NULL DEFAULT true;
