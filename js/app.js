/* ═══════════════════════════════════════════════════════════════
   Aurum — app logic
   Client-side router, catalogue rendering, playback simulation
   (optionally real audio when a track defines `src`).
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  /* Address shown on the Copyright & legal page for removal requests.
     Set this to the site owner's contact address before publishing. */
  const LEGAL_CONTACT_EMAIL = "bhagatdeveloper@zohomail.in";

  // Ensure globals exist from Supabase or fallback
  if (typeof window.TRACKS === 'undefined') window.TRACKS = [];
  if (typeof window.PLAYLISTS === 'undefined') window.PLAYLISTS = [];
  if (typeof window.ARTISTS === 'undefined') window.ARTISTS = [];
  if (typeof window.ALBUMS === 'undefined') window.ALBUMS = [];
  if (typeof window.ALL_ITEMS === 'undefined') window.ALL_ITEMS = [];
  if (typeof window.ITEM_BY_ID === 'undefined') window.ITEM_BY_ID = {};
  if (typeof window.ARTIST_BY_NAME === 'undefined') window.ARTIST_BY_NAME = {};
  if (typeof window.TRACK_BY_ID === 'undefined') window.TRACK_BY_ID = {};
  if (typeof window.GENRE_TRACKS === 'undefined') window.GENRE_TRACKS = {};
  if (typeof window.GENRE_BY_NAME === 'undefined') window.GENRE_BY_NAME = {};
  if (typeof window.byIds === 'undefined') window.byIds = (ids) => (ids || []).map((id) => (window.TRACK_BY_ID || {})[id]).filter(Boolean);

  /* Deterministic hash shared by the artwork and tint generators. It used to
     live in js/data.js, which the Supabase build no longer loads. */
  function hashString(str) {
    const s = String(str ?? "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  /* Browse genres are optional: without a genre source the search page simply
     has nothing to browse. */
  const liveGenres = () => (Array.isArray(window.GENRES) ? window.GENRES : []);

  /* ── Icons ─────────────────────────────────────────────────── */
  const ICONS = {
    home: '<path d="M3 10.8 12 3.2l9 7.6V20a1 1 0 0 1-1 1h-5.3v-6.4H9.3V21H4a1 1 0 0 1-1-1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4-4"/>',
    library:
      '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10.5" y="4" width="5" height="16" rx="1"/><path d="m18 5.4 3 14.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    "chevron-left": '<path d="m15 5-7 7 7 7"/>',
    "chevron-right": '<path d="m9 5 7 7-7 7"/>',
    "arrow-right": '<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9Z"/>',
    play: '<path d="M8 5.1v13.8a1 1 0 0 0 1.53.85l11-6.9a1 1 0 0 0 0-1.7l-11-6.9A1 1 0 0 0 8 5.1Z" style="fill:currentColor;stroke:none"/>',
    pause:
      '<rect x="6.2" y="4.5" width="4" height="15" rx="1.2" style="fill:currentColor;stroke:none"/><rect x="13.8" y="4.5" width="4" height="15" rx="1.2" style="fill:currentColor;stroke:none"/>',
    prev: '<path d="M18 5.4v13.2a1 1 0 0 1-1.55.84L8 13.4V18a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v4.6l8.45-6.04A1 1 0 0 1 18 5.4Z" style="fill:currentColor;stroke:none"/>',
    next: '<path d="M6 5.4v13.2a1 1 0 0 0 1.55.84L16 13.4V18a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0v4.6L7.55 4.56A1 1 0 0 0 6 5.4Z" style="fill:currentColor;stroke:none"/>',
    shuffle:
      '<path d="M3 6h3.2c1.4 0 2.7.7 3.5 1.8l4.6 6.4c.8 1.1 2.1 1.8 3.5 1.8H21"/><path d="m18 3 3 3-3 3"/><path d="M3 18h3.2c1.4 0 2.7-.7 3.5-1.8l.9-1.2"/><path d="m18 15 3 3-3 3"/><path d="m14.4 9.4.9-1.4C16.1 6.9 17.4 6 18.8 6H21"/>',
    repeat:
      '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    heart:
      '<path d="M12 20.7 4.8 13.5a4.9 4.9 0 0 1 0-7 5 5 0 0 1 7 0l.2.2.2-.2a5 5 0 0 1 7 0 4.9 4.9 0 0 1 0 7Z"/>',
    queue:
      '<path d="M4 6h11M4 12h11M4 18h7"/><path d="m16 13 5 3.5-5 3.5z" style="fill:currentColor;stroke:none"/>',
    devices:
      '<rect x="2" y="4" width="14" height="10" rx="1.6"/><path d="M5.5 18h7"/><rect x="17" y="10" width="5" height="10" rx="1.2"/>',
    video:
      '<rect x="2.5" y="6" width="13.5" height="12" rx="2"/><path d="m16 10.5 5.5-3v9l-5.5-3z"/>',
    volume:
      '<path d="M11 5 6.6 9H3v6h3.6L11 19z"/><path d="M15.2 8.6a5 5 0 0 1 0 6.8"/><path d="M18.2 6a9 9 0 0 1 0 12"/>',
    mute:
      '<path d="M11 5 6.6 9H3v6h3.6L11 19z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    fullscreen:
      '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
    mic:
      '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
    more:
      '<circle cx="5" cy="12" r="1.5" style="fill:currentColor;stroke:none"/><circle cx="12" cy="12" r="1.5" style="fill:currentColor;stroke:none"/><circle cx="19" cy="12" r="1.5" style="fill:currentColor;stroke:none"/>',
    check: '<path d="m4.5 12.5 5 5L20 6.5"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    music:
      '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'
  };

  const svg = (name, size = "md", extra = "") =>
    `<svg class="icon ${size === "sm" ? "icon-sm" : ""} ${extra}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  const icon = svg;

  function hydrateIcons(root = document) {
    root.querySelectorAll("i[data-icon]").forEach((el) => {
      const size = el.dataset.size === "sm" ? "sm" : "md";
      const tmp = document.createElement("div");
      tmp.innerHTML = svg(el.dataset.icon, size, el.className);
      const node = tmp.firstElementChild;
      if (node) el.replaceWith(node);
    });
  }

  /* ── Helpers ───────────────────────────────────────────────── */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const fmtTime = (sec) => {
    if (!Number.isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const fmtLong = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h > 0) return `${h} hr ${m} min`;
    return `${m} min`;
  };

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const BASE_DATE = new Date(2026, 9, 20);
  function dateAdded(i) {
    const d = new Date(BASE_DATE);
    d.setDate(d.getDate() - i * 3);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function artistInfo(name) {
    const seed = hashString("artist:" + name);
    const listeners = 320000 + (seed % 8200000);
    return { name, listeners, formatted: listeners.toLocaleString("en-US") };
  }

  /* ── Artwork (generated placeholder covers) ────────────────── */
  const ART_CACHE = new Map();

  function coverArt(seed, { glyph = "", label = "" } = {}) {
    const key = `${seed}|${glyph}|${label}`;
    if (ART_CACHE.has(key)) return ART_CACHE.get(key);

    const h1 = hashString(seed) % 360;
    const h2 = (h1 + 38) % 360;
    const h3 = (h1 + 82) % 360;
    const initial = (label || seed).trim().charAt(0).toUpperCase();
    const caption = label ? esc(label.toUpperCase().slice(0, 18)) : "";
    const glyphText = glyph ? esc(glyph) : "";

    const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="hsl(${h1} 68% 57%)"/>
          <stop offset=".55" stop-color="hsl(${h2} 62% 34%)"/>
          <stop offset="1" stop-color="hsl(${h3} 58% 14%)"/>
        </linearGradient>
        <radialGradient id="glow" cx=".28" cy=".18" r=".85">
          <stop offset="0" stop-color="#fff" stop-opacity=".38"/>
          <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="320" height="320" fill="url(#bg)"/>
      <circle cx="266" cy="62" r="120" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="26"/>
      <circle cx="52" cy="288" r="132" fill="#000" fill-opacity=".18"/>
      <path d="M-20 236C60 196 120 268 200 226s100-16 140 8v86H-20z" fill="#000" fill-opacity=".22"/>
      <rect width="320" height="320" fill="url(#glow)"/>
      ${
        glyphText
          ? `<text x="160" y="205" text-anchor="middle" font-family="Figtree, Helvetica, Arial, sans-serif" font-size="138" font-weight="800" fill="#fff" fill-opacity=".92">${glyphText}</text>`
          : `<text x="160" y="200" text-anchor="middle" font-family="Figtree, Helvetica, Arial, sans-serif" font-size="150" font-weight="800" fill="#fff" fill-opacity=".2">${initial}</text>`
      }
      ${caption ? `<text x="22" y="298" font-family="Figtree, Helvetica, Arial, sans-serif" font-size="10.5" font-weight="700" letter-spacing="2.4" fill="#fff" fill-opacity=".78">${caption}</text>` : ""}
    </svg>`;

    const url = "data:image/svg+xml," + encodeURIComponent(svgText);
    ART_CACHE.set(key, url);
    return url;
  }

  /* Uploaded artwork wins; generated SVG is only the fallback. */
  const trackArt = (t) => t.cover || coverArt(t.album || t.title, { label: t.album || t.title });
  const itemArt = (item) =>
    item.cover_url || item.artist_image_url || coverArt(item.seed || item.title, { glyph: item.glyph || "", label: item.title });
  const artistArt = (name) => {
    const artist = (window.ARTIST_BY_NAME || {})[name];
    return (artist && artist.image_url) || coverArt("artist:" + name, { label: name });
  };
  const genreArt = (g) => coverArt(g.seed, { label: g.name });

  function tintFor(seed) {
    return `hsl(${hashString(seed) % 360} 42% 24%)`;
  }

  /* ── State ─────────────────────────────────────────────────── */
  const LS_LIKED = "wavely.liked.v1";
  const LS_VOLUME = "wavely.volume.v1";
  const LS_VIDEO = "wavely.video.v1";
  /* The catalogue comes from Supabase, so there is no demo track list to
     pre-like: a fresh visitor starts with an empty Liked Songs. */
  const DEFAULT_LIKED = [];

  function loadLiked() {
    try {
      const raw = localStorage.getItem(LS_LIKED);
      if (raw) {
        const ids = JSON.parse(raw);
        if (Array.isArray(ids)) return new Set(ids);
      }
    } catch (_) {}
    return new Set(DEFAULT_LIKED);
  }

  function loadVolume() {
    try {
      const raw = localStorage.getItem(LS_VOLUME);
      const v = Number(raw);
      if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
    } catch (_) {}
    return 0.65;
  }

  function loadVideoMode() {
    try {
      return localStorage.getItem(LS_VIDEO) === "1";
    } catch (_) {}
    return false;
  }

  const state = {
    query: "",
    libFilter: "playlists",
    videoOn: loadVideoMode(),
    liked: loadLiked(),
    following: new Set(),
    searchTracks: [],
    player: {
      queue: [],
      index: 0,
      playing: false,
      pos: 0,
      duration: 0,
      shuffle: false,
      repeat: 0,
      volume: loadVolume(),
      muted: false,
      seeking: false
    }
  };
  const p = state.player;

  const currentTrack = () => p.queue[p.index] || null;
  const currentContext = () => currentTrack()?.contextId || null;

  /* Liked Songs is a built-in playlist, not a catalogue row, so it needs its
     own defaults when the catalogue comes from Supabase. */
  const LIKED_ITEM = {
    id: "liked",
    type: "Playlist",
    title: "Liked Songs",
    owner: "You",
    seed: "Liked Songs",
    glyph: "♥",
    description: "Every song you've liked, in one place."
  };

  /* A track can credit several artists, so match on ids as well as the
     joined display name (used by artist pages and playback contexts). */
  function tracksByArtist(name) {
    const artist = (window.ARTIST_BY_NAME || {})[name];
    const artistId = artist && artist.id;
    return (window.TRACKS || []).filter(
      (t) => (artistId && (t.artist_ids || []).includes(artistId)) || t.artist === name
    );
  }

  /* A multi-artist credit renders as "A, B", which no artist row is named —
     link and follow the first credited artist (artist_ids is in credit order)
     that actually exists in the catalogue. */
  function primaryArtistName(t) {
    const artists = window.ARTISTS || [];
    const ids = [...(t.artist_ids || []), t.artist_id].filter(Boolean);
    for (const id of ids) {
      const artist = artists.find((a) => a.id === id);
      if (artist) return artist.name;
    }
    return String(t.artist || "").split(",")[0].trim();
  }

  function getItem(id) {
    if (id === "liked") {
      const base = (window.ITEM_BY_ID||{}).liked || LIKED_ITEM;
      const tracks = (window.TRACKS||[]).filter((t) => state.liked.has(t.id));
      return { ...base, tracks, trackIds: tracks.map((t) => t.id) };
    }
    if (id === "all-songs") {
      const tracks = (window.TRACKS || []).slice();
      return {
        id: "all-songs",
        type: "Playlist",
        title: "All Songs",
        owner: "Aurum",
        seed: "All Songs",
        glyph: "♪",
        description: "Every song in your library.",
        trackIds: tracks.map((t) => t.id),
        tracks
      };
    }
    return (window.ITEM_BY_ID||{})[id] || null;
  }

  /* ── Audio engine ──────────────────────────────────────────── */
  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = p.volume;
  let hlsPlayer = null;
  let activeAudioSource = "";

  const synth = window.WavelySynth || null;
  const synthSeed = (track) => (track ? `${track.id}:${track.title}` : "");

  const hasAudio = () => Boolean(currentTrack()?.src);

  /* Start the procedural engine for demo tracks, or silence it when a
     real audio file (track.src) takes over. */
  function syncSynth(autoplay) {
    if (!synth) return;
    const t = currentTrack();
    if (autoplay && t && !t.src && !isYT(t)) synth.play(synthSeed(t));
    else synth.stop();
  }

  function syncAudio(autoplay) {
    const t = currentTrack();
    if (t?.src) {
      const abs = new URL(t.src, location.href).href;
      if (activeAudioSource !== abs) {
        hlsPlayer?.destroy();
        hlsPlayer = null;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        activeAudioSource = abs;

        const isHls = /\.m3u8(?:$|[?#])/i.test(abs);
        const nativeHls = audio.canPlayType("application/vnd.apple.mpegurl");
        if (isHls && !nativeHls && window.Hls?.isSupported()) {
          hlsPlayer = new window.Hls();
          hlsPlayer.on(window.Hls.Events.MANIFEST_PARSED, () => {
            if (p.playing && activeAudioSource === abs) audio.play().catch(() => {});
          });
          hlsPlayer.loadSource(t.src);
          hlsPlayer.attachMedia(audio);
        } else {
          audio.src = t.src;
        }
      }
      audio.volume = p.muted ? 0 : p.volume;
      if (autoplay && !hlsPlayer) audio.play().catch(() => {});
    } else {
      hlsPlayer?.destroy();
      hlsPlayer = null;
      activeAudioSource = "";
      audio.pause();
      if (audio.getAttribute("src")) {
        audio.removeAttribute("src");
        audio.load();
      }
    }
  }

  audio.addEventListener("timeupdate", () => {
    if (!hasAudio()) return;
    p.pos = audio.currentTime;
    /* A live stream reports Infinity, which would print as NaN in the deck. */
    p.duration = Number.isFinite(audio.duration)
      ? audio.duration
      : (currentTrack()?.duration || 0);
    updateProgress();
  });
  audio.addEventListener("ended", () => next(true));

  /* ── YouTube playback (official IFrame API) ────────────────── */
  /* Saved YouTube songs are ordinary catalogue rows; their metadata is
     fetched once from the local /api/video proxy when added, so our API key
     never reaches the browser. The audio itself plays inside YouTube's own
     embed — nothing is downloaded or re-hosted here. */
  const isYT = (t) => Boolean(t && t.yt);

  let ytPlayer = null;
  let ytPlayerPromise = null;
  let ytApiPromise = null;

  function ensureYTApi() {
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
        return;
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => console.warn("YouTube IFrame API failed to load");
      document.head.appendChild(s);
    });
    return ytApiPromise;
  }

  function ensureYTPlayer() {
    if (ytPlayer) return Promise.resolve(ytPlayer);
    if (ytPlayerPromise) return ytPlayerPromise;
    ytPlayerPromise = ensureYTApi().then(
      (YT) =>
        new Promise((resolve) => {
          const wrap = document.createElement("div");
          wrap.id = "ytWrap";
          const host = document.createElement("div");
          host.id = "ytHost";
          const cover = document.createElement("div");
          cover.className = "yt-center-cover";
          wrap.appendChild(host);
          wrap.appendChild(cover);
          document.body.appendChild(wrap);
          new YT.Player("ytHost", {
            width: "1",
            height: "1",
            playerVars: {
              autoplay: 1,
              playsinline: 1,
              controls: 0,
              rel: 0,
              modestbranding: 1,
              disablekb: 1
            },
            events: {
              onReady: (ev) => {
                ytPlayer = ev.target;
                resolve(ytPlayer);
              },
              onStateChange: (ev) => {
                const S = window.YT && window.YT.PlayerState;
                if (!S || !isYT(currentTrack())) return;
                if (ev.data === S.ENDED) {
                  if (p.repeat === 2) {
                    ev.target.seekTo(0, true);
                    ev.target.playVideo();
                  } else {
                    next(true);
                  }
                } else if (ev.data === S.PLAYING) {
                  p.playing = true;
                  updateAll();
                } else if (ev.data === S.PAUSED) {
                  p.playing = false;
                  updateAll();
                }
              },
              onError: () => {
                if (!isYT(currentTrack())) return;
                // YouTube rejected this video (embedding disabled, region-blocked,
                // age-restricted, etc.). Silently try the next track so the user
                // never hits a dead end — only report if the whole queue fails.
                next(true);
              }
            }
          });
        })
    );
    return ytPlayerPromise;
  }

  /* Queue a player call until the embed is ready (and swallow failures —
     an offline browser should not break the rest of the player). */
  const ytDo = (fn) => {
    ensureYTPlayer()
      .then((pl) => {
        try {
          fn(pl);
        } catch (_) {}
      })
      .catch(() => {});
  };

  /* Cue (paused) when autoplay is off — loadVideoById always autoplays,
     which would race with the play() that follows a queue change. */
  function ytLoad(track, autoplay) {
    const vid = track.videoId;
    ytDo((pl) => {
      if (!isYT(currentTrack()) || currentTrack().videoId !== vid) return; // queue moved on
      if (autoplay) pl.loadVideoById(vid);
      else pl.cueVideoById(vid);
      pl.setVolume(Math.round((p.muted ? 0 : p.volume) * 100));
    });
  }

  function ytStop() {
    if (!ytPlayer) return;
    try {
      ytPlayer.stopVideo();
    } catch (_) {}
  }

  function setQueue(tracks, index = 0, contextId = null) {
    p.queue = tracks.map((t) => ({ ...t, contextId }));
    p.index = Math.max(0, Math.min(index, p.queue.length - 1));
    p.pos = 0;
    p.duration = p.queue[p.index]?.duration || 0;
    synth?.stop();
    syncAudio(false);
    if (isYT(p.queue[p.index])) ytLoad(p.queue[p.index], false);
    else ytStop();
    updateAll();
  }

  function loadIndex(i, autoplay) {
    if (!p.queue[i]) return;
    p.index = i;
    p.pos = 0;
    p.duration = p.queue[i].duration;
    p.playing = Boolean(autoplay);
    synth?.stop();
    syncAudio(p.playing);
    if (isYT(p.queue[i])) ytLoad(p.queue[i], p.playing);
    else ytStop();
    if (p.playing && !p.queue[i].src && !isYT(p.queue[i]) && synth) {
      try {
        synth.play(synthSeed(p.queue[i]));
      } catch (_) {}
    }
    updateAll();
  }

  function play() {
    if (!p.queue.length) return;
    // A playing Radio Mirchi would talk over the deck — cut it first.
    stopRadioForDeck();
    // Ensure AudioContext is resumed (requires user gesture; click triggers this).
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && window.__wavelyGlobalAC && window.__wavelyGlobalAC.state === "suspended") {
        window.__wavelyGlobalAC.resume().catch(() => {});
      } else if (AC && !window.__wavelyGlobalAC) {
        window.__wavelyGlobalAC = new AC();
        window.__wavelyGlobalAC.resume().catch(() => {});
      }
    } catch (_) {}
    p.playing = true;
    if (isYT(currentTrack())) {
      const vid = currentTrack().videoId;
      /* Start playback in one step. cueVideoById() is asynchronous, so a
         playVideo() fired right after a cue is silently dropped and the
         first click only "selects" the song. Only resume when the embed is
         genuinely on this video and already playing/paused/buffering;
         otherwise load-and-play in one call. */
      const start = (pl) => {
        const S = window.YT && window.YT.PlayerState;
        let state = -99;
        let data = null;
        try {
          state = pl.getPlayerState();
          data = pl.getVideoData();
        } catch (_) {}
        const sameVideo = Boolean(data && data.video_id === vid);
        const active = S && (state === S.PLAYING || state === S.PAUSED || state === S.BUFFERING);
        if (sameVideo && active) pl.playVideo();
        else pl.loadVideoById(vid);
      };

      // Call synchronously when the embed already exists — this keeps the
      // click's user gesture, which browsers require for audible playback.
      if (ytPlayer) {
        try {
          start(ytPlayer);
        } catch (_) {
          ytDo(start);
        }
      } else {
        ytDo(start);
      }
      updateAll();
      return;
    }
    if (hasAudio()) audio.play().catch(() => {});
    else if (synth) {
      try {
        synth.play(synthSeed(currentTrack()));
      } catch (_) {}
    }
    updateAll();
  }

  function pause() {
    p.playing = false;
    if (isYT(currentTrack())) ytDo((pl) => pl.pauseVideo());
    if (hasAudio()) audio.pause();
    synth?.stop();
    updateAll();
  }

  /* p.playing is optimistic while the embed is still loading/buffering —
     a second click in that window would wrongly toggle to "pause"
     (that was the "click 3 times to play" bug). Ground the toggle in
     the player's real state: ignore clicks while still buffering,
     pause only once sound is actually flowing. */
  function ytToggleState() {
    if (!ytPlayer) return "not-ready";
    try {
      const S = window.YT && window.YT.PlayerState;
      if (!S) return "not-ready";
      const st = ytPlayer.getPlayerState();
      if (st === S.BUFFERING) return "buffering";
      if (st === S.PLAYING) return "playing";
      return "idle"; // UNSTARTED / PAUSED / CUED / ENDED
    } catch (_) {
      return "not-ready";
    }
  }

  const togglePlay = () => {
    if (isYT(currentTrack())) {
      const st = ytToggleState();
      if (st === "buffering" || st === "not-ready") return; // let it start
      if (st === "playing") {
        pause();
        return;
      }
      play();
      return;
    }
    p.playing ? pause() : play();
  };

  function next(auto = false) {
    if (!p.queue.length) return;

    if (auto && p.repeat === 2) {
      p.pos = 0;
      if (hasAudio()) audio.currentTime = 0;
      if (isYT(currentTrack())) ytDo((pl) => pl.seekTo(0, true));
      if (p.playing) play();
      updateProgress();
      return;
    }

    let i;
    if (p.shuffle && p.queue.length > 1) {
      do {
        i = Math.floor(Math.random() * p.queue.length);
      } while (i === p.index);
    } else {
      i = p.index + 1;
    }

    /* A radio station never runs dry: when the shuffled queue ends, draw a new
       hand from the same crate and keep going. */
    if (i >= p.queue.length && auto && radioContextStation()) {
      const fresh = radioTracks(radioContextStation());
      if (fresh.length) {
        setQueue(fresh, 0, `radio:${radioContextStation()}`);
        play();
        return;
      }
    }

    if (i >= p.queue.length) {
      if (p.repeat === 1 || !auto) {
        i = 0;
      } else {
        p.playing = false;
        p.pos = 0;
        if (hasAudio()) audio.pause();
        ytStop();
        updateAll();
        return;
      }
    }
    loadIndex(i, p.playing || auto);
  }

  function prev() {
    if (!p.queue.length) return;
    if (p.pos > 3) {
      p.pos = 0;
      if (hasAudio()) audio.currentTime = 0;
      if (isYT(currentTrack())) ytDo((pl) => pl.seekTo(0, true));
      updateProgress();
      return;
    }
    const i = p.index > 0 ? p.index - 1 : 0;
    loadIndex(i, p.playing);
  }

  function seekTo(ratio, moving = false) {
    p.seeking = moving;
    p.pos = Math.min(1, Math.max(0, ratio)) * p.duration;
    if (hasAudio()) audio.currentTime = p.pos;
    if (!moving && isYT(currentTrack())) ytDo((pl) => pl.seekTo(p.pos, true));
    updateProgress();
  }

  function setVolume(ratio) {
    const v = Math.min(1, Math.max(0, ratio));
    p.volume = v;
    p.muted = v === 0;
    audio.volume = v;
    ytDo((pl) => pl.setVolume(Math.round(v * 100)));
    synth?.setVolume(v);
    try {
      localStorage.setItem(LS_VOLUME, String(v));
    } catch (_) {}
    updateVolume();
  }

  function toggleMute() {
    const silent = p.muted || p.volume === 0;
    if (silent) {
      p.muted = false;
      if (p.volume === 0) p.volume = 0.65;
      audio.volume = p.volume;
      try {
        localStorage.setItem(LS_VOLUME, String(p.volume));
      } catch (_) {}
    } else {
      p.muted = true;
      audio.volume = 0;
    }
    synth?.setVolume(p.muted ? 0 : p.volume);
    ytDo((pl) => pl.setVolume(Math.round((p.muted ? 0 : p.volume) * 100)));
    updateVolume();
  }

  /* ── Video ON/OFF ──────────────────────────────────────────── */
  /* The YouTube embed stays a 1x1 audio-only player until video mode is
     switched on; then it lifts into a floating mini player. Preference
     is remembered in localStorage. */
  function applyVideoMode() {
    const visible = state.videoOn && Boolean(isYT(currentTrack()));
    document.body.classList.toggle("video-on", visible);
    // video-paused drives the .yt-center-cover that hides YouTube's big
    // centered play button while music is stopped
    document.body.classList.toggle("video-paused", visible && !p.playing);
    const btn = UI.videoBtn;
    if (btn) {
      btn.classList.toggle("active", visible);
      btn.setAttribute("aria-pressed", String(state.videoOn));
      btn.title = state.videoOn ? "Video off — audio only" : "Watch video";
    }
  }

  function toggleLike(id) {
    if (!id) return;
    const wasLiked = state.liked.has(id);
    if (wasLiked) state.liked.delete(id);
    else state.liked.add(id);

    try {
      localStorage.setItem(LS_LIKED, JSON.stringify([...state.liked]));
    } catch (_) {}

    updateLikeUI();
    npKey = null;
    renderNowPlaying();
    persistLike(id, !wasLiked);
    if (wasLiked) toast("Removed from Liked Songs");
    else toast("Added to Liked Songs", "check");
  }

  function toggleFollow(name) {
    if (!name) return;
    const following = !state.following.has(name);
    if (following) {
      state.following.add(name);
      toast(`Following ${name}`, "check");
    } else {
      state.following.delete(name);
      toast(`Unfollowed ${name}`);
    }
    npKey = null;
    renderNowPlaying();
    $$(".follow-btn[data-name]").forEach((btn) => {
      if (btn.dataset.name !== name) return;
      btn.classList.toggle("following", following);
      btn.textContent = following ? "Following" : "Follow";
      btn.setAttribute("aria-pressed", String(following));
    });
  }

  /* ── Library data ──────────────────────────────────────────── */
  function libraryItems(filter = state.libFilter) {
    if (filter === "artists") return window.ARTISTS || [];
    if (filter === "albums") return window.ALBUMS || [];
    return [getItem("liked"), ...((window.PLAYLISTS||[]).filter((x) => x.id !== "liked"))];
  }

  /* ── Search ────────────────────────────────────────────────── */
  function runSearch(q) {
    const needle = q.toLowerCase();
    const tracks = (window.TRACKS||[]).filter((t) =>
      `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(needle)
    );
    const playlists = (window.ALL_ITEMS||{}).filter((i) =>
      `${i.title} ${i.description || ""} ${i.owner || ""} ${i.artist || ""}`.toLowerCase().includes(needle)
    );
    const artists = (window.ARTISTS||{}).filter((a) => a.name.toLowerCase().includes(needle));
    const genres = liveGenres().filter((g) => g.name.toLowerCase().includes(needle));

    genres.forEach((g) => {
      ((window.GENRE_TRACKS || {})[g.name] || []).forEach((id) => {
        const t = (window.TRACK_BY_ID||{})[id];
        if (t && !tracks.includes(t)) tracks.push(t);
      });
    });

    return { tracks, playlists, artists, genres };
  }

  /* ── Shared markup ─────────────────────────────────────────── */
  function eqBars() {
    return '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  }

  function card(item, extraClass = "") {
    const isArtist = item.type === "Artist";
    const isTrack = item.type === "Track";
    const path = isArtist
      ? `/artist/${encodeURIComponent(item.name)}`
      : isTrack
        ? "#"
        : `/playlist/${encodeURIComponent(item.id)}`;
    const sub = isArtist
      ? "Artist"
      : isTrack
        ? (item.artist || "")
        : item.type === "Album"
          ? `${item.artist}${item.year ? ` • ${item.year}` : ""}`
          : item.description || `${item.tracks?.length || 0} songs`;

    const imgSrc = isArtist ? artistArt(item.name) : isTrack && item.tracks && item.tracks[0] ? trackArt(item.tracks[0]) : itemArt(item);

    return `<article class="card ${isArtist ? "artist" : ""} ${extraClass}" role="link" tabindex="0" ${isTrack ? `data-action="play-track-card" data-track-id="${item.tracks && item.tracks[0] ? item.tracks[0].id : ''}"` : `data-nav="${path}"`} aria-label="${esc(item.title || item.name)}">
      <div class="card-img">
        <img src="${imgSrc}" alt="" loading="lazy" />
        ${
          isArtist
            ? ""
            : `<button class="play-fab" type="button" data-action="${isTrack ? "play-track-card" : "play-context"}" data-id="${isTrack && item.tracks && item.tracks[0] ? item.tracks[0].id : item.id}" data-label="${esc(item.title)}" aria-label="Play ${esc(item.title)}">${icon("play")}</button>`
        }
      </div>
      <h3 class="card-title">${esc(item.title || item.name)}</h3>
      <p class="card-sub">${esc(sub)}</p>
    </article>`;
  }

  function quickTile(item) {
    return `<div class="quick-tile" role="link" tabindex="0" data-nav="/playlist/${encodeURIComponent(item.id)}">
      <img src="${itemArt(item)}" alt="" />
      <span class="quick-tile-title">${esc(item.title)}</span>
      <button class="play-fab" type="button" data-action="play-context" data-id="${item.id}" data-label="${esc(item.title)}" aria-label="Play ${esc(item.title)}">${icon("play")}</button>
    </div>`;
  }

  function genreTile(g) {
    return `<button class="genre" type="button" style="--c1:${g.c1}" data-nav="/genre/${encodeURIComponent(g.name)}" aria-label="Browse ${esc(g.name)}">
      <span class="genre-title">${esc(g.name)}</span>
      <img src="${genreArt(g)}" alt="" loading="lazy" />
    </button>`;
  }

  function trackRow(t, i, contextId, opts = {}) {
    const liked = state.liked.has(t.id);
    const date = opts.date || dateAdded(i);
    const albumId = itemIdForAlbum(t.album);
    return `<div class="track-row" role="button" tabindex="0" data-action="play-track" data-context="${esc(contextId)}" data-index="${i}" data-track-id="${t.id}">
      <div class="track-idx">
        <span class="idx">${i + 1}</span>
        <span class="row-play">${icon("play")}</span>
        ${eqBars()}
      </div>
      <div class="track-main">
        <div class="track-name"><span class="track-title">${esc(t.title)}</span>${t.explicit ? '<span class="explicit">E</span>' : ""}</div>
        <div class="track-artist"><span data-nav="/artist/${encodeURIComponent(primaryArtistName(t))}">${esc(t.artist)}</span></div>
      </div>
      <div class="track-album"${albumId ? ` data-nav="/playlist/${albumId}"` : ""}>${esc(t.album)}</div>
      <div class="track-date">${esc(date)}</div>
      <span class="track-dur">${fmtTime(t.duration)}</span>
      <div class="row-actions">
        <button class="row-add" type="button" data-action="add-to-playlist" data-id="${t.id}" aria-label="Add to playlist" title="Add to playlist">${icon("plus", "sm")}</button>
        <button class="row-like ${liked ? "liked" : ""}" type="button" data-action="like" data-id="${t.id}" aria-label="${liked ? "Remove from" : "Save to"} Liked Songs">
          ${icon("heart", "sm")}
        </button>
      </div>
    </div>`;
  }

  function itemIdForAlbum(albumName) {
    const album = ((window.ALBUMS||[])).find((a) => a.title === albumName);
    return album ? album.id : null;
  }

  /* ── Categories and radio ──────────────────────────────────── */
  /* A song's category lives in `tracks.genre` (supabase/track-genre.sql).
     Matching is by name and case-insensitive, so "bollywood" typed by hand and
     "Bollywood" chosen in the admin panel land in the same crate. The demo
     catalogue in js/data.js has no genre column, so its hand-written
     GENRE_TRACKS map is still honoured as a fallback. */
  const byIdList = (ids) =>
    window.byIds
      ? window.byIds(ids)
      : (ids || []).map((id) => (window.TRACK_BY_ID || {})[id]).filter(Boolean);

  function categoryMeta(name) {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return null;
    const byName = window.AURUM_CATEGORY_BY_NAME || {};
    const direct = Object.keys(byName).find((k) => k.toLowerCase() === key);
    if (direct) return byName[direct];
    const legacy = Object.keys(window.GENRE_BY_NAME || {}).find((k) => k.toLowerCase() === key);
    if (legacy) {
      const g = window.GENRE_BY_NAME[legacy];
      return { name: g.name, c1: g.c1, seed: g.seed, blurb: "", radio: `${g.name} Radio` };
    }
    // A category typed into the admin panel that is not in the shared list yet:
    // keep working, just without a colour of its own.
    return { name: String(name).trim(), c1: "#6a5a3c", seed: `genre:${key}`, blurb: "", radio: `${String(name).trim()} Radio` };
  }

  function tracksInCategory(name) {
    const meta = categoryMeta(name);
    if (!meta) return [];
    const key = meta.name.toLowerCase();
    const tagged = (window.TRACKS || []).filter(
      (t) => String(t.genre || "").trim().toLowerCase() === key
    );
    if (tagged.length) return tagged;
    return byIdList((window.GENRE_TRACKS || {})[meta.name] || []);
  }

  function categoryAlbums(name) {
    const ids = new Set(tracksInCategory(name).map((t) => t.album_id).filter(Boolean));
    if (!ids.size) return [];
    return (window.ALBUMS || []).filter((a) => ids.has(a.id));
  }

  function shuffled(list) {
    const a = (list || []).slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* A station is a shuffled queue, not a stream: every song here plays from
     YouTube, so "radio" means keep handing the queue new songs from the same
     crate instead of stopping at the end. Aurum Radio is the whole room. */
  function radioStations() {
    const lead = new Set(window.AURUM_LEAD_CATEGORIES || []);
    const cats = (window.AURUM_CATEGORIES || []).slice();
    const ordered = cats.filter((c) => lead.has(c.name)).concat(cats.filter((c) => !lead.has(c.name)));
    return [
      { id: "all", name: "Aurum Radio", blurb: "Everything in the room, shuffled.", c1: "#6a5a3c" }
    ].concat(
      ordered.map((c) => ({ id: c.slug, name: c.radio || `${c.name} Radio`, blurb: c.blurb, c1: c.c1, category: c.name }))
    );
  }

  function radioTracks(stationId) {
    if (!stationId || stationId === "all") return shuffled(window.TRACKS || []);
    const meta = (window.AURUM_CATEGORY_BY_SLUG || {})[stationId];
    return shuffled(tracksInCategory(meta ? meta.name : stationId));
  }

  function radioStationCount(station) {
    if (station.id === "all") return (window.TRACKS || []).length;
    return tracksInCategory(station.category).length;
  }

  function playRadio(stationId, label) {
    const tracks = radioTracks(stationId);
    if (!tracks.length) {
      toast(`${label || "This channel"} is empty — Admin → YouTube song add karte waqt category chuno.`);
      return;
    }
    setQueue(tracks, 0, `radio:${stationId}`);
    play();
  }

  function radioContextStation() {
    const ctx = currentContext();
    return ctx && String(ctx).startsWith("radio:") ? String(ctx).slice(6) : null;
  }

  function stationTile(station) {
    const count = radioStationCount(station);
    return `<button class="channel ${count ? "" : "is-empty"}" type="button" style="--c1:${station.c1}" data-action="play-radio" data-radio="${esc(station.id)}" data-label="${esc(station.name)}" aria-label="Play ${esc(station.name)}">
      <span class="channel-top">
        <span class="channel-live" aria-hidden="true"><i></i>Live</span>
        <span class="channel-count">${count ? plural(count, "song") : "Empty"}</span>
      </span>
      <span class="channel-name">${esc(station.name)}</span>
      <span class="channel-sub">${esc(station.blurb || "")}</span>
      <span class="channel-play" aria-hidden="true">${icon("play", "sm")}</span>
    </button>`;
  }

  /* ── Live stations ─────────────────────────────────────────── */
    /* Stations come from Supabase; the static array remains a fallback for
      deployments that have not installed the radio table migration yet. */
  function liveStations() {
    return (window.AURUM_LIVE_STATIONS || []).filter((s) => s && s.enabled !== false && s.name && (s.stream || s.youtube));
  }

  function liveStationTrack(station) {
    const common = {
      id: `live:${station.id || station.name}`,
      title: station.name,
      artist: station.frequency ? `${station.frequency} FM · live` : "Live radio",
      album: "Live radio",
      duration: 0,
      live: true,
      genre: ""
    };
    if (station.youtube) {
      return {
        ...common,
        yt: true,
        videoId: station.youtube,
        embed: `https://www.youtube-nocookie.com/embed/${station.youtube}`,
        url: `https://www.youtube.com/watch?v=${station.youtube}`
      };
    }
    return { ...common, yt: false, src: station.stream };
  }

  function playLiveStation(id) {
    const station = liveStations().find((s) => String(s.id) === String(id));
    if (!station) return;
    setQueue([liveStationTrack(station)], 0, `live:${station.id}`);
    play();
  }

  function liveTile(station) {
    if (isMyTunerMirchi(station)) return myTunerMirchiTile(station);
    return `<button class="channel live-station" type="button" style="--c1:${station.c1 || "#6a5a3c"}" data-action="play-live" data-live="${esc(station.id || station.name)}" aria-label="Play ${esc(station.name)} live">
      <span class="channel-top">
        <span class="channel-live" aria-hidden="true"><i></i>On air</span>
        <span class="channel-count">${esc(station.frequency ? `${station.frequency} FM` : "")}</span>
      </span>
      <span class="channel-control">
        <span class="channel-play" aria-hidden="true">${icon("play", "sm")}</span>
      </span>
      <span class="channel-name">${esc(station.name)}</span>
      <span class="channel-sub">${esc(station.city || station.blurb || "Live radio")}</span>
    </button>`;
  }

  let myTunerScriptsPromise = null;

  function isMyTunerMirchi(station) {
    const frequency = String(station.frequency || "").replace(/[^\d.]/g, "");
    return /radio\s*mirchi/i.test(station.name || "") && frequency === "98.3" &&
      /radioindia\.in|mytuner-radio\.com/i.test(station.stream || "");
  }

  function myTunerMirchiTile(station) {
    const id = "Y0goU8Oqw5DDjMO9fsK3w5RQw71UQcOqNMOALMKlwrE=";
    return `<article class="channel live-station mytuner-station" style="--c1:${station.c1 || "#a84b35"}">
      <span class="channel-top">
        <span class="channel-live"><i></i>Live</span>
        <span class="channel-count">${esc(station.frequency)} FM</span>
      </span>
      <div id="${id}" class="mytuner-widget" data-target="395596" data-requires_initialization="true" data-autoplay="false" data-hidehistory="true">
        <div id="${id}top-bar" class="mytuner-widget-bar">
            <div id="${id}play-button" class="main-play-button channel-play disabled" role="button" tabindex="0" aria-label="Play Radio Mirchi 98.3 FM" data-id="${id}"><div class="play-image"></div></div>
          <a class="player-radio-link" href="https://mytuner-radio.com/radio/radio-mirchi-983-fm-395596/" target="_blank" rel="noopener noreferrer">
            <img src="https://static2.mytuner.mobi/media/tvos_radios/596/radio-mirchi-983-fm.08cff4be.png" alt="Radio Mirchi 98.3 FM">
          </a>
          <div class="volume-controls">
            <input id="${id}volume-control" class="volume-control slider" type="range" min="1" max="100" value="100" aria-label="Radio volume">
            <svg id="${id}volume-indicator" class="volume-indicator" viewBox="0 0 24 24" aria-label="Mute radio"><path d="M3 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.34-1.71-.71L7 9H4c-.55 0-1 .45-1 1zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
          </div>
        </div>
        <ul id="${id}song-history" data-border="1" data-bordercolor="#333" hidden></ul>
      </div>
      <div class="mytuner-station-footer">
        <img src="https://static2.mytuner.mobi/media/tvos_radios/596/radio-mirchi-983-fm.08cff4be.png" alt="">
        <div>
          <span class="channel-name">${esc(station.name)}</span>
          <span class="channel-sub">${esc(station.city || "Mumbai")}</span>
        </div>
      </div>
    </article>`;
  }

  /* Radio Mirchi talks through the mytuner widget's own audio, outside the
     main player, so only one of them may ever be audible. The widget exposes
     nothing but its play/pause button, so that button is the whole protocol:

       * the station comes on air (click, keyboard, widget-driven) -> the deck
         pauses,
       * the deck starts -> the station's pause button gets pressed.

     `syntheticStop` marks our own press so it cannot come back around and
     pause the playback we just started, and the observer only reacts to the
     `playing` class *appearing* — the widget rewrites its class for cosmetic
     reasons, which must not be mistaken for the station starting. */
  let syntheticStop = false;

  function radioPressed() {
    if (syntheticStop) return; // our own stop-press, not the user
    if (p.playing) pause();
  }

  function stopRadioForDeck() {
    const button = document.querySelector(".mytuner-widget .main-play-button.playing");
    if (!button) return;
    syntheticStop = true;
    try {
      button.click();
    } finally {
      syntheticStop = false;
    }
  }

  function watchMyTunerPlayButton(id) {
    const button = document.getElementById(`${id}play-button`);
    if (!button || button.dataset.deckWatch === "on") return;
    button.dataset.deckWatch = "on";
    let stationOn = button.classList.contains("playing");
    button.addEventListener("click", radioPressed);
    new MutationObserver(() => {
      const now = button.classList.contains("playing");
      if (now === stationOn) return; // same state, new coat of paint
      stationOn = now;
      if (now && p.playing) pause();
    }).observe(button, { attributes: true, attributeFilter: ["class"] });
  }

  function initializeMyTunerWidget(id) {
    const widget = document.getElementById(id);
    if (!widget || widget.dataset.requires_initialization !== "true") return;
    watchMyTunerPlayButton(id);
    window.mytuner_scripts = window.mytuner_scripts || {};
    window.mytuner_scripts["player-v1.js_queue"] = window.mytuner_scripts["player-v1.js_queue"] || [];
    if (!myTunerScriptsPromise) {
      const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      myTunerScriptsPromise = loadScript("https://mytuner-radio.com/static/js/widgets/player-v1.js")
        .then(() => loadScript("https://mytuner-radio.com/static/js/widgets/widget-player-v1.js"))
        .catch((error) => {
          myTunerScriptsPromise = null;
          throw error;
        });
    }
    myTunerScriptsPromise.then(() => {
      if (!widget.isConnected || widget.dataset.requires_initialization !== "true") return;
      const initialize = window.mytuner_scripts?.["player-v1.js"];
      if (typeof initialize !== "function") throw new Error("myTuner widget did not initialize");
      initialize(id);
      widget.dataset.requires_initialization = "false";
    }).catch((error) => {
      console.warn("myTuner widget failed to load:", error);
      const button = document.getElementById(`${id}play-button`);
      if (button) {
        button.classList.add("error");
        button.setAttribute("aria-label", "Radio Mirchi player unavailable");
      }
    });
  }

  function crateCard(name) {
    const meta = categoryMeta(name);
    if (!meta) return "";
    const tracks = tracksInCategory(meta.name);
    const albums = categoryAlbums(meta.name);
    const art = albums.slice(0, 3).map((a) => `<img src="${itemArt(a)}" alt="" loading="lazy" />`).join("");
    const count = tracks.length
      ? `${plural(tracks.length, "song")}${albums.length ? ` · ${plural(albums.length, "album")}` : ""}`
      : "No songs yet";
    return `<button class="crate-card" type="button" style="--c1:${meta.c1}" data-nav="/genre/${encodeURIComponent(meta.name)}" aria-label="Open the ${esc(meta.name)} crate">
      <span class="crate-art">${art || `<span class="crate-monogram">${esc(meta.name.charAt(0))}</span>`}</span>
      <span class="crate-name">${esc(meta.name)}</span>
      <span class="crate-sub">${esc(count)}</span>
    </button>`;
  }

  function trackTable(item) {
    const rows = item.tracks.map((t, i) => trackRow(t, i, item.id)).join("");
    return `<div class="tracks">
      <div class="track-head" role="row">
        <div class="col-idx">#</div>
        <div>Title</div>
        <div class="col-album">Album</div>
        <div class="col-date">Date added</div>
        <div class="col-dur">${icon("clock", "sm")}</div>
        <div class="col-like"></div>
      </div>
      <div class="track-body">${rows}</div>
    </div>`;
  }

  /* ── Views ─────────────────────────────────────────────────── */
  /* Quick picks and shelves come from the live catalogue. The old hard-coded
     demo ids pointed at playlists that no longer exist with Supabase data. */
  function homeQuickPickIds() {
    if (Array.isArray(window.QUICK_PICKS) && window.QUICK_PICKS.length) return window.QUICK_PICKS;
    return [...(window.PLAYLISTS || []), ...(window.ALBUMS || [])].slice(0, 6).map((i) => i.id);
  }

  function homeShelves() {
    if (Array.isArray(window.SHELVES) && window.SHELVES.length) return window.SHELVES;
    const shelves = [];
    if ((window.PLAYLISTS || []).length) {
      shelves.push({ title: "Your playlists", ids: window.PLAYLISTS.map((p) => p.id) });
    }
    if ((window.ALBUMS || []).length) {
      shelves.push({ title: "Albums", ids: window.ALBUMS.map((a) => a.id) });
    }
    return shelves;
  }

  /* The front page is set like a record sleeve instead of a wall of shelves:
     one sleeve on the platter, a numbered chart of the newest tracks, an
     asymmetric mosaic of albums and playlists, and a filmstrip of the people
     in the room. */
  function viewHome() {
    const hour = new Date().getHours();
    const greeting =
      hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    const tracks = window.TRACKS || [];
    const quick = homeQuickPickIds().map(getItem).filter(Boolean);
    const featured = quick[0] || null;

    let hero = "";
    if (featured) {
      const count = featured.tracks ? featured.tracks.length : 0;
      const sub =
        featured.description ||
        `${count ? plural(count, "song") + " · " : ""}${featured.artist || "Your library"}`;
      hero = `<section class="hero-sleeve">
      <img class="hero-bg" src="${itemArt(featured)}" alt="" aria-hidden="true" />
      <div class="hero-content">
        <p class="eyebrow">${esc(greeting)} · on the platter</p>
        <h1 class="hero-title">${esc(featured.title)}</h1>
        <p class="hero-sub">${esc(sub)}</p>
        <div class="hero-actions">
          <button class="big-play" type="button" data-action="play-context" data-id="${featured.id}" data-label="${esc(featured.title)}" aria-label="Play ${esc(featured.title)}">${icon("play")}</button>
          <button class="pill pill-text" type="button" data-nav="/playlist/${encodeURIComponent(featured.id)}">Open the sleeve</button>
        </div>
      </div>
      <img class="hero-art" src="${itemArt(featured)}" alt="" />
    </section>`;
    }

    const chartTracks = tracks.slice(0, 10);
    const chart = chartTracks.length
      ? `<section class="chart">
      <div class="section-head">
        <h2>The Gold Ten</h2>
        <span class="section-note">Newest in the room · pick a row to play</span>
      </div>
      <ol class="chart-list">
        ${chartTracks
          .map(
            (t, i) => `<li class="chart-row" role="button" tabindex="0" data-action="play-track-card" data-track-id="${t.id}" aria-label="Play ${esc(t.title)}">
          <span class="chart-rank">${String(i + 1).padStart(2, "0")}</span>
          <img src="${trackArt(t)}" alt="" loading="lazy" />
          <span class="chart-main">
            <span class="chart-title">${esc(t.title)}</span>
            <span class="chart-artist">${esc(t.artist || "")}${t.album ? ` · ${esc(t.album)}` : ""}</span>
          </span>
          <span class="chart-dur">${fmtTime(t.duration)}</span>
        </li>`
          )
          .join("")}
      </ol>
    </section>`
      : "";

    const mosaicSeen = new Set();
    const mosaicCards = homeShelves()
      .flatMap((shelf) => shelf.ids)
      .map(getItem)
      .filter((item) => item && !mosaicSeen.has(item.id) && mosaicSeen.add(item.id))
      .slice(0, 12)
      .map((item) => card(item))
      .join("");
    const mosaic = mosaicCards
      ? `<section class="mosaic">
      <div class="section-head">
        <h2>Sleeves</h2>
        <button class="show-all" type="button" data-nav="/library">Everything in the crate</button>
      </div>
      <div class="mosaic-grid">${mosaicCards}</div>
    </section>`
      : "";

    /* Channels: Aurum Radio plus one station per lead category. A station with
       no songs still renders, so the row shows what the room is for instead of
       disappearing until the first song is filed. */
    const leadNames = new Set(window.AURUM_LEAD_CATEGORIES || []);
    const stations = radioStations().filter((s) => s.id === "all" || leadNames.has(s.category));
    /* Live stations come first when they are configured: they are the only
       thing on this page that is happening right now. */
    const live = liveStations();
    const liveRow = live.length
      ? `<section class="channels live-radio">
      <div class="section-head">
        <h2>Live radio</h2>
        <span class="section-note">On air now · the station's own broadcast</span>
      </div>
      <div class="channel-grid">${live.map(liveTile).join("")}</div>
    </section>`
      : "";

    const channels = stations.length > 1
      ? `<section class="channels">
      <div class="section-head">
        <h2>Channels</h2>
        <span class="section-note">Always on · a shuffled queue from the crate</span>
      </div>
      <div class="channel-grid">${stations.map(stationTile).join("")}</div>
    </section>`
      : "";

    const crateNames = (window.AURUM_LEAD_CATEGORIES && window.AURUM_LEAD_CATEGORIES.length)
      ? window.AURUM_LEAD_CATEGORIES
      : (window.AURUM_CATEGORIES || []).slice(0, 4).map((c) => c.name);
    const crateCards = crateNames.map(crateCard).join("");
    const crates = crateCards
      ? `<section class="crates">
      <div class="section-head">
        <h2>Crates</h2>
        <span class="section-note">Filed by category · open a crate for its albums</span>
      </div>
      <div class="crate-grid">${crateCards}</div>
    </section>`
      : "";

    const artistCards = (window.ARTISTS || []).slice(0, 12).map((artist) => card(artist)).join("");
    const strip = artistCards
      ? `<section class="filmstrip">
      <div class="section-head">
        <h2>The people in the room</h2>
        <button class="show-all" type="button" data-nav="/library">All artists</button>
      </div>
      <div class="strip">${artistCards}</div>
    </section>`
      : "";

    return `<div class="home editorial">
      ${hero}
      ${liveRow}
      ${channels}
      ${crates}
      ${chart}
      ${mosaic}
      ${strip}
    </div>`;
  }

  function viewPlaylist(id) {
    const item = getItem(id);
    if (!item) return viewNotFound();

    const isAlbum = item.type === "Album";
    const totalSec = item.tracks.reduce((s, t) => s + t.duration, 0);
    const ownerInitial = isAlbum ? item.artist.charAt(0) : item.owner === "You" ? "Y" : item.owner.charAt(0);

    const meta = isAlbum
      ? `<span class="avatar-xs">${esc(ownerInitial)}</span><strong>${esc(item.artist)}</strong><span class="dot">•</span><span>${item.year}</span><span class="dot">•</span><span>${plural(item.tracks.length, "song")},</span><span class="total">${fmtLong(totalSec)}</span>`
      : `<span class="avatar-xs">${esc(ownerInitial)}</span><strong>${esc(item.owner)}</strong><span class="dot">•</span><span>${plural(item.tracks.length, "song")},</span><span class="total">${fmtLong(totalSec)}</span>`;

    const body = item.tracks.length
      ? trackTable(item)
      : `<div class="tracks"><div class="empty-state">
          <h3>Songs will show up here</h3>
          <p>Like a song with the heart icon and it will appear in this playlist.</p>
        </div></div>`;

    return `<div class="pl-hero" style="--tint:${tintFor(item.seed || item.id)}">
      <div class="pl-header">
        <img class="pl-cover" src="${itemArt(item)}" alt="${esc(item.title)} cover" />
        <div class="pl-info">
          <span class="pl-eyebrow">${isAlbum ? "Album" : "Playlist"}</span>
          <h1 class="pl-title">${esc(item.title)}</h1>
          ${item.description ? `<p class="pl-desc">${esc(item.description)}</p>` : ""}
          <div class="pl-meta">${meta}</div>
        </div>
      </div>
    </div>
    <div class="pl-actions">
      <button class="big-play" type="button" data-action="play-context" data-id="${item.id}" data-label="${esc(item.title)}" aria-label="Play ${esc(item.title)}">${icon("play")}</button>
      <button class="icon-btn plain" type="button" data-action="toast" data-msg="Added to Your Library" aria-label="Save to Your Library" title="Save to Your Library">${icon("heart")}</button>
      <button class="icon-btn plain" type="button" data-action="toast" data-msg="More options aren't part of this demo" aria-label="More options" title="More options">${icon("more")}</button>
    </div>
    ${body}`;
  }

  function viewArtist(name) {
    const artist = (window.ARTIST_BY_NAME||{})[name];
    if (!artist) return viewNotFound();

    const info = artistInfo(name);
    const tracks = tracksByArtist(name);
    const albums = (window.ALBUMS||{}).filter((a) => a.artist === name);
    const following = state.following.has(name);

    const playCount = (t) => Number(String(t.plays ?? "0").replace(/[^\d.]/g, "")) || 0;
    const popular = tracks
      .slice()
      .sort((a, b) => playCount(b) - playCount(a))
      .slice(0, 5);

    const rows = popular
      .map((t, i) => trackRow(t, i, `artist:${name}`, { date: `${t.plays} plays` }))
      .join("");

    const discography = albums.length
      ? `<section class="artist-section">
          <h2>Discography</h2>
          <div class="card-grid">${albums.map((a) => card(a)).join("")}</div>
        </section>`
      : "";

    return `<div class="artist-hero" style="--tint:${tintFor("artist:" + name)}">
      <img class="artist-photo" src="${artistArt(name)}" alt="${esc(name)}" />
      <div class="artist-info">
        <span class="pl-eyebrow">Artist</span>
        <h1 class="artist-name">${esc(name)}</h1>
        <p class="artist-listeners">${info.formatted} monthly listeners</p>
      </div>
    </div>
    <div class="pl-actions">
      <button class="big-play" type="button" data-action="artist-play" data-name="${esc(name)}" data-label="${esc(name)}" aria-label="Play ${esc(name)}">${icon("play")}</button>
      <button class="follow-btn ${following ? "following" : ""}" type="button" data-action="follow" data-name="${esc(name)}" aria-pressed="${following}">${following ? "Following" : "Follow"}</button>
      <button class="icon-btn plain" type="button" data-action="toast" data-msg="More options aren't part of this demo" aria-label="More options">${icon("more")}</button>
    </div>
    <section class="artist-section">
      <h2>Popular</h2>
      <div class="tracks">
        <div class="track-head">
          <div class="col-idx">#</div><div>Title</div><div class="col-album">Album</div><div class="col-date">Plays</div><div class="col-dur">${icon("clock", "sm")}</div><div class="col-like"></div>
        </div>
        ${rows}
      </div>
    </section>
    ${discography}`;
  }

  /* A category page: the crate itself. Everything here follows from
     `tracks.genre`, so it fills up as soon as songs are filed in the admin
     panel — and says so plainly while it is still empty. */
  function viewGenre(name) {
    const meta = categoryMeta(name);
    if (!meta) return viewNotFound();

    const tracks = tracksInCategory(meta.name);
    const albums = categoryAlbums(meta.name);
    const totalSec = tracks.reduce((sum, t) => sum + t.duration, 0);
    const item = {
      id: `genre:${meta.name}`,
      type: "Category",
      title: meta.name,
      owner: "Aurum",
      seed: meta.seed,
      description: meta.blurb || `Everything filed under ${meta.name}.`,
      tracks
    };

    const body = tracks.length
      ? trackTable(item)
      : `<div class="tracks"><div class="empty-state">
          <h3>The ${esc(meta.name)} crate is empty</h3>
          <p>Admin panel → YouTube song add karte waqt category <strong>${esc(meta.name)}</strong> chuno.
          Song add hote hi yahan albums, radio aur count apne aap bhar jayenge.</p>
          <a class="pill pill-light" href="admin.html">Open the admin panel</a>
        </div></div>`;

    const albumSection = albums.length
      ? `<section class="category-albums">
      <div class="section-head">
        <h2>Albums in ${esc(meta.name)}</h2>
        <span class="section-note">${plural(albums.length, "album")}</span>
      </div>
      <div class="card-grid">${albums.map((a) => card(a)).join("")}</div>
    </section>`
      : "";

    return `<div class="pl-hero" style="--tint:${tintFor(meta.seed)}">
      <div class="pl-header">
        <img class="pl-cover" src="${itemArt(item)}" alt="${esc(meta.name)} cover" />
        <div class="pl-info">
          <span class="pl-eyebrow">Category</span>
          <h1 class="pl-title">${esc(meta.name)}</h1>
          <p class="pl-desc">${esc(item.description)}</p>
          <div class="pl-meta">
            <span class="avatar-xs">A</span><strong>Aurum</strong>
            <span class="dot">•</span><span>${plural(tracks.length, "song")}${albums.length ? `, ${plural(albums.length, "album")}` : ""},</span>
            <span class="total">${fmtLong(totalSec)}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="pl-actions">
      <button class="big-play" type="button" data-action="play-genre" data-name="${esc(meta.name)}" data-label="${esc(meta.name)}" aria-label="Play ${esc(meta.name)}">${icon("play")}</button>
      <button class="pill pill-text" type="button" data-action="play-radio" data-radio="${esc(meta.name)}" data-label="${esc(meta.name)} Radio">${icon("shuffle", "sm")} Start ${esc(meta.name)} Radio</button>
      <button class="icon-btn plain" type="button" data-action="toast" data-msg="Added to Your Library" aria-label="Save to Your Library" title="Save to Your Library">${icon("heart")}</button>
    </div>
    ${albumSection}
    ${body}`;
  }

  function viewProfile() {
    const auth = window.WavelyAuth;
    const user = auth && auth.user;

    if (!user) {
      return `<div class="page">
        <h1 class="page-title">Your profile</h1>
        <div class="empty-state">
          <h3>Log in to see your profile</h3>
          <p>Playlists aur liked songs account ke saath save hote hain.</p>
          <button class="pill pill-light" type="button" data-action="login">Log in</button>
        </div>
      </div>`;
    }

    const name = auth.displayName(user) || "Listener";
    const initial = (name.trim().charAt(0) || "U").toUpperCase();
    const likedTracks = (window.TRACKS || []).filter((t) => state.liked.has(t.id));
    const myPlaylists = (window.PLAYLISTS || []).filter((p) => p.user_id === user.id);

    const likedSection = likedTracks.length
      ? trackTable({ id: "liked", tracks: likedTracks })
      : `<p class="profile-empty">Abhi koi liked song nahi — kisi bhi song par heart dabao.</p>`;

    const playlistSection = myPlaylists.length
      ? `<div class="card-grid">${myPlaylists.map((item) => card(item)).join("")}</div>`
      : `<p class="profile-empty">Abhi koi playlist nahi — upar se ek banao.</p>`;

    return `<div class="profile-hero">
      <div class="profile-avatar">${esc(initial)}</div>
      <div>
        <h1 class="profile-name">${esc(name)}</h1>
        <p class="profile-sub">${esc(user.email || "")}</p>
        <div class="profile-actions">
          <button class="pill pill-light" type="button" data-action="create-playlist">Create playlist</button>
          <button class="pill pill-text" type="button" data-action="logout">Log out</button>
        </div>
      </div>
    </div>
    <section class="profile-section">
      <h2>Liked songs <span class="profile-sub">(${likedTracks.length})</span></h2>
      ${likedSection}
    </section>
    <section class="profile-section">
      <h2>Your playlists <span class="profile-sub">(${myPlaylists.length})</span></h2>
      ${playlistSection}
    </section>`;
  }

  function viewLibraryPage() {
    const items = libraryItems();
    const isArtist = state.libFilter === "artists";

    const rows = items
      .map((item, i) => {
        if (isArtist) {
          const info = artistInfo(item.name);
          return `<div class="lib-row artist" role="link" tabindex="0" data-nav="/artist/${encodeURIComponent(item.name)}">
            <div class="lib-row-main">
              <img src="${artistArt(item.name)}" alt="" loading="lazy" />
              <div><div class="lib-row-title">${esc(item.name)}</div><div class="lib-row-sub">Artist</div></div>
            </div>
            <div class="lib-added">—</div>
            <div class="lib-row-count">${info.formatted} listeners</div>
          </div>`;
        }
        const isAlbum = item.type === "Album";
        return `<div class="lib-row" role="link" tabindex="0" data-nav="/playlist/${encodeURIComponent(item.id)}">
          <div class="lib-row-main">
            <img src="${itemArt(item)}" alt="" loading="lazy" />
            <div>
              <div class="lib-row-title">${esc(item.title)}</div>
              <div class="lib-row-sub">${isAlbum ? "Album" : "Playlist"} • ${esc(item.owner)}</div>
            </div>
          </div>
          <div class="lib-added">${dateAdded(i + 2)}</div>
          <div class="lib-row-count">${plural(item.tracks.length, "song")}</div>
        </div>`;
      })
      .join("");

    return `<div class="page">
      <h1 class="page-title">Your Library</h1>
      <div class="page-chips" role="tablist" aria-label="Library filters">
        <button class="chip ${state.libFilter === "playlists" ? "active" : ""}" type="button" data-filter="playlists" role="tab" aria-selected="${state.libFilter === "playlists"}">Playlists</button>
        <button class="chip ${state.libFilter === "albums" ? "active" : ""}" type="button" data-filter="albums" role="tab" aria-selected="${state.libFilter === "albums"}">Albums</button>
        <button class="chip ${state.libFilter === "artists" ? "active" : ""}" type="button" data-filter="artists" role="tab" aria-selected="${state.libFilter === "artists"}">Artists</button>
      </div>
      <div class="lib-table-head">
        <div>Title</div><div class="col-added">Date added</div><div class="col-count">Songs</div>
      </div>
      ${rows}
    </div>`;
  }

  function viewAllSongs() {
    const tracks = (window.TRACKS || []).slice();
    if (!tracks.length) {
      return `<div class="page">
        <h1 class="page-title">All Songs</h1>
        <div class="empty-state">
          <h3>No songs yet</h3>
          <p>Songs added from Admin panel will appear here.</p>
          <a class="pill pill-light" href="admin.html">Go to Admin</a>
        </div>
      </div>`;
    }

    const item = {
      id: "all-songs",
      type: "Playlist",
      title: "All Songs",
      owner: "Aurum",
      seed: "All Songs",
      description: "Every song in your library.",
      tracks
    };

    return `<div class="pl-hero" style="--tint:${tintFor("All Songs")}">
      <div class="pl-header">
        <img class="pl-cover" src="${itemArt(item)}" alt="All Songs cover" />
        <div class="pl-info">
          <span class="pl-eyebrow">Playlist</span>
          <h1 class="pl-title">All Songs</h1>
          <p class="pl-desc">${esc(item.description)}</p>
          <div class="pl-meta">
            <span class="avatar-xs">A</span><strong>Aurum</strong>
            <span class="dot">•</span><span>${plural(tracks.length, "song")},</span><span class="total">${fmtLong(tracks.reduce((s, t) => s + t.duration, 0))}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="pl-actions">
      <button class="big-play" type="button" data-action="play-context" data-id="all-songs" data-label="All Songs" aria-label="Play All Songs">${icon("play")}</button>
    </div>
    ${trackTable(item)}`;
  }

  function viewSearchPage() {
    const q = state.query.trim();
    if (!q) {
      const artists = (window.ARTISTS || []).slice(0, 6);
      const items = (window.ALL_ITEMS || []).slice(0, 6);
      const browse = artists.length || items.length
        ? `${artists.length
            ? `<section class="results-section">
                <h2>Artists</h2>
                <div class="card-grid">${artists.map((a) => card(a)).join("")}</div>
              </section>`
            : ""}
          ${items.length
            ? `<section class="results-section">
                <h2>Playlists &amp; albums</h2>
                <div class="card-grid">${items.map((i) => card(i)).join("")}</div>
              </section>`
            : ""}`
        : `<div class="empty-state">
            <h3>Nothing in your library yet</h3>
            <p>Songs you add from the Admin panel — including YouTube links — appear here and in search.</p>
            <a class="pill pill-light" href="admin.html">Go to Admin</a>
          </div>`;
      return `<div class="search-page">
        <h1 class="page-title">Browse your library</h1>
        ${browse}
      </div>`;
    }

    const res = runSearch(q);
    state.searchTracks = res.tracks;

    if (!res.tracks.length && !res.playlists.length && !res.artists.length && !res.genres.length) {
      return `<div class="search-page">
        <h1 class="search-heading">Search results for <span class="q">“${esc(q)}”</span></h1>
        <div class="empty-state">
          <h3>Nothing in your library matched</h3>
          <p>Search only covers the songs you've added. Add this song from the Admin panel and it will show up here.</p>
        </div>
      </div>`;
    }

    const top = res.playlists[0] || res.artists[0] || res.tracks[0];
    // A genre name can be the only match, which leaves no playlist/artist/track
    // for the Top result card — guard the lookup instead of reading `top.id`.
    const topIsTrack = Boolean(top && (window.TRACK_BY_ID || {})[top.id]);
    const topIsArtist = Boolean(top && top.type === "Artist");

    let topHTML = "";
    if (top) {
      const img = topIsTrack ? trackArt(top) : topIsArtist ? artistArt(top.name) : itemArt(top);
      const title = topIsTrack ? top.title : topIsArtist ? top.name : top.title;
      const type = topIsTrack ? "Song" : topIsArtist ? "Artist" : top.type;
      const nav = topIsTrack
        ? ""
        : topIsArtist
          ? `/artist/${encodeURIComponent(top.name)}`
          : `/playlist/${encodeURIComponent(top.id)}`;
      const playBtn = topIsTrack
        ? `<button class="play-fab" type="button" data-action="play-search" data-id="${top.id}" aria-label="Play ${esc(top.title)}">${icon("play")}</button>`
        : topIsArtist
          ? ""
          : `<button class="play-fab" type="button" data-action="play-context" data-id="${top.id}" data-label="${esc(top.title)}" aria-label="Play ${esc(top.title)}">${icon("play")}</button>`;

      topHTML = `<article class="top-result ${topIsArtist ? "artist" : ""}" ${nav ? `role="link" tabindex="0" data-nav="${nav}"` : ""}>
        <img src="${img}" alt="" />
        <h3 class="top-result-title">${esc(title)}</h3>
        <span class="top-result-type">${esc(type)}</span>
        ${playBtn}
      </article>`;
    }

    const songs = res.tracks
      .slice(0, 20)
      .map(
        (t) => `<div class="song-row" role="button" tabindex="0" data-action="play-search" data-id="${t.id}" data-track-id="${t.id}">
          <img src="${trackArt(t)}" alt="" loading="lazy" />
          <div class="song-row-main">
            <div class="song-row-title">${esc(t.title)}</div>
            <div class="song-row-artist">${esc(t.artist)}</div>
          </div>
          <span class="song-row-dur">${fmtTime(t.duration)}</span>
        </div>`
      )
      .join("");

    const artists = res.artists.length
      ? `<section class="results-section">
          <h2>Artists</h2>
          <div class="card-grid">${res.artists.slice(0, 6).map((a) => card(a)).join("")}</div>
        </section>`
      : "";

    const playlists = res.playlists.length
      ? `<section class="results-section">
          <h2>Playlists &amp; albums</h2>
          <div class="card-grid">${res.playlists.slice(0, 6).map((i) => card(i)).join("")}</div>
        </section>`
      : "";

    const genres = res.genres.length
      ? `<section class="results-section">
          <h2>Genres</h2>
          <div class="genre-grid">${res.genres.map(genreTile).join("")}</div>
        </section>`
      : "";

    return `<div class="search-page">
      <h1 class="search-heading">Search results for <span class="q">“${esc(q)}”</span></h1>
      <div class="results-layout">
        <div class="results-col">
          <h2>Top result</h2>
          ${topHTML || '<p class="muted">No top result.</p>'}
        </div>
        <div class="results-col">
          <h2>Songs</h2>
          <div class="song-list">${songs || '<p class="muted">No songs matched.</p>'}</div>
        </div>
      </div>
      ${artists}
      ${playlists}
      ${genres}
    </div>`;
  }

  function viewLegal() {
    const contact = LEGAL_CONTACT_EMAIL
      ? `<a href="mailto:${esc(LEGAL_CONTACT_EMAIL)}">${esc(LEGAL_CONTACT_EMAIL)}</a>`
      : "the site administrator";

    return `<div class="page legal-page">
      <h1 class="page-title">Copyright &amp; legal</h1>
      ${legalNav("/legal")}
      <p class="legal-intro">Aurum is a personal music player. It does not sell music or offer downloads, and ads stay off unless the operator switches them on. This page explains where the audio comes from, who owns it, and how a rights holder can have a catalogue entry removed.</p>
      <p class="legal-updated">Last updated: October 2026</p>

      <div class="np-card">
        <div class="np-card-head"><h3>How playback works</h3></div>
        <p class="legal-copy">Songs added from a YouTube link are played through YouTube's official embedded player (youtube-nocookie.com). The audio and video are streamed directly by YouTube. Aurum does not host, download, copy, store or re-upload that media — no audio file is created on this site.</p>
      </div>

      <div class="np-card">
        <div class="np-card-head"><h3>Ownership and rights</h3></div>
        <p class="legal-copy">All songs, recordings, compositions, artwork, thumbnails and trademarks remain the property of their respective artists, labels and rights holders. A catalogue entry only references a publicly available YouTube video. Nothing on this site transfers ownership or grants a licence to any third party.</p>
      </div>

      <div class="np-card">
        <div class="np-card-head"><h3>YouTube API and credits</h3></div>
        <p class="legal-copy">Song titles, artist names, album names, durations, thumbnails and descriptions shown for YouTube songs are retrieved from the public YouTube Data API and are used only to identify and credit the video. Playback happens inside YouTube's own player, so YouTube's Terms of Service and API Services Terms also apply.</p>
      </div>

      <div class="np-card">
        <div class="np-card-head"><h3>Uploaded audio</h3></div>
        <p class="legal-copy">Audio files uploaded directly by the site owner are stored in the site's own storage and are played from there. The site owner only uploads audio that they own or are licensed to distribute. If you believe an uploaded file infringes your rights, please use the removal request below.</p>
      </div>

      <div class="np-card">
        <div class="np-card-head"><h3>Removal requests</h3></div>
        <p class="legal-copy">If you are a rights holder (or an authorised representative) and want a catalogue entry removed, email ${contact} with:</p>
        <ul class="legal-list">
          <li>the YouTube link or the song title shown on Aurum,</li>
          <li>the work you own and your relationship to it, and</li>
          <li>a short statement that you hold the rights.</li>
        </ul>
        <p class="legal-copy" style="margin-top: 10px;">Verified requests are actioned promptly, usually within 48 hours. Removing an entry from Aurum does not remove the video from YouTube — the video remains under its uploader's control.</p>
      </div>

      <div class="np-card">
        <div class="np-card-head"><h3>Disclaimer</h3></div>
        <p class="legal-copy">Aurum is an independent personal project. It is not affiliated with, endorsed by or sponsored by YouTube, Google or any record label. All product names, logos and brands are the property of their respective owners.</p>
      </div>

      <div class="legal-contact">
        <span>Copyright or removal request?</span>
        ${contact}
      </div>
    </div>`;
  }

  /* ── Policy pages ───────────────────────────────────────────
     Five policy pages share one shell: the same cross-link strip, the same
     "last updated" stamp and the same contact block, so a reader can move
     between them without losing their place. The one fact every page has to
     carry is on the first line - playback is YouTube's, not ours. */
  const LEGAL_UPDATED = "October 2026";

  const LEGAL_PAGES = [
    { path: "/privacy", label: "Privacy Center" },
    { path: "/privacy-policy", label: "Privacy Policy" },
    { path: "/cookies", label: "Cookies" },
    { path: "/about-ads", label: "About Ads" },
    { path: "/legal", label: "Copyright & legal" },
  ];

  function legalNav(current) {
    const links = LEGAL_PAGES.map((page) =>
      page.path === current
        ? `<span class="legal-nav-here" aria-current="page">${esc(page.label)}</span>`
        : `<a href="#${page.path}" data-nav="${page.path}">${esc(page.label)}</a>`
    ).join("");
    return `<nav class="legal-nav" aria-label="Policy pages">${links}</nav>`;
  }

  function legalCard(heading, body) {
    return `<div class="np-card">
        <div class="np-card-head"><h3>${heading}</h3></div>
        ${body}
      </div>`;
  }

  function legalShell({ current, title, intro, body }) {
    const contact = LEGAL_CONTACT_EMAIL
      ? `<a href="mailto:${esc(LEGAL_CONTACT_EMAIL)}">${esc(LEGAL_CONTACT_EMAIL)}</a>`
      : "the site administrator";

    return `<div class="page legal-page">
      <h1 class="page-title">${title}</h1>
      ${legalNav(current)}
      <p class="legal-intro">${intro}</p>
      <p class="legal-updated">Last updated: ${LEGAL_UPDATED}</p>
      ${body}
      <div class="legal-contact">
        <span>Questions about this page?</span>
        ${contact}
      </div>
    </div>`;
  }

  function viewPrivacyCenter() {
    return legalShell({
      current: "/privacy",
      title: "Privacy Center",
      intro:
        "Aurum is a player, not a platform. Every song in the catalogue plays through YouTube's embedded player, so YouTube streams the audio and Aurum keeps no copy of it. This page is the short version of what the app stores, what leaves your browser, and what you can switch off.",
      body: [
        legalCard(
          "The short version",
          `<ul class="legal-list">
            <li>Every song plays from YouTube. Nothing is hosted, downloaded, copied or re-uploaded here.</li>
            <li>You can use the whole player without an account. Likes and volume stay in your own browser.</li>
            <li>An account exists only to sync likes and playlists between devices, and it holds your email address.</li>
            <li>No analytics, no tracking pixels, no device fingerprinting and no selling of data.</li>
            <li>Ads are off as shipped and never touch the player.</li>
          </ul>`
        ),
        legalCard(
          "What is stored, and where",
          `<ul class="legal-list">
            <li><strong>In your browser:</strong> liked songs, volume, the video on/off preference and - if you sign in - the session that keeps you signed in.</li>
            <li><strong>In Aurum's database:</strong> your email address, your likes and your playlists, and only once you sign in. They belong to the account and follow it across devices.</li>
            <li><strong>Nowhere:</strong> Aurum keeps no listening history. What you play is not uploaded, profiled or used to target anything.</li>
          </ul>`
        ),
        legalCard(
          "What leaves your browser",
          `<p class="legal-copy">Four external services can see a request from the player. None of them is sent your likes or playlists.</p>
          <ul class="legal-list">
            <li><strong>YouTube</strong> - streams each song inside its own embedded player (<code>youtube-nocookie.com</code>). Pressing play asks YouTube for that video, so YouTube sees your IP address and which track you played.</li>
            <li><strong>Google Fonts</strong> - serves the two typefaces the interface uses (<code>fonts.googleapis.com</code>).</li>
            <li><strong>jsDelivr</strong> - serves the Supabase client library that sign-in and the catalogue need.</li>
            <li><strong>Supabase</strong> - stores accounts, likes and playlists when you sign in.</li>
            <li><strong>Google AdSense</strong> - only if the operator has turned ads on. As shipped the ad code never loads at all; see <a href="#/about-ads" data-nav="/about-ads">About Ads</a>.</li>
          </ul>`
        ),
        legalCard(
          "Your controls",
          `<ul class="legal-list">
            <li><strong>Use it signed out.</strong> Playback, search and the whole interface work with no account at all.</li>
            <li><strong>Sign out.</strong> Ends the session on this device. Your likes and playlists stay in the account for next time.</li>
            <li><strong>Clear site data.</strong> Wipes liked songs, volume and the session from this browser. The account and its playlists stay in the database until you ask for deletion.</li>
            <li><strong>Export or delete.</strong> Email us and we will send back everything held about the account, or remove the account and everything attached to it.</li>
          </ul>`
        ),
        legalCard(
          "Read the detail",
          `<ul class="legal-list">
            <li><a href="#/privacy-policy" data-nav="/privacy-policy">Privacy Policy</a> - what is collected, who processes it, how long it is kept, and your rights over it.</li>
            <li><a href="#/cookies" data-nav="/cookies">Cookies</a> - the exact browser storage Aurum writes, key by key, and what third parties may set.</li>
            <li><a href="#/about-ads" data-nav="/about-ads">About Ads</a> - what the ad slot is, where it is allowed to appear, and how to turn ads off for yourself.</li>
            <li><a href="#/legal" data-nav="/legal">Copyright &amp; legal</a> - who owns the music and how a rights holder requests a removal.</li>
          </ul>`
        ),
      ].join(""),
    });
  }

  function viewPrivacyPolicy() {
    return legalShell({
      current: "/privacy-policy",
      title: "Privacy Policy",
      intro:
        "This policy covers the Aurum web player and its admin panel: what is collected when you listen, what is stored when you sign in, who else processes it on our behalf, and how to get it back or have it deleted.",
      body: [
        legalCard(
          "Scope",
          `<p class="legal-copy">Aurum is an independent, non-commercial music player. It runs no analytics and no advertising network of its own. Every song in the catalogue is played by YouTube's embedded player, so the audio never passes through this site - see <a href="#/legal" data-nav="/legal">Copyright &amp; legal</a> for how that works. This policy applies to the player, the admin panel and the small local server that serves them.</p>`
        ),
        legalCard(
          "What is collected",
          `<ul class="legal-list">
            <li><strong>Account email.</strong> Stored when you create an account, and used to identify you and to let you sign in.</li>
            <li><strong>Password.</strong> Handled by Supabase Auth and kept only as a one-way hash. Aurum never sees it and cannot recover it; a forgotten password is reset, never retrieved.</li>
            <li><strong>Provider profile, if you sign in with Google or Facebook.</strong> The provider returns an account identifier plus the email, display name and avatar picture it shares. The identifier and email are what identify the account.</li>
            <li><strong>Your library.</strong> Liked songs, and the playlists you create, with their tracks and their order. Stored against your account so they follow you to another device.</li>
            <li><strong>Guest preferences.</strong> If you never sign in, your likes and volume are written only to your own browser's local storage. They are merged into the account the first time you sign in on that browser.</li>
            <li><strong>Video lookups.</strong> When a YouTube link is resolved, the video id is passed from the local server to the public YouTube Data API. The API key stays on the server and is never shipped to the browser.</li>
          </ul>`
        ),
        legalCard(
          "What is not collected",
          `<ul class="legal-list">
            <li>No analytics, page-view counters, session recordings or heatmaps.</li>
            <li>No advertising or interest profile, and no selling, renting or sharing of data with data brokers.</li>
            <li>No payment details - there is nothing to buy here, and no checkout exists.</li>
            <li>No contacts, calendar, files, camera, microphone or precise location.</li>
            <li>No device fingerprinting, and no cross-site tracking of any kind by Aurum itself.</li>
          </ul>`
        ),
        legalCard(
          "Who processes it",
          `<p class="legal-copy">Four services handle data on Aurum's behalf. Each receives only what its job needs.</p>
          <ul class="legal-list">
            <li><strong>YouTube (Google)</strong> - receives the request to play a song, and therefore your IP address and the video you asked for. Playback follows YouTube's own Terms of Service and Google's privacy policy. A privacy-enhanced embed domain (<code>youtube-nocookie.com</code>) is used so that no viewing information is stored before you actually press play.</li>
            <li><strong>Supabase</strong> - hosts the database and the sign-in service. It processes account emails, hashed passwords, likes and playlists.</li>
            <li><strong>Google Fonts</strong> - serves the interface typefaces, which means Google sees your IP address when the page loads.</li>
            <li><strong>jsDelivr</strong> - serves the Supabase client library, so it also sees your IP address when the page loads.</li>
            <li><strong>Google AdSense</strong> - only if ads have been enabled by the operator. As shipped, the ad code never loads, makes no request and sets nothing.</li>
          </ul>`
        ),
        legalCard(
          "Cookies and local storage",
          `<p class="legal-copy">Aurum sets no tracking cookies. It uses your browser's local storage for preferences and for the sign-in session, and third parties may set their own storage when you play a YouTube song or when ads are on. Every key is listed on the <a href="#/cookies" data-nav="/cookies">Cookies</a> page.</p>`
        ),
        legalCard(
          "How long it is kept",
          `<ul class="legal-list">
            <li><strong>Account data</strong> - until you delete the account. Deleting it removes the email, the likes and the playlists attached to it.</li>
            <li><strong>Browser preferences</strong> - until you clear site data or the browser evicts them. Signing out clears the session immediately.</li>
            <li><strong>Access logs</strong> - a server hosting this site may keep short-lived request logs (IP address, URL, time) for security and debugging. They are rotated routinely and are not used to build profiles.</li>
          </ul>`
        ),
        legalCard(
          "Your rights",
          `<p class="legal-copy">You can ask for a copy of everything held about your account, have inaccurate details corrected, have the account and its data erased, or object to a particular use. You do not have to give a reason, and asking has no effect on your access to the player, which works without an account anyway.</p>
          <p class="legal-copy" style="margin-top: 10px;">Send the request from the email address on the account so we can match it. Verified requests are handled within 30 days, and usually much sooner.</p>`
        ),
        legalCard(
          "Security",
          `<p class="legal-copy">Traffic to Supabase runs over HTTPS using the publishable anon key, which is designed to be public and grants no privileged access on its own. The database enforces row-level security: reads of the public catalogue are open, while every write to artists, albums, tracks and storage is restricted to signed-in accounts with the right policies applied. No secret or service key is ever shipped to the browser, and the YouTube API key stays on the local server that proxies the lookup.</p>`
        ),
        legalCard(
          "Children",
          `<p class="legal-copy">Aurum is not directed at children, and accounts are not knowingly created for anyone under 13. If you believe a child has signed up, email us and the account will be removed.</p>`
        ),
        legalCard(
          "Where data is processed",
          `<p class="legal-copy">The services listed above are cloud providers and may process requests outside your own country, including in the United States and the European Union. Each of them publishes its own transfer safeguards and security commitments.</p>`
        ),
        legalCard(
          "Changes to this policy",
          `<p class="legal-copy">When the app changes what it stores, this page changes with it, and the \"last updated\" date at the top moves. There is no separate mailing list to subscribe to, so this page is always the current version.</p>`
        ),
      ].join(""),
    });
  }

  function viewCookies() {
    return legalShell({
      current: "/cookies",
      title: "Cookies",
      intro:
        "Aurum sets no cookies of its own - not for analytics, not for advertising, not for anything. It uses your browser's local storage for preferences and for staying signed in, and third parties may store their own data when you play a YouTube song or when ads are switched on.",
      body: [
        legalCard(
          "What Aurum writes to your browser",
          `<p class="legal-copy">These four entries live in this browser only. They are local storage rather than cookies, which means they are never attached to requests automatically and are readable only by this site on this device.</p>
          <ul class="legal-list">
            <li><code>wavely.liked.v1</code> - the songs you have liked. Written while you are signed out, and merged into your account the first time you sign in.</li>
            <li><code>wavely.volume.v1</code> - the player volume, so it returns where you left it.</li>
            <li><code>wavely.video.v1</code> - your video on/off preference for YouTube songs.</li>
            <li><code>sb-&lt;project&gt;-auth-token</code> - the sign-in session, written by the Supabase client library only after you sign in. It is what keeps you signed in between visits; signing out removes it.</li>
          </ul>`
        ),
        legalCard(
          "Third-party storage that can appear",
          `<ul class="legal-list">
            <li><strong>YouTube</strong> - songs are embedded through <code>youtube-nocookie.com</code>, YouTube's privacy-enhanced mode, which does not store information about you until you press play. Once playback starts, YouTube may use cookies and local storage exactly as it does on its own site, and a content blocker in your browser prevents that entirely.</li>
            <li><strong>Google AdSense</strong> - only when ads are enabled by the operator. AdSense uses cookies and local storage for frequency capping and, depending on your settings, for personalising ads. As shipped, the ad script never loads, so nothing is set.</li>
            <li><strong>Google Fonts and jsDelivr</strong> - these receive a request when the page loads, which reveals your IP address and browser. Neither is asked to store anything by Aurum.</li>
          </ul>`
        ),
        legalCard(
          "How to control it",
          `<ul class="legal-list">
            <li><strong>Browser settings</strong> - block third-party storage, or clear cookies and site data. Clearing site data for this site also signs you out and forgets your likes and volume on this device.</li>
            <li><strong>A private window</strong> - everything written here is discarded when the window closes.</li>
            <li><strong>A content blocker</strong> - blocks the YouTube player, the fonts and the ad script. Songs need the YouTube player to play, so blocking it stops playback; blocking ads has no effect because they are off by default.</li>
            <li><strong>Google ad settings</strong> - if ads are ever enabled, personalised advertising can be switched off at Google's Ad Settings page, independently of this site.</li>
          </ul>`
        ),
        legalCard(
          "Do Not Track and Global Privacy Control",
          `<p class="legal-copy">Aurum ignores these signals only because it has nothing to switch off: there is no analytics script and no advertising script running, so no cross-site tracking happens whether or not the signal is sent. If ads are ever enabled, the operator should honour the signal for advertising cookies; until then, the honest answer is that there is nothing to opt out of.</p>`
        ),
      ].join(""),
    });
  }

  function viewAboutAds() {
    return legalShell({
      current: "/about-ads",
      title: "About Ads",
      intro:
        "Ads are wired into Aurum but shipped off. Until the operator pastes a real AdSense client and slot id, no ad script loads, no request is made and no ad markup is written - so this page describes what happens if and when that changes.",
      body: [
        legalCard(
          "How it works as shipped",
          `<p class="legal-copy">The ad configuration holds all-zero placeholder ids. The player checks them before doing anything, finds them unusable, and stops: no script tag, no network request, no reserved space in the page. The strings that could enable it live in <code>js/ads-config.js</code> and are two values - a <code>ca-pub-...</code> client id and one responsive slot id.</p>`
        ),
        legalCard(
          "Where an ad may appear",
          `<ul class="legal-list">
            <li>Home, Search, and album, playlist and artist pages. That is the whole list.</li>
            <li>Never on the player bar, the now-playing panel or the queue drawer - the rule the ad code exists to keep is that a running song never sees the page move.</li>
            <li>Never over a control, never an interstitial before playback, never a pop-up, and never an ad that plays sound.</li>
            <li>Not on your library, your profile, the genre or policy pages, or anywhere in the admin panel.</li>
          </ul>`
        ),
        legalCard(
          "Why playback stays untouched",
          `<ul class="legal-list">
            <li>The ad library is fetched only after the page has finished loading and the browser is idle, so it can never delay the first paint or the first note.</li>
            <li>The slot reserves its height before any ad exists, so filling it cannot shove a track row out from under your cursor.</li>
            <li>Each slot is labelled \"Advertisement\" so an ad is never mistaken for part of the catalogue.</li>
          </ul>`
        ),
        legalCard(
          "What Google would receive",
          `<ul class="legal-list">
            <li>The request for the ad code carries your IP address, your browser details and the page you are on - the standard information any ad network sees.</li>
            <li>Google may use cookies or local storage to cap how often you see an ad and, where permitted, to personalise it. Those choices are governed by your Google ad settings, not by Aurum.</li>
            <li>Aurum does not send your likes, playlists or listening activity to the ad network. Your library is never used to target an ad.</li>
            <li>Without advertising, there is no hosted-account tier and no checkout: ads, when on, exist only to cover the cost of running the site.</li>
          </ul>`
        ),
        legalCard(
          "Turning ads off for yourself",
          `<ul class="legal-list">
            <li>Block them in your browser. Aurum's player is unaffected because no ad code is required for playback.</li>
            <li>Switch off personalised advertising in your Google ad settings; ads would then still appear, but not tailored to you.</li>
            <li>Use a private window, or clear site data, to drop any ad identifiers already stored.</li>
          </ul>`
        ),
      ].join(""),
    });
  }

  function viewNotFound() {
    return `<div class="page">
      <h1 class="page-title">Page not found</h1>
      <div class="empty-state">
        <h3>We couldn't find that page</h3>
        <p>It may have moved, or the link may be incomplete.</p>
        <button class="pill pill-light" type="button" data-nav="/">Back home</button>
      </div>
    </div>`;
  }

  /* ── Sidebar library ───────────────────────────────────────── */
  function renderLibrarySidebar() {
    const list = $("#libList");
    if (!list) return;
    const filter = state.libFilter;

    const html = libraryItems(filter)
      .map((item) => {
        if (filter === "artists") {
          return `<button class="lib-item artist" type="button" title="${esc(item.name)}" data-nav="/artist/${encodeURIComponent(item.name)}">
            <img src="${artistArt(item.name)}" alt="" loading="lazy" />
            <span class="lib-item-meta">
              <span class="lib-item-title">${esc(item.name)}</span>
              <span class="lib-item-sub">Artist</span>
            </span>
          </button>`;
        }
        const isAlbum = item.type === "Album";
        return `<button class="lib-item" type="button" title="${esc(item.title)}" data-nav="/playlist/${encodeURIComponent(item.id)}">
          <img src="${itemArt(item)}" alt="" loading="lazy" />
          <span class="lib-item-meta">
            <span class="lib-item-title">${esc(item.title)}</span>
            <span class="lib-item-sub">${isAlbum ? "Album" : "Playlist"} • ${esc(item.owner)}</span>
          </span>
        </button>`;
      })
      .join("");

    list.innerHTML = html;
  }

  function syncFilterChips() {
    $$("[data-filter]").forEach((chip) => {
      const active = chip.dataset.filter === state.libFilter;
      chip.classList.toggle("active", active);
      if (chip.getAttribute("role") === "tab") chip.setAttribute("aria-selected", String(active));
    });
  }

  /* ── Now playing panel ─────────────────────────────────────── */
  let npKey = null;
  let npDetailsOpen = false;
  let npDetailsTrackId = null;

  function renderNowPlaying(force = false) {
    const body = $("#npBody");
    if (!body) return;
    const t = currentTrack();

    if (!t) {
      npKey = "none";
      body.innerHTML = `<div class="np-empty">
        <strong>Nothing playing yet</strong>
        Pick a playlist, hit play, and the track details will show up here.
      </div>`;
      return;
    }

    // Details start collapsed for every new track, so the panel stays clean.
    if (npDetailsTrackId !== t.id) {
      npDetailsTrackId = t.id;
      npDetailsOpen = false;
    }

    const artistName = primaryArtistName(t);
    const key = `${t.id}:${p.index}:${state.liked.has(t.id)}:${state.following.has(artistName)}`;
    if (!force && key === npKey) return;
    npKey = key;

    const liked = state.liked.has(t.id);
    const info = artistInfo(artistName);
    const following = state.following.has(artistName);
    const artistPath = `/artist/${encodeURIComponent(artistName)}`;

    const upcoming = p.queue
      .slice(p.index + 1, p.index + 4)
      .map(
        (n, i) => `<button class="next-row" type="button" data-action="queue-jump" data-index="${p.index + 1 + i}">
          <img src="${trackArt(n)}" alt="" loading="lazy" />
          <span>
            <span class="next-row-title">${esc(n.title)}</span>
            <span class="next-row-artist">${esc(n.artist)}</span>
          </span>
        </button>`
      )
      .join("");

    body.innerHTML = `<img class="np-cover" src="${trackArt(t)}" alt="${esc(t.album)} cover" />
      <div class="np-head">
        <div class="np-meta">
          <div class="np-title">${esc(t.title)}</div>
          <div class="np-artist" data-nav="${artistPath}">${esc(t.artist)}</div>
        </div>
        <button class="icon-btn round small ${liked ? "liked" : ""}" type="button" data-action="like" data-id="${t.id}" aria-label="${liked ? "Remove from" : "Save to"} Liked Songs" title="${liked ? "Remove from" : "Save to"} Liked Songs">
          ${icon("heart", "sm")}
        </button>
      </div>

      <div class="np-card">
        <div class="np-card-head">
          <h3>About the artist</h3>
          <button type="button" data-nav="${artistPath}">View artist</button>
        </div>
        <div class="about-artist">
          <img src="${artistArt(artistName)}" alt="" loading="lazy" />
          <div>
            <div class="about-artist-name">${esc(artistName)}</div>
            <div class="about-artist-listeners">${info.formatted} monthly listeners</div>
          </div>
          <button class="follow-btn ${following ? "following" : ""}" type="button" data-action="follow" data-name="${esc(artistName)}" aria-pressed="${following}">${following ? "Following" : "Follow"}</button>
        </div>
      </div>

      ${
        isYT(t)
          ? `<div class="np-card np-details">
        <button class="np-details-toggle" type="button" data-action="toggle-details" aria-expanded="${npDetailsOpen}">
          <span>Song details</span>
          <span class="np-details-chev${npDetailsOpen ? " open" : ""}">${icon("arrow-right", "sm")}</span>
        </button>
        <div class="np-details-body"${npDetailsOpen ? "" : " hidden"}>
          <div class="credits">
            <div class="credit-row"><span class="role">Artist</span><span class="name">${esc(t.artist)}</span></div>
            <div class="credit-row"><span class="role">Album</span><span class="name">${esc(t.album || "Single")}</span></div>
            <div class="credit-row"><span class="role">Duration</span><span class="name">${fmtTime(t.duration)}</span></div>
            <div class="credit-row"><span class="role">Source</span><span class="name">YouTube</span></div>
          </div>
          ${t.description ? `<p class="np-description">${esc(t.description)}</p>` : ""}
          ${
            t.url
              ? `<a class="np-yt-link" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">Watch on YouTube ${icon("arrow-right", "sm")}</a>`
              : ""
          }
        </div>
        <p class="np-source">Audio/video from YouTube · rights belong to the original artist, label and rights holders. <a class="np-legal-link" href="#/legal" data-nav="/legal">Legal</a></p>
      </div>`
          : `<div class="np-card">
        <div class="np-card-head"><h3>Credits</h3></div>
        <div class="credits">
          <div class="credit-row"><span class="role">Artist</span><span class="name">${esc(t.artist)}</span></div>
          <div class="credit-row"><span class="role">Album</span><span class="name">${esc(t.album || "Single")}</span></div>
          <div class="credit-row"><span class="role">Duration</span><span class="name">${fmtTime(t.duration)}</span></div>
          <div class="credit-row"><span class="role">Produced by</span><span class="name">Aurum Studios</span></div>
        </div>
      </div>`
      }

      ${
        upcoming
          ? `<div class="np-next"><h3>Next in queue</h3>${upcoming}</div>`
          : `<div class="np-next"><h3>Next in queue</h3><p class="muted" style="font-size:13px">Nothing else queued.</p></div>`
      }`;
  }

  /* ── Queue drawer ──────────────────────────────────────────── */
  function renderQueue() {
    const list = $("#queueList");
    if (!list) return;
    const t = currentTrack();

    if (!t) {
      list.innerHTML = `<div class="np-empty">Your queue is empty. Play something to get started.</div>`;
      return;
    }

    const item = (track, i, active = false) => `<button class="queue-item ${active ? "active" : ""}" type="button" data-action="queue-jump" data-index="${i}">
      <img src="${trackArt(track)}" alt="" loading="lazy" />
      <span class="queue-item-meta">
        <span class="queue-item-title">${esc(track.title)}</span>
        <span class="queue-item-artist">${esc(track.artist)}</span>
      </span>
    </button>`;

    const upNext = p.queue
      .slice(p.index + 1)
      .map((track, i) => item(track, p.index + 1 + i))
      .join("");

    list.innerHTML = `
      <div class="queue-group-label">Now playing</div>
      ${item(t, p.index, true)}
      <div class="queue-group-label">Next up</div>
      ${upNext || '<p class="muted" style="padding:8px;font-size:13px">Nothing else queued.</p>'}`;
  }

  /* ── Player UI sync ────────────────────────────────────────── */
  const UI = {};

  function updatePlayerBar() {
    const t = currentTrack();
    if (!t) return;
    UI.barArt.src = trackArt(t);
    UI.barArt.alt = t.album || t.title;
    UI.barTitle.textContent = t.title;
    UI.barArtist.textContent = t.artist;
    const liked = state.liked.has(t.id);
    UI.barLike.classList.toggle("liked", liked);
    UI.barLike.setAttribute("aria-label", liked ? "Remove from Liked Songs" : "Save to Liked Songs");
    UI.barLike.title = liked ? "Remove from Liked Songs" : "Save to Liked Songs";
  }

  function updateTransport() {
    UI.playBtn.innerHTML = icon(p.playing ? "pause" : "play");
    UI.playBtn.setAttribute("aria-label", p.playing ? "Pause" : "Play");
    UI.playBtn.title = p.playing ? "Pause" : "Play";

    UI.shuffleBtn.classList.toggle("active", p.shuffle);
    UI.shuffleBtn.setAttribute("aria-label", p.shuffle ? "Disable shuffle" : "Enable shuffle");
    UI.shuffleBtn.title = p.shuffle ? "Disable shuffle" : "Enable shuffle";

    UI.repeatBtn.classList.toggle("active", p.repeat > 0);
    const repeatLabel = p.repeat === 0 ? "Enable repeat" : p.repeat === 1 ? "Enable repeat one" : "Disable repeat";
    UI.repeatBtn.setAttribute("aria-label", repeatLabel);
    UI.repeatBtn.title = repeatLabel;

    UI.npToggle.classList.toggle("active", UI.app.classList.contains("np-open"));
    UI.npToggle.setAttribute("aria-pressed", String(UI.app.classList.contains("np-open")));
  }

  function updateProgress() {
    const ratio = p.duration ? Math.min(1, p.pos / p.duration) : 0;
    UI.progressFill.style.width = `${ratio * 100}%`;
    UI.progressKnob.style.left = `${ratio * 100}%`;
    UI.curTime.textContent = fmtTime(p.pos);
    UI.durTime.textContent = fmtTime(p.duration);
    UI.progressBar.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
  }

  function updateVolume() {
    const shown = p.muted ? 0 : p.volume;
    UI.volumeFill.style.width = `${shown * 100}%`;
    UI.volumeKnob.style.left = `${shown * 100}%`;
    UI.volumeBar.setAttribute("aria-valuenow", String(Math.round(shown * 100)));
    UI.muteBtn.innerHTML = icon(p.muted || p.volume === 0 ? "mute" : "volume", "sm");
    UI.muteBtn.setAttribute("aria-label", p.muted || p.volume === 0 ? "Unmute" : "Mute");
    UI.muteBtn.title = p.muted || p.volume === 0 ? "Unmute" : "Mute";
  }

  function updateLikeUI() {
    const t = currentTrack();
    $$(".row-like[data-id]").forEach((btn) => {
      const liked = state.liked.has(btn.dataset.id);
      btn.classList.toggle("liked", liked);
      btn.setAttribute("aria-label", liked ? "Remove from Liked Songs" : "Save to Liked Songs");
    });
    if (t) {
      const liked = state.liked.has(t.id);
      UI.barLike.classList.toggle("liked", liked);
    }
    $$('#npBody [data-action="like"]').forEach((btn) => {
      const liked = state.liked.has(btn.dataset.id);
      btn.classList.toggle("liked", liked);
    });
  }

  function updateActiveRows() {
    const t = currentTrack();
    $$(".track-row[data-track-id]").forEach((row) => {
      const active = Boolean(t && row.dataset.trackId === t.id);
      row.classList.toggle("active", active);
      row.classList.toggle("playing", active && p.playing);
    });
    $$(".song-row[data-track-id]").forEach((row) => {
      const active = Boolean(t && row.dataset.trackId === t.id);
      row.classList.toggle("playing", active && p.playing);
    });
  }

  function updatePlayingButtons() {
    const ctx = currentContext();
    const setBtn = (btn, on) => {
      btn.innerHTML = icon(on ? "pause" : "play");
      const label = btn.dataset.label || "";
      const verb = on ? "Pause" : "Play";
      btn.setAttribute("aria-label", label ? `${verb} ${label}` : verb);
      btn.title = label ? `${verb} ${label}` : verb;
    };
    $$(".play-fab[data-id]").forEach((btn) => {
      const on = Boolean(p.playing && btn.dataset.id === ctx);
      btn.classList.toggle("is-playing", on);
      setBtn(btn, on);
    });
    $$(".channel[data-action='play-live']").forEach((btn) => {
      const on = Boolean(p.playing && ctx === `live:${btn.dataset.live}`);
      btn.classList.toggle("is-playing", on);
      btn.setAttribute("aria-label", `${on ? "Pause" : "Play"} ${btn.dataset.live} live`);
    });
    $$(".big-play[data-id]").forEach((btn) => {
      setBtn(btn, Boolean(p.playing && btn.dataset.id === ctx));
    });
    const artistBtn = $(".big-play[data-action='artist-play']");
    if (artistBtn) {
      setBtn(artistBtn, Boolean(p.playing && ctx === `artist:${artistBtn.dataset.name}`));
    }
    const genreBtn = $(".big-play[data-action='play-genre']");
    if (genreBtn) {
      setBtn(genreBtn, Boolean(p.playing && ctx === `genre:${genreBtn.dataset.name}`));
    }
  }

  function updateAll() {
    updatePlayerBar();
    updateTransport();
    updateProgress();
    updateVolume();
    updateActiveRows();
    updatePlayingButtons();
    applyVideoMode();
    renderNowPlaying();
    renderQueue();
  }

  /* ── Toasts ────────────────────────────────────────────────── */
  function toast(msg, kind = "info") {
    const host = $("#toasts");
    if (!host) return;
    const el = document.createElement("div");
    el.className = `toast ${kind === "check" ? "check" : ""}`;
    el.innerHTML = `${icon(kind === "check" ? "check" : "bell", "sm")}<span>${esc(msg)}</span>`;
    host.append(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 260);
    }, 2600);
  }

  /* ── Routing ───────────────────────────────────────────────── */
  function readRoute() {
    const raw = location.hash.replace(/^#/, "");
    return (raw.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  }

  function navigate(path) {
    const target = "#" + path;
    if (location.hash === target) {
      render();
      return;
    }
    location.hash = target;
  }

  function setActiveNav(path) {
    const inGenre = path.startsWith("/genre/");
    $$(".nav-link[data-nav], .mobile-nav-item[data-nav]").forEach((link) => {
      const target = link.dataset.nav;
      const active =
        target === "/"
          ? path === "/"
          : path === target || path.startsWith(target + "/") || (inGenre && target === "/search");
      link.classList.toggle("active", active);
    });
  }

  function render() {
    const path = readRoute();

    if (path === "/") {
      view.innerHTML = viewHome();
      document.title = "Aurum — Web Player";
    } else if (path === "/search") {
      view.innerHTML = viewSearchPage();
      document.title = state.query ? `${state.query} — Aurum` : "Search — Aurum";
    } else if (path === "/songs") {
      view.innerHTML = viewAllSongs();
      document.title = "All Songs — Aurum";
    } else if (path === "/library") {
      view.innerHTML = viewLibraryPage();
      document.title = "Your Library — Aurum";
    } else if (path === "/profile") {
      view.innerHTML = viewProfile();
      document.title = "Your profile — Aurum";
    } else if (path.startsWith("/playlist/")) {
      const id = decodeURIComponent(path.slice("/playlist/".length));
      const item = getItem(id);
      view.innerHTML = viewPlaylist(id);
      document.title = item ? `${item.title} — Aurum` : "Not found — Aurum";
    } else if (path.startsWith("/artist/")) {
      const name = decodeURIComponent(path.slice("/artist/".length));
      view.innerHTML = viewArtist(name);
      document.title = (window.ARTIST_BY_NAME||{})[name] ? `${name} — Aurum` : "Not found — Aurum";
    } else if (path.startsWith("/genre/")) {
      const name = decodeURIComponent(path.slice("/genre/".length));
      view.innerHTML = viewGenre(name);
      document.title = (window.GENRE_BY_NAME||{})[name] ? `${name} — Aurum` : "Not found — Aurum";
    } else if (path === "/privacy") {
      view.innerHTML = viewPrivacyCenter();
      document.title = "Privacy Center — Aurum";
    } else if (path === "/privacy-policy") {
      view.innerHTML = viewPrivacyPolicy();
      document.title = "Privacy Policy — Aurum";
    } else if (path === "/cookies") {
      view.innerHTML = viewCookies();
      document.title = "Cookies — Aurum";
    } else if (path === "/about-ads") {
      view.innerHTML = viewAboutAds();
      document.title = "About Ads — Aurum";
    } else if (path === "/legal") {
      view.innerHTML = viewLegal();
      document.title = "Copyright & legal — Aurum";
    } else {
      view.innerHTML = viewNotFound();
      document.title = "Not found — Aurum";
    }

    setActiveNav(path);
    syncFilterChips();
    mainScroll.scrollTop = 0;
    updateActiveRows();
    updatePlayingButtons();
    updateLikeUI();
    view.querySelectorAll('.mytuner-widget[data-requires_initialization="true"]').forEach((widget) => {
      initializeMyTunerWidget(widget.id);
    });
  }

  function renderViewOnly() {
    const path = readRoute();
    if (path === "/search") {
      view.innerHTML = viewSearchPage();
      document.title = state.query ? `${state.query} — Aurum` : "Search — Aurum";
      updateActiveRows();
      updatePlayingButtons();
    }
  }

  /* ── Actions ───────────────────────────────────────────────── */
  function playContext(id, index = 0) {
    const item = getItem(id);
    if (!item || !item.tracks.length) {
      toast("This playlist is empty");
      return;
    }
    setQueue(item.tracks, index, id);
    play();
  }

  function playContextTrack(contextId, index) {
    if (currentContext() === contextId && p.index === index && p.queue.length) {
      togglePlay();
      return;
    }
    if (contextId === "search") {
      if (!state.searchTracks.length) return;
      setQueue(state.searchTracks, index, "search");
      play();
      return;
    }
    if (contextId.startsWith("artist:")) {
      const name = contextId.slice("artist:".length);
      const tracks = tracksByArtist(name);
      setQueue(tracks, index, contextId);
      play();
      return;
    }
    if (contextId.startsWith("genre:")) {
      const name = contextId.slice("genre:".length);
      setQueue(tracksInCategory(name), index, contextId);
      play();
      return;
    }
    const item = getItem(contextId);
    if (!item) return;
    setQueue(item.tracks, index, contextId);
    play();
  }

  function playSearchTrack(id) {
    const tracks = state.searchTracks.length ? state.searchTracks : (window.TRACKS||[]).filter((t) => t.id === id);
    const i = tracks.findIndex((t) => t.id === id);
    if (i < 0) return;
    setQueue(tracks, i, "search");
    play();
  }

  function playArtist(name) {
    const tracks = tracksByArtist(name);
    if (!tracks.length) return;
    setQueue(tracks, 0, `artist:${name}`);
    play();
  }

  function playGenre(name) {
    const meta = categoryMeta(name);
    const tracks = tracksInCategory(meta ? meta.name : name);
    if (!tracks.length) return;
    setQueue(tracks, 0, `genre:${meta ? meta.name : name}`);
    play();
  }

  /* ── Accounts: likes + user playlists ──────────────────────── */
  const authUser = () => (window.WavelyAuth && window.WavelyAuth.user) || null;

  async function persistLike(trackId, liked) {
    const user = authUser();
    const client = window.supabaseClient;
    if (!user || !client) return;

    const req = liked
      ? client.from("likes").upsert([{ user_id: user.id, track_id: trackId }],
          { onConflict: "user_id,track_id" })
      : client.from("likes").delete().eq("user_id", user.id).eq("track_id", trackId);
    const { error } = await req;
    if (error) {
      console.error("Like save failed:", error.message);
      toast("Like save nahi hua: " + (error.message || "unknown error"));
    }
  }

  async function syncGuestLikes(user) {
    const guest = loadLiked();
    const client = window.supabaseClient;
    if (!guest.length || !client) return;

    try {
      await client.from("likes").upsert(
        guest.map((id) => ({ user_id: user.id, track_id: id })),
        { onConflict: "user_id,track_id", ignoreDuplicates: true }
      );
      try { localStorage.removeItem(LS_LIKED); } catch (_) {}
    } catch (err) {
      console.error("Guest likes sync failed:", err);
    }
  }

  function closePlaylistModal() {
    const modal = $("#playlistModal");
    if (!modal) return;
    if (window.ModalFocus) window.ModalFocus.close(modal);
    else modal.hidden = true;
  }

  function openPlaylistModal(opener = null) {
    if (!authUser()) {
      window.WavelyAuth?.openModal("login", opener);
      return;
    }

    const modal = $("#playlistModal");
    if (!modal) return;

    const input = $("#playlistName");
    const msg = $("#playlistMsg");
    if (input) input.value = "";
    if (msg) { msg.textContent = ""; msg.className = "auth-msg"; }

    if (window.ModalFocus) {
      window.ModalFocus.open(modal, {
        initialFocus: input,
        onClose: closePlaylistModal,
        returnFocus: opener
      });
    } else {
      modal.hidden = false;
      setTimeout(() => input?.focus(), 40);
    }
  }

  async function createPlaylist(title) {
    const user = authUser();
    const client = window.supabaseClient;
    if (!user || !client) throw new Error("Pehle log in karo");

    const { data, error } = await client.from("playlists").insert([{
      title,
      user_id: user.id,
      owner: window.WavelyAuth.displayName(user) || "You"
    }]).select("id");
    if (error) throw new Error(error.message || String(error));

    if (typeof window.reloadSupabaseData === "function") await window.reloadSupabaseData();
    renderLibrarySidebar();
    render();
    toast(`Playlist "${title}" ban gayi`, "check");
    return data;
  }

  let pendingTrackId = null;

  function closeAddModal() {
    const modal = $("#addModal");
    if (!modal) return;
    if (window.ModalFocus) window.ModalFocus.close(modal);
    else modal.hidden = true;
  }

  function openAddToPlaylist(trackId, opener = null) {
    const user = authUser();
    if (!user) {
      window.WavelyAuth?.openModal("login", opener);
      return;
    }

    const modal = $("#addModal");
    const list = $("#addList");
    if (!modal || !list) return;

    pendingTrackId = trackId;

    const msg = $("#addMsg");
    if (msg) { msg.textContent = ""; msg.className = "auth-msg"; }

    const mine = (window.PLAYLISTS || []).filter((pl) => pl.user_id === user.id);
    list.innerHTML = mine.length
      ? mine.map((pl) => `<button class="add-item" type="button" data-playlist-id="${esc(pl.id)}">${icon("plus", "sm")}<span>${esc(pl.title)}</span></button>`).join("")
      : `<p class="add-empty">Abhi koi playlist nahi — pehle "Create playlist" se ek banao.</p>`;

    if (window.ModalFocus) {
      window.ModalFocus.open(modal, {
        initialFocus: list.querySelector("[data-playlist-id]"),
        onClose: closeAddModal,
        returnFocus: opener
      });
    } else {
      modal.hidden = false;
    }
  }

  async function addTrackToPlaylist(playlistId, trackId) {
    const client = window.supabaseClient;
    if (!client || !playlistId || !trackId) return;

    const { data: last } = await client
      .from("playlist_tracks")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1);

    const position = (last && last.length ? last[0].position : -1) + 1;

    const { error } = await client
      .from("playlist_tracks")
      .insert([{ playlist_id: playlistId, track_id: trackId, position }]);
    if (error) throw error;

    if (typeof window.reloadSupabaseData === "function") await window.reloadSupabaseData();
    render();
    toast("Playlist me add ho gaya", "check");
  }

  function bindAccountUI() {
    $("#playlistClose")?.addEventListener("click", closePlaylistModal);
    $("#playlistModal")?.addEventListener("click", (e) => {
      if (e.target.id === "playlistModal") closePlaylistModal();
    });
    $("#playlistForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = $("#playlistName");
      const msg = $("#playlistMsg");
      const title = (input?.value || "").trim();
      if (!title) return;

      try {
        await createPlaylist(title);
        closePlaylistModal();
      } catch (err) {
        if (msg) {
          msg.textContent = err?.message || String(err);
          msg.className = "auth-msg error";
        }
      }
    });

    $("#addClose")?.addEventListener("click", closeAddModal);
    $("#addModal")?.addEventListener("click", (e) => {
      if (e.target.id === "addModal") closeAddModal();
    });
    $("#addList")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-playlist-id]");
      if (!btn) return;

      try {
        await addTrackToPlaylist(btn.dataset.playlistId, pendingTrackId);
        closeAddModal();
      } catch (err) {
        const msg = $("#addMsg");
        if (msg) {
          msg.textContent = err?.message || String(err);
          msg.className = "auth-msg error";
        }
      }
    });

    // Escape, Tab trapping and focus restore live in js/modal-focus.js.
  }

  function handleAction(el) {
    const action = el.dataset.action;
    switch (action) {
      case "toast":
        toast(el.dataset.msg || "");
        break;
      case "login":
        window.WavelyAuth?.openModal("login", el);
        break;
      case "logout":
        window.WavelyAuth?.signOut();
        break;
      case "open-profile":
        navigate("/profile");
        break;
      case "create-playlist":
        openPlaylistModal(el);
        break;
      case "add-to-playlist":
        openAddToPlaylist(el.dataset.id, el);
        break;
      case "play-track-card": {
        const id = el.dataset.trackId || el.dataset.id;
        if (!id) break;
        const tracks = (window.TRACKS||[]).filter(t=>t.id===id);
        if (!tracks.length) break;
        if (p.queue.length && currentTrack() && currentTrack().id === id) togglePlay();
        else { setQueue(tracks, 0, "recent"); play(); }
        break;
      }
      case "play-context": {
        const id = el.dataset.id;
        if (currentContext() === id) togglePlay();
        else playContext(id);
        break;
      }
      case "play-track":
        playContextTrack(el.dataset.context, Number(el.dataset.index) || 0);
        break;
      case "play-search": {
        const track = currentTrack();
        if (track && track.id === el.dataset.id && currentContext() === "search") togglePlay();
        else playSearchTrack(el.dataset.id);
        break;
      }
      case "artist-play": {
        const name = el.dataset.name;
        if (currentContext() === `artist:${name}`) togglePlay();
        else playArtist(name);
        break;
      }
      case "play-genre": {
        const name = el.dataset.name;
        if (currentContext() === `genre:${name}`) togglePlay();
        else playGenre(name);
        break;
      }
      case "play-live": {
        const station = el.dataset.live;
        if (currentContext() === `live:${station}`) togglePlay();
        else playLiveStation(station);
        break;
      }
      case "play-radio": {
        const station = el.dataset.radio;
        if (currentContext() === `radio:${station}`) togglePlay();
        else playRadio(station, el.dataset.label);
        break;
      }
      case "like":
        toggleLike(el.dataset.id);
        break;
      case "toggle-details":
        npDetailsOpen = !npDetailsOpen;
        renderNowPlaying(true);
        break;
      case "follow":
        toggleFollow(el.dataset.name);
        break;
      case "queue-jump": {
        const i = Number(el.dataset.index);
        if (Number.isInteger(i)) {
          loadIndex(i, true);
          p.playing = true;
          updateAll();
        }
        break;
      }
    }
  }

  /* ── Slider bars ───────────────────────────────────────────── */
  function bindBar(bar, onChange) {
    let dragging = false;
    const ratio = (e) => {
      const r = bar.getBoundingClientRect();
      return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    };

    bar.addEventListener("pointerdown", (e) => {
      dragging = true;
      bar.classList.add("dragging");
      bar.setPointerCapture?.(e.pointerId);
      onChange(ratio(e), true);
    });
    bar.addEventListener("pointermove", (e) => {
      if (dragging) onChange(ratio(e), true);
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      bar.classList.remove("dragging");
      onChange(ratio(e), false);
    };
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", end);

    bar.addEventListener("keydown", (e) => {
      const current = Number(bar.getAttribute("aria-valuenow")) / 100;
      let next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = current + 0.05;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = current - 0.05;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = 1;
      if (next === null) return;
      e.preventDefault();
      onChange(Math.min(1, Math.max(0, next)), false);
    });
  }

  /* ── Wiring ────────────────────────────────────────────────── */
  function cacheUI() {
    UI.app = $("#app");
    UI.mainScroll = $("#mainScroll");
    UI.view = $("#view");
    UI.barArt = $("#barArt");
    UI.barTitle = $("#barTitle");
    UI.barArtist = $("#barArtist");
    UI.barLike = $("#barLike");
    UI.videoBtn = $("#videoBtn");
    UI.playBtn = $("#playBtn");
    UI.prevBtn = $("#prevBtn");
    UI.nextBtn = $("#nextBtn");
    UI.shuffleBtn = $("#shuffleBtn");
    UI.repeatBtn = $("#repeatBtn");
    UI.progressBar = $("#progressBar");
    UI.progressFill = $("#progressFill");
    UI.progressKnob = $("#progressKnob");
    UI.curTime = $("#curTime");
    UI.durTime = $("#durTime");
    UI.volumeBar = $("#volumeBar");
    UI.volumeFill = $("#volumeFill");
    UI.volumeKnob = $("#volumeKnob");
    UI.muteBtn = $("#muteBtn");
    UI.npToggle = $("#npToggle");
    UI.searchInput = $("#searchInput");
    UI.searchForm = $("#searchForm");
    UI.npBody = $("#npBody");
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action], [data-nav]");
      if (!el) return;

      if (el.hasAttribute("data-action")) {
        handleAction(el);
        return;
      }
      e.preventDefault();
      navigate(el.dataset.nav);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.matches('[role="link"][data-nav]')) {
        e.preventDefault();
        navigate(e.target.dataset.nav);
      }
    });

    window.addEventListener("hashchange", render);

    $("#backBtn").addEventListener("click", () => history.back());
    $("#forwardBtn").addEventListener("click", () => history.forward());

    UI.searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      navigate("/search");
    });

    UI.searchInput.addEventListener("input", () => {
      state.query = UI.searchInput.value;
      if (readRoute() === "/search") renderViewOnly();
      else navigate("/search");
    });

    $("#browseBtn").addEventListener("click", () => {
      navigate("/search");
      UI.searchInput.focus();
    });

    $("#libChips").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-filter]");
      if (!chip) return;
      state.libFilter = chip.dataset.filter;
      syncFilterChips();
      renderLibrarySidebar();
      if (readRoute() === "/library") render();
    });

    document.addEventListener("click", (e) => {
      const chip = e.target.closest(".page-chips [data-filter]");
      if (!chip) return;
      state.libFilter = chip.dataset.filter;
      syncFilterChips();
      renderLibrarySidebar();
      render();
    });

    UI.playBtn.addEventListener("click", togglePlay);
    UI.prevBtn.addEventListener("click", prev);
    UI.nextBtn.addEventListener("click", () => next(false));
    UI.barLike.addEventListener("click", () => toggleLike(currentTrack()?.id));
    UI.videoBtn.addEventListener("click", () => {
      state.videoOn = !state.videoOn;
      try {
        localStorage.setItem(LS_VIDEO, state.videoOn ? "1" : "0");
      } catch (_) {}
      applyVideoMode();
      // Turning video on with a paused track resumes music too — the video
      // panel alone shouldn't look like it opened without playing.
      if (state.videoOn && isYT(currentTrack()) && !p.playing) play();
      toast(state.videoOn ? "Video on" : "Audio only", "check");
    });

    UI.shuffleBtn.addEventListener("click", () => {
      p.shuffle = !p.shuffle;
      updateTransport();
      toast(p.shuffle ? "Shuffle on" : "Shuffle off");
    });

    UI.repeatBtn.addEventListener("click", () => {
      p.repeat = (p.repeat + 1) % 3;
      updateTransport();
      toast(p.repeat === 0 ? "Repeat off" : p.repeat === 1 ? "Repeat all" : "Repeat one");
    });

    $("#queueBtn").addEventListener("click", () => {
      const open = UI.app.classList.toggle("queue-open");
      $("#queueDrawer").setAttribute("aria-hidden", String(!open));
      renderQueue();
    });
    $("#npQueueBtn").addEventListener("click", () => {
      UI.app.classList.add("queue-open");
      $("#queueDrawer").setAttribute("aria-hidden", "false");
      renderQueue();
    });
    $("#queueClose").addEventListener("click", () => {
      UI.app.classList.remove("queue-open");
      $("#queueDrawer").setAttribute("aria-hidden", "true");
    });

    UI.npToggle.addEventListener("click", () => {
      const open = UI.app.classList.toggle("np-open");
      UI.npToggle.classList.toggle("active", open);
      UI.npToggle.setAttribute("aria-pressed", String(open));
      renderNowPlaying(true);
    });
    $("#npClose").addEventListener("click", () => {
      UI.app.classList.remove("np-open");
      UI.npToggle.classList.remove("active");
      UI.npToggle.setAttribute("aria-pressed", "false");
    });

    $("#muteBtn").addEventListener("click", toggleMute);
    $("#lyricsBtn").addEventListener("click", () =>
      toast("Lyrics aren't available for this demo track")
    );
    $("#fullscreenBtn").addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => toast("Full screen isn't available"));
    });

    bindBar(UI.progressBar, (ratio, moving) => seekTo(ratio, moving));
    bindBar(UI.volumeBar, (ratio) => setVolume(ratio));

    const avatar = $("#avatarBtn");
    const menu = $("#accountMenu");
    avatar.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      avatar.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (e) => {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== avatar) {
        menu.hidden = true;
        avatar.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      // Never drive the player with a dialog open — focus may sit on one of its
      // buttons, and typing "m"/"l" there should not mute or like anything.
      if (document.body.classList.contains("modal-open")) return;

      const tag = e.target.tagName;
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable) return;

      if (e.code === "Space" && !/BUTTON|A/.test(tag)) {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      } else if (e.key.toLowerCase() === "l") {
        if (currentTrack()) toggleLike(currentTrack().id);
      } else if (e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        if (!p.duration) return;
        const delta = e.key === "ArrowRight" ? 5 : -5;
        seekTo(Math.min(1, Math.max(0, (p.pos + delta) / p.duration)), false);
      }
    });

    // Keep playback position moving: poll the YouTube embed first, then
    // real audio, then the simulated clock.
    setInterval(() => {
      if (isYT(currentTrack())) {
        if (!p.playing || p.seeking || !ytPlayer) return;
        p.pos = ytPlayer.getCurrentTime() || 0;
        const d = ytPlayer.getDuration();
        if (d) p.duration = d;
        if (p.duration) updateProgress();
        return;
      }
      if (!p.playing || p.seeking || hasAudio() || !p.duration) return;
      p.pos += 0.25;
      if (p.pos >= p.duration) {
        p.pos = p.duration;
        next(true);
        return;
      }
      updateProgress();
    }, 250);
  }

  /* ── Boot ──────────────────────────────────────────────────── */
  function init() {
    cacheUI();
    hydrateIcons();
    bindEvents();
    bindAccountUI();
    renderLibrarySidebar();
    syncFilterChips();

    if (!location.hash) history.replaceState(null, "", "#/");

    // Preload the first real playlist/album so the player bar shows a track
    // before the first click (the old demo catalogue had a fixed "discover").
    const firstItem = (window.PLAYLISTS || [])[0] || (window.ALBUMS || [])[0] || null;
    const initial = firstItem ? getItem(firstItem.id) : null;
    if (initial && initial.tracks.length) setQueue(initial.tracks, 0, initial.id);

    updateVolume();
    synth?.setVolume(p.muted ? 0 : p.volume);
    if (window.innerWidth >= 1240) UI.app.classList.add("np-open");
    render();
    renderNowPlaying(true);
    renderQueue();

    booted = true;
    if (pendingAuthRefresh || authUser()) refreshUserState();

    // Pre-warm the YouTube embed: by the time the first song is clicked the
    // player already exists, so one click plays instead of select-then-play.
    ensureYTPlayer();

    // Autostart synth if browser allows, or resume on first user gesture.
    document.addEventListener("click", () => {
      if (p.playing && currentTrack() && !currentTrack().src && !isYT(currentTrack()) && synth) {
        synth.play(synthSeed(currentTrack()));
        synth.setVolume(p.muted ? 0 : p.volume);
      }
    }, { once: true });
  }

  // Declared before start(): init() assigns these, and a boot that runs
  // synchronously would otherwise hit the temporal dead zone.
  let booted = false;
  let pendingAuthRefresh = false;

  function start() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  if ((window.TRACKS && window.TRACKS.length > 0) || (typeof window.supabaseClient === 'undefined')) {
    start();
  } else {
    window.addEventListener("supabaseDataLoaded", start, { once: true });
  }

  async function refreshUserState() {
    if (!booted) {
      pendingAuthRefresh = true;
      return;
    }

    const user = authUser();

    try {
      if (user) await syncGuestLikes(user);
    } catch (err) {
      console.error(err);
    }

    if (typeof window.reloadSupabaseData === 'function') await window.reloadSupabaseData();

    state.liked = user ? new Set(window.USER_LIKES || []) : loadLiked();
    npKey = null;
    renderLibrarySidebar();
    render();
    renderNowPlaying(true);
    renderQueue();
  }

  window.addEventListener('authChanged', refreshUserState);

  window.addEventListener("supabaseDataLoaded", () => {
    try {
      if (typeof renderLibrarySidebar === 'function') renderLibrarySidebar();
      if (typeof syncFilterChips === 'function') syncFilterChips();
      if (typeof render === 'function') render();
      if (typeof renderNowPlaying === 'function') renderNowPlaying(true);
      if (typeof renderQueue === 'function') renderQueue();
    } catch (e) {
      console.error(e);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && typeof window.reloadSupabaseData === 'function') {
      window.reloadSupabaseData();
    }
  });
  window.addEventListener('focus', () => {
    if (typeof window.reloadSupabaseData === 'function') {
      window.reloadSupabaseData();
    }
  });
})();
