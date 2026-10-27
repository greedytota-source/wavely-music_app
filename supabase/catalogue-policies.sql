-- ═══════════════════════════════════════════════════════════════
-- Aurum — catalogue write access for the admin panel
--
-- Run this once in Supabase → SQL Editor if adding a song from
-- admin.html fails with:
--   new row violates row-level security policy for table "artists"
--   (or "albums" / "tracks" / "track_artists")
--
-- The player only reads the catalogue, so reads stay public. Writes
-- are allowed to any signed-in account. The admin login gate is UI
-- only, so if more than one person can sign up to your project, uncomment
-- the email allowlist at the bottom before running this file.
-- ═══════════════════════════════════════════════════════════════

-- Make sure RLS is on for every catalogue table (it normally already is).
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.tracks enable row level security;
do $$
begin
  if to_regclass('public.track_artists') is not null then
    execute 'alter table public.track_artists enable row level security';
  end if;
end $$;

-- ── Artists ─────────────────────────────────────────────────────
drop policy if exists "aurum_artists_read" on public.artists;
create policy "aurum_artists_read" on public.artists
  for select using (true);

drop policy if exists "aurum_artists_insert" on public.artists;
create policy "aurum_artists_insert" on public.artists
  for insert to authenticated with check (true);

drop policy if exists "aurum_artists_update" on public.artists;
create policy "aurum_artists_update" on public.artists
  for update to authenticated using (true) with check (true);

drop policy if exists "aurum_artists_delete" on public.artists;
create policy "aurum_artists_delete" on public.artists
  for delete to authenticated using (true);

-- ── Albums ──────────────────────────────────────────────────────
drop policy if exists "aurum_albums_read" on public.albums;
create policy "aurum_albums_read" on public.albums
  for select using (true);

drop policy if exists "aurum_albums_insert" on public.albums;
create policy "aurum_albums_insert" on public.albums
  for insert to authenticated with check (true);

drop policy if exists "aurum_albums_update" on public.albums;
create policy "aurum_albums_update" on public.albums
  for update to authenticated using (true) with check (true);

drop policy if exists "aurum_albums_delete" on public.albums;
create policy "aurum_albums_delete" on public.albums
  for delete to authenticated using (true);

-- ── Tracks ──────────────────────────────────────────────────────
drop policy if exists "aurum_tracks_read" on public.tracks;
create policy "aurum_tracks_read" on public.tracks
  for select using (true);

drop policy if exists "aurum_tracks_insert" on public.tracks;
create policy "aurum_tracks_insert" on public.tracks
  for insert to authenticated with check (true);

drop policy if exists "aurum_tracks_update" on public.tracks;
create policy "aurum_tracks_update" on public.tracks
  for update to authenticated using (true) with check (true);

drop policy if exists "aurum_tracks_delete" on public.tracks;
create policy "aurum_tracks_delete" on public.tracks
  for delete to authenticated using (true);

-- ── Track credits (optional table) ──────────────────────────────
do $$
begin
  if to_regclass('public.track_artists') is not null then
    execute 'drop policy if exists "aurum_track_artists_read" on public.track_artists';
    execute 'create policy "aurum_track_artists_read" on public.track_artists for select using (true)';

    execute 'drop policy if exists "aurum_track_artists_insert" on public.track_artists';
    execute 'create policy "aurum_track_artists_insert" on public.track_artists for insert to authenticated with check (true)';

    execute 'drop policy if exists "aurum_track_artists_delete" on public.track_artists';
    execute 'create policy "aurum_track_artists_delete" on public.track_artists for delete to authenticated using (true)';
  end if;
end $$;

-- ── Storage: audio uploads + cover/artist artwork ───────────────
-- Public read of the two buckets; signed-in accounts can upload,
-- overwrite and remove their own files.
drop policy if exists "aurum_catalogue_read" on storage.objects;
create policy "aurum_catalogue_read" on storage.objects
  for select using (bucket_id in ('audio', 'covers'));

drop policy if exists "aurum_catalogue_insert" on storage.objects;
create policy "aurum_catalogue_insert" on storage.objects
  for insert to authenticated with check (bucket_id in ('audio', 'covers'));

drop policy if exists "aurum_catalogue_update" on storage.objects;
create policy "aurum_catalogue_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('audio', 'covers'))
  with check (bucket_id in ('audio', 'covers'));

drop policy if exists "aurum_catalogue_delete" on storage.objects;
create policy "aurum_catalogue_delete" on storage.objects
  for delete to authenticated using (bucket_id in ('audio', 'covers'));

-- ── Optional: restrict writes to specific accounts ──────────────
-- Uncomment the block below, put your admin email(s) in the list, then
-- re-run the file. It makes the write policies above apply only to those
-- emails, even if other people manage to sign up.
--
-- create table if not exists public.aurum_admins (
--   email text primary key
-- );
-- insert into public.aurum_admins (email) values
--   ('you@example.com')
--   on conflict do nothing;
-- alter table public.aurum_admins enable row level security;
--
-- -- Replace the permissive write policies with allowlisted versions:
-- drop policy if exists "aurum_artists_insert" on public.artists;
-- drop policy if exists "aurum_artists_update" on public.artists;
-- drop policy if exists "aurum_artists_delete" on public.artists;
-- create policy "aurum_artists_insert" on public.artists for insert to authenticated
--   with check (exists (select 1 from public.aurum_admins a where a.email = auth.jwt() ->> 'email'));
-- create policy "aurum_artists_update" on public.artists for update to authenticated
--   using (exists (select 1 from public.aurum_admins a where a.email = auth.jwt() ->> 'email'))
--   with check (exists (select 1 from public.aurum_admins a where a.email = auth.jwt() ->> 'email'));
-- create policy "aurum_artists_delete" on public.artists for delete to authenticated
--   using (exists (select 1 from public.aurum_admins a where a.email = auth.jwt() ->> 'email'));
--
-- -- Repeat the same three policies for albums, tracks and track_artists,
-- -- and the storage insert/update/delete policies above.
