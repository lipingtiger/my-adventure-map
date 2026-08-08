create table if not exists public.journey_video_links (
  id uuid primary key default gen_random_uuid(),
  journey_id text not null,
  stop_id text,
  title text not null,
  caption text,
  video_url text not null,
  thumbnail_url text,
  taken_at date,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists journey_video_links_journey_created_at_idx
on public.journey_video_links (journey_id, created_at desc);

alter table public.journey_video_links enable row level security;

drop policy if exists "Public can read journey video links" on public.journey_video_links;

create policy "Public can read journey video links"
on public.journey_video_links
for select
using (true);

grant select on public.journey_video_links to anon, authenticated;
