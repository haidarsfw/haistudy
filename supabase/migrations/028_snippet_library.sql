-- ============================================
-- 028 — Snippet library (VIP saved highlights)
-- ============================================
-- VIP users can save highlighted rangkuman text to a personal library.
-- Scoped by (semester, exam_period, jurusan); owned by license_key.
-- RLS on with permissive SELECT (anon-side isolation via client filtering,
-- writes go through service_role in API routes guarded by requireScope).
-- Idempotent.

CREATE TABLE IF NOT EXISTS snippet_library (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key   text NOT NULL REFERENCES license_keys(key) ON DELETE CASCADE,
  semester      int  NOT NULL,
  exam_period   text NOT NULL,
  jurusan       text NOT NULL,
  subject_id    text,
  snippet_text  text NOT NULL CHECK (char_length(snippet_text) BETWEEN 1 AND 4000),
  source_module text,
  color         text CHECK (color IN ('yellow','blue','green','pink','red')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snippet_library_owner_scope_idx
  ON snippet_library (license_key, semester, exam_period, jurusan, created_at DESC);

CREATE INDEX IF NOT EXISTS snippet_library_subject_idx
  ON snippet_library (license_key, subject_id, created_at DESC);

ALTER TABLE snippet_library ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='snippet_library' AND policyname='snippet_library_select') THEN
    CREATE POLICY snippet_library_select ON snippet_library FOR SELECT USING (true);
  END IF;
END $$;
