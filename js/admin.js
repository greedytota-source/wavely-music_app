async function getOrCreateArtist(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Artist is required');
  
  if (typeof window.supabaseClient === 'undefined') throw new Error('Supabase not initialized');
  
  const { data: existing, error: findErr } = await window.supabaseClient
    .from('artists')
    .select('id')
    .ilike('name', trimmed)
    .limit(1);
  
  if (findErr) throw findErr;
  
  if (existing && existing.length > 0) {
    return existing[0].id;
  }
  
  const { data, error: insertErr } = await window.supabaseClient
    .from('artists')
    .insert([{ name: trimmed }])
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

function initAdmin() {
  console.log('initAdmin starting');
  const uploadForm = document.getElementById('uploadForm');
  if (!uploadForm) {
    console.error('uploadForm not found');
    showStatus('Error: upload form not found', 'error');
    return;
  }
  
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
      const artistEl = document.getElementById('artistName');
      const albumEl = document.getElementById('albumName');
      const durationEl = document.getElementById('duration');
      const explicitEl = document.getElementById('explicit');
      const audioEl = document.getElementById('audioFile');
      const coverEl = document.getElementById('coverFile');
      
      if (!titleEl) throw new Error('Title field missing (#title)');
      if (!artistEl) throw new Error('Artist field missing (#artistName)');
      if (!durationEl) throw new Error('Duration field missing (#duration)');
      if (!audioEl) throw new Error('Audio file field missing (#audioFile)');
      
      const title = String(titleEl.value || '').trim();
      const artistName = artistEl.value;
      const albumName = albumEl ? artistEl.value && albumEl.value ? albumEl.value : (albumEl.value || '') : '';
      // better: just use albumEl.value directly
      const albumName2 = albumEl ? String(albumEl.value || '') : '';
      const durationStr = String(durationEl.value || '');
      const duration = parseInt(durationStr);
      const explicit = explicitEl && explicitEl.value === 'true';
      
      if (!title) throw new Error('Song title is required');
      if (!(artistEl.value || '').trim()) throw new Error('Artist name is required');
      if (!audioEl.files || audioEl.files.length === 0) throw new Error('Please select an audio file');
      if (isNaN(duration) || duration <= 0) throw new Error('Valid duration is required');
      
      const audioFile = audioEl.files[0];
      const coverFile = coverEl && coverEl.files && coverEl.files.length > 0 ? coverEl.files[0] : null;
      
      showStatus('Creating/finding artist...', 'success');
      const artistId = await getOrCreateArtist(artistEl.value);
      
      showStatus('Creating/finding album...', 'success');
      const albumId = await getOrCreateAlbum(albumName2, artistId);
      
      showStatus('Uploading audio file...', 'success');
      const audioExt = (audioFile.name.split('.').pop() || 'mp3').toLowerCase();
      const audioName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${audioExt}`;
      const { error: audioError } = await window.supabaseClient.storage.from('audio').upload(audioName, audioFile);
      if (audioError) throw audioError;
      const { data: audioUrlData } = window.supabaseClient.storage.from('audio').getPublicUrl(audioName);
      const audioUrl = audioUrlData.publicUrl;
      
      let coverUrl = null;
      if (coverFile) {
        showStatus('Uploading cover art...', 'success');
        const coverExt = (coverFile.name.split('.').pop() || 'jpg').toLowerCase();
        const coverName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${coverExt}`;
        const { error: coverError } = await window.supabaseClient.storage.from('covers').upload(coverName, coverFile);
        if (coverError) throw coverError;
        const { data: coverUrlData } = window.supabaseClient.storage.from('covers').getPublicUrl(coverName);
        coverUrl = coverUrlData.publicUrl;
      }
      
      showStatus('Saving track to database...', 'success');
      const { error: trackError } = await window.supabaseClient.from('tracks').insert([{
        title,
        artist_id: artistId,
        album_id: albumId,
        duration,
        file_url: audioUrl,
        cover_url: coverUrl,
        explicit
      }]);
      if (trackError) throw trackError;
      
      showStatus('Track uploaded successfully!', 'success');
      uploadForm.reset();
      
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
