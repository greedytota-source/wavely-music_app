async function getOrCreateArtist(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Artist is required');
  
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
}

async function getOrCreateAlbum(name, artistId) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  
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
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
}

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';
  showStatus('Starting upload...', 'success');
  
  try {
    const title = document.getElementById('title').value.trim();
    const artistName = document.getElementById('artistName').value;
    const albumName = document.getElementById('albumName').value;
    const duration = parseInt(document.getElementById('duration').value);
    const explicit = document.getElementById('explicit').value === 'true';
    const audioFile = document.getElementById('audioFile').files[0];
    const coverFile = document.getElementById('coverFile').files[0];
    
    if (!title) throw new Error('Song title is required');
    if (!audioFile) throw new Error('Please select an audio file');
    if (!duration) throw new Error('Duration is required');
    
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
    document.getElementById('uploadForm').reset();
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    console.error(error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload Track';
  }
});
