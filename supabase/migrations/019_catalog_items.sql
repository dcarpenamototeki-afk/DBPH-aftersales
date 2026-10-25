create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  brand text not null default '',
  category text not null default 'Street',
  engine_cc numeric,
  year_model text not null default '',
  odometer_km numeric,
  cash_price numeric,
  swapping_value numeric,
  image_url text not null default '',
  condition_notes text not null default '',
  is_available boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_catalog_items_updated_at on public.catalog_items;
create trigger set_catalog_items_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

create index if not exists catalog_items_public_idx
  on public.catalog_items (is_published, is_available, updated_at desc);

alter table public.catalog_items enable row level security;

drop policy if exists "Public users can read published catalog items" on public.catalog_items;
create policy "Public users can read published catalog items"
  on public.catalog_items for select to anon, authenticated
  using (is_published = true and is_available = true);
