-- Interaction log table (matches the live Supabase schema)
-- Columns: id, contact_id, created_at, type, notes, draft

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  type text not null check (type in ('auto', 'manual')),
  notes text,
  draft uuid references outreach_drafts(id) on delete set null
);

create index if not exists interactions_contact_id_created_at_idx
  on interactions (contact_id, created_at desc);

alter table interactions enable row level security;

drop policy if exists "Allow anon select interactions" on interactions;
drop policy if exists "Allow anon insert interactions" on interactions;
drop policy if exists "Allow anon update interactions" on interactions;
drop policy if exists "Allow anon delete interactions" on interactions;

create policy "Allow anon select interactions"
  on interactions for select
  to anon
  using (true);

create policy "Allow anon insert interactions"
  on interactions for insert
  to anon
  with check (true);

create policy "Allow anon update interactions"
  on interactions for update
  to anon
  using (true)
  with check (true);

create policy "Allow anon delete interactions"
  on interactions for delete
  to anon
  using (true);
