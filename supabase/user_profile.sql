create table user_profile (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  full_name text,
  current_company text,
  role text,
  location text,
  undergraduate_university text,
  graduate_university text,
  background text,
  linkedin_url text
);
