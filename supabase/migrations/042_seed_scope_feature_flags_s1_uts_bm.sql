-- ============================================================================
-- 042: Seed scope_feature_flags for the new scope s1-uts-bm (Semester 1 UTS BM).
-- Mirrors the s1-uas / s2 seed pattern (all features enabled). No runtime
-- consumer of scope_feature_flags yet (gating is global via
-- src/lib/feature-flags.ts); keeps the table complete for future per-scope
-- toggling. Idempotent.
-- ============================================================================

INSERT INTO scope_feature_flags (semester, exam_period, jurusan, feature_key, enabled, message) VALUES
  (1, 'uts', 'bm', 'ai_chat',       true, NULL),
  (1, 'uts', 'bm', 'voice_rooms',   true, NULL),
  (1, 'uts', 'bm', 'forum',         true, NULL),
  (1, 'uts', 'bm', 'announcements', true, NULL)
ON CONFLICT (semester, exam_period, jurusan, feature_key) DO NOTHING;
