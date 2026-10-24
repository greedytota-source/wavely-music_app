/* ═══════════════════════════════════════════════════════════════
   Wavely — demo catalogue
   All artists, songs, albums and playlists here are fictional.
   Swap this file for a real API or local library when wiring audio.
   ═══════════════════════════════════════════════════════════════ */

const TRACKS = [
  { id: "t1",  title: "Midnight Static",  artist: "Nova Ray",      album: "Neon Static",   duration: 222, plays: "48,201,933" },
  { id: "t2",  title: "Paper Planes",     artist: "The Slow Hours", album: "Paper Planes",  duration: 198, plays: "21,884,102" },
  { id: "t3",  title: "Golden Hour",      artist: "Iris Vale",       album: "Golden Hour",   duration: 241, plays: "63,450,721" },
  { id: "t4",  title: "Coastline",        artist: "Kite & Sea",      album: "Coastline",     duration: 207, plays: "12,309,884" },
  { id: "t5",  title: "Afterglow",        artist: "Maren Sol",       album: "Afterglow",     duration: 235, plays: "34,771,220" },
  { id: "t6",  title: "Night Drive",      artist: "Cassette Club",   album: "Night Drive",   duration: 252, plays: "57,102,338" },
  { id: "t7",  title: "Velvet Room",      artist: "Lina Marsh",      album: "Velvet Room",   duration: 216, plays: "19,442,007" },
  { id: "t8",  title: "Echo Park",        artist: "The Slow Hours",  album: "Echo Park",     duration: 189, plays: "8,773,516" },
  { id: "t9",  title: "Static Bloom",     artist: "Nova Ray",        album: "Neon Static",   duration: 178, plays: "26,118,442" },
  { id: "t10", title: "Blue Hour",        artist: "Iris Vale",       album: "Golden Hour",   duration: 224, plays: "41,003,915" },
  { id: "t11", title: "Runaway Sun",      artist: "Kite & Sea",      album: "Coastline",     duration: 201, plays: "15,662,804" },
  { id: "t12", title: "Low Tide",         artist: "Maren Sol",       album: "Afterglow",     duration: 245, plays: "22,904,771" },
  { id: "t13", title: "Headlights",       artist: "Cassette Club",   album: "Night Drive",   duration: 211, plays: "31,558,092" },
  { id: "t14", title: "Slow Motion",      artist: "Lina Marsh",      album: "Slow Motion",   duration: 227, plays: "17,882,340" },
  { id: "t15", title: "Northern Lights",  artist: "Aurora Field",    album: "Northern Lights", duration: 262, plays: "29,441,508" },
  { id: "t16", title: "Glasshouse",       artist: "Aurora Field",    album: "Northern Lights", duration: 232, plays: "11,220,664" },
  { id: "t17", title: "Wildflower",       artist: "Juniper Lane",    album: "Wildflower",    duration: 194, plays: "38,662,190" },
  { id: "t18", title: "Backseat",         artist: "Juniper Lane",    album: "Wildflower",    duration: 208, plays: "14,903,772" },
  { id: "t19", title: "Driftwood",        artist: "Kite & Sea",      album: "Coastline",     duration: 249, plays: "9,881,423" },
  { id: "t20", title: "Nightcall",        artist: "Static Youth",    album: "Nightcall",     duration: 219, plays: "44,209,776" },
  { id: "t21", title: "Signal Fire",      artist: "Static Youth",    album: "Nightcall",     duration: 237, plays: "27,551,308" },
  { id: "t22", title: "Half Light",       artist: "Nova Ray",        album: "Neon Static",   duration: 203, plays: "20,004,119" },
  { id: "t23", title: "Cherry Soda",      artist: "Peach Motel",     album: "Cherry Soda",   duration: 171, plays: "33,117,650" },
  { id: "t24", title: "Parking Lot",      artist: "Peach Motel",     album: "Cherry Soda",   duration: 186, plays: "12,448,901" },
  { id: "t25", title: "Monsoon",          artist: "Asha Rao",        album: "Monsoon",       duration: 258, plays: "52,880,144" },
  { id: "t26", title: "Cardamom",         artist: "Asha Rao",        album: "Monsoon",       duration: 221, plays: "18,664,220" },
  { id: "t27", title: "City Rain",        artist: "Asha Rao",        album: "Monsoon",       duration: 209, plays: "24,993,015" },
  { id: "t28", title: "Slow Burn",        artist: "Maren Sol",       album: "Afterglow",     duration: 273, plays: "26,442,818" },
  { id: "t29", title: "Paperweight",      artist: "The Slow Hours",  album: "Paper Planes",  duration: 192, plays: "7,552,664" },
  { id: "t30", title: "Orbit",            artist: "Iris Vale",       album: "Golden Hour",   duration: 238, plays: "37,009,442" },
  { id: "t31", title: "Midnight Oil",     artist: "Cassette Club",   album: "Midnight Oil",  duration: 244, plays: "23,118,730" },
  { id: "t32", title: "Fever Dream",      artist: "Lina Marsh",      album: "Fever Dream",   duration: 213, plays: "16,220,587" },
  { id: "t33", title: "Undertow",         artist: "Aurora Field",    album: "Northern Lights", duration: 251, plays: "19,338,266" },
  { id: "t34", title: "Sunroom",          artist: "Juniper Lane",    album: "Wildflower",    duration: 182, plays: "28,771,093" },
  { id: "t35", title: "Chasing Trails",   artist: "Juniper Lane",    album: "Wildflower",    duration: 225, plays: "13,559,480" },
  { id: "t36", title: "No Signal",        artist: "Static Youth",    album: "Nightcall",     duration: 197, plays: "21,004,552" },
  { id: "t37", title: "Blacktop",         artist: "Peach Motel",     album: "Cherry Soda",   duration: 179, plays: "9,442,118" },
  { id: "t38", title: "Petrichor",        artist: "Asha Rao",        album: "Monsoon",       duration: 266, plays: "30,558,901" },
  { id: "t39", title: "Late Checkout",    artist: "Cassette Club",   album: "Midnight Oil",  duration: 230, plays: "18,220,644" },
  { id: "t40", title: "Blue Neon",        artist: "Nova Ray",        album: "Neon Static",   duration: 191, plays: "35,881,220" }
];

const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

window.byIds = (ids) => (ids || []).map((id) => (window.TRACK_BY_ID || {})[id]).filter(Boolean);
const byIds = window.byIds;

const PLAYLISTS = [
  {
    id: "liked",
    type: "Playlist",
    title: "Liked Songs",
    owner: "You",
    seed: "Liked Songs",
    glyph: "♥",
    description: "Every song you've liked, in one place.",
    trackIds: ["t1", "t3", "t5", "t7", "t10", "t12", "t14", "t17", "t19", "t23", "t25", "t28", "t30", "t33", "t34", "t38", "t39", "t40"],
    system: true
  },
  {
    id: "discover",
    type: "Playlist",
    title: "Discover Weekly",
    owner: "Wavely",
    seed: "Discover Weekly",
    description: "Your weekly mixtape of fresh music. Enjoy new discoveries and deep cuts picked just for you. Updated every Monday.",
    trackIds: ["t1", "t33", "t25", "t17", "t6", "t30", "t38", "t23", "t15", "t13", "t34", "t40"],
    system: true
  },
  {
    id: "release-radar",
    type: "Playlist",
    title: "Release Radar",
    owner: "Wavely",
    seed: "Release Radar",
    description: "Catch all the latest music from artists you follow, plus new singles picked for you. Updates every Friday.",
    trackIds: ["t40", "t39", "t38", "t37", "t36", "t35", "t34", "t33", "t32", "t31"]
  },
  {
    id: "daily-mix-1",
    type: "Playlist",
    title: "Daily Mix 1",
    owner: "Wavely",
    seed: "Daily Mix 1",
    description: "Nova Ray, The Slow Hours, Iris Vale and more.",
    trackIds: ["t1", "t9", "t40", "t4", "t11", "t19", "t2", "t8", "t29", "t10", "t30", "t3"]
  },
  {
    id: "late-night-drive",
    type: "Playlist",
    title: "Late Night Drive",
    owner: "Wavely",
    seed: "Late Night Drive",
    description: "Neon on the dashboard, empty roads, and the volume just a little too loud.",
    trackIds: ["t6", "t13", "t31", "t39", "t20", "t21", "t36", "t9", "t15", "t29", "t4", "t19"]
  },
  {
    id: "focus-flow",
    type: "Playlist",
    title: "Focus Flow",
    owner: "Wavely",
    seed: "Focus Flow",
    description: "Instrumental-leaning textures and steady rhythms to keep you in the zone.",
    trackIds: ["t15", "t33", "t5", "t30", "t23", "t34", "t12", "t14", "t28", "t38", "t7", "t24"]
  },
  {
    id: "indie-bloom",
    type: "Playlist",
    title: "Indie Bloom",
    owner: "Wavely",
    seed: "Indie Bloom",
    description: "Fresh guitars, soft edges, and the kind of choruses that sneak up on you.",
    trackIds: ["t17", "t18", "t34", "t35", "t2", "t8", "t29", "t3", "t10", "t25", "t26", "t27"]
  },
  {
    id: "golden-hour",
    type: "Playlist",
    title: "Golden Hour",
    owner: "Wavely",
    seed: "Golden Hour",
    description: "Warm light, open windows, and songs that feel like the last hour of daylight.",
    trackIds: ["t3", "t5", "t10", "t12", "t28", "t30", "t7", "t14", "t26", "t38"]
  },
  {
    id: "neon-nights",
    type: "Playlist",
    title: "Neon Nights",
    owner: "Wavely",
    seed: "Neon Nights",
    description: "Synths, city lights and a little bit of static.",
    trackIds: ["t1", "t9", "t20", "t21", "t36", "t40", "t6", "t13", "t31", "t39", "t23", "t24"]
  },
  {
    id: "coffee-rain",
    type: "Playlist",
    title: "Coffee & Rain",
    owner: "Wavely",
    seed: "Coffee & Rain",
    description: "Slow mornings, rain on the glass, nowhere to be.",
    trackIds: ["t7", "t14", "t25", "t26", "t27", "t38", "t2", "t29", "t3", "t12"]
  },
  {
    id: "sunday-slowdown",
    type: "Playlist",
    title: "Sunday Slowdown",
    owner: "Wavely",
    seed: "Sunday Slowdown",
    description: "No alarms, no agenda. Just a gentle soundtrack for the whole day.",
    trackIds: ["t2", "t8", "t17", "t18", "t34", "t35", "t3", "t10", "t5", "t28", "t19", "t12"]
  },
  {
    id: "road-trip",
    type: "Playlist",
    title: "Road Trip Radio",
    owner: "Wavely",
    seed: "Road Trip Radio",
    description: "Windows down, map folded badly, no fixed destination.",
    trackIds: ["t6", "t13", "t31", "t39", "t4", "t11", "t19", "t36", "t20", "t21", "t40", "t1"]
  }
].map((p) => ({ ...p, tracks: byIds(p.trackIds) }));

const ALBUMS = [
  {
    id: "a-neon-static",
    type: "Album",
    title: "Neon Static",
    artist: "Nova Ray",
    owner: "Nova Ray",
    year: 2026,
    seed: "Neon Static",
    description: "The debut EP — four tracks of wide-screen synths and close-mic vocals.",
    trackIds: ["t1", "t9", "t22", "t40"]
  },
  {
    id: "a-monsoon",
    type: "Album",
    title: "Monsoon",
    artist: "Asha Rao",
    owner: "Asha Rao",
    year: 2026,
    seed: "Monsoon",
    description: "Rain-soaked arrangements and slow-burning melodies.",
    trackIds: ["t25", "t26", "t27", "t38"]
  },
  {
    id: "a-paper-planes",
    type: "Album",
    title: "Paper Planes",
    artist: "The Slow Hours",
    owner: "The Slow Hours",
    year: 2025,
    seed: "Paper Planes",
    description: "Three quiet songs about distance, memory and letting go.",
    trackIds: ["t2", "t8", "t29"]
  },
  {
    id: "a-wildflower",
    type: "Album",
    title: "Wildflower",
    artist: "Juniper Lane",
    owner: "Juniper Lane",
    year: 2026,
    seed: "Wildflower",
    description: "Sun-faded indie folk recorded in a converted garage.",
    trackIds: ["t17", "t18", "t34", "t35"]
  },
  {
    id: "a-nightcall",
    type: "Album",
    title: "Nightcall",
    artist: "Static Youth",
    owner: "Static Youth",
    year: 2026,
    seed: "Nightcall",
    description: "Late-night electronics with a restless pulse.",
    trackIds: ["t20", "t21", "t36"]
  },
  {
    id: "a-golden-hour",
    type: "Album",
    title: "Golden Hour",
    artist: "Iris Vale",
    owner: "Iris Vale",
    year: 2025,
    seed: "Golden Hour",
    description: "Warm, unhurried pop about the light at the end of the day.",
    trackIds: ["t3", "t5", "t10", "t30"]
  }
].map((a) => ({ ...a, tracks: byIds(a.trackIds) }));

const ALL_ITEMS = [...PLAYLISTS, ...ALBUMS];
const ITEM_BY_ID = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i]));

const ARTISTS = [...new Set(TRACKS.map((t) => t.artist))].map((name) => ({
  id: "artist-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  type: "Artist",
  name,
  seed: "artist:" + name
}));
const ARTIST_BY_NAME = Object.fromEntries(ARTISTS.map((a) => [a.name, a]));

const QUICK_PICKS = ["liked", "discover", "daily-mix-1", "late-night-drive", "focus-flow", "golden-hour"];

const SHELVES = [
  { title: "Recently played", ids: ["discover", "indie-bloom", "neon-nights", "coffee-rain", "road-trip", "sunday-slowdown"] },
  { title: "Made for you", ids: ["discover", "daily-mix-1", "release-radar", "liked", "focus-flow", "golden-hour"] },
  { title: "New releases", ids: ["a-neon-static", "a-monsoon", "a-paper-planes", "a-wildflower", "a-nightcall", "a-golden-hour"] },
  { title: "Recommended for today", ids: ["indie-bloom", "neon-nights", "coffee-rain", "sunday-slowdown", "late-night-drive", "focus-flow"] }
];

const GENRES = [
  { name: "Pop", c1: "#e8115b", seed: "genre:pop" },
  { name: "Indie", c1: "#608108", seed: "genre:indie" },
  { name: "Hip-Hop", c1: "#ba5d07", seed: "genre:hiphop" },
  { name: "Rock", c1: "#e91429", seed: "genre:rock" },
  { name: "Chill", c1: "#1e3264", seed: "genre:chill" },
  { name: "Workout", c1: "#777777", seed: "genre:workout" },
  { name: "Party", c1: "#af2896", seed: "genre:party" },
  { name: "Focus", c1: "#503750", seed: "genre:focus" },
  { name: "Love", c1: "#8d67ab", seed: "genre:love" },
  { name: "Sleep", c1: "#1e3264", seed: "genre:sleep" },
  { name: "Commute", c1: "#477d95", seed: "genre:commute" },
  { name: "Gaming", c1: "#e13300", seed: "genre:gaming" }
];

window.GENRE_TRACKS = {
  Pop: ["t3", "t23", "t40", "t17", "t10", "t24"],
  Indie: ["t17", "t2", "t34", "t8", "t18", "t35"],
  "Hip-Hop": ["t20", "t36", "t21", "t37", "t6", "t13"],
  Rock: ["t6", "t31", "t13", "t39", "t20", "t21"],
  Chill: ["t7", "t14", "t38", "t12", "t25", "t26"],
  Workout: ["t1", "t9", "t40", "t21", "t36", "t6"],
  Party: ["t23", "t24", "t37", "t40", "t20", "t9"],
  Focus: ["t15", "t33", "t30", "t5", "t34", "t38"],
  Love: ["t3", "t5", "t12", "t28", "t25", "t7"],
  Sleep: ["t15", "t33", "t38", "t12", "t26", "t14"],
  Commute: ["t6", "t13", "t31", "t4", "t11", "t19"],
  Gaming: ["t1", "t9", "t20", "t21", "t36", "t40"]
};
const GENRE_TRACKS = window.GENRE_TRACKS;

window.GENRE_BY_NAME = Object.fromEntries(GENRES.map((g) => [g.name, g]));
const GENRE_BY_NAME = window.GENRE_BY_NAME;

/* Small deterministic hash shared by the UI and artwork generators. */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
