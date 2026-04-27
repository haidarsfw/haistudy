-- ============================================
-- 017 — Support chat QoL (reply, reactions, edit, receipts, presence, media)
-- ============================================
-- Idempotent: safe to re-run. All ADD COLUMN / CREATE TABLE / CREATE INDEX
-- guarded with IF NOT EXISTS. Publication adds wrapped in DO blocks.
--
-- Backwards compat:
--   • Existing rows have content = "[image]URL\n{caption}" — backfilled below
--     to type='image' + media_url. Renderer keeps a runtime fallback as safety.
--   • New columns default NULL/false so any older POST that omits them works.
--   • is_system column was missing from migration 003 but the API/UI assumed it
--     exists; added here.
-- ============================================

-- 1) Extend support_messages with new columns ----------------------------

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS is_system           boolean      NOT NULL DEFAULT false;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS type                text         NOT NULL DEFAULT 'text';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_messages_type_check'
  ) THEN
    ALTER TABLE support_messages
      ADD CONSTRAINT support_messages_type_check
      CHECK (type IN ('text','image','audio','system'));
  END IF;
END $$;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS media_url           text;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS reply_to_id         uuid
    REFERENCES support_messages(id) ON DELETE SET NULL;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS reply_to_name       text;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS reply_to_content    text;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS edited_at           timestamptz;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS deleted             boolean      NOT NULL DEFAULT false;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS client_nonce        text;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS author_license_key  text;


-- 2) Backfill legacy [image]URL\ncaption rows ---------------------------
-- Limited to text rows that begin with '[image]' (system messages start with
-- the green-check ✅ so they are unaffected). Conservative — if no rows match,
-- this is a no-op.

UPDATE support_messages
SET type      = 'image',
    media_url = split_part(substring(content FROM 8), E'\n', 1),
    content   = CASE
                  WHEN position(E'\n' IN content) > 0
                    THEN substring(content FROM position(E'\n' IN content) + 1)
                  ELSE ''
                END
WHERE type = 'text'
  AND content LIKE '[image]%'
  AND (media_url IS NULL OR media_url = '');


-- 3) Indexes for new query patterns -------------------------------------

CREATE INDEX IF NOT EXISTS idx_support_messages_reply_to
  ON support_messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_messages_key_created_active
  ON support_messages (license_key, created_at)
  WHERE deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_messages_client_nonce
  ON support_messages (client_nonce)
  WHERE client_nonce IS NOT NULL;


-- 4) Reactions table ----------------------------------------------------

CREATE TABLE IF NOT EXISTS support_reactions (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id    uuid        NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  license_key   text        NOT NULL,
  reactor_key   text        NOT NULL,
  reactor_name  text        NOT NULL,
  is_admin      boolean     NOT NULL DEFAULT false,
  emoji         text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, reactor_key, emoji)
);

CREATE INDEX IF NOT EXISTS idx_support_reactions_message
  ON support_reactions (message_id);

CREATE INDEX IF NOT EXISTS idx_support_reactions_conv
  ON support_reactions (license_key, created_at DESC);


-- 5) Read receipts table ------------------------------------------------
-- Support is 1:1, so at most 2 rows per message (admin reader + user reader).

CREATE TABLE IF NOT EXISTS support_read_receipts (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_key   text        NOT NULL,
  message_id    uuid        NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  reader_kind   text        NOT NULL CHECK (reader_kind IN ('user','admin')),
  read_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, reader_kind)
);

CREATE INDEX IF NOT EXISTS idx_support_read_receipts_conv
  ON support_read_receipts (license_key, message_id);


-- 6) RLS — public SELECT (Realtime needs read), service_role for writes -

ALTER TABLE support_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_reactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_read_receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_messages'
      AND policyname = 'Public read support_messages'
  ) THEN
    CREATE POLICY "Public read support_messages"
      ON support_messages FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_reactions'
      AND policyname = 'Public read support_reactions'
  ) THEN
    CREATE POLICY "Public read support_reactions"
      ON support_reactions FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_read_receipts'
      AND policyname = 'Public read support_read_receipts'
  ) THEN
    CREATE POLICY "Public read support_read_receipts"
      ON support_read_receipts FOR SELECT USING (true);
  END IF;
END $$;


-- 7) Realtime publication — idempotent --------------------------------

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_read_receipts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
