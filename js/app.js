/* ═══════════════════════════════════════════════════════════════
   Wavely — app logic
   Client-side router, catalogue rendering, playback simulation
   (optionally real audio when a track defines `src`).
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

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

  const trackArt = (t) => coverArt(t.album || t.title, { label: t.album || t.title });
  const itemArt = (item) => coverArt(item.seed || item.title, { glyph: item.glyph || "", label: item.title });
  const artistArt = (name) => coverArt("artist:" + name, { label: name });
  const genreArt = (g) => coverArt(g.seed, { label: g.name });

  function tintFor(seed) {
    return `hsl(${hashString(seed) % 360} 42% 24%)`;
  }

  /* ── State ─────────────────────────────────────────────────── */
  const LS_LIKED = "wavely.liked.v1";
  const LS_VOLUME = "wavely.volume.v1";
  const DEFAULT_LIKED = ["t1", "t3", "t5", "t7", "t10", "t12", "t14", "t17", "t19", "t23", "t25", "t28", "t30", "t33", "t34", "t38", "t39", "t40"];

  function loadLiked() {
    try {
      const raw = localStorage.getItem(LS_LIKED);
      if (raw) return new Set(JSON.parse(raw));
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

  const state = {
    query: "",
    libFilter: "playlists",
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

  function getItem(id) {
    if (id === "liked") {
      const base = ITEM_BY_ID.liked;
      const tracks = TRACKS.filter((t) => state.liked.has(t.id));
      return { ...base, tracks, trackIds: tracks.map((t) => t.id) };
    }
    return ITEM_BY_ID[id] || null;
  }

  /* ── Audio engine ──────────────────────────────────────────── */
  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = p.volume;

  const synth = window.WavelySynth || null;
  const synthSeed = (track) => (track ? `${track.id}:${track.title}` : "");

  const hasAudio = () => Boolean(currentTrack()?.src);

  /* Start the procedural engine for demo tracks, or silence it when a
     real audio file (track.src) takes over. */
  function syncSynth(autoplay) {
    if (!synth) return;
    const t = currentTrack();
    if (autoplay && t && !t.src) synth.play(synthSeed(t));
    else synth.stop();
  }

  function syncAudio(autoplay) {
    const t = currentTrack();
    if (t?.src) {
      const abs = new URL(t.src, location.href).href;
      if (audio.src !== abs) audio.src = t.src;
      audio.currentTime = 0;
      audio.volume = p.muted ? 0 : p.volume;
      if (autoplay) audio.play().catch(() => {});
    } else {
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
    p.duration = audio.duration || currentTrack()?.duration || 0;
    updateProgress();
  });
  audio.addEventListener("ended", () => next(true));

  function setQueue(tracks, index = 0, contextId = null) {
    p.queue = tracks.map((t) => ({ ...t, contextId }));
    p.index = Math.max(0, Math.min(index, p.queue.length - 1));
    p.pos = 0;
    p.duration = p.queue[p.index]?.duration || 0;
    synth?.stop();
    syncAudio(false);
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
    if (p.playing && !p.queue[i].src && synth) {
      try {
        synth.play(synthSeed(p.queue[i]));
      } catch (_) {}
    }
    updateAll();
  }

  function play() {
    if (!p.queue.length) return;
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
    if (hasAudio()) audio.pause();
    synth?.stop();
    updateAll();
  }

  const togglePlay = () => (p.playing ? pause() : play());

  function next(auto = false) {
    if (!p.queue.length) return;

    if (auto && p.repeat === 2) {
      p.pos = 0;
      if (hasAudio()) audio.currentTime = 0;
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

    if (i >= p.queue.length) {
      if (p.repeat === 1 || !auto) {
        i = 0;
      } else {
        p.playing = false;
        p.pos = 0;
        if (hasAudio()) audio.pause();
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
    updateProgress();
  }

  function setVolume(ratio) {
    const v = Math.min(1, Math.max(0, ratio));
    p.volume = v;
    p.muted = v === 0;
    audio.volume = v;
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
    updateVolume();
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
    if (filter === "artists") return ARTISTS;
    if (filter === "albums") return ALBUMS;
    return [getItem("liked"), ...PLAYLISTS.filter((x) => x.id !== "liked")];
  }

  /* ── Search ────────────────────────────────────────────────── */
  function runSearch(q) {
    const needle = q.toLowerCase();
    const tracks = TRACKS.filter((t) =>
      `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(needle)
    );
    const playlists = ALL_ITEMS.filter((i) =>
      `${i.title} ${i.description || ""} ${i.owner || ""} ${i.artist || ""}`.toLowerCase().includes(needle)
    );
    const artists = ARTISTS.filter((a) => a.name.toLowerCase().includes(needle));
    const genres = GENRES.filter((g) => g.name.toLowerCase().includes(needle));

    genres.forEach((g) => {
      (GENRE_TRACKS[g.name] || []).forEach((id) => {
        const t = TRACK_BY_ID[id];
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
    const path = isArtist
      ? `/artist/${encodeURIComponent(item.name)}`
      : `/playlist/${encodeURIComponent(item.id)}`;
    const sub = isArtist
      ? "Artist"
      : item.type === "Album"
        ? `${item.artist} • ${item.year}`
        : item.description || `${item.tracks?.length || 0} songs`;

    return `<article class="card ${isArtist ? "artist" : ""} ${extraClass}" role="link" tabindex="0" data-nav="${path}" aria-label="${esc(item.title || item.name)}">
      <div class="card-img">
        <img src="${isArtist ? artistArt(item.name) : itemArt(item)}" alt="" loading="lazy" />
        ${
          isArtist
            ? ""
            : `<button class="play-fab" type="button" data-action="play-context" data-id="${item.id}" data-label="${esc(item.title)}" aria-label="Play ${esc(item.title)}">${icon("play")}</button>`
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
        <div class="track-artist"><span data-nav="/artist/${encodeURIComponent(t.artist)}">${esc(t.artist)}</span></div>
      </div>
      <div class="track-album"${albumId ? ` data-nav="/playlist/${albumId}"` : ""}>${esc(t.album)}</div>
      <div class="track-date">${esc(date)}</div>
      <span class="track-dur">${fmtTime(t.duration)}</span>
      <button class="row-like ${liked ? "liked" : ""}" type="button" data-action="like" data-id="${t.id}" aria-label="${liked ? "Remove from" : "Save to"} Liked Songs">
        ${icon("heart", "sm")}
      </button>
    </div>`;
  }

  function itemIdForAlbum(albumName) {
    const album = ALBUMS.find((a) => a.title === albumName);
    return album ? album.id : null;
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
  function viewHome() {
    const hour = new Date().getHours();
    const greeting =
      hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    const quick = QUICK_PICKS.map(getItem).filter(Boolean).map(quickTile).join("");

    const shelves = SHELVES.map((shelf) => {
      const items = shelf.ids.map(getItem).filter(Boolean);
      if (!items.length) return "";
      return `<section class="shelf">
        <div class="shelf-head">
          <h2 class="shelf-title" data-nav="/library">${esc(shelf.title)}</h2>
          <button class="show-all" type="button" data-nav="/library">Show all</button>
        </div>
        <div class="card-grid">${items.map((i) => card(i)).join("")}</div>
      </section>`;
    }).join("");

    return `<div class="home">
      <h1 class="greeting">${greeting}</h1>
      <div class="quick-grid">${quick}</div>
      ${shelves}
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
    const artist = ARTIST_BY_NAME[name];
    if (!artist) return viewNotFound();

    const info = artistInfo(name);
    const tracks = TRACKS.filter((t) => t.artist === name);
    const albums = ALBUMS.filter((a) => a.artist === name);
    const following = state.following.has(name);

    const popular = tracks
      .slice()
      .sort((a, b) => Number(b.plays.replace(/,/g, "")) - Number(a.plays.replace(/,/g, "")))
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

  function viewGenre(name) {
    const genre = GENRE_BY_NAME[name];
    if (!genre) return viewNotFound();

    const tracks = byIds(GENRE_TRACKS[name] || []);
    const totalSec = tracks.reduce((sum, t) => sum + t.duration, 0);
    const item = {
      id: `genre:${name}`,
      type: "Genre",
      title: name,
      owner: "Wavely",
      seed: genre.seed,
      description: `The best of ${name}, all in one place.`,
      tracks
    };

    const body = tracks.length
      ? trackTable(item)
      : `<div class="tracks"><div class="empty-state">
          <h3>Nothing here yet</h3>
          <p>This genre doesn't have any tracks in the demo catalogue.</p>
        </div></div>`;

    return `<div class="pl-hero" style="--tint:${tintFor(genre.seed)}">
      <div class="pl-header">
        <img class="pl-cover" src="${itemArt(item)}" alt="${esc(name)} cover" />
        <div class="pl-info">
          <span class="pl-eyebrow">Genre</span>
          <h1 class="pl-title">${esc(name)}</h1>
          <p class="pl-desc">${esc(item.description)}</p>
          <div class="pl-meta">
            <span class="avatar-xs">W</span><strong>Wavely</strong>
            <span class="dot">•</span><span>${plural(tracks.length, "song")},</span>
            <span class="total">${fmtLong(totalSec)}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="pl-actions">
      <button class="big-play" type="button" data-action="play-genre" data-name="${esc(name)}" data-label="${esc(name)}" aria-label="Play ${esc(name)}">${icon("play")}</button>
      <button class="icon-btn plain" type="button" data-action="toast" data-msg="Added to Your Library" aria-label="Save to Your Library" title="Save to Your Library">${icon("heart")}</button>
      <button class="icon-btn plain" type="button" data-action="toast" data-msg="More options aren't part of this demo" aria-label="More options" title="More options">${icon("more")}</button>
    </div>
    ${body}`;
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

  function viewSearchPage() {
    const q = state.query.trim();
    if (!q) {
      const tiles = GENRES.map(genreTile).join("");

      return `<div class="search-page">
        <h1 class="page-title">Browse all</h1>
        <div class="genre-grid">${tiles}</div>
      </div>`;
    }

    const res = runSearch(q);
    state.searchTracks = res.tracks;

    if (!res.tracks.length && !res.playlists.length && !res.artists.length && !res.genres.length) {
      return `<div class="search-page">
        <h1 class="search-heading">Search results for <span class="q">“${esc(q)}”</span></h1>
        <div class="empty-state">
          <h3>No results found</h3>
          <p>Please make sure your words are spelled correctly, or use fewer or different keywords.</p>
        </div>
      </div>`;
    }

    const top = res.playlists[0] || res.artists[0] || res.tracks[0];
    const topIsTrack = Boolean(TRACK_BY_ID[top.id]);
    const topIsArtist = top.type === "Artist";

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
      .slice(0, 5)
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
          ${topHTML}
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

    const key = `${t.id}:${p.index}:${state.liked.has(t.id)}:${state.following.has(t.artist)}`;
    if (!force && key === npKey) return;
    npKey = key;

    const liked = state.liked.has(t.id);
    const info = artistInfo(t.artist);
    const following = state.following.has(t.artist);
    const artistPath = `/artist/${encodeURIComponent(t.artist)}`;

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

    body.innerHTML = `<img class="np-cover" src="${itemArt({ seed: t.album, title: t.album })}" alt="${esc(t.album)} cover" />
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
          <img src="${artistArt(t.artist)}" alt="" loading="lazy" />
          <div>
            <div class="about-artist-name">${esc(t.artist)}</div>
            <div class="about-artist-listeners">${info.formatted} monthly listeners</div>
          </div>
          <button class="follow-btn ${following ? "following" : ""}" type="button" data-action="follow" data-name="${esc(t.artist)}" aria-pressed="${following}">${following ? "Following" : "Follow"}</button>
        </div>
      </div>

      <div class="np-card">
        <div class="np-card-head"><h3>Credits</h3></div>
        <div class="credits">
          <div class="credit-row"><span class="role">Written by</span><span class="name">${esc(t.artist)}</span></div>
          <div class="credit-row"><span class="role">Produced by</span><span class="name">Wavely Studios</span></div>
          <div class="credit-row"><span class="role">Album</span><span class="name">${esc(t.album)}</span></div>
          <div class="credit-row"><span class="role">Duration</span><span class="name">${fmtTime(t.duration)}</span></div>
        </div>
      </div>

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
    UI.barArt.src = itemArt({ seed: t.album, title: t.album });
    UI.barArt.alt = t.album;
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
      document.title = "Wavely — Web Player";
    } else if (path === "/search") {
      view.innerHTML = viewSearchPage();
      document.title = state.query ? `${state.query} — Wavely` : "Search — Wavely";
    } else if (path === "/library") {
      view.innerHTML = viewLibraryPage();
      document.title = "Your Library — Wavely";
    } else if (path.startsWith("/playlist/")) {
      const id = decodeURIComponent(path.slice("/playlist/".length));
      const item = getItem(id);
      view.innerHTML = viewPlaylist(id);
      document.title = item ? `${item.title} — Wavely` : "Not found — Wavely";
    } else if (path.startsWith("/artist/")) {
      const name = decodeURIComponent(path.slice("/artist/".length));
      view.innerHTML = viewArtist(name);
      document.title = ARTIST_BY_NAME[name] ? `${name} — Wavely` : "Not found — Wavely";
    } else if (path.startsWith("/genre/")) {
      const name = decodeURIComponent(path.slice("/genre/".length));
      view.innerHTML = viewGenre(name);
      document.title = GENRE_BY_NAME[name] ? `${name} — Wavely` : "Not found — Wavely";
    } else {
      view.innerHTML = viewNotFound();
      document.title = "Not found — Wavely";
    }

    setActiveNav(path);
    syncFilterChips();
    mainScroll.scrollTop = 0;
    updateActiveRows();
    updatePlayingButtons();
    updateLikeUI();
  }

  function renderViewOnly() {
    const path = readRoute();
    if (path === "/search") {
      view.innerHTML = viewSearchPage();
      document.title = state.query ? `${state.query} — Wavely` : "Search — Wavely";
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
      const tracks = TRACKS.filter((t) => t.artist === name);
      setQueue(tracks, index, contextId);
      play();
      return;
    }
    if (contextId.startsWith("genre:")) {
      const name = contextId.slice("genre:".length);
      const tracks = byIds(GENRE_TRACKS[name] || []);
      setQueue(tracks, index, contextId);
      play();
      return;
    }
    const item = getItem(contextId);
    if (!item) return;
    setQueue(item.tracks, index, contextId);
    play();
  }

  function playSearchTrack(id) {
    const tracks = state.searchTracks.length ? state.searchTracks : TRACKS.filter((t) => t.id === id);
    const i = tracks.findIndex((t) => t.id === id);
    if (i < 0) return;
    setQueue(tracks, i, "search");
    play();
  }

  function playArtist(name) {
    const tracks = TRACKS.filter((t) => t.artist === name);
    if (!tracks.length) return;
    setQueue(tracks, 0, `artist:${name}`);
    play();
  }

  function playGenre(name) {
    const tracks = byIds(GENRE_TRACKS[name] || []);
    if (!tracks.length) return;
    setQueue(tracks, 0, `genre:${name}`);
    play();
  }

  function handleAction(el) {
    const action = el.dataset.action;
    switch (action) {
      case "toast":
        toast(el.dataset.msg || "");
        break;
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
      case "like":
        toggleLike(el.dataset.id);
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

    // Keep playback position moving for simulated tracks.
    setInterval(() => {
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
    renderLibrarySidebar();
    syncFilterChips();

    if (!location.hash) history.replaceState(null, "", "#/");

    const initial = getItem("discover");
    if (initial && initial.tracks.length) setQueue(initial.tracks, 0, initial.id);

    updateVolume();
    synth?.setVolume(p.muted ? 0 : p.volume);
    if (window.innerWidth >= 1240) UI.app.classList.add("np-open");
    render();
    renderNowPlaying(true);
    renderQueue();
    // Autostart synth if browser allows, or resume on first user gesture.
    document.addEventListener("click", () => {
      if (p.playing && currentTrack() && !currentTrack().src && synth) {
        synth.play(synthSeed(currentTrack()));
        synth.setVolume(p.muted ? 0 : p.volume);
      }
    }, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
