create table if not exists dismissed_calendar_events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  event_id text not null,
  contact_id uuid not null references contacts(id) on delete cascade,
  unique (event_id, contact_id)
);

alter table dismissed_calendar_events enable row level security;

drop policy if exists "Allow anon select dismissed_calendar_events" on dismissed_calendar_events;
drop policy if exists "Allow anon insert dismissed_calendar_events" on dismissed_calendar_events;
drop policy if exists "Allow anon delete dismissed_calendar_events" on dismissed_calendar_events;

create policy "Allow anon select dismissed_calendar_events"
  on dismissed_calendar_events for select
  to anon
  using (true);

create policy "Allow anon insert dismissed_calendar_events"
  on dismissed_calendar_events for insert
  to anon
  with check (true);

create policy "Allow anon delete dismissed_calendar_events"
  on dismissed_calendar_events for delete
  to anon
  using (true);
