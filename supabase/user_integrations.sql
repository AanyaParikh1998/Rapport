create table if not exists user_integrations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  type text not null,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone
);

create unique index if not exists user_integrations_type_key on user_integrations (type);
