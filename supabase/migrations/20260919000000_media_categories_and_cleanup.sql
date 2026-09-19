begin;

create or replace function public.delete_map_journey(p_id text) returns void language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(7090626);
  perform 1 from journey_settings where journey_id = p_id for update;
  if not found then raise exception 'Journey not found'; end if;
  update journey_photos set journey_id = null, stop_id = null,
    latitude = null, longitude = null, location_name = null, is_highlight = true where journey_id = p_id;
  update journey_video_links set journey_id = null, stop_id = null,
    latitude = null, longitude = null, location_name = null, is_highlight = true where journey_id = p_id;
  delete from live_location_history where journey_id = p_id;
  delete from live_locations where journey_id = p_id;
  delete from journey_stop_overrides where journey_id = p_id;
  delete from journey_stops where journey_id = p_id;
  delete from journey_settings where journey_id = p_id;
end $$;

-- Keep file paths durably until storage confirms removal, even if a request is interrupted.
create table public.media_storage_cleanup (
  id uuid primary key,
  storage_bucket text not null,
  paths text[] not null,
  created_at timestamptz not null default now()
);
alter table public.media_storage_cleanup enable row level security;
revoke all on public.media_storage_cleanup from public, anon, authenticated;
grant select, insert, delete on public.media_storage_cleanup to service_role;

create function public.delete_unlocated_media(p_items jsonb) returns integer
language plpgsql set search_path = public as $$
declare item record; photo journey_photos; video journey_video_links; removed integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Choose media items'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then raise exception 'Choose 1 to 100 media items'; end if;
  -- Lock in a stable order. Any ineligible item rolls back the entire selection.
  for item in select distinct value->>'kind' as kind, (value->>'id')::uuid as id
    from jsonb_array_elements(p_items) order by kind, id
  loop
    if item.id is null or item.kind is null or item.kind not in ('photo','video') then raise exception 'Invalid media item'; end if;
    if item.kind = 'photo' then
      select * into photo from journey_photos where id = item.id for update;
      if not found then continue; end if;
      if photo.journey_id is not null or photo.latitude is not null or photo.longitude is not null then
        raise exception 'Only Unlocated media can be deleted here. Refresh your selection.';
      end if;
      insert into media_storage_cleanup(id, storage_bucket, paths)
        values(photo.id, photo.storage_bucket, array_remove(array[photo.storage_path, photo.thumbnail_path], null));
      delete from journey_photos where id = photo.id;
    else
      select * into video from journey_video_links where id = item.id for update;
      if not found then continue; end if;
      if video.journey_id is not null or video.latitude is not null or video.longitude is not null then
        raise exception 'Only Unlocated media can be deleted here. Refresh your selection.';
      end if;
      delete from journey_video_links where id = video.id;
    end if;
    removed := removed + 1;
  end loop;
  return removed;
end $$;
revoke all on function public.delete_unlocated_media(jsonb) from public, anon, authenticated;
grant execute on function public.delete_unlocated_media(jsonb) to service_role;

commit;
