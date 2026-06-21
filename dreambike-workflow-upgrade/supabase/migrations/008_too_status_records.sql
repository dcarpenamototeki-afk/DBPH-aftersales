create table if not exists public.too_status_records (
  id uuid primary key default gen_random_uuid(),
  origin text not null default 'PERSONAL BIKE',
  first_owner_name text not null default '',
  new_owner_name text not null default '',
  motorcycle_unit_type text not null default '',
  color text not null default '',
  engine_number text not null default '',
  chassis_number text not null default '',
  plate_number text not null default '',
  date_received date,
  data_check_status text not null default 'NOT CHECKED',
  matched_orcr_record_id uuid,
  status text not null default 'IN PROCESS',
  release_date date,
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint too_status_origin_check check (origin in ('SWAP UNIT', 'PERSONAL BIKE', 'SINSKI', 'SB FINANCE')),
  constraint too_data_check_status_check check (data_check_status in ('NOT CHECKED', 'NO MATCH', 'MATCHED & MOVED')),
  constraint too_status_check check (status in ('IN PROCESS', 'RELEASED'))
);

drop trigger if exists set_too_status_records_updated_at on public.too_status_records;
create trigger set_too_status_records_updated_at
before update on public.too_status_records
for each row execute function public.set_updated_at();

create index if not exists too_first_owner_name_idx
  on public.too_status_records using gin (to_tsvector('simple', first_owner_name));
create index if not exists too_new_owner_name_idx
  on public.too_status_records using gin (to_tsvector('simple', new_owner_name));

alter table public.too_status_records enable row level security;

create policy "Authenticated users can read TOO records"
  on public.too_status_records for select to authenticated using (true);
create policy "Authenticated users can write TOO records"
  on public.too_status_records for all to authenticated using (true) with check (true);

create or replace function public.check_and_move_too_record(p_too_id uuid)
returns public.too_status_records
language plpgsql
security definer
set search_path = public
as $$
declare
  too_row public.too_status_records;
  orcr_row public.orcr_plate_records;
begin
  select * into too_row
  from public.too_status_records
  where id = p_too_id
  for update;

  if not found then
    raise exception 'ToO record was not found.';
  end if;

  select * into orcr_row
  from public.orcr_plate_records
  where lower(trim(registered_name)) = lower(trim(too_row.first_owner_name))
     or lower(trim(owner_name)) = lower(trim(too_row.first_owner_name))
  order by updated_at desc
  limit 1
  for update;

  if not found then
    update public.too_status_records
    set data_check_status = 'NO MATCH'
    where id = p_too_id
    returning * into too_row;
    return too_row;
  end if;

  update public.too_status_records
  set motorcycle_unit_type = coalesce(nullif(motorcycle_unit_type, ''), orcr_row.motorcycle_unit_type),
      color = coalesce(nullif(color, ''), orcr_row.color),
      engine_number = coalesce(nullif(engine_number, ''), orcr_row.engine_number),
      chassis_number = coalesce(nullif(chassis_number, ''), orcr_row.chassis_number),
      plate_number = coalesce(nullif(plate_number, ''), orcr_row.plate_number),
      data_check_status = 'MATCHED & MOVED',
      matched_orcr_record_id = orcr_row.id
  where id = p_too_id
  returning * into too_row;

  delete from public.orcr_plate_records where id = orcr_row.id;
  return too_row;
end;
$$;

grant execute on function public.check_and_move_too_record(uuid) to authenticated;
