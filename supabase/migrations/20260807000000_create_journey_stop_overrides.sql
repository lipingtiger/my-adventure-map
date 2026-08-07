create table if not exists public.journey_stop_overrides (
  id uuid primary key default gen_random_uuid(),
  journey_id text not null,
  stop_id text not null,
  name text not null,
  city text,
  state_or_province text not null,
  country text not null,
  date date not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  description text not null,
  overnight text,
  start_point text,
  destination text,
  driving_distance_km double precision check (driving_distance_km >= 0),
  driving_distance_note text,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (journey_id, stop_id)
);

create index if not exists journey_stop_overrides_journey_idx
on public.journey_stop_overrides (journey_id);

alter table public.journey_stop_overrides enable row level security;

drop policy if exists "Public can read journey stop overrides" on public.journey_stop_overrides;

create policy "Public can read journey stop overrides"
on public.journey_stop_overrides
for select
using (true);

grant select on public.journey_stop_overrides to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.journey_stop_overrides;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
