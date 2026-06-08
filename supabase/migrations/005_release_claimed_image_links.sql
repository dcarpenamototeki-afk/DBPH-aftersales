alter table public.orcr_plate_records
  add column if not exists orcr_claimed_image_url text not null default '',
  add column if not exists plate_claimed_image_url text not null default '';
