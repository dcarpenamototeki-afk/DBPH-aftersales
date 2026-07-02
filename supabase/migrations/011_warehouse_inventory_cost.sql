alter table public.dbph_warehouse_inventory
  add column if not exists cost numeric(14,2) not null default 0;
