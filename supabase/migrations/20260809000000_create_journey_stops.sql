create table if not exists public.journey_stops (
  id uuid primary key default gen_random_uuid(),
  journey_id text not null,
  stop_id text not null,
  sort_order numeric not null,
  day_number integer,
  day_stop_order integer,
  name text not null,
  address text,
  city text,
  state_or_province text not null,
  country text not null,
  date date not null,
  latitude double precision not null,
  longitude double precision not null,
  type text not null,
  description text not null,
  completed boolean not null default false,
  driving_distance_km numeric,
  driving_distance_note text,
  overnight text,
  overnight_status text not null default 'none',
  start_point text,
  destination text,
  optional boolean not null default false,
  show_in_timeline boolean not null default true,
  notes text[],
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (journey_id, stop_id),
  constraint journey_stops_overnight_status_check
    check (overnight_status in ('none', 'pass', 'overnight'))
);

create index if not exists journey_stops_journey_sort_order_idx
on public.journey_stops (journey_id, sort_order);

alter table public.journey_stops enable row level security;

drop policy if exists "Public can read journey stops" on public.journey_stops;

create policy "Public can read journey stops"
on public.journey_stops
for select
using (true);

grant select on public.journey_stops to anon, authenticated;
