-- Denormalize license_key onto chat_messages so the read-only profile popover
-- can resolve an author's PublicProfile via /api/profile/public (keyed by
-- license_key). author_id holds a deviceId which has no reliable license map,
-- so new rows are populated server-side from the hs-session cookie on POST.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS license_key text;

-- Best-effort backfill: only where (author_name, scope) maps to exactly ONE
-- license key. Ambiguous names are left null and degrade to name/tier badge.
WITH unique_names AS (
  SELECT lower(a.user_name) AS lname,
         a.license_key,
         lk.semester, lk.exam_period, lk.jurusan
  FROM activations a
  JOIN license_keys lk ON lk.key = a.license_key
  WHERE a.user_name IS NOT NULL AND a.user_name <> ''
),
collapsed AS (
  SELECT lname, semester, exam_period, jurusan,
         min(license_key) AS license_key,
         count(DISTINCT license_key) AS n
  FROM unique_names
  GROUP BY lname, semester, exam_period, jurusan
  HAVING count(DISTINCT license_key) = 1
)
UPDATE chat_messages cm
SET license_key = c.license_key
FROM collapsed c
WHERE cm.license_key IS NULL
  AND lower(cm.author_name) = c.lname
  AND cm.semester = c.semester
  AND cm.exam_period = c.exam_period
  AND cm.jurusan = c.jurusan;

CREATE INDEX IF NOT EXISTS idx_chat_messages_license_key
  ON chat_messages (license_key);
