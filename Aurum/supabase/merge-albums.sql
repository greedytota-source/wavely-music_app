-- ═══════════════════════════════════════════════════════════════
-- Aurum — merge albums that share the same name
--
-- Run this once in Supabase → SQL Editor if the library still shows
-- separate albums with the same title (older rows were created per
-- artist before the admin started matching album names globally).
--
-- What it does:
--   1. Picks the lowest-id album for each title (case/space-insensitive).
--   2. Re-points every track from a duplicate album to that one album.
--   3. Deletes the duplicate album rows that are now empty.
--
-- Safe to run more than once. It does not touch playlists or likes.
-- ═══════════════════════════════════════════════════════════════

-- 1) Move tracks onto one album per title.
with keep as (
  select distinct on (lower(btrim(title)))
    id,
    lower(btrim(title)) as norm
  from public.albums
  where title is not null
  order by lower(btrim(title)), id
)
update public.tracks t
set album_id = k.id
from public.albums a
join keep k on lower(btrim(a.title)) = k.norm
where t.album_id = a.id
  and a.id <> k.id;

-- 2) Remove the now-empty duplicate album rows (lowest id wins).
delete from public.albums a
using public.albums b
where a.id <> b.id
  and a.title is not null
  and b.title is not null
  and lower(btrim(a.title)) = lower(btrim(b.title))
  and b.id < a.id
  and not exists (
    select 1 from public.tracks t where t.album_id = a.id
  );

-- 3) Optional check: should return one row per album title.
-- select lower(btrim(title)) as album, count(*) as rows
-- from public.albums
-- group by 1
-- having count(*) > 1;
