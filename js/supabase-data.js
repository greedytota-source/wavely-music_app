let TRACKS = [];
let PLAYLISTS = [];
let ARTISTS = [];
let ALBUMS = [];
let ALL_ITEMS = [];
let ITEM_BY_ID = {};
let ARTIST_BY_NAME = {};
let TRACK_BY_ID = {};

const byIds = (ids) => (ids || []).map((id) => TRACK_BY_ID[id]).filter(Boolean);

async function loadSupabaseData() {
  try {
    // Load tracks with artist and album info
    const { data: tracksData, error: tracksError } = await window.supabaseClient
      .from('tracks')
      .select('*, artists(name), albums(title)')
      .order('created_at', { ascending: false });

    if (tracksError) throw tracksError;

    TRACKS = (tracksData || []).map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artists?.name || 'Unknown Artist',
      artist_id: t.artist_id,
      album: t.albums?.title || '',
      album_id: t.album_id,
      duration: t.duration || 0,
      src: t.file_url,
      cover: t.cover_url,
      plays: t.plays ? t.plays.toLocaleString() : '0',
      explicit: t.explicit || false
    }));

    TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

    // Load artists
    const { data: artistsData } = await window.supabaseClient.from('artists').select('*').order('name');
    ARTISTS = (artistsData || []).map((a) => ({
      id: a.id,
      type: 'Artist',
      name: a.name,
      image_url: a.image_url,
      seed: 'artist:' + a.name
    }));
    ARTIST_BY_NAME = Object.fromEntries(ARTISTS.map((a) => [a.name, a]));

    // Load albums
    const { data: albumsData } = await window.supabaseClient
      .from('albums')
      .select('*, artists(name)')
      .order('title');

    ALBUMS = (albumsData || []).map((a) => ({
      id: a.id,
      type: 'Album',
      title: a.title,
      artist: a.artists?.name || 'Unknown Artist',
      artist_id: a.artist_id,
      year: a.year,
      cover_url: a.cover_url,
      description: a.description || '',
      owner: a.artists?.name || 'Unknown Artist',
      seed: a.title,
      tracks: []
    }));

    // Load playlists with tracks
    const { data: playlistsData } = await window.supabaseClient
      .from('playlists')
      .select('*, playlist_tracks(track_id, position)')
      .order('created_at');

    PLAYLISTS = (playlistsData || []).map((p) => {
      const trackIds = (p.playlist_tracks || [])
        .sort((a, b) => a.position - b.position)
        .map((pt) => pt.track_id);
      const tracks = byIds(trackIds);
      return {
        id: p.id,
        type: 'Playlist',
        title: p.title,
        owner: p.owner || 'Wavely',
        description: p.description || '',
        cover_url: p.cover_url,
        seed: p.title,
        trackIds,
        tracks
      };
    });

    // Link album tracks
    ALBUMS = ALBUMS.map((album) => {
      const albumTracks = TRACKS.filter((t) => t.album_id === album.id);
      return { ...album, trackIds: albumTracks.map((t) => t.id), tracks: albumTracks };
    });

    ALL_ITEMS = [...PLAYLISTS, ...ALBUMS];
    ITEM_BY_ID = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i]));

    console.log('Loaded from Supabase:', TRACKS.length, 'tracks |', PLAYLISTS.length, 'playlists');
    window.dispatchEvent(new CustomEvent('supabaseDataLoaded'));
  } catch (err) {
    console.error('Supabase load error:', err);
    window.dispatchEvent(new CustomEvent('supabaseDataLoaded'));
  }
}

loadSupabaseData();
