alter table public.journey_settings
  add column if not exists title text,
  add column if not exists subtitle text,
  add column if not exists description text,
  add column if not exists route_note text,
  add column if not exists total_distance_label text,
  add column if not exists duration_label text,
  add column if not exists start_date date,
  add column if not exists end_date date;

update public.journey_settings
set
  title = coalesce(title, 'Toronto to Seattle'),
  subtitle = coalesce(subtitle, 'A flexible cross-border route through Chicago, Badlands, Yellowstone, Montana, Spokane, and Seattle.'),
  description = coalesce(description, 'A scenic Toronto-to-Seattle road trip that crosses through the Chicago area, South Dakota, Wyoming, Yellowstone, Montana, Spokane, and the Puget Sound area.'),
  route_note = coalesce(route_note, 'This route is flexible and may change during the journey.'),
  total_distance_label = coalesce(total_distance_label, '5,200+ km'),
  duration_label = coalesce(duration_label, '12 days on the road'),
  start_date = coalesce(start_date, '2026-08-06'::date),
  end_date = coalesce(end_date, '2026-08-17'::date)
where journey_id = 'toronto-seattle-2026';

alter table public.journey_settings
  alter column title set not null,
  alter column subtitle set not null,
  alter column description set not null,
  alter column route_note set not null,
  alter column total_distance_label set not null,
  alter column duration_label set not null,
  alter column start_date set not null,
  alter column end_date set not null;
