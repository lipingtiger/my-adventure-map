create table if not exists public.journey_settings (
  journey_id text primary key,
  status text not null default 'planning' check (status in ('planning', 'active', 'completed')),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.journey_settings enable row level security;

drop policy if exists "Public can read journey settings" on public.journey_settings;
create policy "Public can read journey settings"
on public.journey_settings
for select
using (true);

grant select on public.journey_settings to anon, authenticated;

insert into public.journey_settings (journey_id, status)
values ('toronto-seattle-2026', 'completed')
on conflict (journey_id) do nothing;
