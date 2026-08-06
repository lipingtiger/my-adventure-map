create extension if not exists pgcrypto;

create table if not exists public.live_location_history (
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
  created_at timestamptz not null default now()
);

create index if not exists live_location_history_journey_recorded_at_idx
on public.live_location_history (journey_id, recorded_at);

create index if not exists live_location_history_tracker_recorded_at_idx
on public.live_location_history (journey_id, tracker_id, recorded_at);

alter table public.live_location_history enable row level security;

drop policy if exists "Public can read enabled live location history" on public.live_location_history;

create policy "Public can read enabled live location history"
on public.live_location_history
for select
using (sharing_enabled = true);

grant select on public.live_location_history to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.live_location_history;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
