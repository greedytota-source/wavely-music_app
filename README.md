# Wavely — Spotify-style web player

A pixel-close recreation of Spotify's **web player** layout and interaction model, built
from scratch with plain HTML, CSS and JavaScript. No framework, no build step, no network
requests beyond the optional Google Font.

> **Not affiliated with Spotify.** All branding here is placeholder, all artists, songs and
> playlists are fictional, and the cover art is generated at runtime as SVG. No Spotify
> assets, album artwork, lyrics or audio are included. See [Branding](#branding).

---

## Run it

```bash
cd wavely-web-player
python3 -m http.server 4173
```

Open <http://localhost:4173>. (Any static server works; opening `index.html` directly is fine
too, though `localStorage` may be restricted under `file://` in some browsers.)

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
- **Home** — time-based greeting, six quick-pick tiles, four shelves with hover play buttons
- **Search** — 12 "Browse all" genre tiles with rotated generated artwork, live results split
  into Top result / Songs / Artists / Playlists
- **Your Library** — table view with Playlists / Albums / Artists filters and row metadata
- **Playlist & album** — tinted gradient hero, large generated cover, description, owner and
  duration metadata, play/save/more actions, full track table with hover states
- **Artist** — circular hero, monthly listeners, follow button, popular tracks, discography
- **Not found** — graceful fallback

**Playback**
- Simulated progress for every track (0:00 → duration, auto-advances)
- Seek by click or drag; keyboard support on the slider
- Shuffle, repeat all / repeat one, previous (restarts after 3 s), volume + mute
- Like/unlike from the track table, player bar, or now-playing panel
- Queue drawer with "Now playing" and "Next up"; jump to any queued track
- Optional **real audio**: add `src: "assets/audio/song.mp3"` to any track in `js/data.js`
  and the player uses it automatically instead of the simulated clock

**Persistence**
- Liked songs and volume are saved in `localStorage`
  (`wavely.liked.v1`, `wavely.volume.v1`)

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
├── index.html          # static shell: top bar, sidebar, panels, player, toggles
├── css/
│   └── styles.css      # design tokens, layout grid, components, responsive rules
└── js/
    ├── data.js         # fictional catalogue: tracks, playlists, albums, artists, genres
    └── app.js          # icons, artwork generator, router, views, playback, events
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

The wordmark, mark and green accent are placeholders. To rebrand, edit:
- `index.html` → `.brand` (mark SVG + name) and `<title>`
- `css/styles.css` → `--green` / `--green-bright`
- `js/app.js` → toast copy and credits text

Spotify, its logo and its product names are trademarks of Spotify AB. This project is a
learning/demo recreation and is not distributed as a Spotify product.

## Extending

- **Real catalogue:** replace `js/data.js` with a fetch from your API and keep the same shapes
  (`tracks`, `playlists`, `albums`, `artists`, `shelves`).
- **Real audio:** drop files in `assets/audio/` and add `src` to tracks. The player already
  handles `timeupdate`, seeking, volume and auto-advance.
- **Backend:** the like/follow handlers and the "Create playlist" button are the natural
  integration points for accounts and persistence.
