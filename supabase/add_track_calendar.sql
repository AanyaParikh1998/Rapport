alter table contacts
  add column if not exists track_calendar boolean;

update contacts
set track_calendar = case
  when lower(connection_type) = 'hot' then false
  else true
end
where track_calendar is null;

alter table contacts
  alter column track_calendar set default true;
