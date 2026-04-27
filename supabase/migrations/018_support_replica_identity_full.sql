-- ============================================
-- 018 — Support tables: REPLICA IDENTITY FULL
-- ============================================
-- Without REPLICA IDENTITY FULL, Supabase Realtime DELETE/UPDATE events only
-- carry the primary key columns in `payload.old`. Client-side subscription
-- filters on non-PK columns (e.g. `license_key=eq.X`) cannot be evaluated for
-- those events, so they fail to deliver — which broke reaction toggle (DELETE
-- never reached client → UI thought reactions were accumulating).
--
-- FULL identity makes Postgres include ALL old column values in the WAL, at the
-- cost of slightly larger replication traffic. For these small tables it's
-- negligible.
-- ============================================

ALTER TABLE support_messages      REPLICA IDENTITY FULL;
ALTER TABLE support_reactions     REPLICA IDENTITY FULL;
ALTER TABLE support_read_receipts REPLICA IDENTITY FULL;
