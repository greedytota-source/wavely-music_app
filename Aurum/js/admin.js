const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let artistsCache = [];
const selectedArtists = new Set();
const selectedYtArtists = new Set();

/* Both admin forms (upload + YouTube) share the artist data but keep their
   own selection. Each entry describes one picker's DOM ids. */
const ARTIST_PICKERS = [
  {
    root: 'artistSelect',
    panel: 'artistPanel',
    toggle: 'artistToggle',
    label: 'artistToggleLabel',
    search: 'artistSearch',
    picker: 'artistPicker',
    selected: selectedArtists
  },
  {
    root: 'ytArtistSelect',
    panel: 'ytArtistPanel',
    toggle: 'ytArtistToggle',
    label: 'ytArtistToggleLabel',
    search: 'ytArtistSearch',
    picker: 'ytArtistPicker',
    selected: selectedYtArtists,
    // Selecting an existing artist wins over the auto-filled channel name,
    // otherwise the same song would be credited twice.
    onSelect: () => {
      const input = document.getElementById('ytArtist');
      if (input && ytAutoArtist && input.value.trim() === ytAutoArtist) input.value = '';
    }
  }
];

function showStatus(message, type) {
  const status = document.getElementById('status');
  if (!status) {
    console.log('Status:', message);
    alert(message);
    return;
  }
  status.textContent = message || '';
  status.className = type || '';
}

/* Turn the raw PostgREST error into something actionable. The catalogue
   tables are protected by RLS, so a new artist/album/track insert fails
   until supabase/catalogue-policies.sql has been run for the project. */
function catalogueError(err) {
  const message = String((err && err.message) || err || 'Unknown error');
  if (/row-level security|violates row-level/i.test(message)) {
    return `${message} — Supabase → SQL Editor me supabase/catalogue-policies.sql run karo, phir dobara try karo.`;
  }
  if (/bucket not found/i.test(message)) {
    return `${message} — Supabase → Storage me "audio" aur "covers" buckets banao (public read), phir dobara try karo.`;
  }
  return message;
}

/* ── Artist picker ─────────────────────────────────────────────── */

async function loadArtists() {
  if (!ARTIST_PICKERS.some((p) => document.getElementById(p.picker))) return;

  const setPickerMessage = (html) =>
    ARTIST_PICKERS.forEach((p) => {
      const picker = document.getElementById(p.picker);
      if (picker) picker.innerHTML = html;
    });

  if (typeof window.supabaseClient === 'undefined') {
    setPickerMessage('<p class="hint">Supabase not initialized</p>');
    return;
  }

  const { data, error } = await window.supabaseClient
    .from('artists')
    .select('id, name, image_url')
    .order('name');

  if (error) {
    setPickerMessage(`<p class="hint">Could not load artists: ${escapeHtml(error.message)}</p>`);
    return;
  }

  artistsCache = data || [];
  renderArtistPicker();
}

function renderArtistPicker() {
  ARTIST_PICKERS.forEach((p) => {
    const picker = document.getElementById(p.picker);
    if (!picker) return;

    if (!artistsCache.length) {
      picker.innerHTML = '<p class="hint">Abhi koi artist nahi hai — naya naam daalo.</p>';
      updateArtistToggleLabel(p);
      return;
    }

    const query = String(document.getElementById(p.search)?.value || '').trim().toLowerCase();
    const visible = artistsCache.filter((a) => !query || (a.name || '').toLowerCase().includes(query));

    if (!visible.length) {
      picker.innerHTML = '<p class="hint">Koi artist is search se match nahi hua.</p>';
      updateArtistToggleLabel(p);
      return;
    }

    picker.innerHTML = visible
      .map((artist) => {
        const initial = (artist.name || '?').trim().charAt(0).toUpperCase();
        const thumb = artist.image_url
          ? `<img class="artist-thumb" src="${escapeHtml(artist.image_url)}" alt="">`
          : `<span class="artist-thumb placeholder">${escapeHtml(initial)}</span>`;
        const checked = p.selected.has(artist.id) ? ' checked' : '';
        return `<label class="artist-option">
          <input type="checkbox" value="${escapeHtml(artist.id)}"${checked}>
          ${thumb}<span>${escapeHtml(artist.name)}</span>
        </label>`;
      })
      .join('');

    updateArtistToggleLabel(p);
  });
}

function updateArtistToggleLabel(p) {
  const label = document.getElementById(p.label);
  if (!label) return;

  if (!p.selected.size) {
    label.textContent = 'Select artists…';
    label.classList.add('muted');
    return;
  }

  const names = Array.from(p.selected)
    .map((id) => (artistsCache.find((a) => a.id === id) || {}).name)
    .filter(Boolean);

  label.textContent = names.length > 2 ? `${names.length} artists selected` : names.join(', ');
  label.classList.remove('muted');
}

function setArtistPanelOpen(open, p) {
  const panel = document.getElementById(p.panel);
  const toggle = document.getElementById(p.toggle);
  if (!panel || !toggle) return;

  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open) document.getElementById(p.search)?.focus();
}

function closeArtistPanels() {
  ARTIST_PICKERS.forEach((p) => setArtistPanelOpen(false, p));
}

/* ── Track manager ─────────────────────────────────────────────── */

let trackCache = [];

/* A saved YouTube song stores its watch URL in file_url, which is the only
   reliable source marker in the catalogue. */
function trackSource(track) {
  return /youtube\.com|youtu\.be/i.test(String(track.file_url || '')) ? 'youtube' : 'upload';
}

function currentTrackFilter() {
  return document.getElementById('trackFilter')?.value || '';
}

async function loadTracks(filter = currentTrackFilter()) {
  const client = window.supabaseClient;
  if (!client) {
    renderTracks([]);
    return;
  }

  const { data, error } = await client
    .from('tracks')
    .select('*, artists(name, image_url), albums(title)')
    .order('id', { ascending: false });

  if (error) {
    renderTracks([]);
    return;
  }

  trackCache = data || [];
  renderTracks(trackCache, filter);
}

function renderTracks(tracks, filter = currentTrackFilter()) {
  const list = document.getElementById('tracksList');
  if (!list) return;

  const query = String(document.getElementById('trackSearch')?.value || '').trim().toLowerCase();

  const filtered = (tracks || []).filter((t) => {
    const source = trackSource(t);
    if (filter === 'youtube' && source !== 'youtube') return false;
    if (filter === 'upload' && source === 'youtube') return false;
    if (!query) return true;
    return [t.title, t.artists?.name, t.albums?.title]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const countEl = document.getElementById('trackCount');
  if (countEl) {
    countEl.textContent = `${filtered.length} of ${(tracks || []).length} shown`;
  }

  if (!filtered.length) {
    list.innerHTML = `<p class="empty">${
      query || filter
        ? 'Is search/filter se koi song nahi mila.'
        : 'Koi track nahi hai — pehle Upload track page se add karo.'
    }</p>`;
    return;
  }

  list.innerHTML = filtered
    .map((t) => {
      const title = t.title || 'Untitled';
      const artist = t.artists?.name || 'Unknown Artist';
      const album = t.albums?.title || 'Single';
      const id = escapeHtml(t.id);
      const source = trackSource(t);
      const chip = source === 'youtube'
        ? '<span class="chip chip-yt">YouTube</span>'
        : '<span class="chip">Upload</span>';
      return `<div class="track-row">
        <div class="track-main">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(artist)}</span>
        </div>
        <span class="track-album">${escapeHtml(album)}</span>
        ${chip}
        <div class="track-actions">
          <button class="btn-small btn-ghost" data-action="edit-desc" data-id="${id}" title="Edit description" aria-label="Edit description for ${escapeHtml(title)}">✎</button>
          <button class="btn-small btn-ghost danger" data-action="delete-track" data-id="${id}" title="Delete" aria-label="Delete ${escapeHtml(title)}">✕</button>
        </div>
      </div>`;
    })
    .join('');
}

function showTrackStatus(message, type) {
  const status = document.getElementById('trackStatus');
  if (!status) return;
  status.textContent = message || '';
  status.className = type || '';
}

function initTrackManager() {
  loadTracks();
}

/* ── End track manager ─────────────────────────────────────────── */

async function uploadToBucket(bucket, file, prefix) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const name = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  const path = prefix ? `${prefix}/${name}` : name;
  const { error } = await window.supabaseClient.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data } = window.supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

const uploadImage = (file, prefix = '') => uploadToBucket('covers', file, prefix);
const uploadAudio = (file) => uploadToBucket('audio', file, '');

async function setArtistImage(artistId, imageUrl) {
  const { error } = await window.supabaseClient
    .from('artists')
    .update({ image_url: imageUrl })
    .eq('id', artistId);
  if (error) throw error;
}

async function getOrCreateArtist(name, imageFile) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Artist is required');

  if (typeof window.supabaseClient === 'undefined') throw new Error('Supabase not initialized');

  let imageUrl = null;
  if (imageFile) imageUrl = await uploadImage(imageFile, 'artists');

  const { data: existing, error: findErr } = await window.supabaseClient
    .from('artists')
    .select('id')
    .ilike('name', trimmed)
    .limit(1);

  if (findErr) throw findErr;

  if (existing && existing.length > 0) {
    if (imageUrl) await setArtistImage(existing[0].id, imageUrl);
    return existing[0].id;
  }

  const { data, error: insertErr } = await window.supabaseClient
    .from('artists')
    .insert([{ name: trimmed, image_url: imageUrl }])
    .select()
    .single();

  if (insertErr) throw insertErr;
  if (!data) throw new Error('Failed to create artist');
  return data.id;
}

async function getOrCreateAlbum(name, artistId) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  if (!artistId) return null;

  if (typeof window.supabaseClient === 'undefined') throw new Error('Supabase not initialized');

  // Match on the album title alone (not artist_id): saving every song with the
  // same album name puts them in one album, even when the artists differ.
  const { data: existing, error: findErr } = await window.supabaseClient
    .from('albums')
    .select('id')
    .ilike('title', trimmed)
    .order('id', { ascending: true })
    .limit(1);

  if (findErr) throw findErr;

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  const { data, error: insertErr } = await window.supabaseClient
    .from('albums')
    .insert([{ title: trimmed, artist_id: artistId }])
    .select()
    .single();

  if (insertErr) throw insertErr;
  if (!data) throw new Error('Failed to create album');
  return data.id;
}

/* Existing album names feed both album inputs (datalist), so every song can
   be filed into the same album with one click. */
let albumsCache = [];

async function loadAlbumOptions() {
  const list = document.getElementById('albumOptions');
  if (!list || typeof window.supabaseClient === 'undefined') return;

  const { data, error } = await window.supabaseClient
    .from('albums')
    .select('title')
    .order('title');

  if (error) return;

  albumsCache = [...new Set((data || []).map((a) => String(a.title || '').trim()).filter(Boolean))];
  list.innerHTML = albumsCache
    .map((title) => `<option value="${escapeHtml(title)}"></option>`)
    .join('');
}

/* ── YouTube songs ─────────────────────────────────────────────── */

const YOUTUBE_URL_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

/* Shown by default on every YouTube song so the player always states the
   source and ownership, even when the video has no description. */
const YT_SOURCE_NOTE = 'This video/audio is from YouTube. All rights belong to the original artist, label and rights holders.';

function youTubeIdFrom(value) {
  const text = String(value || '').trim();
  const match = text.match(YOUTUBE_URL_RE);
  if (match) return match[1];
  return /^[A-Za-z0-9_-]{11}$/.test(text) ? text : '';
}

async function fetchVideoMeta(videoId) {
  const path = `/api/video?id=${encodeURIComponent(videoId)}`;
  const local = ['', 'localhost', '127.0.0.1', '::1'].includes(location.hostname);
  const bases = local ? ['', 'http://localhost:4173'] : [''];
  let lastError = null;

  for (const base of bases) {
    try {
      const res = await fetch(base + path);
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      lastError = new Error(data.error || `HTTP ${res.status}`);
      // A 404 means this port has no proxy; a quota/API error will not improve
      // by asking the same proxy on its default port.
      if (res.status !== 404) break;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Could not reach the local server');
}

let ytLookupTimer = null;
let ytLastLookup = '';
let ytAutoArtist = '';
let ytAutoDescription = '';

function initYouTubeForm() {
  const form = document.getElementById('ytForm');
  if (!form) return;

  const urlEl = document.getElementById('ytUrl');
  const titleEl = document.getElementById('ytTitle');
  const artistEl = document.getElementById('ytArtist');
  const albumEl = document.getElementById('ytAlbum');
  const durationEl = document.getElementById('ytDuration');
  const coverEl = document.getElementById('ytCover');
  const descriptionEl = document.getElementById('ytDescription');
  const submitBtn = document.getElementById('ytSubmitBtn');
  const hint = document.getElementById('ytHint');
  if (!urlEl || !titleEl || !artistEl || !durationEl || !submitBtn) return;

  const status = (message, type) => {
    const el = document.getElementById('ytStatus');
    if (!el) return;
    el.textContent = message || '';
    el.className = type || '';
  };

  const fillIfEmpty = (el, value) => {
    if (el && !String(el.value || '').trim() && value) el.value = value;
  };

  /* The description box starts with a safe YouTube source note and is then
     replaced by the video's own description (plus the note) once the lookup
     succeeds. Once the admin types their own text, auto-fill stops. */
  const setAutoDescription = (text) => {
    if (!descriptionEl) return;
    const current = String(descriptionEl.value || '').trim();
    if (current && current !== ytAutoDescription) return;
    descriptionEl.value = text;
    ytAutoDescription = text;
  };

  urlEl.addEventListener('input', () => {
    clearTimeout(ytLookupTimer);
    const videoId = youTubeIdFrom(urlEl.value);
    if (!videoId || videoId === ytLastLookup) return;

    setAutoDescription(YT_SOURCE_NOTE);

    ytLookupTimer = setTimeout(async () => {
      ytLastLookup = videoId;
      try {
        const meta = await fetchVideoMeta(videoId);
        if (youTubeIdFrom(urlEl.value) !== videoId) return;
        fillIfEmpty(titleEl, meta.title);
        if (!selectedYtArtists.size && !String(artistEl.value || '').trim() && meta.artist) {
          artistEl.value = meta.artist;
          ytAutoArtist = meta.artist;
        }
        fillIfEmpty(durationEl, meta.duration);
        fillIfEmpty(coverEl, meta.cover);
        const sourceDescription = String(meta.description || '').trim();
        setAutoDescription(
          sourceDescription ? `${sourceDescription}\n\n${YT_SOURCE_NOTE}` : YT_SOURCE_NOTE
        );
        if (hint) {
          const mins = Math.floor((meta.duration || 0) / 60);
          const secs = String((meta.duration || 0) % 60).padStart(2, '0');
          hint.textContent = `YouTube: ${meta.title} · ${mins}:${secs}`;
        }
      } catch (err) {
        ytLastLookup = '';
        if (hint) hint.textContent = 'Details automatically nahi mile — title, artist aur duration khud bhar do.';
      }
    }, 500);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const videoId = youTubeIdFrom(urlEl.value);
    if (!videoId) {
      status('Valid YouTube link ya 11-character video ID daalo.', 'error');
      return;
    }

    const title = String(titleEl.value || '').trim();
    const newArtistName = String(artistEl.value || '').trim();
    const albumName = String(albumEl ? albumEl.value || '' : '').trim() || 'YouTube';
    const selectedIds = Array.from(selectedYtArtists);
    const duration = parseInt(String(durationEl.value || ''), 10);
    const coverUrl = String(coverEl ? coverEl.value || '' : '').trim()
      || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const description = String(descriptionEl ? descriptionEl.value || '' : '').trim();

    if (!title) {
      status('Song title required hai.', 'error');
      return;
    }
    if (!selectedIds.length && !newArtistName) {
      status('Kam se kam ek artist chuno ya naya artist naam daalo.', 'error');
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      status('Duration seconds mein daalo (e.g. 210).', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
    status('Checking YouTube song...', 'success');

    try {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const { data: existing, error: findErr } = await window.supabaseClient
        .from('tracks')
        .select('id, title')
        .eq('file_url', watchUrl)
        .limit(1);

      if (findErr) throw findErr;
      if (existing && existing.length) {
        status(`Ye video pehle se catalogue mein hai: "${existing[0].title}".`, 'error');
        return;
      }

      let artistIds = selectedIds.slice();
      const newArtistNames = newArtistName
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

      if (newArtistNames.length) {
        status('Creating/finding artists...', 'success');
        const createdIds = [];
        for (const name of newArtistNames) {
          const newId = await getOrCreateArtist(name);
          if (newId && !createdIds.includes(newId)) createdIds.push(newId);
        }
        artistIds = [...createdIds, ...artistIds.filter((id) => !createdIds.includes(id))];
      }
      if (!artistIds.length) throw new Error('Kam se kam ek artist chahiye');

      const primaryArtistId = artistIds[0];
      status('Creating/finding album...', 'success');
      const albumId = await getOrCreateAlbum(albumName, primaryArtistId);

      const trackPayload = {
        title,
        artist_id: primaryArtistId,
        album_id: albumId,
        duration,
        file_url: watchUrl,
        cover_url: coverUrl,
        description: description || null,
        explicit: false
      };

      let descriptionSaved = true;
      let { data: track, error } = await window.supabaseClient
        .from('tracks')
        .insert([trackPayload])
        .select('id')
        .single();

      // Older projects may not have the optional description column yet.
      if (error && /description/i.test(error.message) && /column|schema/i.test(error.message)) {
        descriptionSaved = false;
        delete trackPayload.description;
        ({ data: track, error } = await window.supabaseClient
          .from('tracks')
          .insert([trackPayload])
          .select('id')
          .single());
      }
      if (error) throw error;

      let linkWarning = '';
      if (!descriptionSaved) {
        linkWarning += ' Description save nahi hua — Supabase me supabase/song-details.sql run karo.';
      }
      if (artistIds.length > 1) {
        const rows = artistIds.map((artistId, index) => ({
          track_id: track.id,
          artist_id: artistId,
          position: index
        }));
        const { error: linkError } = await window.supabaseClient.from('track_artists').insert(rows);
        if (linkError) {
          linkWarning = ' Track save ho gaya, par multi-artist link nahi bana (track_artists ka SQL run karo).';
        }
      }

      status(`"${title}" add ho gaya — player kholo aur All Songs / search mein dekho.` + linkWarning, linkWarning ? 'error' : 'success');
      form.reset();
      selectedYtArtists.clear();
      ytAutoArtist = '';
      ytAutoDescription = '';
      const ytSearch = document.getElementById('ytArtistSearch');
      if (ytSearch) ytSearch.value = '';
      closeArtistPanels();
      ytLastLookup = '';
      if (hint) hint.textContent = 'Link paste karne par title, artist, duration aur cover apne aap bhar jayenge.';
      await Promise.all([refreshArtists(), loadAlbumOptions()]);
    } catch (err) {
      console.error('YouTube add error:', err);
      status('Error: ' + catalogueError(err), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add YouTube Song';
    }
  });
}

/* ── Artists manager ───────────────────────────────────────────── */

let editingArtistId = null;
let artistUsage = { trackCount: () => 0, albumCount: () => 0 };

function showArtistStatus(message, type) {
  const status = document.getElementById('artistStatus');
  if (!status) return;
  status.textContent = message || '';
  status.className = type || '';
}

async function loadArtistUsage() {
  const client = window.supabaseClient;
  const [tracksRes, creditsRes, albumsRes] = await Promise.all([
    client.from('tracks').select('id, artist_id'),
    client.from('track_artists').select('track_id, artist_id'),
    client.from('albums').select('id, artist_id')
  ]);

  const tracksByArtist = new Map();
  const addTrack = (artistId, trackId) => {
    if (!artistId) return;
    if (!tracksByArtist.has(artistId)) tracksByArtist.set(artistId, new Set());
    tracksByArtist.get(artistId).add(trackId);
  };

  (tracksRes.data || []).forEach((t) => addTrack(t.artist_id, t.id));
  (creditsRes.data || []).forEach((c) => addTrack(c.artist_id, c.track_id));

  const albumsByArtist = new Map();
  (albumsRes.data || []).forEach((a) => {
    albumsByArtist.set(a.artist_id, (albumsByArtist.get(a.artist_id) || 0) + 1);
  });

  artistUsage = {
    trackCount: (id) => (tracksByArtist.get(id) || { size: 0 }).size,
    albumCount: (id) => albumsByArtist.get(id) || 0
  };
}

function renderArtistManager() {
  const list = document.getElementById('artistsList');
  if (!list) return;

  const countEl = document.getElementById('artistCount');
  if (countEl) countEl.textContent = `${artistsCache.length} artist${artistsCache.length === 1 ? '' : 's'}`;

  if (!artistsCache.length) {
    list.innerHTML = '<p class="empty">Koi artist nahi hai — upar se add karo.</p>';
    return;
  }

  list.innerHTML = artistsCache
    .map((artist) => {
      const tracks = artistUsage.trackCount(artist.id);
      const albums = artistUsage.albumCount(artist.id);
      const initial = (artist.name || '?').trim().charAt(0).toUpperCase();
      const thumb = artist.image_url
        ? `<img class="artist-thumb" src="${escapeHtml(artist.image_url)}" alt="">`
        : `<span class="artist-thumb placeholder">${escapeHtml(initial)}</span>`;

      return `<div class="artist-row" data-id="${escapeHtml(artist.id)}">
        ${thumb}
        <div class="artist-row-meta">
          <strong>${escapeHtml(artist.name)}</strong>
          <span>${tracks} track${tracks === 1 ? '' : 's'} • ${albums} album${albums === 1 ? '' : 's'}</span>
        </div>
        <div class="artist-row-actions">
          <a class="btn-small btn-ghost" href="index.html#/artist/${encodeURIComponent(artist.name)}" title="Artist page kholo">View</a>
          <button type="button" class="btn-small" data-artist-edit="${escapeHtml(artist.id)}">Edit</button>
          <button type="button" class="btn-small danger" data-artist-delete="${escapeHtml(artist.id)}">Delete</button>
        </div>
      </div>`;
    })
    .join('');
}

async function refreshArtists() {
  await loadArtists();
  await loadArtistUsage();
  renderArtistManager();
}

function resetArtistForm() {
  editingArtistId = null;
  const nameInput = document.getElementById('artistNameInput');
  const photoInput = document.getElementById('artistPhotoInput');
  const submitBtn = document.getElementById('artistSubmitBtn');
  const cancelBtn = document.getElementById('artistCancelBtn');

  if (nameInput) nameInput.value = '';
  if (photoInput) photoInput.value = '';
  if (submitBtn) submitBtn.textContent = 'Add artist';
  if (cancelBtn) cancelBtn.hidden = true;
  const heading = document.getElementById('artistFormHeading');
  if (heading) heading.textContent = 'Add artist';
}

function startArtistEdit(artistId) {
  const artist = artistsCache.find((a) => a.id === artistId);
  if (!artist) return;

  editingArtistId = artistId;
  document.getElementById('artistNameInput').value = artist.name || '';
  document.getElementById('artistPhotoInput').value = '';
  document.getElementById('artistSubmitBtn').textContent = 'Update artist';
  document.getElementById('artistCancelBtn').hidden = false;
  const heading = document.getElementById('artistFormHeading');
  if (heading) heading.textContent = 'Edit artist';
  document.getElementById('artistNameInput').focus();
}

let artistManagerBound = false;

function initArtistManager() {
  if (artistManagerBound) return;

  const form = document.getElementById('artistForm');
  const list = document.getElementById('artistsList');
  const cancelBtn = document.getElementById('artistCancelBtn');
  if (!form) return;

  artistManagerBound = true;

  cancelBtn?.addEventListener('click', () => {
    resetArtistForm();
    showArtistStatus('', '');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nameInput = document.getElementById('artistNameInput');
    const photoInput = document.getElementById('artistPhotoInput');
    const submitBtn = document.getElementById('artistSubmitBtn');
    const name = String(nameInput.value || '').trim();
    const photo = photoInput.files && photoInput.files.length ? photoInput.files[0] : null;

    if (!name) {
      showArtistStatus('Artist name required hai', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      if (editingArtistId) {
        const { data: clash } = await window.supabaseClient
          .from('artists')
          .select('id')
          .ilike('name', name)
          .neq('id', editingArtistId)
          .limit(1);

        if (clash && clash.length) {
          showArtistStatus(`"${name}" naam ka artist pehle se hai — doosra artist isi naam se nahi bana sakte.`, 'error');
          return;
        }

        const patch = { name };
        if (photo) patch.image_url = await uploadImage(photo, 'artists');

        const { data, error } = await window.supabaseClient
          .from('artists')
          .update(patch)
          .eq('id', editingArtistId)
          .select('id');

        if (error) throw error;
        if (!data || !data.length) {
          // 0 rows can also mean "already applied" when the handler fires twice.
          const { data: current } = await window.supabaseClient
            .from('artists')
            .select('name')
            .eq('id', editingArtistId)
            .limit(1);
          const applied = current && current.length && current[0].name === name;
          if (!applied) {
            throw new Error('Update block hua — artists par UPDATE policy chahiye (neeche diya SQL run karo)');
          }
        }
        showArtistStatus('Artist update ho gaya', 'success');
      } else {
        const { data: existing } = await window.supabaseClient
          .from('artists')
          .select('id')
          .ilike('name', name)
          .limit(1);

        if (existing && existing.length) {
          showArtistStatus(`"${name}" pehle se exist karta hai — duplicate nahi banaya. Badalna ho to list me Edit dabao.`, 'error');
          await refreshArtists();
          return;
        }

        const imageUrl = photo ? await uploadImage(photo, 'artists') : null;
        const { error } = await window.supabaseClient
          .from('artists')
          .insert([{ name, image_url: imageUrl }]);

        if (error) throw error;
        showArtistStatus('Naya artist add ho gaya', 'success');
      }

      resetArtistForm();
      await refreshArtists();
    } catch (err) {
      console.error('Artist save error:', err);
      showArtistStatus('Error: ' + catalogueError(err), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editingArtistId ? 'Update artist' : 'Add artist';
    }
  });

  list?.addEventListener('click', async (event) => {
    const editBtn = event.target.closest('[data-artist-edit]');
    if (editBtn) {
      startArtistEdit(editBtn.dataset.artistEdit);
      return;
    }

    const deleteBtn = event.target.closest('[data-artist-delete]');
    if (!deleteBtn) return;

    const artistId = deleteBtn.dataset.artistDelete;
    const artist = artistsCache.find((a) => a.id === artistId);
    if (!artist) return;

    const tracks = artistUsage.trackCount(artistId);
    const albums = artistUsage.albumCount(artistId);

    if (tracks || albums) {
      showArtistStatus(
        `"${artist.name}" ke paas ${tracks} track aur ${albums} album hain — pehle unhe delete karo ya doosre artist ko assign karo.`,
        'error'
      );
      return;
    }

    if (!confirm(`Delete artist "${artist.name}"?`)) return;

    try {
      await window.supabaseClient.from('track_artists').delete().eq('artist_id', artistId);

      const { data, error } = await window.supabaseClient
        .from('artists')
        .delete()
        .eq('id', artistId)
        .select('id');

      if (error) throw error;
      if (!data || !data.length) {
        // If the row is already gone, the delete worked (double submit) — not an RLS block.
        const { data: still } = await window.supabaseClient
          .from('artists')
          .select('id')
          .eq('id', artistId)
          .limit(1);
        if (still && still.length) {
          throw new Error('Delete block hua — artists par DELETE policy chahiye (neeche diya SQL run karo)');
        }
      }

      if (editingArtistId === artistId) resetArtistForm();
      showArtistStatus('Artist delete ho gaya', 'success');
      await refreshArtists();
    } catch (err) {
      console.error('Artist delete error:', err);
      showArtistStatus('Error: ' + catalogueError(err), 'error');
    }
  });
}

/* ── Admin form ────────────────────────────────────────────────── */

function selectedArtistIds() {
  return Array.from(selectedArtists);
}

let adminBound = false;

function initAdmin() {
  if (adminBound) return;

  const uploadForm = document.getElementById('uploadForm');
  if (!uploadForm) {
    console.error('uploadForm not found');
    showStatus('Error: upload form not found', 'error');
    return;
  }

  adminBound = true;

  refreshArtists();
  loadAlbumOptions();
  initArtistManager();
  initTrackManager();
  initYouTubeForm();

  ARTIST_PICKERS.forEach((p) => {
    document.getElementById(p.toggle)?.addEventListener('click', () => {
      const panel = document.getElementById(p.panel);
      setArtistPanelOpen(panel?.hidden ?? true, p);
    });

    document.getElementById(p.search)?.addEventListener('input', renderArtistPicker);

    document.getElementById(p.picker)?.addEventListener('change', (event) => {
      const checkbox = event.target.closest('input[type="checkbox"]');
      if (!checkbox) return;
      if (checkbox.checked) p.selected.add(checkbox.value);
      else p.selected.delete(checkbox.value);
      if (checkbox.checked && typeof p.onSelect === 'function') p.onSelect();
      updateArtistToggleLabel(p);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeArtistPanels();
  });

  // Track management UI
  const trackSearch = document.getElementById('trackSearch');
  const trackFilter = document.getElementById('trackFilter');
  if (trackSearch && trackFilter) {
    // Search/filter only re-render the cached list — no refetch per keystroke.
    trackSearch.addEventListener('input', () => renderTracks(trackCache, trackFilter.value));
    trackFilter.addEventListener('change', () => renderTracks(trackCache, trackFilter.value));
  }

  document.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('[data-action="delete-track"]');
    if (deleteBtn) {
      event.stopPropagation();
      const id = deleteBtn.dataset.id;
      if (!confirm(`Delete song ID ${id}? This cannot be undone.`)) return;
      (async () => {
        try {
          const { error } = await window.supabaseClient
            .from('tracks')
            .delete()
            .eq('id', id);
          if (error) throw error;
          showTrackStatus('Track delete ho gaya', 'success');
          loadTracks(trackFilter ? trackFilter.value : '');

        } catch (err) {
          console.error('Track delete error:', err);
          showTrackStatus('Error: ' + catalogueError(err), 'error');
        }
      })();
      return;
    }

    const editDescBtn = event.target.closest('[data-action="edit-desc"]');
    if (editDescBtn) {
      event.stopPropagation();
      const id = editDescBtn.dataset.id;
      const track = trackCache.find((t) => String(t.id) === String(id));
      if (!track) return;
      const newDesc = prompt('Song description / credit (YouTube songs ke liye):', track.description || '');
      if (newDesc === null) return;
      (async () => {
        try {
          const { error } = await window.supabaseClient
            .from('tracks')
            .update({ description: newDesc || null })
            .eq('id', id);
          if (error) throw error;
          showTrackStatus('Description update ho gaya', 'success');
          loadTracks(trackFilter ? trackFilter.value : '');
        } catch (err) {
          console.error('Track description error:', err);
          showTrackStatus('Error: ' + catalogueError(err), 'error');
        }
      })();
    }
  });

  uploadForm.onsubmit = null;
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading...';
    }
    showStatus('Starting upload...', 'success');

    try {
      const titleEl = document.getElementById('title');
      const newArtistEl = document.getElementById('newArtistName');
      const artistImageEl = document.getElementById('artistImage');
      const albumEl = document.getElementById('albumName');
      const durationEl = document.getElementById('duration');
      const explicitEl = document.getElementById('explicit');
      const audioEl = document.getElementById('audioFile');
      const coverEl = document.getElementById('coverFile');

      if (!titleEl) throw new Error('Title field missing (#title)');
      if (!durationEl) throw new Error('Duration field missing (#duration)');
      if (!audioEl) throw new Error('Audio file field missing (#audioFile)');

      const title = String(titleEl.value || '').trim();
      const albumName = String(albumEl ? albumEl.value || '' : '').trim();
      const newArtistName = String(newArtistEl ? newArtistEl.value || '' : '').trim();
      const artistImage = artistImageEl && artistImageEl.files && artistImageEl.files.length ? artistImageEl.files[0] : null;
      const duration = parseInt(String(durationEl.value || ''));
      const explicit = explicitEl && explicitEl.value === 'true';

      if (!title) throw new Error('Song title is required');
      if (!audioEl.files || audioEl.files.length === 0) throw new Error('Please select an audio file');
      if (isNaN(duration) || duration <= 0) throw new Error('Valid duration is required');

      let artistIds = selectedArtistIds();
      if (!artistIds.length && !newArtistName) {
        throw new Error('Kam se kam ek artist chuno ya naya artist naam daalo');
      }

      if (newArtistName) {
        showStatus('Creating/finding artist...', 'success');
        const newId = await getOrCreateArtist(newArtistName, artistImage);
        if (!artistIds.includes(newId)) artistIds = [newId, ...artistIds];
      } else if (artistImage && artistIds.length === 1) {
        showStatus('Updating artist photo...', 'success');
        const imageUrl = await uploadImage(artistImage, 'artists');
        await setArtistImage(artistIds[0], imageUrl);
      }

      if (!artistIds.length) throw new Error('Kam se kam ek artist chahiye');

      const primaryArtistId = artistIds[0];

      showStatus('Creating/finding album...', 'success');
      const albumId = await getOrCreateAlbum(albumName, primaryArtistId);

      const audioFile = audioEl.files[0];
      const coverFile = coverEl && coverEl.files && coverEl.files.length > 0 ? coverEl.files[0] : null;

      showStatus('Uploading audio file...', 'success');
      const audioUrl = await uploadAudio(audioFile);

      let coverUrl = null;
      if (coverFile) {
        showStatus('Uploading cover art...', 'success');
        coverUrl = await uploadImage(coverFile, '');
      }

      showStatus('Saving track to database...', 'success');
      const { data: track, error: trackError } = await window.supabaseClient
        .from('tracks')
        .insert([{
          title,
          artist_id: primaryArtistId,
          album_id: albumId,
          duration,
          file_url: audioUrl,
          cover_url: coverUrl,
          explicit
        }])
        .select('id')
        .single();

      if (trackError) throw trackError;

      let linkWarning = '';
      if (artistIds.length > 1) {
        const rows = artistIds.map((artistId, index) => ({
          track_id: track.id,
          artist_id: artistId,
          position: index
        }));
        const { error: linkError } = await window.supabaseClient.from('track_artists').insert(rows);
        if (linkError) {
          linkWarning = ' Track save ho gaya, par multi-artist link nahi bana (track_artists table ka SQL run karo).';
        }
      }

      showStatus('Track uploaded successfully!' + linkWarning, linkWarning ? 'error' : 'success');
      uploadForm.reset();
      selectedArtists.clear();
      const uploadArtistSearch = document.getElementById('artistSearch');
      if (uploadArtistSearch) uploadArtistSearch.value = '';
      setArtistPanelOpen(false, ARTIST_PICKERS[0]);
      await Promise.all([refreshArtists(), loadAlbumOptions()]);
    } catch (error) {
      console.error('Upload error:', error);
      showStatus('Error: ' + catalogueError(error), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Track';
      }
    }
  }, { passive: false });
}

/* ── Page navigation ───────────────────────────────────── */

const ADMIN_PAGES = ['upload', 'youtube', 'artists', 'songs'];
let currentPage = '';

function pageFromHash() {
  const name = String(location.hash || '').replace(/^#\/?/, '').trim();
  return ADMIN_PAGES.includes(name) ? name : 'upload';
}

function showPage(name) {
  if (!ADMIN_PAGES.includes(name)) name = 'upload';
  if (name === currentPage) return;
  currentPage = name;

  let section = null;
  document.querySelectorAll('.page').forEach((el) => {
    const active = el.dataset.page === name;
    el.hidden = !active;
    if (active) section = el;
  });

  document.querySelectorAll('.nav-item[data-page]').forEach((btn) => {
    const active = btn.dataset.page === name;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  const title = (section && section.dataset.title) || 'Admin';
  const subtitle = (section && section.dataset.subtitle) || '';
  const titleEl = document.getElementById('pageTitle');
  const subtitleEl = document.getElementById('pageSubtitle');
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  document.title = `${title} · Aurum Admin`;

  if (pageFromHash() !== name) history.replaceState(null, '', `#${name}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initPageNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });
  window.addEventListener('hashchange', () => showPage(pageFromHash()));
  showPage(pageFromHash());
}

/* ── Auth gate ─────────────────────────────────────────────────── */

let adminBooted = false;

function bootAdmin() {
  initAdmin();
}

async function initAuthGate() {
  const gate = document.getElementById('authGate');
  const content = document.getElementById('adminContent');
  const sessionBar = document.getElementById('sessionBar');
  const emailLabel = document.getElementById('sessionEmail');
  const loginStatus = document.getElementById('loginStatus');

  if (!gate || !content) {
    // No gate markup: fall back to the old behaviour.
    bootAdmin();
    return;
  }

  if (typeof window.supabaseClient === 'undefined') {
    gate.hidden = false;
    loginStatus.textContent = 'Supabase client load nahi hua';
    loginStatus.className = 'error';
    return;
  }

  const applySession = (session) => {
    const signedIn = Boolean(session);
    gate.hidden = signedIn;
    content.hidden = !signedIn;
    document.body.classList.toggle('signed-in', signedIn);
    if (sessionBar) sessionBar.hidden = !signedIn;
    if (emailLabel) emailLabel.textContent = signedIn ? session.email : '';

    if (!signedIn) return;

    if (!adminBooted) {
      adminBooted = true;
      bootAdmin();
    } else {
      refreshArtists();
    }
  };

  const { data } = await window.supabaseClient.auth.getSession();
  applySession(data ? data.session : null);

  window.supabaseClient.auth.onAuthStateChange((_event, session) => applySession(session));

  const loginForm = document.getElementById('loginForm');
  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = String(document.getElementById('loginEmail').value || '').trim();
    const password = String(document.getElementById('loginPassword').value || '');
    const loginBtn = document.getElementById('loginBtn');

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    loginStatus.textContent = '';
    loginStatus.className = '';

    const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';

    if (error) {
      loginStatus.textContent = error.message;
      loginStatus.className = 'error';
      return;
    }

    document.getElementById('loginPassword').value = '';
  });

  document.getElementById('signOutBtn')?.addEventListener('click', () => {
    window.supabaseClient.auth.signOut();
  });
}

initPageNav();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthGate);
} else {
  initAuthGate();
}
