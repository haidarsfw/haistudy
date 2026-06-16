-- 046_progress_notes_scope_nesting.sql
-- Migrate user_settings.progress / .notes to the SCOPE-NESTED shape the app now
-- reads/writes:
--   progress = { "<scopeKey>": { "<subjectId>": {materi,...} } }
--   notes    = { "<scopeKey>": { "<subjectId>": "text", "__quickNote": "..." } }
--
-- Most rows are ALREADY nested (migration 022 wrapped them under the default
-- scope s2-uts-bm). This migration only fixes the stragglers that still hold
-- FLAT entries at the top level — and it handles MIXED rows (a nested scope map
-- PLUS a stray flat key, e.g. {"s2-uts-bm":{...},"__quickNote":"x"}) without
-- double-nesting the existing scope map.
--
-- Per row: split top-level entries into FLAT (string values for notes / objects
-- carrying "materi" for progress) vs KEPT (already-nested scope maps), then fold
-- the flat bucket under the license's own scope-key (default s2-uts-bm), merging
-- into an existing scope map if one is present. Idempotent: rows with no flat
-- entries are left untouched, so re-running is a no-op.

DO $$
DECLARE
  r RECORD;
  sk text;
  flat_notes jsonb;
  kept_notes jsonb;
  flat_prog jsonb;
  kept_prog jsonb;
BEGIN
  FOR r IN
    SELECT us.license_key, us.progress, us.notes,
           lk.semester, lk.exam_period, lk.jurusan
    FROM user_settings us
    LEFT JOIN license_keys lk ON lk.key = us.license_key
  LOOP
    sk := 's' || COALESCE(r.semester, 2)::text
          || '-' || COALESCE(r.exam_period, 'uts')
          || '-' || COALESCE(r.jurusan, 'bm');

    -- ===== NOTES: flat entries have STRING values =====
    IF r.notes IS NOT NULL AND jsonb_typeof(r.notes) = 'object'
       AND EXISTS (
         SELECT 1 FROM jsonb_each(r.notes) e WHERE jsonb_typeof(e.value) = 'string'
       )
    THEN
      SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
        INTO flat_notes
        FROM jsonb_each(r.notes) e WHERE jsonb_typeof(e.value) = 'string';
      SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
        INTO kept_notes
        FROM jsonb_each(r.notes) e WHERE jsonb_typeof(e.value) <> 'string';

      UPDATE user_settings
      SET notes = kept_notes
                  || jsonb_build_object(sk, COALESCE(kept_notes -> sk, '{}'::jsonb) || flat_notes)
      WHERE license_key = r.license_key;
    END IF;

    -- ===== PROGRESS: flat entries are SubjectProgress objects (have "materi") =====
    IF r.progress IS NOT NULL AND jsonb_typeof(r.progress) = 'object'
       AND EXISTS (
         SELECT 1 FROM jsonb_each(r.progress) e
         WHERE jsonb_typeof(e.value) = 'object' AND e.value ? 'materi'
       )
    THEN
      SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
        INTO flat_prog
        FROM jsonb_each(r.progress) e
        WHERE jsonb_typeof(e.value) = 'object' AND e.value ? 'materi';
      SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
        INTO kept_prog
        FROM jsonb_each(r.progress) e
        WHERE NOT (jsonb_typeof(e.value) = 'object' AND e.value ? 'materi');

      UPDATE user_settings
      SET progress = kept_prog
                     || jsonb_build_object(sk, COALESCE(kept_prog -> sk, '{}'::jsonb) || flat_prog)
      WHERE license_key = r.license_key;
    END IF;
  END LOOP;
END $$;
