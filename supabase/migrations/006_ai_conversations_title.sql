-- Add title column for conversation labels
alter table ai_conversations add column if not exists title text not null default '';

-- Add RLS policies for ai_conversations
create policy "ai_conversations_select" on ai_conversations
  for select using (true);
create policy "ai_conversations_insert" on ai_conversations
  for insert with check (true);
create policy "ai_conversations_update" on ai_conversations
  for update using (true);
create policy "ai_conversations_delete" on ai_conversations
  for delete using (true);
