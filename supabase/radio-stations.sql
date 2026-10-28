create table if not exists public.radio_stations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  frequency text,
  city text,
  stream_url text not null,
  enabled boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint radio_stations_stream_url_https check (stream_url like 'https://%')
);

create index if not exists radio_stations_position_idx
  on public.radio_stations (position, name);

alter table public.radio_stations enable row level security;

drop policy if exists "radio_stations_public_read" on public.radio_stations;
create policy "radio_stations_public_read" on public.radio_stations
  for select to anon, authenticated using (true);

drop policy if exists "radio_stations_admin_insert" on public.radio_stations;
create policy "radio_stations_admin_insert" on public.radio_stations
  for insert to authenticated with check (true);

drop policy if exists "radio_stations_admin_update" on public.radio_stations;
create policy "radio_stations_admin_update" on public.radio_stations
  for update to authenticated using (true) with check (true);

drop policy if exists "radio_stations_admin_delete" on public.radio_stations;
create policy "radio_stations_admin_delete" on public.radio_stations
  for delete to authenticated using (true);

grant select on public.radio_stations to anon, authenticated;
grant insert, update, delete on public.radio_stations to authenticated;

insert into public.radio_stations (name, frequency, city, stream_url, enabled, position)
values (
  'FM GOLD',
  '106.4',
  'Delhi',
  'https://d3r9rhourdc02u.cloudfront.net/assets/radio/airdelhi01/air001_Auto.m3u8',
  true,
  0
)
on conflict (name) do update set
  frequency = excluded.frequency,
  city = excluded.city,
  stream_url = excluded.stream_url,
  enabled = excluded.enabled,
  position = excluded.position;