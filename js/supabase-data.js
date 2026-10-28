window.TRACKS = window.TRACKS || [];
window.PLAYLISTS = window.PLAYLISTS || [];
window.ARTISTS = window.ARTISTS || [];
window.ALBUMS = window.ALBUMS || [];
window.ALL_ITEMS = window.ALL_ITEMS || [];
window.ITEM_BY_ID = window.ITEM_BY_ID || {};
window.ARTIST_BY_NAME = window.ARTIST_BY_NAME || {};
window.TRACK_BY_ID = window.TRACK_BY_ID || {};

const byIds = (ids) => (ids || []).map((id) => (window.TRACK_BY_ID || {})[id]).filter(Boolean);

// Tracks added from YouTube store their watch URL in file_url; they play
// through the embed instead of an <audio> element.
const YOUTUBE_URL_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const youTubeIdFromUrl = (url) => {
  const match = String(url || '').match(YOUTUBE_URL_RE);
  return match ? match[1] : null;
};

async function loadSupabaseData() {
  try {
    if (typeof window.supabaseClient === 'undefined') {
      console.error('Supabase client not initialized');
      window.dispatchEvent(new CustomEvent('supabaseDataLoaded'));
      return;
    }
    // Load tracks with artist and album info. Multi-artist credits live in the
    // optional track_artists table, so fall back gracefully when it's missing.
    // The !artist_id / !album_id hints keep the embeds unambiguous once
    // track_artists adds a second path from tracks to artists.
    const trackSelect = (withCredits) =>
      '*, artists!artist_id(id, name, image_url), albums!album_id(title)' +
      (withCredits ? ', track_artists(position, artists(id, name, image_url))' : '');

    let tracksRes = await window.supabaseClient
      .from('tracks')
      .select(trackSelect(true))
      .order('created_at', { ascending: false });

    if (tracksRes.error) {
      console.warn('track_artists unavailable, using single artist:', tracksRes.error.message);
      tracksRes = await window.supabaseClient
        .from('tracks')
        .select(trackSelect(false))
        .order('created_at', { ascending: false });
    }

    if (tracksRes.error) throw tracksRes.error;

    window.TRACKS = (tracksRes.data || []).map((t) => {
      const credits = (t.track_artists || [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((row) => row.artists)
        .filter(Boolean);
      const names = credits.length ? credits.map((a) => a.name) : [t.artists?.name || 'Unknown Artist'];
      const ids = credits.length ? credits.map((a) => a.id) : t.artist_id ? [t.artist_id] : [];
      const videoId = youTubeIdFromUrl(t.file_url);
      const cover = t.cover_url || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null);

      return {
        id: t.id,
        title: t.title,
        artist: names.join(', '),
        artist_id: t.artist_id,
        artist_ids: ids,
        artist_image: (credits.length ? credits[0].image_url : t.artists?.image_url) || null,
        album: t.albums?.title || '',
        album_id: t.album_id,
        // Category chosen in the admin panel (supabase/track-genre.sql).
        // Older projects have no column yet, so this stays empty rather
        // than failing the whole load.
        genre: t.genre || '',
        description: t.description || '',
        duration: t.duration || 0,
        src: videoId ? null : t.file_url,
        yt: Boolean(videoId),
        videoId,
        embed: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null,
        url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : t.file_url,
        cover,
        thumb: cover,
        plays: t.plays ? t.plays.toLocaleString() : '0',
        explicit: t.explicit || false
      };
    });

    window.TRACK_BY_ID = Object.fromEntries(window.TRACKS.map((t) => [t.id, t]));

    // Load artists
    const { data: artistsData } = await window.supabaseClient.from('artists').select('*').order('name');
    window.ARTISTS = (artistsData || []).map((a) => ({
      id: a.id,
      type: 'Artist',
      name: a.name,
      image_url: a.image_url,
      seed: 'artist:' + a.name
    }));
    window.ARTIST_BY_NAME = Object.fromEntries(window.ARTISTS.map((a) => [a.name, a]));

    // Load albums (artist image doubles as the cover when no cover was uploaded)
    const { data: albumsData } = await window.supabaseClient
      .from('albums')
      .select('*, artists(name, image_url)')
      .order('title');

    window.ALBUMS = (albumsData || []).map((a) => ({
      id: a.id,
      type: 'Album',
      title: a.title,
      artist: a.artists?.name || 'Unknown Artist',
      artist_id: a.artist_id,
      year: a.year,
      cover_url: a.cover_url,
      artist_image_url: a.artists?.image_url || null,
      description: a.description || '',
      owner: a.artists?.name || 'Unknown Artist',
      seed: a.title,
      tracks: []
    }));

    // Older rows may have one album per artist even when the title is the
    // same. The admin now matches album names globally, so fold those
    // duplicates into the lowest-id album for display and playback.
    const canonicalAlbumByTitle = new Map();
    const mergedAlbums = [];
    window.ALBUMS
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .forEach((album) => {
        const key = String(album.title || '').trim().toLowerCase();
        if (!key) {
          mergedAlbums.push(album);
          return;
        }
        const keep = canonicalAlbumByTitle.get(key);
        if (!keep) {
          canonicalAlbumByTitle.set(key, album);
          mergedAlbums.push(album);
          return;
        }
        window.TRACKS.forEach((t) => {
          if (t.album_id === album.id) {
            t.album_id = keep.id;
            t.album = keep.title;
          }
        });
        if (!keep.cover_url && album.cover_url) keep.cover_url = album.cover_url;
        if (!keep.description && album.description) keep.description = album.description;
        if (!keep.year && album.year) keep.year = album.year;
      });
    window.ALBUMS = mergedAlbums.sort((a, b) =>
      String(a.title || '').localeCompare(String(b.title || ''))
    );

    // Load playlists with tracks
    const { data: playlistsData } = await window.supabaseClient
      .from('playlists')
      .select('*, playlist_tracks(track_id, position)')
      .order('created_at');

    window.PLAYLISTS = (playlistsData || []).map((p) => {
      const trackIds = (p.playlist_tracks || [])
        .sort((a, b) => a.position - b.position)
        .map((pt) => pt.track_id);
      const tracks = byIds(trackIds);
      return {
        id: p.id,
        type: 'Playlist',
        title: p.title,
        user_id: p.user_id || null,
        owner: p.owner || 'Aurum',
        description: p.description || '',
        cover_url: p.cover_url,
        seed: p.title,
        trackIds,
        tracks
      };
    });

    // Link album tracks
    window.ALBUMS = window.ALBUMS.map((album) => {
      const albumTracks = window.TRACKS.filter((t) => t.album_id === album.id);
      return { ...album, trackIds: albumTracks.map((t) => t.id), tracks: albumTracks };
    });

    // Hide album/artist rows left behind by uploads that never saved a track,
    // so they don't show up as duplicate entries in the library and shelves.
    // An artist also counts as used when they are credited via track_artists
    // but are not the track's primary artist_id.
    const usedAlbumIds = new Set(window.TRACKS.map((t) => t.album_id).filter(Boolean));
    const usedArtistIds = new Set();
    window.TRACKS.forEach((t) => {
      if (t.artist_id) usedArtistIds.add(t.artist_id);
      (t.artist_ids || []).forEach((id) => usedArtistIds.add(id));
    });
    window.ALBUMS = window.ALBUMS.filter((a) => usedAlbumIds.has(a.id));
    window.ARTISTS = window.ARTISTS.filter((a) => usedArtistIds.has(a.id));
    window.ARTIST_BY_NAME = Object.fromEntries(window.ARTISTS.map((a) => [a.name, a]));

    window.ALL_ITEMS = [...(window.PLAYLISTS || []), ...(window.ALBUMS || [])];
    window.ITEM_BY_ID = Object.fromEntries((window.ALL_ITEMS || []).map((i) => [i.id, i]));

    // Likes for the signed-in listener (guests keep theirs in localStorage)
    window.USER_LIKES = [];
    const currentUser = window.WavelyAuth && window.WavelyAuth.user;
    if (currentUser) {
      const { data: likeRows, error: likeErr } = await window.supabaseClient
        .from('likes')
        .select('track_id')
        .eq('user_id', currentUser.id);
      if (!likeErr) window.USER_LIKES = (likeRows || []).map((row) => row.track_id);
    }

    console.log('Loaded from Supabase:', (window.TRACKS || []).length, 'tracks |', (window.PLAYLISTS || []).length, 'playlists');
    window.dispatchEvent(new CustomEvent('supabaseDataLoaded', { detail: { refreshed: true } }));
  } catch (err) {
    console.error('Supabase load error:', err?.message || err);
    window.dispatchEvent(new CustomEvent('supabaseDataLoaded'));
  }
}

window.reloadSupabaseData = loadSupabaseData;

loadSupabaseData();
