-- ============================================
-- 030 — Direct messages (VIP 1:1 DM)
-- ============================================
-- VIP/admin can DM each other within a scope. A conversation is a sorted
-- pair of license keys: participants[1] < participants[2] guarantees one
-- row per pair per scope. dm_messages are added to the realtime publication.
-- RLS on with permissive SELECT; writes via service_role guarded by requireScope.
-- Idempotent.

CREATE TABLE IF NOT EXISTS dm_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participants    text[] NOT NULL CHECK (cardinality(participants) = 2 AND participants[1] < participants[2]),
  semester        int  NOT NULL,
  exam_period     text NOT NULL,
  jurusan         text NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dm_conversations_unique_pair_scope
  ON dm_conversations (participants, semester, exam_period, jurusan);

CREATE INDEX IF NOT EXISTS dm_conversations_participants_idx
  ON dm_conversations USING gin (participants);

CREATE TABLE IF NOT EXISTS dm_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_key      text NOT NULL REFERENCES license_keys(key) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  semester        int  NOT NULL,
  exam_period     text NOT NULL,
  jurusan         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dm_messages_conversation_created_idx
  ON dm_messages (conversation_id, created_at DESC);

ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages      ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dm_conversations' AND policyname='dm_conversations_select') THEN
    CREATE POLICY dm_conversations_select ON dm_conversations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dm_messages' AND policyname='dm_messages_select') THEN
    CREATE POLICY dm_messages_select ON dm_messages FOR SELECT USING (true);
  END IF;
END $$;

-- dm_messages must be in the realtime publication for live DM delivery.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='dm_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
  END IF;
END $$;
