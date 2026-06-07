alter table public.sb_finance_inventory
  add column if not exists sold_date date,
  add column if not exists sold_orcr_released text not null default '',
  add column if not exists sold_plate_released text not null default '',
  add column if not exists sold_sb_finance_documents text not null default '',
  add column if not exists sold_for_too boolean not null default false;

alter table public.sb_finance_inventory
  drop column if exists claiming_orcr_status,
  drop column if exists exit_status,
  drop column if exists orcr_status,
  drop column if exists plate_status;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sb_finance_inventory_sold_orcr_check'
  ) then
    alter table public.sb_finance_inventory
      add constraint sb_finance_inventory_sold_orcr_check check (sold_orcr_released in ('', 'CLAIMED', 'TO FOLLOW'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sb_finance_inventory_sold_plate_check'
  ) then
    alter table public.sb_finance_inventory
      add constraint sb_finance_inventory_sold_plate_check check (sold_plate_released in ('', 'CLAIMED', 'TO FOLLOW'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sb_finance_inventory_sold_documents_check'
  ) then
    alter table public.sb_finance_inventory
      add constraint sb_finance_inventory_sold_documents_check check (sold_sb_finance_documents in ('', 'CLAIMED', 'TO FOLLOW'));
  end if;
end $$;
