-- ============================================
-- Feedback table (referenced by /api/feedback)
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_key TEXT NOT NULL,
  name TEXT DEFAULT 'Anonymous',
  category TEXT DEFAULT 'other' CHECK (category IN ('bug', 'feature', 'other')),
  message TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow server-side reads (service_role bypasses RLS, but anon needs SELECT for admin dashboard)
CREATE POLICY "Allow read feedback" ON feedback FOR SELECT USING (true);
CREATE POLICY "Allow insert feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update feedback" ON feedback FOR UPDATE USING (true);

-- ============================================
-- User profiles table (referenced by /api/profile)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  license_key TEXT PRIMARY KEY REFERENCES license_keys(key) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  selected_class TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read user_profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert user_profiles" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update user_profiles" ON user_profiles FOR UPDATE USING (true);
