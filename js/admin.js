const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let artistsCache = [];
const selectedArtists = new Set();

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

/* ── Artist picker ─────────────────────────────────────────────── */

async function loadArtists() {
  const picker = document.getElementById('artistPicker');
  if (!picker) return;

  if (typeof window.supabaseClient === 'undefined') {
    picker.innerHTML = '<p class="hint">Supabase not initialized</p>';
    return;
  }

  const { data, error } = await window.supabaseClient
    .from('artists')
    .select('id, name, image_url')
    .order('name');

  if (error) {
    picker.innerHTML = `<p class="hint">Could not load artists: ${escapeHtml(error.message)}</p>`;
    return;
  }

  artistsCache = data || [];
  renderArtistPicker();
}

function renderArtistPicker() {
  const picker = document.getElementById('artistPicker');
  if (!picker) return;

  if (!artistsCache.length) {
    picker.innerHTML = '<p class="hint">Abhi koi artist nahi hai — niche naya naam daalo.</p>';
    updateArtistToggleLabel();
    return;
  }

  const query = String(document.getElementById('artistSearch')?.value || '').trim().toLowerCase();
  const visible = artistsCache.filter((a) => !query || (a.name || '').toLowerCase().includes(query));

  if (!visible.length) {
    picker.innerHTML = '<p class="hint">Koi artist is search se match nahi hua.</p>';
    updateArtistToggleLabel();
    return;
  }

  picker.innerHTML = visible
    .map((artist) => {
      const initial = (artist.name || '?').trim().charAt(0).toUpperCase();
      const thumb = artist.image_url
        ? `<img class="artist-thumb" src="${escapeHtml(artist.image_url)}" alt="">`
        : `<span class="artist-thumb placeholder">${escapeHtml(initial)}</span>`;
      const checked = selectedArtists.has(artist.id) ? ' checked' : '';
      return `<label class="artist-option">
        <input type="checkbox" value="${escapeHtml(artist.id)}"${checked}>
        ${thumb}<span>${escapeHtml(artist.name)}</span>
      </label>`;
    })
    .join('');

  updateArtistToggleLabel();
}

function updateArtistToggleLabel() {
  const label = document.getElementById('artistToggleLabel');
  if (!label) return;

  if (!selectedArtists.size) {
    label.textContent = 'Select artists…';
    label.classList.add('muted');
    return;
  }

  const names = Array.from(selectedArtists)
    .map((id) => (artistsCache.find((a) => a.id === id) || {}).name)
    .filter(Boolean);

  label.textContent = names.length > 2 ? `${names.length} artists selected` : names.join(', ');
  label.classList.remove('muted');
}

function setArtistPanelOpen(open) {
  const panel = document.getElementById('artistPanel');
  const toggle = document.getElementById('artistToggle');
  if (!panel || !toggle) return;

  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open) document.getElementById('artistSearch')?.focus();
}

/* ── Supabase helpers ──────────────────────────────────────────── */

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

  const { data: existing, error: findErr } = await window.supabaseClient
    .from('albums')
    .select('id')
    .eq('artist_id', artistId)
    .ilike('title', trimmed)
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

  if (!artistsCache.length) {
    list.innerHTML = '<p class="hint">Koi artist nahi hai — upar se add karo.</p>';
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
  if (submitBtn) submitBtn.textContent = 'Add Artist';
  if (cancelBtn) cancelBtn.hidden = true;
}

function startArtistEdit(artistId) {
  const artist = artistsCache.find((a) => a.id === artistId);
  if (!artist) return;

  editingArtistId = artistId;
  document.getElementById('artistNameInput').value = artist.name || '';
  document.getElementById('artistPhotoInput').value = '';
  document.getElementById('artistSubmitBtn').textContent = 'Update Artist';
  document.getElementById('artistCancelBtn').hidden = false;
  document.getElementById('artistNameInput').focus();
}

function initArtistManager() {
  const form = document.getElementById('artistForm');
  const list = document.getElementById('artistsList');
  const cancelBtn = document.getElementById('artistCancelBtn');
  if (!form) return;

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
        const patch = { name };
        if (photo) patch.image_url = await uploadImage(photo, 'artists');

        const { data, error } = await window.supabaseClient
          .from('artists')
          .update(patch)
          .eq('id', editingArtistId)
          .select('id');

        if (error) throw error;
        if (!data || !data.length) {
          throw new Error('Update block hua — artists par UPDATE policy chahiye (neeche diya SQL run karo)');
        }
        showArtistStatus('Artist update ho gaya', 'success');
      } else {
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
      showArtistStatus('Error: ' + (err?.message || err), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editingArtistId ? 'Update Artist' : 'Add Artist';
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
        throw new Error('Delete block hua — artists par DELETE policy chahiye (neeche diya SQL run karo)');
      }

      if (editingArtistId === artistId) resetArtistForm();
      showArtistStatus('Artist delete ho gaya', 'success');
      await refreshArtists();
    } catch (err) {
      console.error('Artist delete error:', err);
      showArtistStatus('Error: ' + (err?.message || err), 'error');
    }
  });
}

/* ── Admin form ────────────────────────────────────────────────── */

function selectedArtistIds() {
  return Array.from(selectedArtists);
}

function initAdmin() {
  const uploadForm = document.getElementById('uploadForm');
  if (!uploadForm) {
    console.error('uploadForm not found');
    showStatus('Error: upload form not found', 'error');
    return;
  }

  refreshArtists();
  initArtistManager();

  const artistPicker = document.getElementById('artistPicker');
  const artistSearch = document.getElementById('artistSearch');

  document.getElementById('artistToggle')?.addEventListener('click', () => {
    setArtistPanelOpen(document.getElementById('artistPanel')?.hidden ?? true);
  });

  artistSearch?.addEventListener('input', renderArtistPicker);

  artistPicker?.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    if (checkbox.checked) selectedArtists.add(checkbox.value);
    else selectedArtists.delete(checkbox.value);
    updateArtistToggleLabel();
  });

  document.addEventListener('click', (event) => {
    const root = document.getElementById('artistSelect');
    if (root && !root.contains(event.target)) setArtistPanelOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setArtistPanelOpen(false);
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
      if (artistSearch) artistSearch.value = '';
      setArtistPanelOpen(false);
      refreshArtists();
    } catch (error) {
      console.error('Upload error:', error);
      const msg = error && error.message ? error.message : String(error);
      showStatus('Error: ' + msg, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Track';
      }
    }
  }, { passive: false });
}

/* ── Auth gate ─────────────────────────────────────────────────── */

let adminBooted = false;

function bootAdmin() {
  initAdmin();
  initArtistManager();
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthGate);
} else {
  initAuthGate();
}
