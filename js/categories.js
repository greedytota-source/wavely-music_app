/* ═══════════════════════════════════════════════════════════════
   Aurum — categories

   One list, used everywhere: the home page crates, the /genre/ pages,
   the Youtube song form in the admin panel and the per-song category
   picker in the song list. A track's category is stored in
   `tracks.genre` (see supabase/track-genre.sql), matched by name and
   case-insensitively, so "bollywood" and "Bollywood" are the same crate.

   The four Indian categories lead because they are what this room is
   for; the older English moods stay below so nothing that already
   exists disappears from Browse all.
   ═══════════════════════════════════════════════════════════════ */

window.AURUM_CATEGORIES = [
  {
    name: "Bollywood",
    slug: "bollywood",
    c1: "#8f3d52",
    blurb: "Hindi film music — the songs everyone already knows by heart."
  },
  {
    name: "Bhojpuri",
    slug: "bhojpuri",
    c1: "#a3542f",
    blurb: "Bhojpuri dance, folk aur dhamaka, ek hi jagah."
  },
  {
    name: "Punjabi",
    slug: "punjabi",
    c1: "#8a6a2f",
    blurb: "Bhangra beats, big choruses and the modern Punjabi sound."
  },
  {
    name: "Haryanvi",
    slug: "haryanvi",
    c1: "#6f6b35",
    blurb: "Haryanvi folk, raagni and the new Haryanvi hits."
  },
  { name: "Pop", slug: "pop", c1: "#7d4257", blurb: "Bright hooks and big choruses." },
  { name: "Indie", slug: "indie", c1: "#4e5c33", blurb: "Guitars with soft edges." },
  { name: "Hip-Hop", slug: "hip-hop", c1: "#8a4a26", blurb: "Beats first, everything else after." },
  { name: "Rock", slug: "rock", c1: "#7a3238", blurb: "Loud, live and unpolished." },
  { name: "Chill", slug: "chill", c1: "#33405c", blurb: "Slow tempos and open windows." },
  { name: "Workout", slug: "workout", c1: "#55504a", blurb: "Something with a pulse." },
  { name: "Party", slug: "party", c1: "#6d3f63", blurb: "For rooms with the lights down." },
  { name: "Focus", slug: "focus", c1: "#463950", blurb: "Texture, not lyrics." },
  { name: "Love", slug: "love", c1: "#5b4a70", blurb: "The slow ones." },
  { name: "Sleep", slug: "sleep", c1: "#2f3b52", blurb: "Quiet enough to drift off to." },
  { name: "Commute", slug: "commute", c1: "#3d5560", blurb: "For the long way home." },
  { name: "Gaming", slug: "gaming", c1: "#7a3c22", blurb: "Momentum, on repeat." }
].map((c) => ({
  ...c,
  seed: `genre:${c.slug}`,
  radio: `${c.name} Radio`
}));

/* The crates the home page leads with. */
window.AURUM_LEAD_CATEGORIES = ["Bollywood", "Bhojpuri", "Punjabi", "Haryanvi"];

window.AURUM_CATEGORY_BY_NAME = Object.fromEntries(
  window.AURUM_CATEGORIES.map((c) => [c.name, c])
);

window.AURUM_CATEGORY_BY_SLUG = Object.fromEntries(
  window.AURUM_CATEGORIES.map((c) => [c.slug, c])
);

/* Used by the admin selects and by anything that has to accept a category
   typed by hand: returns the canonical name, or null for "no category". */
window.resolveCategoryName = function resolveCategoryName(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const byName = window.AURUM_CATEGORY_BY_NAME[raw];
  if (byName) return byName.name;
  const lower = raw.toLowerCase();
  const found = window.AURUM_CATEGORIES.find(
    (c) => c.slug === lower || c.name.toLowerCase() === lower
  );
  return found ? found.name : raw;
};
