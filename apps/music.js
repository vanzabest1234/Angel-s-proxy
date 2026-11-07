const SONG_URL = (n) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;
const SERIES = ['Series A', 'Series B', 'Series C', 'Series D'];
const ART = {
  'Series A': ['#3ddc84', '#0b3d24'],
  'Series B': ['#7b5cff', '#1d1046'],
  'Series C': ['#ff8a5c', '#3d1408'],
  'Series D': ['#38bdf8', '#0b2b45'],
};

const TRACKS = Array.from({ length: 16 }, (_, i) => {
  const album = SERIES[Math.floor(i / 4)];
  return {
    title: `SoundHelix Song ${i + 1}`,
    artist: 'SoundHelix',
    album,
    src: SONG_URL(i + 1),
  };
});

const PLAYLISTS = [
  { id: 'all', name: 'All Songs', desc: 'Every royalty-free track in the library.', tracks: TRACKS.map((_, i) => i) },
  { id: 'discover', name: 'Discover Weekly', desc: 'A fresh mix of free instrumentals.', tracks: [0, 2, 5, 8, 11, 14] },
  { id: 'focus', name: 'Focus Flow', desc: 'Steady music for deep work.', tracks: [1, 4, 6, 9, 12, 15] },
  { id: 'chill', name: 'Chill Evenings', desc: 'Slow tempos for winding down.', tracks: [3, 7, 10, 13] },
  { id: 'workout', name: 'Workout Boost', desc: 'Driving rhythms to keep you moving.', tracks: [2, 6, 9, 12, 0, 15] },
  { id: 'liked', name: 'Liked Songs', desc: 'Your saved tracks, all in one place.', tracks: [1, 5, 8, 14] },
];

const ICONS = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.6 12 3l9 7.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5.5 9.6V20h13V9.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5.5v13L9 12z" fill="currentColor"/><rect x="4" y="5.5" width="2.4" height="13" rx="1" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5v13L15 12z" fill="currentColor"/><rect x="17.6" y="5.5" width="2.4" height="13" rx="1" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5.2" width="3.6" height="13.6" rx="1" fill="currentColor"/><rect x="13.4" y="5.2" width="3.6" height="13.6" rx="1" fill="currentColor"/></svg>',
  volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.4L12 18V6L7.4 9.5z" fill="currentColor"/><path d="M15.6 8.6a4.6 4.6 0 0 1 0 6.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

const fmt = (sec) => {
  if (!Number.isFinite(sec)) return '0:00';
  const whole = Math.max(0, Math.floor(sec));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

const art = (album) => ART[album] || ['#1db954', '#0b3d24'];

export function renderMusic(body) {
  body.innerHTML = `
    <div class="sp">
      <div class="sp-shell">
        <aside class="sp-side">
          <div class="sp-brand">
            <span class="sp-mark" aria-hidden="true"></span>
            <span>Spotify</span>
            <span class="sp-free">royalty-free</span>
          </div>
          <nav class="sp-nav">
            <button class="sp-nav-item is-active" data-view="home">${ICONS.home}Home</button>
            <button class="sp-nav-item" data-view="search">${ICONS.search}Search</button>
          </nav>
          <div class="sp-library">
            <p class="sp-library-title">Your Library</p>
            <div data-lists></div>
          </div>
        </aside>
        <main class="sp-main">
          <header class="sp-top">
            <label class="sp-searchwrap">
              ${ICONS.search}
              <input class="sp-search" type="search" placeholder="Search songs or albums" aria-label="Search songs" data-search>
            </label>
            <span class="sp-badge">Free to play</span>
          </header>
          <div class="sp-scroll" data-scroll>
            <section class="sp-hero" data-hero></section>
            <section class="sp-section">
              <h2 class="sp-h2">Made for you</h2>
              <div class="sp-grid" data-grid></div>
            </section>
            <section class="sp-section">
              <h2 class="sp-h2" data-list-title>All Songs</h2>
              <div class="sp-tracks" data-tracks></div>
            </section>
          </div>
        </main>
      </div>

      <footer class="sp-player">
        <div class="sp-now">
          <span class="sp-cover" data-cover></span>
          <div class="sp-now-text">
            <p class="sp-now-title" data-now-title>Nothing playing</p>
            <p class="sp-now-artist" data-now-artist>Pick a song to start</p>
          </div>
        </div>
        <div class="sp-center">
          <div class="sp-buttons">
            <button class="sp-btn" data-prev aria-label="Previous song">${ICONS.prev}</button>
            <button class="sp-btn sp-play" data-play aria-label="Play">${ICONS.play}</button>
            <button class="sp-btn" data-next aria-label="Next song">${ICONS.next}</button>
          </div>
          <div class="sp-seek">
            <span class="sp-time" data-cur>0:00</span>
            <input class="sp-range" type="range" min="0" max="100" step="0.1" value="0" data-seek aria-label="Seek">
            <span class="sp-time" data-dur>0:00</span>
          </div>
        </div>
        <div class="sp-right">
          ${ICONS.volume}
          <input class="sp-range sp-vol" type="range" min="0" max="100" step="1" value="70" data-vol aria-label="Volume">
        </div>
      </footer>
      <audio data-audio preload="metadata"></audio>
    </div>`;

  const audio = body.querySelector('[data-audio]');
  const seek = body.querySelector('[data-seek]');
  const vol = body.querySelector('[data-vol]');
  const curEl = body.querySelector('[data-cur]');
  const durEl = body.querySelector('[data-dur]');
  const playBtn = body.querySelector('[data-play]');
  const searchInput = body.querySelector('[data-search]');
  const scroll = body.querySelector('[data-scroll]');
  const heroEl = body.querySelector('[data-hero]');
  const gridEl = body.querySelector('[data-grid]');
  const listsEl = body.querySelector('[data-lists]');
  const tracksEl = body.querySelector('[data-tracks]');
  const listTitle = body.querySelector('[data-list-title]');
  const cover = body.querySelector('[data-cover]');
  const nowTitle = body.querySelector('[data-now-title]');
  const nowArtist = body.querySelector('[data-now-artist]');
  const durations = new Map();

  const state = { listId: 'all', query: '', pos: 0 };

  // Re-rendered rows detach mid-click; stop the click here so the desktop's
  // background-click handler never hides the window.
  body.querySelector('.sp').addEventListener('click', (event) => event.stopPropagation());

  audio.volume = vol.value / 100;

  const list = () => PLAYLISTS.find((p) => p.id === state.listId) || PLAYLISTS[0];

  const queue = () => {
    const term = state.query.trim().toLowerCase();
    return list().tracks.filter((i) => {
      if (!term) return true;
      const t = TRACKS[i];
      return `${t.title} ${t.album} ${t.artist}`.toLowerCase().includes(term);
    });
  };

  const paint = (el, album) => {
    const [a, b] = art(album);
    el.style.setProperty('--c1', a);
    el.style.setProperty('--c2', b);
  };

  const renderLists = () => {
    listsEl.innerHTML = PLAYLISTS.map((p) => `
      <button class="sp-lib-item${p.id === state.listId ? ' is-active' : ''}" data-list="${p.id}">
        <span class="sp-lib-thumb" data-art="${TRACKS[p.tracks[0]].album}" aria-hidden="true"></span>
        <span>${p.name}</span>
      </button>`).join('');
    listsEl.querySelectorAll('.sp-lib-thumb').forEach((el) => paint(el, el.dataset.art));
  };

  const renderHero = () => {
    const current = list();
    const album = TRACKS[current.tracks[0]].album;
    const [a, b] = art(album);
    heroEl.style.setProperty('--c1', a);
    heroEl.style.setProperty('--c2', b);
    heroEl.innerHTML = `
      <span class="sp-hero-art" data-hero-art aria-hidden="true"></span>
      <div class="sp-hero-text">
        <p class="sp-hero-kind">Playlist</p>
        <h1 class="sp-hero-name">${current.name}</h1>
        <p class="sp-hero-desc">${current.desc} · ${current.tracks.length} songs</p>
      </div>
      <button class="sp-hero-play" data-hero-play aria-label="Play ${current.name}">${ICONS.play}</button>`;
    paint(heroEl.querySelector('[data-hero-art]'), album);
  };

  const renderGrid = () => {
    gridEl.innerHTML = PLAYLISTS.filter((p) => p.id !== state.listId).map((p) => `
      <button class="sp-card" data-card="${p.id}">
        <span class="sp-card-art" data-art="${TRACKS[p.tracks[0]].album}" aria-hidden="true">
          <span class="sp-card-play" aria-hidden="true">${ICONS.play}</span>
        </span>
        <span class="sp-card-name">${p.name}</span>
        <span class="sp-card-desc">${p.desc}</span>
      </button>`).join('');
    gridEl.querySelectorAll('.sp-card-art').forEach((el) => paint(el, el.dataset.art));
  };

  const renderTracks = () => {
    const q = queue();
    listTitle.textContent = state.query ? `Results in ${list().name}` : list().name;
    if (!q.length) {
      tracksEl.innerHTML = '<p class="sp-empty">No songs match that search.</p>';
      return;
    }
    tracksEl.innerHTML = q.map((trackIndex, pos) => {
      const track = TRACKS[trackIndex];
      const playing = Boolean(audio.currentSrc) && audio.currentSrc === track.src;
      return `
        <button class="sp-row${playing ? ' is-playing' : ''}" data-pos="${pos}" aria-label="Play ${track.title}">
          <span class="sp-row-index">${playing ? '<span class="sp-bars" aria-hidden="true"><i></i><i></i><i></i></span>' : pos + 1}</span>
          <span class="sp-row-main">
            <span class="sp-row-title">${track.title}</span>
            <span class="sp-row-artist">${track.artist}</span>
          </span>
          <span class="sp-row-album">${track.album}</span>
          <span class="sp-row-dur">${durations.has(track.src) ? fmt(durations.get(track.src)) : '--:--'}</span>
        </button>`;
    }).join('');
  };

  const renderAll = () => {
    renderLists();
    renderHero();
    renderGrid();
    renderTracks();
  };

  const setPlayIcon = (playing) => {
    playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    playBtn.classList.toggle('is-playing', playing);
  };

  const playPos = (pos) => {
    const q = queue();
    if (!q.length) return;
    state.pos = ((pos % q.length) + q.length) % q.length;
    const track = TRACKS[q[state.pos]];
    audio.src = track.src;
    audio.play().catch(() => setPlayIcon(false));
    nowTitle.textContent = track.title;
    nowArtist.textContent = `${track.artist} · ${track.album}`;
    paint(cover, track.album);
    seek.value = 0;
    curEl.textContent = '0:00';
    renderTracks();
  };

  /* ---------- player events ---------- */
  playBtn.addEventListener('click', () => {
    if (!audio.currentSrc) {
      playPos(state.pos);
      return;
    }
    if (audio.paused) audio.play().catch(() => setPlayIcon(false));
    else audio.pause();
  });

  body.querySelector('[data-prev]').addEventListener('click', () => playPos(state.pos - 1));
  body.querySelector('[data-next]').addEventListener('click', () => playPos(state.pos + 1));
  heroEl.addEventListener('click', (event) => {
    if (event.target.closest('[data-hero-play]')) playPos(0);
  });

  audio.addEventListener('play', () => setPlayIcon(true));
  audio.addEventListener('pause', () => setPlayIcon(false));
  audio.addEventListener('loadedmetadata', () => {
    durEl.textContent = fmt(audio.duration);
    durations.set(audio.currentSrc, audio.duration);
    const row = tracksEl.querySelector(`[data-pos="${state.pos}"] .sp-row-dur`);
    if (row) row.textContent = fmt(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    curEl.textContent = fmt(audio.currentTime);
    if (audio.duration) seek.value = (audio.currentTime / audio.duration) * 100;
  });
  audio.addEventListener('ended', () => playPos(state.pos + 1));
  audio.addEventListener('error', () => {
    nowArtist.textContent = 'That song could not load — check your connection.';
    setPlayIcon(false);
  });

  seek.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
  });
  vol.addEventListener('input', () => { audio.volume = vol.value / 100; });

  /* ---------- browsing ---------- */
  const selectList = (id) => {
    state.listId = id;
    state.query = '';
    state.pos = 0;
    searchInput.value = '';
    renderAll();
    scroll.scrollTop = 0;
  };

  gridEl.addEventListener('click', (event) => {
    const card = event.target.closest('[data-card]');
    if (card) selectList(card.dataset.card);
  });
  listsEl.addEventListener('click', (event) => {
    const item = event.target.closest('[data-list]');
    if (item) selectList(item.dataset.list);
  });
  tracksEl.addEventListener('click', (event) => {
    const row = event.target.closest('[data-pos]');
    if (row) playPos(Number(row.dataset.pos));
  });
  body.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.sp-nav-item').forEach((b) => b.classList.toggle('is-active', b === btn));
      if (btn.dataset.view === 'search') searchInput.focus();
      else selectList('all');
    });
  });
  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    state.pos = 0;
    renderTracks();
  });

  renderAll();
}

export const music = {
  name: 'Spotify',
  title: 'Spotify',
  tile: 'tile-music',
  desc: 'A Spotify-style player with royalty-free songs.',
  render: renderMusic,
};
