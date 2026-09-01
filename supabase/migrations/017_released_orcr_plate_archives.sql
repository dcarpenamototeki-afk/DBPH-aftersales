create table if not exists public.released_orcr_plate_archives
  (like public.orcr_plate_records including all);

alter table public.released_orcr_plate_archives
  add column if not exists archived_at timestamptz not null default now(),
  add column if not exists archive_year integer,
  add column if not exists archive_month integer;

create index if not exists released_orcr_plate_archive_period_idx
  on public.released_orcr_plate_archives (archive_year, archive_month);

alter table public.released_orcr_plate_archives enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'released_orcr_plate_archives'
      and policyname = 'Authenticated users can read released ORCR plate archives'
  ) then
    create policy "Authenticated users can read released ORCR plate archives"
      on public.released_orcr_plate_archives
      for select to authenticated using (true);
  end if;
end;
$$;

create or replace function public.archive_completed_orcr_plate_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  archive_date date;
begin
  if new.orcr_release_date is null or new.plate_release_date is null then
    return new;
  end if;

  archive_date := greatest(new.orcr_release_date, new.plate_release_date);

  delete from public.released_orcr_plate_archives where id = new.id;

  insert into public.released_orcr_plate_archives (
    id, registered_name, owner_name, motorcycle_unit_type, color,
    engine_number, chassis_number, orcr_on_hand, date_in, plate_number,
    plate_on_hand, orcr_release_date, orcr_release_method,
    orcr_lbc_tracking_number, orcr_received_by, orcr_claimed_image_url,
    plate_release_date, plate_release_method, plate_lbc_tracking_number,
    plate_received_by, plate_claimed_image_url, new_owner_name, remarks,
    created_at, updated_at, archived_at, archive_year, archive_month
  ) values (
    new.id, new.registered_name, new.owner_name, new.motorcycle_unit_type, new.color,
    new.engine_number, new.chassis_number, new.orcr_on_hand, new.date_in, new.plate_number,
    new.plate_on_hand, new.orcr_release_date, new.orcr_release_method,
    new.orcr_lbc_tracking_number, new.orcr_received_by, new.orcr_claimed_image_url,
    new.plate_release_date, new.plate_release_method, new.plate_lbc_tracking_number,
    new.plate_received_by, new.plate_claimed_image_url, new.new_owner_name, new.remarks,
    new.created_at, new.updated_at, now(), extract(year from archive_date)::integer,
    extract(month from archive_date)::integer
  );

  delete from public.orcr_plate_records where id = new.id;
  return new;
end;
$$;

drop trigger if exists archive_completed_orcr_plate_record on public.orcr_plate_records;
create trigger archive_completed_orcr_plate_record
after insert or update of orcr_release_date, plate_release_date
on public.orcr_plate_records
for each row
execute function public.archive_completed_orcr_plate_record();

-- Backfill existing records. The copy and removal run in the same transaction.
insert into public.released_orcr_plate_archives (
  id, registered_name, owner_name, motorcycle_unit_type, color,
  engine_number, chassis_number, orcr_on_hand, date_in, plate_number,
  plate_on_hand, orcr_release_date, orcr_release_method,
  orcr_lbc_tracking_number, orcr_received_by, orcr_claimed_image_url,
  plate_release_date, plate_release_method, plate_lbc_tracking_number,
  plate_received_by, plate_claimed_image_url, new_owner_name, remarks,
  created_at, updated_at, archived_at, archive_year, archive_month
)
select
  id, registered_name, owner_name, motorcycle_unit_type, color,
  engine_number, chassis_number, orcr_on_hand, date_in, plate_number,
  plate_on_hand, orcr_release_date, orcr_release_method,
  orcr_lbc_tracking_number, orcr_received_by, orcr_claimed_image_url,
  plate_release_date, plate_release_method, plate_lbc_tracking_number,
  plate_received_by, plate_claimed_image_url, new_owner_name, remarks,
  created_at, updated_at, now(),
  extract(year from greatest(orcr_release_date, plate_release_date))::integer,
  extract(month from greatest(orcr_release_date, plate_release_date))::integer
from public.orcr_plate_records
where orcr_release_date is not null
  and plate_release_date is not null
on conflict (id) do nothing;

delete from public.orcr_plate_records source
using public.released_orcr_plate_archives archive
where source.id = archive.id
  and source.orcr_release_date is not null
  and source.plate_release_date is not null;

