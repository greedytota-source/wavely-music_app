async function loadArtists() {
  try {
    const { data } = await supabase.from('artists').select('*').order('name');
    const select = document.getElementById('artist');
    select.innerHTML = '<option value="">Select Artist</option>';
    data?.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      select.appendChild(opt);
    });
  } catch(e) { console.error(e); }
}
async function loadAlbums() {
  try {
    const { data } = await supabase.from('albums').select('*, artists(name)').order('title');
    const select = document.getElementById('album');
    select.innerHTML = '<option value="">None (Single)</option>';
    data?.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.artists?.name ? a.title + ' - ' + a.artists.name : a.title;
      select.appendChild(opt);
    });
  } catch(e) { console.error(e); }
}
function showStatus(m,t){const s=document.getElementById('status');s.textContent=m;s.className=t;}
document.getElementById('uploadForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const btn=document.getElementById('submitBtn'); btn.disabled=true; btn.textContent='Uploading...';
  try {
    let artistId=document.getElementById('artist').value;
    const newArtist=document.getElementById('newArtist').value;
    if(!artistId&&newArtist.trim()){ const{data}=await supabase.from('artists').insert([{name:newArtist.trim()}]).select(); artistId=data[0].id; }
    let albumId=document.getElementById('album').value;
    const newAlbum=document.getElementById('newAlbum').value;
    if(!albumId&&newAlbum.trim()){ const{data}=await supabase.from('albums').insert([{title:newAlbum.trim(),artist_id:artistId}]).select(); albumId=data[0].id; }
    const audio=document.getElementById('audioFile').files[0];
    const audioName=Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+audio.name.split('.').pop();
    await supabase.storage.from('audio').upload(audioName,audio);
    const {data:{publicUrl:audioUrl}}=supabase.storage.from('audio').getPublicUrl(audioName);
    let coverUrl=null;
    const cover=document.getElementById('coverFile').files[0];
    if(cover){ const cName=Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+cover.name.split('.').pop(); await supabase.storage.from('covers').upload(cName,cover); const {data:{publicUrl}}=supabase.storage.from('covers').getPublicUrl(cName); coverUrl=publicUrl; }
    await supabase.from('tracks').insert([{title:document.getElementById('title').value,artist_id:artistId,album_id:albumId||null,duration:parseInt(document.getElementById('duration').value),file_url:audioUrl,cover_url:coverUrl,explicit:document.getElementById('explicit').value==='true'}]);
    showStatus('Track uploaded successfully!','success'); e.target.reset(); loadArtists(); loadAlbums();
  }catch(err){ showStatus('Error: '+err.message,'error'); console.error(err); }
  finally{ btn.disabled=false; btn.textContent='Upload Track'; }
});
loadArtists(); loadAlbums();
