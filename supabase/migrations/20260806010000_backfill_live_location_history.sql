delete from public.live_location_history history
using public.live_location_history duplicate
where history.ctid < duplicate.ctid
  and history.journey_id = duplicate.journey_id
  and history.tracker_id = duplicate.tracker_id
  and history.recorded_at = duplicate.recorded_at;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'live_location_history_journey_tracker_recorded_unique'
  ) then
    alter table public.live_location_history
    add constraint live_location_history_journey_tracker_recorded_unique
    unique (journey_id, tracker_id, recorded_at);
  end if;
end;
$$;

insert into public.live_location_history (
  accuracy_m,
  altitude_m,
  battery_percent,
  heading_degrees,
  journey_id,
  latitude,
  longitude,
  raw_payload,
  recorded_at,
  sharing_enabled,
  source,
  speed_mps,
  tracker_id
)
select
  accuracy_m,
  altitude_m,
  battery_percent,
  heading_degrees,
  journey_id,
  latitude,
  longitude,
  raw_payload,
  recorded_at,
  sharing_enabled,
  source,
  speed_mps,
  tracker_id
from public.live_locations
on conflict (journey_id, tracker_id, recorded_at) do nothing;
