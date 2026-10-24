-- ═══════════════════════════════════════════════════════════════
-- Wavely — listener accounts
-- Run once in Supabase → SQL Editor.
-- Public catalogue stays readable by everyone; playlists and likes
-- become per-user.
-- ═══════════════════════════════════════════════════════════════

-- 1) Playlist ownership (null = editorial/public playlist)
alter table public.playlists
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2) Likes
create table if not exists public.likes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  track_id   uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.likes enable row level security;

-- 3) Playlists: public ones readable by all, personal ones only by owner
drop policy if exists "public read playlists" on public.playlists;
drop policy if exists "admin write playlists" on public.playlists;
drop policy if exists "playlists_select" on public.playlists;
drop policy if exists "playlists_insert" on public.playlists;
drop policy if exists "playlists_update" on public.playlists;
drop policy if exists "playlists_delete" on public.playlists;

create policy "playlists_select" on public.playlists for select
  using (user_id is null or user_id = auth.uid());

create policy "playlists_insert" on public.playlists for insert to authenticated
  with check (user_id = auth.uid());

create policy "playlists_update" on public.playlists for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "playlists_delete" on public.playlists for delete to authenticated
  using (user_id = auth.uid());

-- 4) Playlist tracks follow their playlist
drop policy if exists "public read playlist_tracks" on public.playlist_tracks;
drop policy if exists "admin write playlist_tracks" on public.playlist_tracks;
drop policy if exists "playlist_tracks_select" on public.playlist_tracks;
drop policy if exists "playlist_tracks_insert" on public.playlist_tracks;
drop policy if exists "playlist_tracks_delete" on public.playlist_tracks;

create policy "playlist_tracks_select" on public.playlist_tracks for select
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_tracks.playlist_id
      and (p.user_id is null or p.user_id = auth.uid())
  ));

create policy "playlist_tracks_insert" on public.playlist_tracks for insert to authenticated
  with check (exists (
    select 1 from public.playlists p
    where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid()
  ));

create policy "playlist_tracks_delete" on public.playlist_tracks for delete to authenticated
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid()
  ));

-- 5) Likes are private to their owner
drop policy if exists "likes_select" on public.likes;
drop policy if exists "likes_insert" on public.likes;
drop policy if exists "likes_delete" on public.likes;

create policy "likes_select" on public.likes for select to authenticated
  using (user_id = auth.uid());

create policy "likes_insert" on public.likes for insert to authenticated
  with check (user_id = auth.uid());

create policy "likes_delete" on public.likes for delete to authenticated
  using (user_id = auth.uid());
