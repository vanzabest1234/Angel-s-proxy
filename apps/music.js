const LISTS = [
  { id: '0', name: 'Top Hits', desc: 'The most played songs right now', c1: '#3ddc84', c2: '#0b3d24' },
  { id: '132', name: 'Pop', desc: 'Chart-topping pop songs', c1: '#ff7bd5', c2: '#3a0b2e' },
  { id: '116', name: 'Hip-Hop', desc: 'Rap and hip-hop heavyweights', c1: '#7b5cff', c2: '#1d1046' },
  { id: '152', name: 'Rock', desc: 'Guitars turned all the way up', c1: '#ff5a66', c2: '#3d0b12' },
  { id: '113', name: 'Dance', desc: 'Electronic and dance floor fillers', c1: '#38bdf8', c2: '#0b2b45' },
  { id: '165', name: 'R&B', desc: 'Smooth R&B and soul', c1: '#f5a623', c2: '#3a2506' },
  { id: '85', name: 'Alternative', desc: 'Alternative and indie favorites', c1: '#9ae66e', c2: '#15300b' },
  { id: '144', name: 'Reggae', desc: 'Reggae and island vibes', c1: '#33d17a', c2: '#0a2e1b' },
  { id: '129', name: 'Jazz', desc: 'Jazz standards and new voices', c1: '#c084fc', c2: '#2a1040' },
  { id: '98', name: 'Classical', desc: 'Orchestral and chamber works', c1: '#cfd6e4', c2: '#2a2f3a' },
  { id: '464', name: 'Metal', desc: 'Heavy riffs and screams', c1: '#94a3b8', c2: '#111827' },
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

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmt = (sec) => {
  if (!Number.isFinite(sec)) return '0:00';
  const whole = Math.max(0, Math.floor(sec));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

export function renderMusic(body) {
  body.innerHTML = `
    <div class="sp">
      <div class="sp-shell">
        <aside class="sp-side">
          <div class="sp-brand">
            <span class="sp-mark" aria-hidden="true"></span>
            <span>Spotify</span>
            <span class="sp-free">Songs</span>
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
              <input class="sp-search" type="search" placeholder="Search any song or artist" aria-label="Search songs" data-search>
            </label>
            <span class="sp-badge">30s previews</span>
          </header>
          <div class="sp-scroll" data-scroll>
            <section class="sp-hero" data-hero></section>
            <section class="sp-section">
              <h2 class="sp-h2" data-list-title>Top Hits</h2>
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
  const listsEl = body.querySelector('[data-lists]');
  const tracksEl = body.querySelector('[data-tracks]');
  const listTitle = body.querySelector('[data-list-title]');
  const cover = body.querySelector('[data-cover]');
  const nowTitle = body.querySelector('[data-now-title]');
  const nowArtist = body.querySelector('[data-now-artist]');
  const homeBtn = body.querySelector('[data-view="home"]');
  const searchBtn = body.querySelector('[data-view="search"]');

  const state = {
    list: LISTS[0],
    view: { kind: 'Playlist', name: LISTS[0].name, desc: LISTS[0].desc, cover: '' },
    tracks: [],
    pos: 0,
    loading: false,
    note: '',
  };

  // Re-rendered rows detach mid-click; stop the click here so the desktop's
  // background-click handler never hides the window.
  body.querySelector('.sp').addEventListener('click', (event) => event.stopPropagation());

  audio.volume = vol.value / 100;

  const api = async (query) => {
    try {
      const res = await fetch(`/api/music?${query}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch {
      return { tracks: [], note: 'Could not reach the song service.' };
    }
  };

  const paint = (el, list) => {
    el.style.setProperty('--c1', list.c1);
    el.style.setProperty('--c2', list.c2);
  };

  const renderLists = () => {
    listsEl.innerHTML = LISTS.map((list) => `
      <button class="sp-lib-item${list.id === state.list.id ? ' is-active' : ''}" data-list="${list.id}">
        <span class="sp-lib-thumb" aria-hidden="true"></span>
        <span>${esc(list.name)}</span>
      </button>`).join('');
    listsEl.querySelectorAll('.sp-lib-item').forEach((el, i) => {
      paint(el.querySelector('.sp-lib-thumb'), LISTS[i]);
    });
  };

  const renderHero = () => {
    const { kind, name, desc, cover: coverUrl } = state.view;
    heroEl.innerHTML = `
      <span class="sp-hero-art">${coverUrl ? `<img src="${esc(coverUrl)}" alt="">` : ''}</span>
      <div class="sp-hero-text">
        <p class="sp-hero-kind">${esc(kind)}</p>
        <h2 class="sp-hero-name">${esc(name)}</h2>
        <p class="sp-hero-desc">${esc(desc)}</p>
      </div>
      <button class="sp-hero-play" data-hero-play aria-label="Play ${esc(name)}">${ICONS.play}</button>`;
    paint(heroEl, state.list);
    paint(heroEl.querySelector('.sp-hero-art'), state.list);
  };

  const renderTracks = () => {
    listTitle.textContent = state.view.name;
    if (state.loading) {
      tracksEl.innerHTML = '<p class="sp-loading">Loading songs…</p>';
      return;
    }
    if (!state.tracks.length) {
      tracksEl.innerHTML = `<p class="sp-empty">${esc(state.note || 'No songs found.')}</p>`;
      return;
    }
    const current = audio.currentSrc;
    tracksEl.innerHTML = state.tracks.map((track, pos) => {
      const playing = !audio.paused && Boolean(current) && current === track.src;
      return `
        <button class="sp-row${playing ? ' is-playing' : ''}" data-pos="${pos}" aria-label="Play ${esc(track.title)}">
          <span class="sp-row-index">${playing ? '<span class="sp-bars" aria-hidden="true"><i></i><i></i><i></i></span>' : pos + 1}</span>
          <span class="sp-row-main">
            <span class="sp-row-art">${track.cover ? `<img src="${esc(track.cover)}" alt="" loading="lazy">` : ''}</span>
            <span class="sp-row-text">
              <span class="sp-row-title">${esc(track.title)}</span>
              <span class="sp-row-artist">${esc(track.artist)}</span>
            </span>
          </span>
          <span class="sp-row-album">${esc(track.album)}</span>
          <span class="sp-row-dur">${track.duration ? fmt(track.duration) : '--:--'}</span>
        </button>`;
    }).join('');
  };

  const renderAll = () => {
    renderLists();
    renderHero();
    renderTracks();
  };

  const setPlayIcon = (playing) => {
    playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    playBtn.classList.toggle('is-playing', playing);
  };

  const showTrack = (track) => {
    nowTitle.textContent = track.title;
    nowArtist.textContent = track.album ? `${track.artist} · ${track.album}` : track.artist;
    cover.innerHTML = track.cover ? `<img src="${esc(track.cover)}" alt="">` : '';
    paint(cover, state.list);
  };

  const playPos = (pos) => {
    if (!state.tracks.length) return;
    state.pos = ((pos % state.tracks.length) + state.tracks.length) % state.tracks.length;
    const track = state.tracks[state.pos];
    audio.src = track.src;
    audio.play().catch(() => setPlayIcon(false));
    showTrack(track);
    seek.value = 0;
    curEl.textContent = '0:00';
    durEl.textContent = track.duration ? fmt(track.duration) : '0:00';
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

  audio.addEventListener('play', () => {
    setPlayIcon(true);
    renderTracks();
  });
  audio.addEventListener('pause', () => {
    setPlayIcon(false);
    renderTracks();
  });
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audio.duration)) durEl.textContent = fmt(audio.duration);
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
  const loadList = async (list) => {
    state.list = list;
    state.view = { kind: 'Playlist', name: list.name, desc: list.desc, cover: '' };
    state.tracks = [];
    state.loading = true;
    state.note = '';
    searchInput.value = '';
    renderAll();
    scroll.scrollTop = 0;

    const data = await api(`chart=${encodeURIComponent(list.id)}`);
    if (state.list !== list) return;
    state.tracks = data.tracks || [];
    state.view.cover = state.tracks[0] ? state.tracks[0].cover : '';
    state.loading = false;
    state.note = data.note || '';
    renderAll();
  };

  let timer;
  const search = () => {
    clearTimeout(timer);
    const term = searchInput.value.trim();
    if (!term) {
      loadList(state.list);
      return;
    }
    state.tracks = [];
    state.loading = true;
    state.note = '';
    state.view = { kind: 'Search', name: `“${term}”`, desc: 'Songs matching your search', cover: '' };
    renderTracks();
    listTitle.textContent = state.view.name;

    timer = setTimeout(async () => {
      const data = await api(`q=${encodeURIComponent(term)}`);
      if (searchInput.value.trim() !== term) return;
      state.tracks = data.tracks || [];
      state.pos = 0;
      state.view = {
        kind: 'Search',
        name: `“${term}”`,
        desc: `${state.tracks.length} song${state.tracks.length === 1 ? '' : 's'} found`,
        cover: state.tracks[0] ? state.tracks[0].cover : '',
      };
      state.loading = false;
      state.note = data.note || '';
      renderHero();
      renderTracks();
    }, 350);
  };

  listsEl.addEventListener('click', (event) => {
    const item = event.target.closest('[data-list]');
    if (!item) return;
    const list = LISTS.find((l) => l.id === item.dataset.list);
    if (list) loadList(list);
  });

  tracksEl.addEventListener('click', (event) => {
    const row = event.target.closest('[data-pos]');
    if (row) playPos(Number(row.dataset.pos));
  });

  homeBtn.addEventListener('click', () => {
    homeBtn.classList.add('is-active');
    searchBtn.classList.remove('is-active');
    loadList(LISTS[0]);
  });

  searchBtn.addEventListener('click', () => {
    searchBtn.classList.add('is-active');
    homeBtn.classList.remove('is-active');
    searchInput.focus();
  });

  searchInput.addEventListener('input', search);

  renderLists();
  renderHero();
  loadList(LISTS[0]);
}

export const music = {
  name: 'Spotify',
  title: 'Spotify',
  tile: 'tile-music',
  desc: 'Real songs with 30-second previews.',
  render: renderMusic,
};
