alter table interactions add column if not exists summary_discussed text;
alter table interactions add column if not exists summary_commitments text;
alter table interactions add column if not exists summary_followups text;
alter table interactions add column if not exists raw_notes text;

alter table interactions drop constraint if exists interactions_type_check;
alter table interactions add constraint interactions_type_check
  check (type in ('auto', 'manual', 'manual_met_connected', 'manual_responded'));
