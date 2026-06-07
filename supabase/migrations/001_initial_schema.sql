create extension if not exists "pgcrypto";

create table if not exists public.orcr_plate_records (
  id uuid primary key default gen_random_uuid(),
  registered_name text not null default '',
  owner_name text not null default '',
  motorcycle_unit_type text not null default '',
  engine_number text not null default '',
  chassis_number text not null default '',
  orcr_on_hand boolean not null default false,
  date_in date,
  plate_number text not null default '',
  plate_on_hand boolean not null default false,
  orcr_release_date date,
  orcr_release_method text not null default '',
  orcr_lbc_tracking_number text not null default '',
  orcr_received_by text not null default '',
  plate_release_date date,
  plate_release_method text not null default '',
  plate_lbc_tracking_number text not null default '',
  plate_received_by text not null default '',
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orcr_release_method_check check (orcr_release_method in ('', 'LBC', 'WALK IN')),
  constraint plate_release_method_check check (plate_release_method in ('', 'LBC', 'WALK IN'))
);

create table if not exists public.sales_invoice_records (
  id uuid primary key default gen_random_uuid(),
  sales_invoice_number text not null default '',
  registered_name text not null default '',
  motorcycle_unit_type text not null default '',
  engine_number text not null default '',
  chassis_number text not null default '',
  date_received date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sb_finance_inventory (
  id uuid primary key default gen_random_uuid(),
  motor_number text not null default '',
  registered_name text not null default '',
  motorcycle_model text not null default '',
  color text not null default '',
  year_model text not null default '',
  odometer_reading numeric,
  srp numeric,
  costing numeric,
  plate_number text not null default '',
  sold_date date,
  new_owner text not null default '',
  sold_orcr_released text not null default '',
  sold_plate_released text not null default '',
  sold_sb_finance_documents text not null default '',
  sold_for_too boolean not null default false,
  main_status text not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sb_finance_inventory_main_status_check check (main_status in ('AVAILABLE', 'SOLD')),
  constraint sb_finance_inventory_sold_orcr_check check (sold_orcr_released in ('', 'CLAIMED', 'TO FOLLOW')),
  constraint sb_finance_inventory_sold_plate_check check (sold_plate_released in ('', 'CLAIMED', 'TO FOLLOW')),
  constraint sb_finance_inventory_sold_documents_check check (sold_sb_finance_documents in ('', 'CLAIMED', 'TO FOLLOW'))
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  changed_by uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_orcr_plate_records_updated_at on public.orcr_plate_records;
create trigger set_orcr_plate_records_updated_at
before update on public.orcr_plate_records
for each row execute function public.set_updated_at();

drop trigger if exists set_sales_invoice_records_updated_at on public.sales_invoice_records;
create trigger set_sales_invoice_records_updated_at
before update on public.sales_invoice_records
for each row execute function public.set_updated_at();

drop trigger if exists set_sb_finance_inventory_updated_at on public.sb_finance_inventory;
create trigger set_sb_finance_inventory_updated_at
before update on public.sb_finance_inventory
for each row execute function public.set_updated_at();

create unique index if not exists orcr_engine_chassis_idx
  on public.orcr_plate_records (engine_number, chassis_number)
  where engine_number <> '' and chassis_number <> '';

create unique index if not exists sales_invoice_number_idx
  on public.sales_invoice_records (sales_invoice_number)
  where sales_invoice_number <> '';

create unique index if not exists inventory_motor_number_idx
  on public.sb_finance_inventory (motor_number)
  where motor_number <> '';

create index if not exists orcr_registered_name_idx on public.orcr_plate_records using gin (to_tsvector('simple', registered_name));
create index if not exists sales_registered_name_idx on public.sales_invoice_records using gin (to_tsvector('simple', registered_name));
create index if not exists inventory_registered_name_idx on public.sb_finance_inventory using gin (to_tsvector('simple', registered_name));

alter table public.orcr_plate_records enable row level security;
alter table public.sales_invoice_records enable row level security;
alter table public.sb_finance_inventory enable row level security;
alter table public.activity_log enable row level security;

create policy "Authenticated users can read orcr records"
  on public.orcr_plate_records for select to authenticated using (true);
create policy "Authenticated users can write orcr records"
  on public.orcr_plate_records for all to authenticated using (true) with check (true);

create policy "Authenticated users can read sales invoices"
  on public.sales_invoice_records for select to authenticated using (true);
create policy "Authenticated users can write sales invoices"
  on public.sales_invoice_records for all to authenticated using (true) with check (true);

create policy "Authenticated users can read inventory"
  on public.sb_finance_inventory for select to authenticated using (true);
create policy "Authenticated users can write inventory"
  on public.sb_finance_inventory for all to authenticated using (true) with check (true);

create policy "Authenticated users can read activity log"
  on public.activity_log for select to authenticated using (true);
