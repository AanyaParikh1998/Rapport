-- Migrate pipeline stage values to the new column model.
update contacts set status = 'not_contacted' where status = 'drafted';
update contacts set status = 'in_progress' where status = 'sent';
