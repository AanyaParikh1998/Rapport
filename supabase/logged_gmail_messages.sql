create table if not exists logged_gmail_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  message_id text not null,
  contact_id uuid not null references contacts(id) on delete cascade,
  direction text not null check (direction in ('sent', 'received')),
  subject text,
  dismissed boolean not null default false,
  unique (message_id, contact_id)
);

create index if not exists logged_gmail_messages_message_id_idx
  on logged_gmail_messages (message_id);

alter table logged_gmail_messages enable row level security;

drop policy if exists "Allow anon select logged_gmail_messages" on logged_gmail_messages;
drop policy if exists "Allow anon insert logged_gmail_messages" on logged_gmail_messages;
drop policy if exists "Allow anon update logged_gmail_messages" on logged_gmail_messages;

create policy "Allow anon select logged_gmail_messages"
  on logged_gmail_messages for select
  to anon
  using (true);

create policy "Allow anon insert logged_gmail_messages"
  on logged_gmail_messages for insert
  to anon
  with check (true);

create policy "Allow anon update logged_gmail_messages"
  on logged_gmail_messages for update
  to anon
  using (true);

-- If the table already exists without subject, run:
-- alter table logged_gmail_messages add column if not exists subject text;

-- If the table already exists without direction, run:
-- alter table logged_gmail_messages
--   add column if not exists direction text;
-- update logged_gmail_messages set direction = 'received' where direction is null;
-- alter table logged_gmail_messages alter column direction set not null;
-- alter table logged_gmail_messages
--   add constraint logged_gmail_messages_direction_check
--   check (direction in ('sent', 'received'));
