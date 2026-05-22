-- ============================================
-- 023 — Admin scope columns
-- ============================================
-- Two admin-touched tables were left out of migration 022:
--   - feedback (added in migration 011)
--   - purchase_requests (added in migration 001)
-- Add the same (semester, exam_period, jurusan) trio so admin tabs
-- (Feedback, Purchase Queue) can scope-filter like every other surface.
--
-- DEFAULTs match migration 022's posture (2/'uts'/'bm') — drop them in a
-- later migration after a week of clean prod logs.

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS semester    int  NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS exam_period text NOT NULL DEFAULT 'uts',
  ADD COLUMN IF NOT EXISTS jurusan     text NOT NULL DEFAULT 'bm';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_feedback_semester') THEN
    ALTER TABLE feedback ADD CONSTRAINT chk_feedback_semester    CHECK (semester BETWEEN 1 AND 14);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_feedback_exam_period') THEN
    ALTER TABLE feedback ADD CONSTRAINT chk_feedback_exam_period CHECK (exam_period IN ('uts','uas'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_feedback_jurusan') THEN
    ALTER TABLE feedback ADD CONSTRAINT chk_feedback_jurusan     CHECK (jurusan ~ '^[a-z0-9-]{1,16}$');
  END IF;
END $$;

ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS semester    int  NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS exam_period text NOT NULL DEFAULT 'uts',
  ADD COLUMN IF NOT EXISTS jurusan     text NOT NULL DEFAULT 'bm';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pr_semester') THEN
    ALTER TABLE purchase_requests ADD CONSTRAINT chk_pr_semester    CHECK (semester BETWEEN 1 AND 14);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pr_exam_period') THEN
    ALTER TABLE purchase_requests ADD CONSTRAINT chk_pr_exam_period CHECK (exam_period IN ('uts','uas'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pr_jurusan') THEN
    ALTER TABLE purchase_requests ADD CONSTRAINT chk_pr_jurusan     CHECK (jurusan ~ '^[a-z0-9-]{1,16}$');
  END IF;
END $$;

-- Defaults handle freshly-added rows; explicit UPDATE for clarity:
UPDATE feedback          SET semester=2, exam_period='uts', jurusan='bm' WHERE semester IS NULL;
UPDATE purchase_requests SET semester=2, exam_period='uts', jurusan='bm' WHERE semester IS NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_scope_status_created
  ON feedback (semester, exam_period, jurusan, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pr_scope_status_created
  ON purchase_requests (semester, exam_period, jurusan, status, created_at DESC);
