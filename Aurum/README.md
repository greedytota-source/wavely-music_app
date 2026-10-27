# Aurum — noir + gold web music player

A pixel-close recreation of Spotify's **web player** layout and interaction model, built
from scratch with plain HTML, CSS and JavaScript. No framework and no build step; the
catalogue and accounts come from Supabase, YouTube metadata lookups go through the local
proxy in `main.py`, and the Google Font is optional.

> **Not affiliated with Spotify.** All branding here is placeholder and the demo cover art
> is generated at runtime as SVG. No Spotify assets, album artwork, lyrics or audio are
> included. YouTube songs you add are streamed from YouTube and remain the property of
> their rights holders — see [Legal contact](#legal-contact).

---

## Run it

```bash
python3 main.py serve          # default port 4173
python3 main.py serve --port 8080
```

Open <http://localhost:4173>. `main.py` serves the static site **and** proxies the YouTube
metadata lookup at `/api/video`, so the key in `api_key.txt` never reaches the browser. A
plain `python3 -m http.server` still serves the UI, but adding a YouTube song needs
`main.py` (otherwise `/api/video` returns 404).

Paste your YouTube Data API v3 key into `api_key.txt` first (git-ignored on purpose, and
never served to the browser). You can still look up videos from the terminal:

```bash
python3 main.py search "nashe si chadh gayi" -n 15 --order viewCount
```

### Catalogue, accounts and admin

The catalogue is loaded from Supabase, not from a bundled demo file. Point the app at a
project by editing `js/supabase-client.js` (player + auth) and `js/admin-config.js`
(admin page); both only need the project URL and the **publishable** anon key.

Run `supabase/user-accounts.sql` once in the Supabase SQL editor. It adds playlist
ownership, the `likes` table, and the row-level security policies the player relies on.
Accounts use Supabase Auth (email + password, plus Google/Facebook when enabled in the
dashboard); the provider buttons hide themselves when a provider is off.

Run `supabase/catalogue-policies.sql` once too. It grants signed-in admins write access to
`artists`, `albums`, `tracks`, `track_artists` and the `audio` / `covers` storage buckets.
Without it, adding a song from `admin.html` fails with
`new row violates row-level security policy for table "artists"` (the reader can still play
the catalogue, because reads stay public).

Two optional migrations keep older libraries tidy:

- `supabase/merge-albums.sql` folds albums that share the same title into one row and
  re-points their tracks. The player already merges duplicate titles for display, but this
  cleans the database itself.
- `supabase/song-details.sql` adds `tracks.description`, the per-song credit / copyright
  note shown in Now playing → Song details and editable in the YouTube form.

`/admin.html` uploads tracks (audio to the `audio` bucket, artwork to `covers`), manages
artists, and can **add a YouTube song from its link**. A saved YouTube song is a normal
catalogue row (watch URL stored in `file_url`), so it appears in All Songs, albums and
search, and plays through the YouTube embed. Its title/artist/duration/thumbnail are
fetched from `/api/video` when the link is pasted (manual entry still works), and the
**Song description** box is pre-filled with the video's own YouTube description plus a
source note: *"This video/audio is from YouTube. All rights belong to the original artist,
label and rights holders."* The note is shown in Now playing → Song details for every
YouTube song even when no description is saved.

Both add forms accept **one or more artists** through the same picker (plus a new-artist
name field; the YouTube form also accepts comma-separated names like
`Arijit Singh, Shreya Ghoshal`). Album names are matched across the whole catalogue, so
saving every song with the same album name files them into one shared album — and both
album inputs suggest the album names that already exist.

The admin page requires a Supabase sign-in, but the gate is only UI: real write access
comes from the RLS policies on `tracks`, `albums`, `artists` and storage — keep those
restricted to the accounts that should be able to publish.

### Ads (optional)

AdSense is wired in but dormant: `js/ads-config.js` ships with all-zero ids, so `js/ads.js`
adds no script tag, makes no request and writes no markup until you paste a real
`ca-pub-…` client and one responsive slot id. When enabled it injects the ad library only
after `load` + an idle callback, and places a single height-reserved slot at the end of
Home, Search, playlist/album and artist views — never in the player bar, the now-playing
panel or the queue, so a playing song never sees the page move. `ads.txt` in the repo root
needs your `pub-…` digits before the AdSense site review will pass.

## What's implemented

**Shell**
- Black top bar with wordmark, history arrows, expanding search, Premium/Install pills,
  notifications and an account menu
- Two-panel left sidebar: navigation panel + "Your Library" panel with filter chips,
  playlist/album/artist rows, legal links and language pill
- Rounded `#121212` main panel with independently scrolling content
- Collapsible right "Now playing" panel (open by default above 1240 px)
- Slide-in queue drawer
- Sticky bottom player: artwork, title/artist, save button, shuffle, previous, play/pause,
  next, repeat, seek bar, lyrics, queue, devices, volume, now-playing toggle, fullscreen
- Mobile layout: icon rail collapses, sidebar hides, bottom tab bar, compact player

**Pages**
- **Home** — time-based greeting, six quick-pick tiles, recently added tracks and shelves with hover play buttons
- **Search** — searches only the songs in your catalogue (uploads and saved YouTube songs), split into
  Top result / Songs / Artists / Playlists; the empty state browses your library instead of the web
- **Your Library** — table view with Playlists / Albums / Artists filters and row metadata
- **Playlist & album** — tinted gradient hero, large generated cover, description, owner and
  duration metadata, play/save/more actions, full track table with hover states
- **Artist** — circular hero, monthly listeners, follow button, popular tracks, discography
- **Copyright & legal** — how YouTube embedding works, ownership, removal requests and credits
- **Not found** — graceful fallback

**Playback**
- Simulated progress for every track (0:00 → duration, auto-advances)
- Seek by click or drag; keyboard support on the slider
- Shuffle, repeat all / repeat one, previous (restarts after 3 s), volume + mute
- Like/unlike from the track table, player bar, or now-playing panel
- Queue drawer with "Now playing" and "Next up"; jump to any queued track
- Now playing → **Song details** for YouTube songs: a collapsed row that opens the
  source, artist/album/duration, optional description and a "Watch on YouTube" link.
  A single muted line under it always states the audio/video comes from YouTube and
  that rights belong to the original owners, with a link to the legal page
- Single click on a song row/card starts playback (no select-then-play second click)
- Optional **real audio**: add `src: "assets/audio/song.mp3"` to any track in `js/data.js`
  and the player uses it automatically instead of the simulated clock

**Persistence**
- Signed in: liked songs and playlists live in Supabase (`likes`, `playlists`,
  `playlist_tracks`) and follow the account across devices
- Guest: liked songs and volume stay in `localStorage` (`wavely.liked.v1`,
  `wavely.volume.v1`) and are merged into the account on the first sign-in

**Keyboard shortcuts** (when not typing)
| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `M` | Mute / unmute |
| `L` | Like current track |
| `Shift` + `←` / `→` | Seek ±5 s |
| `Tab` / `Enter` | Navigate cards and rows |

**Accessibility**
- Semantic landmarks, `aria-label`s on icon-only buttons, `aria-pressed` on toggles,
  `aria-valuenow` on sliders, visible focus rings, keyboard-activatable cards, and a
  `prefers-reduced-motion` fallback.

## Structure

```
wavely-web-player/
├── main.py                # local server + YouTube metadata proxy (/api/video)
├── api_key.txt            # your YouTube Data API v3 key (git-ignored, never served)
├── requirements.txt       # no third-party deps; stdlib only
├── index.html             # static shell: top bar, sidebar, panels, player, modals
├── admin.html             # sidebar admin: upload / YouTube / artists / songs (signed in)
├── ads.txt                # AdSense seller record (paste your pub- id before review)
├── css/
│   └── styles.css         # design tokens, layout grid, components, responsive rules
├── js/
│   ├── app.js             # icons, artwork, router, views, playback, YT engine, events
│   ├── auth.js            # Supabase Auth (email, Google, Facebook) + account modal
│   ├── supabase-client.js # Supabase URL + publishable key for the player
│   ├── supabase-data.js   # loads tracks/albums/artists/playlists, likes
│   ├── admin-config.js    # Supabase URL + publishable key for the admin page
│   ├── admin.js           # uploads, artist picker/manager, admin auth gate, page nav
│   ├── ads-config.js      # AdSense client + slot ids (all-zero placeholder by default)
│   ├── ads.js             # reserved ad slots on Home/Search/playlist/artist, never the player
│   ├── synth.js           # procedural audio for tracks without a file
│   └── data.js            # legacy demo catalogue (not loaded by index.html)
└── supabase/
    ├── user-accounts.sql  # playlist ownership, likes, RLS policies
    ├── catalogue-policies.sql  # admin write access (artists/albums/tracks/storage)
    ├── merge-albums.sql   # fold duplicate album titles into one album
    └── song-details.sql   # optional tracks.description credit note
```

## How it's put together

- **Layout:** CSS Grid shell (`64px / 1fr / 88px`) with a three-column workspace. Sidebar and
  now-playing width are variables; `np-open` toggles the third column.
- **Routing:** hash-based (`#/`, `#/search`, `#/library`, `#/playlist/:id`, `#/artist/:name`)
  with re-render on `hashchange`.
- **Artwork:** `coverArt(seed)` derives a stable hue from an FNV-1a hash and renders a gradient
  + geometry + caption as a data-URI SVG. Deterministic, zero binary assets.
- **Player state:** one queue array of tracks with `contextId`, an index, and a position.
  Tracks without `src` advance on a 250 ms ticker; tracks with `src` defer to the `<audio>`
  element's `timeupdate`/`ended` events.

## Branding

The wordmark, mark and gold accent are placeholders. To rebrand, edit:
- `index.html` → `.brand` (mark SVG + name) and `<title>`
- `css/styles.css` → `--gold` / `--gold-bright` (the noir + gold layer sits at the end of the file)
- `js/app.js` → toast copy and credits text

### Legal contact

Set `LEGAL_CONTACT_EMAIL` at the top of `js/app.js` to the address that should receive
copyright/removal requests. The Copyright & legal page links to it, and every YouTube song
shows a short "streamed from YouTube, rights belong to the owners" notice in the Now
playing → Song details card. YouTube playback uses `youtube-nocookie.com` and the site
never downloads or re-hosts the audio.

Spotify, its logo and its product names are trademarks of Spotify AB. This project is a
learning/demo recreation and is not distributed as a Spotify product.

## Extending

- **Catalogue:** add rows through `admin.html` or Supabase Studio; `js/supabase-data.js` maps
  them to the shapes the UI expects (`TRACKS`, `PLAYLISTS`, `ALBUMS`, `ARTISTS`).
- **Real audio:** the admin panel stores uploads in the `audio` bucket and writes
  `tracks.file_url`, which the player uses instead of the procedural synth.
- **Accounts:** `js/auth.js` owns the auth UI; `window.WavelyAuth` exposes `user`, `onChange`
  and the sign-in/out helpers if you add more account features.
