-- ============================================================================
-- 040: Seed scope_feature_flags for the new scope s1-uas-bm (Semester 1 UAS BM).
-- Mirrors the s2/uas seed pattern (all features enabled). Forward-looking: there
-- is no runtime consumer of scope_feature_flags yet (gating is global via
-- src/lib/feature-flags.ts); this keeps the table complete for future per-scope
-- toggling. Idempotent.
-- ============================================================================

INSERT INTO scope_feature_flags (semester, exam_period, jurusan, feature_key, enabled, message) VALUES
  (1, 'uas', 'bm', 'ai_chat',       true, NULL),
  (1, 'uas', 'bm', 'voice_rooms',   true, NULL),
  (1, 'uas', 'bm', 'forum',         true, NULL),
  (1, 'uas', 'bm', 'announcements', true, NULL)
ON CONFLICT (semester, exam_period, jurusan, feature_key) DO NOTHING;
