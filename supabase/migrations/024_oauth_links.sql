-- ============================================
-- 024 — oauth_links: map (provider, email) → license_key
-- ============================================
-- Strict 1 email ↔ 1 license. Provider field is forward-compatible
-- (microsoft/apple later). Email uniqueness enforced case-insensitively
-- via generated column.

CREATE TABLE IF NOT EXISTS oauth_links (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_key text NOT NULL REFERENCES license_keys(key) ON DELETE CASCADE,
  provider    text NOT NULL DEFAULT 'google' CHECK (provider IN ('google')),
  email       text NOT NULL,
  email_lower text GENERATED ALWAYS AS (lower(email)) STORED,
  linked_at   timestamptz NOT NULL DEFAULT now(),
  created_by  text,  -- admin license_key who created the link
  UNIQUE (license_key),    -- 1 license → 1 email
  UNIQUE (email_lower)     -- 1 email → 1 license (case-insensitive)
);

CREATE INDEX IF NOT EXISTS idx_oauth_links_email_lower ON oauth_links (email_lower);

ALTER TABLE oauth_links ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies needed; all access via service_role.
