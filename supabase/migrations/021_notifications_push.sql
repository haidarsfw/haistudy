-- ============================================
-- 021 — Multi-channel notifications: push subscriptions, mutes,
--       deliveries, settings columns, support_message type
-- ============================================
-- Adds infrastructure for Web Push + email backup + per-conversation mute
-- + per-user channel preferences. RLS: all writes go through API routes
-- using service_role; SELECT exposed where Realtime needs to broadcast.
-- ============================================

-- 1) Allow 'support_message' notification type + ensure message_id column exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'mention', 'mention_all', 'thread_reply', 'announcement',
    'forum_thread', 'poll_vote', 'poll_result', 'comment_reply',
    'support_message'
  ));

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_id uuid;

-- 2) push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key  text NOT NULL REFERENCES license_keys(key) ON DELETE CASCADE,
  endpoint     text NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  user_agent   text,
  device_id    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz,
  UNIQUE (license_key, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_lk
  ON push_subscriptions (license_key)
  WHERE revoked_at IS NULL;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='push_subscriptions'
      AND policyname='Public read push_subscriptions'
  ) THEN
    CREATE POLICY "Public read push_subscriptions"
      ON push_subscriptions FOR SELECT USING (true);
  END IF;
END $$;
-- INSERT/UPDATE/DELETE: no policies = denied for anon; service_role bypasses.

-- 3) support_mutes  (recipient_lk → conversation_lk)
CREATE TABLE IF NOT EXISTS support_mutes (
  recipient_lk    text NOT NULL REFERENCES license_keys(key) ON DELETE CASCADE,
  conversation_lk text NOT NULL,
  muted_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipient_lk, conversation_lk)
);

CREATE INDEX IF NOT EXISTS idx_support_mutes_recipient
  ON support_mutes (recipient_lk);

ALTER TABLE support_mutes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='support_mutes'
      AND policyname='Public read support_mutes'
  ) THEN
    CREATE POLICY "Public read support_mutes"
      ON support_mutes FOR SELECT USING (true);
  END IF;
END $$;

-- 4) notification_deliveries (coalescing + email rate-limit)
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_lk    text NOT NULL,
  conversation_lk text NOT NULL,
  channel         text NOT NULL CHECK (channel IN ('webpush', 'email')),
  last_message_id uuid,
  batch_count     integer NOT NULL DEFAULT 1,
  last_pushed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_lk, conversation_lk, channel)
);

CREATE INDEX IF NOT EXISTS idx_notif_deliv_recent
  ON notification_deliveries (recipient_lk, conversation_lk, last_pushed_at DESC);

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
-- no policies = service_role only.

-- 5) user_settings: per-channel notification toggles
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS notif_sound_enabled   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_browser_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_push_enabled    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_enabled   boolean NOT NULL DEFAULT true;

-- 6) Realtime: support_mutes (so other devices sync mute state instantly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='support_mutes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_mutes;
  END IF;
END $$;
