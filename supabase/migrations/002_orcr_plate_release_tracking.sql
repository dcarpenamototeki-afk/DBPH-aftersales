alter table public.orcr_plate_records
  add column if not exists orcr_release_date date,
  add column if not exists orcr_release_method text not null default '',
  add column if not exists orcr_lbc_tracking_number text not null default '',
  add column if not exists orcr_received_by text not null default '',
  add column if not exists plate_release_date date,
  add column if not exists plate_release_method text not null default '',
  add column if not exists plate_lbc_tracking_number text not null default '',
  add column if not exists plate_received_by text not null default '';

alter table public.orcr_plate_records
  drop column if exists date_out,
  drop column if exists lbc_tracking_number;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orcr_release_method_check'
  ) then
    alter table public.orcr_plate_records
      add constraint orcr_release_method_check check (orcr_release_method in ('', 'LBC', 'WALK IN'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'plate_release_method_check'
  ) then
    alter table public.orcr_plate_records
      add constraint plate_release_method_check check (plate_release_method in ('', 'LBC', 'WALK IN'));
  end if;
end $$;
