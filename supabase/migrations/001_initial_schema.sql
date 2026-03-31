-- ============================================
-- haistudy — Initial Database Schema
-- ============================================
-- Run: supabase db push (or apply via Supabase dashboard)

-- ============================================
-- Extensions
-- ============================================
create extension if not exists "uuid-ossp";

-- ============================================
-- License Keys (admin-managed)
-- ============================================
create table license_keys (
  key text primary key,
  name text not null default '',
  days_active integer not null default 30,
  is_admin boolean not null default false,
  is_tester boolean not null default false,
  max_devices integer not null default 2,
  unlimited_devices boolean not null default false,
  fixed_expiry timestamptz,
  suspended_until timestamptz,
  total_quiz_score integer not null default 0,
  total_online_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- Activations (user-facing license data)
-- ============================================
create table activations (
  id uuid primary key default uuid_generate_v4(),
  license_key text not null references license_keys(key) on delete cascade,
  user_name text not null default '',
  email text,
  expiry timestamptz,
  referral_code text unique,
  referral_count integer not null default 0,
  referred_by text,
  activated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(license_key)
);

-- ============================================
-- Devices
-- ============================================
create table devices (
  id uuid primary key default uuid_generate_v4(),
  activation_id uuid not null references activations(id) on delete cascade,
  device_id text not null,
  device_type text not null default 'desktop',
  device_label text,
  is_primary boolean not null default false,
  verified boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(activation_id, device_id)
);

-- ============================================
-- User Settings
-- ============================================
create table user_settings (
  license_key text primary key references license_keys(key) on delete cascade,
  dark_mode boolean not null default false,
  theme text not null default 'amber',
  font text not null default 'geist',
  selected_class text not null default '',
  reminder timestamptz,
  hide_status boolean not null default false,
  hide_status_changed_at timestamptz,
  dark_mode_schedule jsonb not null default '{"enabled": false, "start": "18:00", "end": "06:00"}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================
-- User Notes (per subject)
-- ============================================
create table user_notes (
  id uuid primary key default uuid_generate_v4(),
  license_key text not null references license_keys(key) on delete cascade,
  subject_id text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique(license_key, subject_id)
);

-- ============================================
-- Bookmarks
-- ============================================
create table bookmarks (
  id uuid primary key default uuid_generate_v4(),
  license_key text not null references license_keys(key) on delete cascade,
  item_type text not null,
  item_id text not null,
  subject_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================
-- Chat Messages
-- ============================================
create table chat_messages (
  id uuid primary key default uuid_generate_v4(),
  content text not null default '',
  type text not null default 'text' check (type in ('text', 'image', 'audio', 'sticker')),
  media_url text,
  author_id text not null,
  author_name text not null,
  author_class text not null default '',
  is_admin boolean not null default false,
  is_tester boolean not null default false,
  deleted boolean not null default false,
  reply_to_id uuid references chat_messages(id) on delete set null,
  reply_to_name text,
  reply_to_content text,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_created_at on chat_messages(created_at desc);

-- ============================================
-- Pinned Messages (max 3)
-- ============================================
create table pinned_messages (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references chat_messages(id) on delete cascade,
  pinned_by text not null,
  pinned_at timestamptz not null default now(),
  unique(message_id)
);

-- ============================================
-- Chat Read Positions
-- ============================================
create table chat_read_positions (
  license_key text primary key references license_keys(key) on delete cascade,
  last_read_message_id uuid references chat_messages(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ============================================
-- Forum Threads
-- ============================================
create table forum_threads (
  id uuid primary key default uuid_generate_v4(),
  subject_id text not null,
  title text not null,
  content text not null default '',
  author_id text not null,
  author_name text not null,
  author_class text not null default '',
  is_admin boolean not null default false,
  image_url text,
  media_url text,
  closed boolean not null default false,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_forum_threads_subject on forum_threads(subject_id, created_at desc);

-- ============================================
-- Forum Comments
-- ============================================
create table forum_comments (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references forum_threads(id) on delete cascade,
  content text not null,
  author_id text not null,
  author_name text not null,
  author_class text not null default '',
  is_admin boolean not null default false,
  parent_comment_id uuid references forum_comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_forum_comments_thread on forum_comments(thread_id, created_at);

-- ============================================
-- Forum Polls
-- ============================================
create table forum_polls (
  id uuid primary key default uuid_generate_v4(),
  subject_id text not null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  total_votes integer not null default 0,
  author_id text not null,
  author_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- Poll Votes
-- ============================================
create table poll_votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references forum_polls(id) on delete cascade,
  voter_id text not null,
  option_index integer not null,
  created_at timestamptz not null default now(),
  unique(poll_id, voter_id)
);

-- ============================================
-- Notifications
-- ============================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  license_key text not null references license_keys(key) on delete cascade,
  type text not null check (type in ('mention', 'mention_all', 'thread_reply')),
  sender_name text,
  preview text,
  context text not null default 'chat' check (context in ('chat', 'forum')),
  thread_id uuid,
  subject_id text,
  thread_title text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(license_key, read, created_at desc);

-- ============================================
-- Announcements (single active broadcast)
-- ============================================
create table announcements (
  id uuid primary key default uuid_generate_v4(),
  message text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'maintenance')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- Presence
-- ============================================
create table presence (
  user_id text primary key,
  user_name text not null,
  license_key text,
  current_subject text,
  device_type text not null default 'desktop',
  hide_status boolean not null default false,
  online boolean not null default true,
  last_seen timestamptz not null default now(),
  device_count integer not null default 1
);

create index idx_presence_online on presence(online) where online = true;

-- ============================================
-- Activity Logs (with stacking)
-- ============================================
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_name text not null,
  action text not null,
  details text,
  count integer not null default 1,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_created on activity_logs(created_at desc);

-- ============================================
-- Error Logs
-- ============================================
create table error_logs (
  id uuid primary key default uuid_generate_v4(),
  message text not null,
  stack text,
  context jsonb,
  user_agent text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================
-- Analytics Sessions
-- ============================================
create table analytics_sessions (
  id uuid primary key default uuid_generate_v4(),
  license_key text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================
-- AI Conversations
-- ============================================
create table ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  license_key text not null references license_keys(key) on delete cascade,
  subject_id text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- Voice Rooms
-- ============================================
create table voice_rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  max_participants integer not null default 10,
  created_at timestamptz not null default now()
);

-- ============================================
-- Voice Participants
-- ============================================
create table voice_participants (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references voice_rooms(id) on delete cascade,
  user_name text not null,
  license_key text,
  device_id text,
  joined_at timestamptz not null default now()
);

create index idx_voice_participants_room on voice_participants(room_id);

-- ============================================
-- Purchase Requests
-- ============================================
create table purchase_requests (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  whatsapp text not null,
  email text,
  package text not null default 'normal' check (package in ('discount', 'normal', 'free')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  license_key text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================
-- Invoice Counter (singleton)
-- ============================================
create table invoice_counter (
  id integer primary key default 1 check (id = 1),
  value integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================
-- Referrals
-- ============================================
create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_key text not null references license_keys(key) on delete cascade,
  referred_key text not null references license_keys(key) on delete cascade,
  created_at timestamptz not null default now(),
  unique(referrer_key, referred_key)
);

-- ============================================
-- Triggers: auto updated_at
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_license_keys_updated_at
  before update on license_keys
  for each row execute function update_updated_at();

create trigger trg_activations_updated_at
  before update on activations
  for each row execute function update_updated_at();

create trigger trg_user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at();

create trigger trg_user_notes_updated_at
  before update on user_notes
  for each row execute function update_updated_at();

create trigger trg_forum_threads_updated_at
  before update on forum_threads
  for each row execute function update_updated_at();

create trigger trg_ai_conversations_updated_at
  before update on ai_conversations
  for each row execute function update_updated_at();

-- ============================================
-- Trigger: auto comment_count on forum_threads
-- ============================================
create or replace function update_thread_comment_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update forum_threads
      set comment_count = comment_count + 1
      where id = new.thread_id;
    return new;
  elsif tg_op = 'DELETE' then
    update forum_threads
      set comment_count = greatest(comment_count - 1, 0)
      where id = old.thread_id;
    return old;
  end if;
end;
$$ language plpgsql;

create trigger trg_forum_comments_count
  after insert or delete on forum_comments
  for each row execute function update_thread_comment_count();

-- ============================================
-- RLS (Row Level Security)
-- ============================================
-- Enable RLS on all tables. Since we use service_role key for writes
-- and anon key for reads, the policies allow public SELECT on
-- shared tables and restrict everything else.

alter table license_keys enable row level security;
alter table activations enable row level security;
alter table devices enable row level security;
alter table user_settings enable row level security;
alter table user_notes enable row level security;
alter table bookmarks enable row level security;
alter table chat_messages enable row level security;
alter table pinned_messages enable row level security;
alter table chat_read_positions enable row level security;
alter table forum_threads enable row level security;
alter table forum_comments enable row level security;
alter table forum_polls enable row level security;
alter table poll_votes enable row level security;
alter table notifications enable row level security;
alter table announcements enable row level security;
alter table presence enable row level security;
alter table activity_logs enable row level security;
alter table error_logs enable row level security;
alter table analytics_sessions enable row level security;
alter table ai_conversations enable row level security;
alter table voice_rooms enable row level security;
alter table voice_participants enable row level security;
alter table purchase_requests enable row level security;
alter table invoice_counter enable row level security;
alter table referrals enable row level security;

-- Public read policies (anon key can SELECT these)
create policy "Public read chat_messages" on chat_messages for select using (true);
create policy "Public read pinned_messages" on pinned_messages for select using (true);
create policy "Public read forum_threads" on forum_threads for select using (true);
create policy "Public read forum_comments" on forum_comments for select using (true);
create policy "Public read forum_polls" on forum_polls for select using (true);
create policy "Public read poll_votes" on poll_votes for select using (true);
create policy "Public read announcements" on announcements for select using (true);
create policy "Public read presence" on presence for select using (true);
create policy "Public read voice_rooms" on voice_rooms for select using (true);
create policy "Public read voice_participants" on voice_participants for select using (true);
create policy "Public read activity_logs" on activity_logs for select using (true);

-- All writes go through API routes using service_role key,
-- which bypasses RLS. No INSERT/UPDATE/DELETE policies needed for anon.

-- ============================================
-- Realtime publications
-- ============================================
-- Enable Realtime on tables that need live updates
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table pinned_messages;
alter publication supabase_realtime add table presence;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table announcements;
alter publication supabase_realtime add table forum_threads;
alter publication supabase_realtime add table forum_comments;
alter publication supabase_realtime add table user_settings;
alter publication supabase_realtime add table voice_participants;

-- ============================================
-- Seed Data
-- ============================================

-- Default admin key
insert into license_keys (key, name, is_admin, days_active)
values ('ADMIN1', 'Admin', true, 365);

-- Preview key (for demo/dev without full auth)
insert into license_keys (key, name, is_tester, days_active)
values ('preview01', 'Preview User', true, 365);

-- Voice rooms
insert into voice_rooms (name, description, max_participants) values
  ('Study Room 1', 'Focused study session', 10),
  ('Study Room 2', 'Focused study session', 10),
  ('Discussion', 'Open discussion and Q&A', 15),
  ('Chill Zone', 'Relax and chat', 8);

-- Invoice counter (singleton)
insert into invoice_counter (id, value) values (1, 0);
