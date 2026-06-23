-- 057_user_settings_drop_from_realtime.sql
-- Remove user_settings from the realtime publication.
--
-- Why: user_settings has default (PK-only) replica identity, so the
-- settings-provider's `filter: license_key=eq.<key>` postgres_changes binding
-- was rejected by Postgres ("invalid column for filter license_key") and the
-- Realtime client retried the subscription forever — for EVERY logged-in user.
-- That retry storm (subscription churn + WAL decode on every 2s progress
-- autosave) was a primary cause of free-tier Supabase overload/downtime.
--
-- The client-side subscription is removed in the same change (settings-provider).
-- Settings still load on mount + refetch; cross-device changes apply on the next
-- load instead of live. No other consumer reads user_settings over realtime.
--
-- Rollback:
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;

ALTER PUBLICATION supabase_realtime DROP TABLE public.user_settings;
