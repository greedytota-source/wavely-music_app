-- ═══════════════════════════════════════════════════════════════
-- Aurum — optional per-song description / credit note
--
-- Run once in Supabase → SQL Editor. The admin panel then shows a
-- "Song description / credit" box for YouTube songs, and the player
-- displays the text in the Now playing → Song details card.
--
-- Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

alter table public.tracks
  add column if not exists description text;
