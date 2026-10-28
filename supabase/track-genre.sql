-- ═══════════════════════════════════════════════════════════════
-- Aurum — per-song category (Bollywood, Bhojpuri, Punjabi, Haryanvi…)
--
-- Run once in Supabase → SQL Editor. After that:
--
--   * the YouTube song form in the admin panel has a category picker,
--   * every row in Admin → Songs has one too, so songs that already
--     exist can be filed without being deleted and re-added,
--   * the player reads the value and fills the home page crates and the
--     /genre/<name> pages with the tracks that carry it.
--
-- Songs with no category keep working exactly as before: they stay in
-- All Songs, search and their album, and simply do not appear in a crate.
--
-- Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

alter table public.tracks
  add column if not exists genre text;

-- Case-insensitive lookups are the common query (lower(genre) = lower($1)).
create index if not exists tracks_genre_lower_idx
  on public.tracks (lower(genre));

-- Writes go through the same row level security as the rest of the
-- catalogue: reads are public, writes need a signed-in admin. Nothing to
-- change here unless your project has custom policies on public.tracks.
