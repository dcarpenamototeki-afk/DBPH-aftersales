create table if not exists public.dbph_warehouse_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  report_year integer not null,
  report_month integer not null,
  generated_at timestamptz not null default now(),
  report_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dbph_warehouse_report_year_check check (report_year between 2000 and 2100),
  constraint dbph_warehouse_report_month_check check (report_month between 1 and 12),
  constraint dbph_warehouse_report_period_unique unique (report_year, report_month)
);

drop trigger if exists set_dbph_warehouse_monthly_reports_updated_at
  on public.dbph_warehouse_monthly_reports;
create trigger set_dbph_warehouse_monthly_reports_updated_at
before update on public.dbph_warehouse_monthly_reports
for each row execute function public.set_updated_at();

alter table public.dbph_warehouse_monthly_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dbph_warehouse_monthly_reports'
      and policyname = 'Authenticated users can read DBPH warehouse monthly reports'
  ) then
    create policy "Authenticated users can read DBPH warehouse monthly reports"
      on public.dbph_warehouse_monthly_reports
      for select to authenticated using (true);
  end if;
end;
$$;
