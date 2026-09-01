create table if not exists public.important_documents (
  id uuid primary key default gen_random_uuid(),
  document text not null,
  description text not null,
  google_drive_link text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint important_documents_document_required check (btrim(document) <> ''),
  constraint important_documents_description_required check (btrim(description) <> ''),
  constraint important_documents_google_link_check check (
    google_drive_link ~ '^https://(drive|docs)\.google\.com/'
  )
);

drop trigger if exists set_important_documents_updated_at on public.important_documents;
create trigger set_important_documents_updated_at
before update on public.important_documents
for each row execute function public.set_updated_at();

alter table public.important_documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'important_documents'
      and policyname = 'Authenticated users can read important documents'
  ) then
    create policy "Authenticated users can read important documents"
      on public.important_documents for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'important_documents'
      and policyname = 'Authenticated users can write important documents'
  ) then
    create policy "Authenticated users can write important documents"
      on public.important_documents for all to authenticated using (true) with check (true);
  end if;
end;
$$;

-- Existing document records are managed in Supabase through the app.
-- Drive links are intentionally not embedded in this public repository.

