begin;

alter table public.journey_settings
  add column slug text,
  add column created_at timestamptz not null default now(),
  add column active_since timestamptz,
  alter column start_date drop not null,
  alter column end_date drop not null,
  alter column description set default '',
  alter column route_note set default '',
  alter column total_distance_label set default '',
  alter column duration_label set default '';
update public.journey_settings set slug = journey_id,
  active_since = case when status = 'active' then now() else null end;
alter table public.journey_settings alter column slug set not null;
create unique index journey_slug_unique on public.journey_settings(slug);
create unique index one_active_journey on public.journey_settings(status) where status = 'active';

create function public.guard_journey_status() returns trigger language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(7090626);
  if TG_OP = 'INSERT' or NEW.status is distinct from OLD.status then
    NEW.active_since := case when NEW.status = 'active' then now() else null end;
  end if;
  NEW.updated_at := now();
  return NEW;
end $$;
create trigger guard_journey_status before insert or update on public.journey_settings
for each row execute function public.guard_journey_status();

alter table public.journey_stops
  alter column date drop not null,
  add column transportation text not null default 'car'
    check (transportation in ('car','airplane','boat','bicycle','walking'));

alter table public.journey_photos
  alter column journey_id drop not null,
  add column latitude double precision,
  add column longitude double precision,
  add column location_name text,
  add column is_highlight boolean not null default false,
  add column thumbnail_url text,
  add column thumbnail_path text,
  add constraint photo_location_valid check (
    (latitude is null and longitude is null) or
    (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180));
alter table public.journey_video_links
  alter column journey_id drop not null,
  add column latitude double precision,
  add column longitude double precision,
  add column location_name text,
  add column is_highlight boolean not null default false,
  add constraint video_location_valid check (
    (latitude is null and longitude is null) or
    (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180));

create table public.journey_route_cache (
  route_key text primary key,
  journey_id text not null references public.journey_settings(journey_id) on delete cascade,
  positions jsonb not null,
  distance_km double precision not null,
  duration_hours double precision,
  created_at timestamptz not null default now()
);
alter table public.journey_route_cache enable row level security;
create policy "Public route cache" on public.journey_route_cache for select using (true);
grant select on public.journey_route_cache to anon, authenticated;

alter table public.journey_stops add constraint journey_stops_parent
  foreign key(journey_id) references public.journey_settings(journey_id) on delete cascade not valid;
alter table public.journey_photos add constraint journey_photos_parent
  foreign key(journey_id) references public.journey_settings(journey_id) on delete set null not valid;
alter table public.journey_video_links add constraint journey_videos_parent
  foreign key(journey_id) references public.journey_settings(journey_id) on delete set null not valid;

create function public.create_map_journey(p_id text, p_slug text, p_title text, p_subtitle text,
  p_start jsonb, p_user uuid) returns void language plpgsql set search_path = public as $$
begin
  insert into journey_settings(journey_id, slug, title, subtitle, updated_by)
    values(p_id, p_slug, p_title, p_subtitle, p_user);
  insert into journey_stops(journey_id, stop_id, name, address, latitude, longitude,
    country, state_or_province, description, type, sort_order, show_in_timeline, updated_by)
  values(p_id, 'route-start', p_start->>'name', p_start->>'address',
    (p_start->>'latitude')::double precision, (p_start->>'longitude')::double precision,
    coalesce(p_start->>'country',''), coalesce(p_start->>'stateOrProvince',''), '', 'start', 0, false, p_user);
end $$;

create function public.delete_map_journey(p_id text) returns void language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(7090626);
  if not exists(select 1 from journey_settings where journey_id = p_id) then
    raise exception 'Journey not found';
  end if;
  update journey_photos set journey_id = null, stop_id = null where journey_id = p_id;
  update journey_video_links set journey_id = null, stop_id = null where journey_id = p_id;
  delete from live_location_history where journey_id = p_id;
  delete from live_locations where journey_id = p_id;
  delete from journey_stop_overrides where journey_id = p_id;
  delete from journey_stops where journey_id = p_id;
  delete from journey_settings where journey_id = p_id;
end $$;

-- Select the active journey and record a fix in one transaction. World fixes are snapshots only.
create function public.record_map_location(p_row jsonb) returns void language plpgsql set search_path = public as $$
declare active_id text; active_time timestamptz; fix public.live_locations;
begin
  perform pg_advisory_xact_lock(7090626);
  select journey_id, active_since into active_id, active_time from journey_settings where status = 'active';
  fix := jsonb_populate_record(null::public.live_locations, p_row);
  insert into live_locations(journey_id, tracker_id, latitude, longitude, accuracy_m, altitude_m,
    battery_percent, heading_degrees, speed_mps, recorded_at, sharing_enabled, source, raw_payload, updated_at)
  values('__world__',fix.tracker_id,fix.latitude,fix.longitude,fix.accuracy_m,fix.altitude_m,
    fix.battery_percent,fix.heading_degrees,fix.speed_mps,fix.recorded_at,true,'owntracks','{}',now())
  on conflict(journey_id,tracker_id) do update set latitude=excluded.latitude, longitude=excluded.longitude,
    accuracy_m=excluded.accuracy_m, recorded_at=excluded.recorded_at, updated_at=now()
    where excluded.recorded_at >= live_locations.recorded_at;
  if active_id is null or fix.recorded_at < active_time then return; end if;
  insert into live_locations(journey_id, tracker_id, latitude, longitude, accuracy_m, altitude_m,
    battery_percent, heading_degrees, speed_mps, recorded_at, sharing_enabled, source, raw_payload, updated_at)
  values(active_id,fix.tracker_id,fix.latitude,fix.longitude,fix.accuracy_m,fix.altitude_m,
    fix.battery_percent,fix.heading_degrees,fix.speed_mps,fix.recorded_at,true,'owntracks','{}',now())
  on conflict(journey_id,tracker_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,
    accuracy_m=excluded.accuracy_m,recorded_at=excluded.recorded_at,updated_at=now()
    where excluded.recorded_at >= live_locations.recorded_at;
  insert into live_location_history(journey_id, tracker_id, latitude, longitude, accuracy_m,
    recorded_at, sharing_enabled, source, raw_payload)
  values(active_id,fix.tracker_id,fix.latitude,fix.longitude,fix.accuracy_m,fix.recorded_at,true,'owntracks','{}')
  on conflict(journey_id,tracker_id,recorded_at) do nothing;
end $$;

revoke all on function public.create_map_journey(text,text,text,text,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.delete_map_journey(text) from public, anon, authenticated;
revoke all on function public.record_map_location(jsonb) from public, anon, authenticated;
grant execute on function public.create_map_journey(text,text,text,text,jsonb,uuid) to service_role;
grant execute on function public.delete_map_journey(text) to service_role;
grant execute on function public.record_map_location(jsonb) to service_role;

create function public.reorder_map_stop(p_journey text, p_stop text, p_action text) returns text
language plpgsql set search_path = public as $$
declare current_stop journey_stops; target journey_stops; first_id text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_journey, 0));
  select * into current_stop from journey_stops where journey_id=p_journey and stop_id=p_stop for update;
  if not found then raise exception 'Stop not found'; end if;
  select stop_id into first_id from journey_stops where journey_id=p_journey order by sort_order limit 1;
  if first_id=p_stop then raise exception 'Route start must remain first. Edit its location instead.'; end if;
  if p_action='up' then
    select * into target from journey_stops where journey_id=p_journey and sort_order<current_stop.sort_order order by sort_order desc limit 1;
  else
    select * into target from journey_stops where journey_id=p_journey and sort_order>current_stop.sort_order order by sort_order limit 1;
  end if;
  if p_action='delete' then
    update journey_photos set stop_id=target.stop_id where journey_id=p_journey and stop_id=p_stop;
    update journey_video_links set stop_id=target.stop_id where journey_id=p_journey and stop_id=p_stop;
    delete from journey_stop_overrides where journey_id=p_journey and stop_id=p_stop;
    delete from journey_stops where journey_id=p_journey and stop_id=p_stop;
  elsif p_action in ('up','down') then
    if target.stop_id is null or target.stop_id=first_id then raise exception 'Stop cannot move further'; end if;
    update journey_stops set sort_order=case when stop_id=p_stop then target.sort_order else current_stop.sort_order end,
      updated_at=now() where journey_id=p_journey and stop_id in (p_stop,target.stop_id);
  else raise exception 'Invalid stop action';
  end if;
  return target.stop_id;
end $$;
revoke all on function public.reorder_map_stop(text,text,text) from public, anon, authenticated;
grant execute on function public.reorder_map_stop(text,text,text) to service_role;

commit;
