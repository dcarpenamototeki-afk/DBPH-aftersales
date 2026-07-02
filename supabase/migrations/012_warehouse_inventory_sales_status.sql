alter table public.dbph_warehouse_inventory
  add column if not exists status text not null default 'AVAIL',
  add column if not exists date_out date;

alter table public.dbph_warehouse_inventory
  drop constraint if exists dbph_warehouse_status_check;

alter table public.dbph_warehouse_inventory
  add constraint dbph_warehouse_status_check check (status in ('AVAIL', 'SOLD'));
