async function getOrCreateArtist(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Artist is required');
  
  try {
    const { data: existing } = await supabase
      .from('artists')
      .select('id')
      .ilike('name', trimmed)
      .limit(1);
    
    if (existing && existing.length > 0) {
      return existing[0].id;
    }
    
    const { data, error } = await supabase
      .from('artists')
      .insert([{ name: trimmed }])
      .select()
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (err) {
    console.error('getOrCreateArtist error:', err);
    throw err;
  }
}

async function getOrCreateAlbum(name, artistId) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  if (!artistId) return null;
  
  try {
    const { data: existing } = await supabase
      .from('albums')
      .select('id')
      .eq('artist_id', artistId)
      .ilike('title', trimmed)
      .limit(1);
    
    if (existing && existing.length > 0) {
      return existing[0].id;
    }
    
    const { data, error } = await supabase
      .from('albums')
      .insert([{ title: trimmed, artist_id: artistId }])
      .select()
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (err) {
    console.error('getOrCreateAlbum error:', err);
    throw err;
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  if (!status) {
    console.log('Status:', message);
    return;
  }
  status.textContent = message || '';
  status.className = type || '';
}

function initAdmin() {
  const uploadForm = document.getElementById('uploadForm');
  if (!uploadForm) {
    console.error('uploadForm not found');
    return;
  }
  
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
      
      if (!titleEl) throw new Error('Title field missing');
      if (!artistEl) throw new Error('Artist field missing');
      if (!durationEl) throw new Error('Duration field missing');
      if (!audioEl) throw new Error('Audio file field missing');
      
      const title = (titleEl.value || '').trim();
      const artistName = artistEl.value || '';
      const albumName = albumEl ? (albumEl.value || '') : '';
      const durationStr = durationEl.value || '';
      const duration = parseInt(durationStr);
      const explicit = explicitEl && explicitEl.value === 'true';
      
      if (!title) throw new Error('Song title is required');
      if (!artistName.trim()) throw new Error('Artist name is required');
      if (audioEl.files.length === 0) throw new Error('Please select an audio file');
      if (isNaN(duration) || duration <= 0) throw new Error('Valid duration is required');
      
      const audioFile = audioEl.files[0];
      const coverFile = coverEl && coverEl.files && coverEl.files.length > 0 ? coverEl.files[0] : null;
      
      showStatus('Creating/finding artist...', 'success');
      const artistId = await getOrCreateArtist(artistName);
      
      showStatus('Creating/finding album...', 'success');
      const albumId = await getOrCreateAlbum(albumName, artistId);
      
      showStatus('Uploading audio file...', 'success');
      const audioExt = audioFile.name.split('.').pop();
      const audioName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${audioExt}`;
      const { error: audioError } = await supabase.storage.from('audio').upload(audioName, audioFile);
      if (audioError) throw audioError;
      const { data: { publicUrl: audioUrl } } = supabase.storage.from('audio').getPublicUrl(audioName);
      
      let coverUrl = null;
      if (coverFile) {
        showStatus('Uploading cover art...', 'success');
        const coverExt = coverFile.name.split('.').pop();
        const coverName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${coverExt}`;
        const { error: coverError } = await supabase.storage.from('covers').upload(coverName, coverFile);
        if (coverError) throw coverError;
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverName);
        coverUrl = publicUrl;
      }
      
      showStatus('Saving track to database...', 'success');
      const { error: trackError } = await supabase.from('tracks').insert([{
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
      console.error(error);
      showStatus('Error: ' + (error.message || error), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Track';
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
