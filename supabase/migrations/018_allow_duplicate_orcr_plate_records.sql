-- Users choose whether to overwrite a matching record or intentionally create a new one.
-- Keep lookup indexes, but remove the constraints that previously blocked both choices.
drop index if exists public.orcr_engine_chassis_idx;
drop index if exists public.released_orcr_plate_archives_engine_number_chassis_number_idx;

create index if not exists orcr_engine_chassis_lookup_idx
  on public.orcr_plate_records (engine_number, chassis_number)
  where engine_number <> '' and chassis_number <> '';

create index if not exists released_orcr_plate_archives_engine_chassis_lookup_idx
  on public.released_orcr_plate_archives (engine_number, chassis_number)
  where engine_number <> '' and chassis_number <> '';
