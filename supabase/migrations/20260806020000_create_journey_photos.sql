insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journey-media',
  'journey-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.journey_photos (
  id uuid primary key default gen_random_uuid(),
  journey_id text not null,
  stop_id text,
  title text not null,
  caption text,
  storage_bucket text not null default 'journey-media',
  storage_path text not null,
  public_url text not null,
  taken_at date,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists journey_photos_journey_created_at_idx
on public.journey_photos (journey_id, created_at desc);

alter table public.journey_photos enable row level security;

drop policy if exists "Public can read journey photos" on public.journey_photos;

create policy "Public can read journey photos"
on public.journey_photos
for select
using (true);

grant select on public.journey_photos to anon, authenticated;
