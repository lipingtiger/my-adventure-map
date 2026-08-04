create extension if not exists pgcrypto;

create table if not exists public.live_locations (
  id uuid primary key default gen_random_uuid(),
  journey_id text not null,
  tracker_id text not null default 'primary',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision,
  altitude_m double precision,
  speed_mps double precision,
  heading_degrees double precision,
  battery_percent integer check (battery_percent between 0 and 100),
  source text not null default 'owntracks',
  raw_payload jsonb not null default '{}'::jsonb,
  sharing_enabled boolean not null default true,
  recorded_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint live_locations_journey_tracker_unique unique (journey_id, tracker_id)
);

alter table public.live_locations enable row level security;

drop policy if exists "Public can read enabled live locations" on public.live_locations;

create policy "Public can read enabled live locations"
on public.live_locations
for select
using (sharing_enabled = true);

grant select on public.live_locations to anon, authenticated;

create or replace function public.set_live_locations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists live_locations_set_updated_at on public.live_locations;

create trigger live_locations_set_updated_at
before update on public.live_locations
for each row
execute function public.set_live_locations_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.live_locations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
