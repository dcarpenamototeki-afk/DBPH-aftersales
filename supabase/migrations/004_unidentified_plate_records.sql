create table if not exists public.unidentified_plate_records (
  id uuid primary key default gen_random_uuid(),
  plate_number text not null default '',
  date_received date,
  source_location text not null default '',
  status text not null default 'UNTRACED',
  matched_registered_name text not null default '',
  matched_engine_number text not null default '',
  matched_chassis_number text not null default '',
  matched_record_type text not null default '',
  matched_record_id uuid,
  release_date date,
  release_method text not null default '',
  lbc_tracking_number text not null default '',
  received_by text not null default '',
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unidentified_plate_status_check check (status in ('UNTRACED', 'MATCHED', 'RELEASED')),
  constraint unidentified_plate_release_method_check check (release_method in ('', 'LBC', 'WALK IN'))
);

drop trigger if exists set_unidentified_plate_records_updated_at on public.unidentified_plate_records;
create trigger set_unidentified_plate_records_updated_at
before update on public.unidentified_plate_records
for each row execute function public.set_updated_at();

create unique index if not exists unidentified_plate_number_idx
  on public.unidentified_plate_records (plate_number)
  where plate_number <> '';

alter table public.unidentified_plate_records enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'unidentified_plate_records' and policyname = 'Authenticated users can read unidentified plates'
  ) then
    create policy "Authenticated users can read unidentified plates"
      on public.unidentified_plate_records for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'unidentified_plate_records' and policyname = 'Authenticated users can write unidentified plates'
  ) then
    create policy "Authenticated users can write unidentified plates"
      on public.unidentified_plate_records for all to authenticated using (true) with check (true);
  end if;
end $$;
