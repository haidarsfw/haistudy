-- ============================================
-- Fix presence RLS, voice room UUIDs, increment COALESCE
-- ============================================

-- 1. Add missing columns to voice_rooms (used by app code but missing from schema)
ALTER TABLE voice_rooms ADD COLUMN IF NOT EXISTS creator_id text;
ALTER TABLE voice_rooms ADD COLUMN IF NOT EXISTS creator_name text;
ALTER TABLE voice_rooms ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
ALTER TABLE voice_rooms ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;

-- 2. Insert seed rooms with deterministic UUIDs
--    These match the SEED_ROOMS constant in src/app/api/voice/rooms/route.ts
INSERT INTO voice_rooms (id, name, description, max_participants, is_custom)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Study Bareng', 'Belajar bareng, diskusi materi', 10, false),
  ('00000000-0000-4000-8000-000000000002', 'Diskusi Materi', 'Bahas soal dan materi kuliah', 8, false),
  ('00000000-0000-4000-8000-000000000003', 'Chill Zone', 'Ngobrol santai, istirahat sejenak', 6, false),
  ('00000000-0000-4000-8000-000000000004', 'Focus Mode', 'Belajar fokus, minimal obrolan', 4, false)
ON CONFLICT (id) DO NOTHING;

-- 3. Fix increment function: use COALESCE so NULL + N doesn't stay NULL
--    SECURITY DEFINER so it works when called via anon key fallback
CREATE OR REPLACE FUNCTION increment_license_field(p_key text, p_field text, p_amount integer)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE license_keys SET %I = COALESCE(%I, 0) + $1, updated_at = now() WHERE key = $2',
    p_field, p_field
  ) USING p_amount, p_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add write policies for presence table
--    Currently only SELECT exists — client-side cleanup and server-side heartbeat need INSERT/UPDATE/DELETE
CREATE POLICY "Public insert presence" ON presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update presence" ON presence FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete presence" ON presence FOR DELETE USING (true);
