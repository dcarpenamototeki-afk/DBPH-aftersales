alter table public.dbph_warehouse_inventory
  add column if not exists customer_name text not null default '';
