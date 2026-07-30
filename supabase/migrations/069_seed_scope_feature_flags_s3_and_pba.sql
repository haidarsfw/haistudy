-- ============================================================================
-- 069: Seed scope_feature_flags for the six new periods.
--
--   s3-uts-bm  / s3-uas-bm    BINUS Business Management, semester 3
--   s1-uts-pba / s1-uas-pba   UNJ Pendidikan Bahasa Arab, semester 1 ('26 intake)
--   s3-uts-pba / s3-uas-pba   UNJ Pendidikan Bahasa Arab, semester 3 ('25 intake)
--
-- Copied from the s2-uas-bm pattern: every feature on. Behaviour therefore
-- matches an existing period the moment content lands, which is the point —
-- promoting a period should be a one-word edit in SCOPE_REGISTRY, not a hunt for
-- missing rows.
--
-- Four keys, not five. s2-uas-bm also carries `cheatsheet_dl_opsmgmt`, which
-- unlocks the download for ONE subject's cheatsheet in ONE period. It is not a
-- per-scope feature and these periods have no subjects at all, so copying it
-- would seed a permission for material that does not exist.
--
-- The UAS halves are seeded too even though they are `hidden` in code and
-- unreachable today. A half-seeded table is the failure mode worth avoiding: the
-- first reader queries by scope and gets a quietly wrong answer for the rows
-- nobody remembered to add.
--
-- Additive, idempotent, no schema change. Reversing it is a DELETE on these
-- (semester, exam_period, jurusan) triples. No runtime consumer reads this table
-- yet (gating is global via src/lib/feature-flags.ts).
--
-- scope_invoice_counter needs no seeding — next_scope_invoice() seeds a period on
-- its first call.
-- ============================================================================

INSERT INTO scope_feature_flags (semester, exam_period, jurusan, feature_key, enabled, message) VALUES
  (3, 'uts', 'bm',  'ai_chat',       true, NULL),
  (3, 'uts', 'bm',  'voice_rooms',   true, NULL),
  (3, 'uts', 'bm',  'forum',         true, NULL),
  (3, 'uts', 'bm',  'announcements', true, NULL),
  (3, 'uas', 'bm',  'ai_chat',       true, NULL),
  (3, 'uas', 'bm',  'voice_rooms',   true, NULL),
  (3, 'uas', 'bm',  'forum',         true, NULL),
  (3, 'uas', 'bm',  'announcements', true, NULL),
  (1, 'uts', 'pba', 'ai_chat',       true, NULL),
  (1, 'uts', 'pba', 'voice_rooms',   true, NULL),
  (1, 'uts', 'pba', 'forum',         true, NULL),
  (1, 'uts', 'pba', 'announcements', true, NULL),
  (1, 'uas', 'pba', 'ai_chat',       true, NULL),
  (1, 'uas', 'pba', 'voice_rooms',   true, NULL),
  (1, 'uas', 'pba', 'forum',         true, NULL),
  (1, 'uas', 'pba', 'announcements', true, NULL),
  (3, 'uts', 'pba', 'ai_chat',       true, NULL),
  (3, 'uts', 'pba', 'voice_rooms',   true, NULL),
  (3, 'uts', 'pba', 'forum',         true, NULL),
  (3, 'uts', 'pba', 'announcements', true, NULL),
  (3, 'uas', 'pba', 'ai_chat',       true, NULL),
  (3, 'uas', 'pba', 'voice_rooms',   true, NULL),
  (3, 'uas', 'pba', 'forum',         true, NULL),
  (3, 'uas', 'pba', 'announcements', true, NULL)
ON CONFLICT (semester, exam_period, jurusan, feature_key) DO NOTHING;
