-- Root-cause fix for Supabase Disk IO Budget depletion (88% on NANO compute).
--
-- Before these indexes:
--   • presence had 2.8M seq tuple reads (63.5% seq scan ratio). The existing
--     idx_presence_online (partial WHERE online=true) doesn't include last_seen,
--     so Postgres bitmap-scanned then sorted every fetchOnlineUsers() call.
--   • announcements had zero non-pkey indexes, 100% seq scan.
--   • ai_conversations had 68.7% seq scan because license_key lookups had no index.
--
-- After: the hot presence query is a plain index scan (cost ~9.66, 138 rows).
-- The two supporting indexes cut seq scans on announcements / ai_conversations.

CREATE INDEX IF NOT EXISTS idx_presence_last_seen_desc_online
  ON public.presence (last_seen DESC)
  WHERE online = true;

CREATE INDEX IF NOT EXISTS idx_announcements_created_at_desc
  ON public.announcements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_license_key_updated_at
  ON public.ai_conversations (license_key, updated_at DESC);
