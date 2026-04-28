-- ============================================
-- 019 — Support chat round 4 features
-- ============================================
-- Adds: unsend (admin), internal notes (admin-only), search index, pin messages.
-- Idempotent: safe to re-run.

-- 1) Extend support_messages with new columns
ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS unsent_by         text,
  ADD COLUMN IF NOT EXISTS unsent_at         timestamptz,
  ADD COLUMN IF NOT EXISTS is_internal       boolean NOT NULL DEFAULT false;

-- 2) Trigram extension + index for fuzzy ILIKE content search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_support_messages_content_trgm
  ON support_messages USING GIN (content gin_trgm_ops)
  WHERE deleted = false AND is_system = false;

-- 3) Pinned messages — per-conversation, max 3 enforced server-side
CREATE TABLE IF NOT EXISTS support_pinned_messages (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  uuid        NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  license_key text        NOT NULL,            -- conversation owner
  pinned_by   text        NOT NULL,            -- license_key of admin who pinned
  pinned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id)
);

CREATE INDEX IF NOT EXISTS idx_support_pinned_messages_conv
  ON support_pinned_messages (license_key, pinned_at DESC);

-- 4) RLS + Realtime
ALTER TABLE support_pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_pinned_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_pinned_messages'
      AND policyname = 'Public read support_pinned_messages'
  ) THEN
    CREATE POLICY "Public read support_pinned_messages"
      ON support_pinned_messages FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_pinned_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
