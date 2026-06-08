alter table public.activity_log
  add column if not exists changed_by_email text not null default '';
