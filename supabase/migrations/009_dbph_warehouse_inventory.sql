create table if not exists public.dbph_warehouse_inventory (
  id uuid primary key default gen_random_uuid(),
  warehouse text not null default 'DB1 WAREHOUSE',
  model text not null default '',
  color text not null default '',
  engine_number text not null default '',
  chassis_number text not null default '',
  orcr text not null default 'NO',
  cost numeric(14,2) not null default 0,
  status text not null default 'AVAIL',
  date_out date,
  customer_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dbph_warehouse_check check (warehouse in ('DB1 WAREHOUSE', 'DB2 WAREHOUSE')),
  constraint dbph_warehouse_orcr_check check (orcr in ('YES', 'NO')),
  constraint dbph_warehouse_cost_check check (cost >= 0),
  constraint dbph_warehouse_status_check check (status in ('AVAIL', 'SOLD'))
);

drop trigger if exists set_dbph_warehouse_inventory_updated_at on public.dbph_warehouse_inventory;
create trigger set_dbph_warehouse_inventory_updated_at
before update on public.dbph_warehouse_inventory
for each row execute function public.set_updated_at();

create index if not exists dbph_warehouse_inventory_warehouse_idx
  on public.dbph_warehouse_inventory (warehouse);
create index if not exists dbph_warehouse_inventory_model_idx
  on public.dbph_warehouse_inventory using gin (to_tsvector('simple', model));

alter table public.dbph_warehouse_inventory enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dbph_warehouse_inventory'
      and policyname = 'Authenticated users can read DBPH warehouse inventory'
  ) then
    create policy "Authenticated users can read DBPH warehouse inventory"
      on public.dbph_warehouse_inventory for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dbph_warehouse_inventory'
      and policyname = 'Authenticated users can write DBPH warehouse inventory'
  ) then
    create policy "Authenticated users can write DBPH warehouse inventory"
      on public.dbph_warehouse_inventory for all to authenticated using (true) with check (true);
  end if;
end;
$$;
