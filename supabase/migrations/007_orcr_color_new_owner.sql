alter table public.orcr_plate_records
  add column if not exists color text not null default '',
  add column if not exists new_owner_name text not null default '';
