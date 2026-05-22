-- ============================================
-- 022 — Multi-scope restructure
-- ============================================
-- Adds (semester, exam_period, jurusan) scoping to every cohort-shared
-- table. Existing rows backfill to (2, 'uts', 'bm'). Defaults stay until
-- phase 5 (after 7d prod stability) to keep older API code safe.
--
-- New tables: scope_feature_flags (runtime per-scope toggles),
--             scope_login_attempts (server-side brute-force defense).
--
-- Critical: user_settings.progress + user_settings.notes are JSONB keyed
-- by subjectId — we one-shot rewrite to nest under 's2-uts-bm' so subject
-- IDs that collide across UTS/UAS don't clobber each other.
-- ============================================

-- ────────────────────────────────────────────────────────────────────
-- 1) Scope columns on every cohort-shared table
-- ────────────────────────────────────────────────────────────────────

-- license_keys is the source of truth for "what scope does this user belong to"
ALTER TABLE license_keys
  ADD COLUMN IF NOT EXISTS semester    int  NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS exam_period text NOT NULL DEFAULT 'uts',
  ADD COLUMN IF NOT EXISTS jurusan     text NOT NULL DEFAULT 'bm';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_license_keys_semester') THEN
    ALTER TABLE license_keys ADD CONSTRAINT chk_license_keys_semester    CHECK (semester BETWEEN 1 AND 14);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_license_keys_exam_period') THEN
    ALTER TABLE license_keys ADD CONSTRAINT chk_license_keys_exam_period CHECK (exam_period IN ('uts','uas'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_license_keys_jurusan') THEN
    ALTER TABLE license_keys ADD CONSTRAINT chk_license_keys_jurusan     CHECK (jurusan ~ '^[a-z0-9-]{1,16}$');
  END IF;
END $$;

-- Repeat for every scoped table. Same trio of columns + CHECK constraints.
DO $$
DECLARE
  t text;
  scoped_tables text[] := ARRAY[
    'chat_messages','pinned_messages','chat_read_positions',
    'support_messages','support_pinned_messages','support_mutes',
    'support_reactions','support_read_receipts',
    'forum_threads','forum_comments','forum_polls','poll_votes',
    'notifications','announcements','presence',
    'notification_deliveries','push_subscriptions',
    'ai_conversations','voice_rooms','voice_participants',
    'activity_logs','error_logs','analytics_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY scoped_tables LOOP
    EXECUTE format(
      'ALTER TABLE %I
         ADD COLUMN IF NOT EXISTS semester    int  NOT NULL DEFAULT 2,
         ADD COLUMN IF NOT EXISTS exam_period text NOT NULL DEFAULT ''uts'',
         ADD COLUMN IF NOT EXISTS jurusan     text NOT NULL DEFAULT ''bm''',
      t
    );

    -- Constraints (idempotent via pg_constraint check)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = format('chk_%s_semester', t)) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT chk_%s_semester    CHECK (semester BETWEEN 1 AND 14)', t, t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = format('chk_%s_exam_period', t)) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT chk_%s_exam_period CHECK (exam_period IN (''uts'',''uas''))', t, t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = format('chk_%s_jurusan', t)) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT chk_%s_jurusan     CHECK (jurusan ~ ''^[a-z0-9-]{1,16}$'')', t, t);
    END IF;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 2) Backfill existing rows → (2, 'uts', 'bm')
-- ────────────────────────────────────────────────────────────────────
-- DEFAULT 2/'uts'/'bm' covers freshly-added NOT NULL columns, but we
-- explicitly run UPDATE to make the intent visible + audit-friendly.

UPDATE license_keys             SET semester=2, exam_period='uts', jurusan='bm';
UPDATE chat_messages            SET semester=2, exam_period='uts', jurusan='bm';
UPDATE pinned_messages          SET semester=2, exam_period='uts', jurusan='bm';
UPDATE chat_read_positions      SET semester=2, exam_period='uts', jurusan='bm';
UPDATE support_messages         SET semester=2, exam_period='uts', jurusan='bm';
UPDATE support_pinned_messages  SET semester=2, exam_period='uts', jurusan='bm';
UPDATE support_mutes            SET semester=2, exam_period='uts', jurusan='bm';
UPDATE support_reactions        SET semester=2, exam_period='uts', jurusan='bm';
UPDATE support_read_receipts    SET semester=2, exam_period='uts', jurusan='bm';
UPDATE forum_threads            SET semester=2, exam_period='uts', jurusan='bm';
UPDATE forum_comments           SET semester=2, exam_period='uts', jurusan='bm';
UPDATE forum_polls              SET semester=2, exam_period='uts', jurusan='bm';
UPDATE poll_votes               SET semester=2, exam_period='uts', jurusan='bm';
UPDATE notifications            SET semester=2, exam_period='uts', jurusan='bm';
UPDATE announcements            SET semester=2, exam_period='uts', jurusan='bm';
UPDATE presence                 SET semester=2, exam_period='uts', jurusan='bm';
UPDATE notification_deliveries  SET semester=2, exam_period='uts', jurusan='bm';
UPDATE push_subscriptions       SET semester=2, exam_period='uts', jurusan='bm';
UPDATE ai_conversations         SET semester=2, exam_period='uts', jurusan='bm';
UPDATE voice_rooms              SET semester=2, exam_period='uts', jurusan='bm';
UPDATE voice_participants       SET semester=2, exam_period='uts', jurusan='bm';
UPDATE activity_logs            SET semester=2, exam_period='uts', jurusan='bm';
UPDATE error_logs               SET semester=2, exam_period='uts', jurusan='bm';
UPDATE analytics_sessions       SET semester=2, exam_period='uts', jurusan='bm';

-- ────────────────────────────────────────────────────────────────────
-- 3) JSONB rewrite: nest user_settings.progress + notes under 's2-uts-bm'
-- ────────────────────────────────────────────────────────────────────
-- Subject IDs (e.g., 'statistik') collide across UTS+UAS. Migrate to
-- nested shape: { 's2-uts-bm': { [subjectId]: ... } }. Client code reads
-- via progress[scopeKey][subjectId] going forward.

-- Add notes column if missing (some user_settings rows may not have it)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notes jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE user_settings
SET progress = jsonb_build_object('s2-uts-bm', COALESCE(progress, '{}'::jsonb))
WHERE jsonb_typeof(progress) = 'object'
  AND NOT (progress ? 's2-uts-bm')
  AND progress != '{}'::jsonb;

UPDATE user_settings
SET notes = jsonb_build_object('s2-uts-bm', COALESCE(notes, '{}'::jsonb))
WHERE jsonb_typeof(notes) = 'object'
  AND NOT (notes ? 's2-uts-bm')
  AND notes != '{}'::jsonb;

-- ────────────────────────────────────────────────────────────────────
-- 4) Composite indexes — leading with scope cols
-- ────────────────────────────────────────────────────────────────────
-- Drop superseded indexes from earlier migrations + add scope-leading
-- composites that match the new query pattern (scope filter first).

DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_chat_messages_created_at_desc;
CREATE INDEX IF NOT EXISTS idx_chat_messages_scope_created
  ON chat_messages (semester, exam_period, jurusan, created_at DESC);

DROP INDEX IF EXISTS idx_forum_threads_subject;
DROP INDEX IF EXISTS idx_forum_threads_subject_created;
CREATE INDEX IF NOT EXISTS idx_forum_threads_scope_subject_created
  ON forum_threads (semester, exam_period, jurusan, subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_comments_scope_thread_created
  ON forum_comments (semester, exam_period, jurusan, thread_id, created_at);

DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_notifications_license_unread;
CREATE INDEX IF NOT EXISTS idx_notifications_scope_user_read
  ON notifications (semester, exam_period, jurusan, license_key, read, created_at DESC);

DROP INDEX IF EXISTS idx_presence_online;
CREATE INDEX IF NOT EXISTS idx_presence_scope_online
  ON presence (semester, exam_period, jurusan, online)
  WHERE online = true;

CREATE INDEX IF NOT EXISTS idx_support_messages_scope_key_created
  ON support_messages (semester, exam_period, jurusan, license_key, created_at)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_ai_conv_scope_key
  ON ai_conversations (semester, exam_period, jurusan, license_key, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_scope_active
  ON announcements (semester, exam_period, jurusan, active, created_at DESC);

-- ────────────────────────────────────────────────────────────────────
-- 5) presence PK change — was user_id only; now scope-aware
-- ────────────────────────────────────────────────────────────────────
-- Allows same human (same device_id) to be present in multiple scopes
-- simultaneously when they have multiple keys (one per scope).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'presence_pkey' AND conrelid = 'presence'::regclass
  ) THEN
    ALTER TABLE presence DROP CONSTRAINT presence_pkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'presence_scope_pkey' AND conrelid = 'presence'::regclass
  ) THEN
    ALTER TABLE presence ADD CONSTRAINT presence_scope_pkey
      PRIMARY KEY (user_id, semester, exam_period, jurusan);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 6) scope_feature_flags — DB-driven per-scope feature toggles
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scope_feature_flags (
  semester    int  NOT NULL,
  exam_period text NOT NULL,
  jurusan     text NOT NULL,
  feature_key text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  message     text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (semester, exam_period, jurusan, feature_key),
  CHECK (semester BETWEEN 1 AND 14),
  CHECK (exam_period IN ('uts','uas')),
  CHECK (jurusan ~ '^[a-z0-9-]{1,16}$')
);

ALTER TABLE scope_feature_flags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='scope_feature_flags'
      AND policyname='Public read scope_feature_flags'
  ) THEN
    CREATE POLICY "Public read scope_feature_flags"
      ON scope_feature_flags FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='scope_feature_flags'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE scope_feature_flags;
  END IF;
END $$;

-- Seed: s2/uts/bm = current state (AI + voice DISABLED post-cohort)
--       s2/uas/bm = re-enabled for upcoming UAS launch
INSERT INTO scope_feature_flags (semester, exam_period, jurusan, feature_key, enabled, message) VALUES
  (2, 'uts', 'bm', 'ai_chat',       false, 'Fitur AI Chat tidak tersedia untuk periode ini.'),
  (2, 'uts', 'bm', 'voice_rooms',   false, 'Voice Rooms tidak tersedia untuk periode ini.'),
  (2, 'uts', 'bm', 'forum',         true,  NULL),
  (2, 'uts', 'bm', 'announcements', true,  NULL),
  (2, 'uas', 'bm', 'ai_chat',       true,  NULL),
  (2, 'uas', 'bm', 'voice_rooms',   true,  NULL),
  (2, 'uas', 'bm', 'forum',         true,  NULL),
  (2, 'uas', 'bm', 'announcements', true,  NULL)
ON CONFLICT (semester, exam_period, jurusan, feature_key) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- 7) scope_login_attempts — backs server-side rate limiter
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scope_login_attempts (
  ip           inet NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  outcome      text NOT NULL CHECK (outcome IN ('ok','fail')),
  PRIMARY KEY (ip, attempted_at)
);

CREATE INDEX IF NOT EXISTS idx_scope_login_attempts_recent
  ON scope_login_attempts(ip, attempted_at DESC);

ALTER TABLE scope_login_attempts ENABLE ROW LEVEL SECURITY;
-- no SELECT policy = service_role only.

-- ────────────────────────────────────────────────────────────────────
-- 8) Defaults stay until phase 5 — DROP DEFAULT later via separate migration
-- ────────────────────────────────────────────────────────────────────
-- ALTER TABLE <each> ALTER COLUMN semester    DROP DEFAULT;
-- ALTER TABLE <each> ALTER COLUMN exam_period DROP DEFAULT;
-- ALTER TABLE <each> ALTER COLUMN jurusan     DROP DEFAULT;
