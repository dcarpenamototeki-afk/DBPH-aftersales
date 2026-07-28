create table if not exists public.sales_invoice_tracker_records (
  id uuid primary key default gen_random_uuid(),
  model text not null default '',
  engine_number text not null default '',
  chassis_number text not null default '',
  color text not null default '',
  date_submitted_to_bristol date,
  status text not null default 'PENDING',
  note text not null default '',
  date_released date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_invoice_tracker_status_check check (status in ('PENDING', 'CLAIMED'))
);

drop trigger if exists set_sales_invoice_tracker_records_updated_at on public.sales_invoice_tracker_records;
create trigger set_sales_invoice_tracker_records_updated_at
before update on public.sales_invoice_tracker_records
for each row execute function public.set_updated_at();

create index if not exists sales_invoice_tracker_model_idx
  on public.sales_invoice_tracker_records using gin (to_tsvector('simple', model));

create index if not exists sales_invoice_tracker_engine_idx
  on public.sales_invoice_tracker_records (engine_number);

create index if not exists sales_invoice_tracker_chassis_idx
  on public.sales_invoice_tracker_records (chassis_number);

alter table public.sales_invoice_tracker_records enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'sales_invoice_tracker_records'
      and policyname = 'Authenticated users can read sales invoice tracker records'
  ) then
    create policy "Authenticated users can read sales invoice tracker records"
      on public.sales_invoice_tracker_records for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'sales_invoice_tracker_records'
      and policyname = 'Authenticated users can write sales invoice tracker records'
  ) then
    create policy "Authenticated users can write sales invoice tracker records"
      on public.sales_invoice_tracker_records for all to authenticated using (true) with check (true);
  end if;
end $$;
