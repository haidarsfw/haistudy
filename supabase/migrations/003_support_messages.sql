create table support_messages (
  id uuid primary key default uuid_generate_v4(),
  license_key text not null,
  content text not null,
  is_admin boolean not null default false,
  sender_name text not null,
  created_at timestamptz not null default now()
);

create index idx_support_messages_key on support_messages(license_key, created_at);
