const EMBED = 'https://open.spotify.com/embed';
const TYPES = ['track', 'album', 'playlist', 'artist', 'episode', 'show'];

// Every playlist below is a real Spotify playlist, so the app plays actual
// Spotify songs instead of the old royalty-free placeholders.
const PLAYLISTS = [
  { id: '37i9dQZF1DXcBWIGoYBM5M', name: 'Today’s Top Hits', desc: 'The 50 biggest songs on Spotify right now', cover: 'https://i.scdn.co/image/ab67706f00000002e06fabee7abffa117bed662f' },
  { id: '37i9dQZF1DX0XUsuxWHRQd', name: 'RapCaviar', desc: 'Hip-hop’s heaviest hitters', cover: 'https://i.scdn.co/image/ab67706f00000002bc625e1e16425bc7d8e049e5' },
  { id: '37i9dQZF1DX1lVhptIYRda', name: 'Hot Country', desc: 'Country’s hottest tracks', cover: 'https://i.scdn.co/image/ab67706f000000022abdf5bda95a1572f813740f' },
  { id: '37i9dQZF1DWXRqgorJj26U', name: 'Rock Classics', desc: 'The riffs that built rock', cover: 'https://i.scdn.co/image/ab67706f00000002694bf33281695f3b7542a09a' },
  { id: '37i9dQZF1DX4UtSsGT1Sbe', name: 'All Out 80s', desc: 'Synths, big hair, bigger hooks', cover: 'https://i.scdn.co/image/ab67706f000000028c767aab2034bb8fafd33124' },
  { id: '37i9dQZF1DX4WYpdgoIcn6', name: 'Chill Hits', desc: 'Low-key songs for slowing down', cover: 'https://i.scdn.co/image/ab67706f000000020408713c731caaf1f800615a' },
  { id: '37i9dQZF1DX76Wlfdnj7AP', name: 'Beast Mode', desc: 'Beats to push through any workout', cover: 'https://i.scdn.co/image/ab67706f00000002f367481f06b565250cc7b139' },
  { id: '37i9dQZF1DX4dyzvuaRJ0n', name: 'mint', desc: 'The newest in dance and electronic', cover: 'https://i.scdn.co/image/ab67706f000000028df1aa8183f5f64949d9b269' },
  { id: '37i9dQZF1DWUa8ZRTfalHk', name: 'Pop Rising', desc: 'Tomorrow’s pop stars, today', cover: 'https://i.scdn.co/image/ab67706f00000002f24e6237278c6d653d587b3b' },
  { id: '37i9dQZF1DWWQRwui0ExPn', name: 'lofi beats', desc: 'Chill beats to study and relax to', cover: 'https://i.scdn.co/image/ab67706f00000002266beb50b0032b0f140a749e' },
  { id: '37i9dQZF1DWWEJlAGA9gs0', name: 'Classical Essentials', desc: 'The greatest classical works', cover: 'https://i.scdn.co/image/ab67706f00000002762f5045eac92a372596acca' },
  { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Piano', desc: 'Solo piano for calm moments', cover: 'https://i.scdn.co/image/ab67706f0000000270e1fb7db7b45809d6a80377' },
  { id: '37i9dQZF1DXbITWG1ZJKYt', name: 'Jazz Classics', desc: 'Standards from the greats', cover: 'https://i.scdn.co/image/ab67706f00000002d6717501a3dc7fdef7aa1694' },
];

const ICONS = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.6 12 3l9 7.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5.5 9.6V20h13V9.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Accepts open.spotify.com links, spotify: URIs and bare 22-character ids. */
function parseSpotify(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const uri = raw.match(/spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]{22})/i);
  if (uri) return { type: uri[1].toLowerCase(), id: uri[2] };

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const parts = url.pathname.split('/').filter(Boolean).filter((p) => !/^intl-/i.test(p));
    const at = parts.findIndex((p) => TYPES.includes(p.toLowerCase()));
    if (at > -1 && /^[A-Za-z0-9]{22}$/.test(parts[at + 1] || '')) {
      return { type: parts[at].toLowerCase(), id: parts[at + 1] };
    }
  } catch {
    return null;
  }

  const bare = raw.match(/^([A-Za-z0-9]{22})$/);
  if (bare) return { type: 'playlist', id: bare[1] };
  return null;
}

export function renderMusic(body) {
  body.innerHTML = `
    <div class="sp">
      <div class="sp-shell">
        <aside class="sp-side">
          <div class="sp-brand">
            <span class="sp-mark" aria-hidden="true"></span>
            <span>Spotify</span>
            <span class="sp-free">All songs</span>
          </div>
          <nav class="sp-nav">
            <button class="sp-nav-item is-active" data-view="home">${ICONS.home}Home</button>
            <button class="sp-nav-item" data-view="link">${ICONS.search}Open a link</button>
          </nav>
          <div class="sp-library">
            <p class="sp-library-title">Spotify playlists</p>
            <div data-lists></div>
          </div>
        </aside>
        <main class="sp-main">
          <header class="sp-top">
            <label class="sp-searchwrap">
              ${ICONS.search}
              <input class="sp-search" type="search" placeholder="Paste a Spotify song, album or playlist link" aria-label="Spotify link" data-link>
            </label>
            <button class="sp-go" data-go>Play</button>
            <span class="sp-badge">All songs</span>
          </header>
          <p class="sp-msg" data-msg hidden></p>
          <div class="sp-frame-wrap">
            <iframe class="sp-frame" data-frame title="Spotify player" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </main>
      </div>
    </div>`;

  const frame = body.querySelector('[data-frame]');
  const listsEl = body.querySelector('[data-lists]');
  const linkInput = body.querySelector('[data-link]');
  const msg = body.querySelector('[data-msg]');
  const homeBtn = body.querySelector('[data-view="home"]');
  const linkBtn = body.querySelector('[data-view="link"]');

  // Re-rendered rows detach mid-click; keep clicks from hiding the desktop window.
  body.querySelector('.sp').addEventListener('click', (event) => event.stopPropagation());

  const say = (text = '') => {
    msg.textContent = text;
    msg.hidden = !text;
  };

  const highlight = (id) => {
    listsEl.querySelectorAll('.sp-lib-item').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.id === id);
    });
  };

  const play = (target, name) => {
    const src = `${EMBED}/${target.type}/${target.id}?utm_source=generator&theme=0`;
    if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
    frame.title = name ? `Spotify: ${name}` : 'Spotify player';
    highlight(name ? target.id : '');
    say('');
  };

  listsEl.innerHTML = PLAYLISTS.map((p) => `
    <button class="sp-lib-item" data-id="${p.id}" title="${esc(p.desc)}">
      <span class="sp-lib-thumb"><img src="${p.cover}" alt="" loading="lazy"></span>
      <span>${esc(p.name)}</span>
    </button>`).join('');

  const openPlaylist = (id) => {
    const list = PLAYLISTS.find((p) => p.id === id) || PLAYLISTS[0];
    play({ type: 'playlist', id: list.id }, list.name);
    linkInput.value = '';
  };

  const openLink = () => {
    const target = parseSpotify(linkInput.value);
    if (!target) {
      say('That is not a Spotify link — paste a song, album, playlist or artist link.');
      linkInput.focus();
      return;
    }
    const list = PLAYLISTS.find((p) => p.id === target.id);
    play(target, list ? list.name : '');
  };

  listsEl.addEventListener('click', (event) => {
    const item = event.target.closest('[data-id]');
    if (item) openPlaylist(item.dataset.id);
  });

  body.querySelector('[data-go]').addEventListener('click', openLink);
  linkInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openLink();
    }
  });

  homeBtn.addEventListener('click', () => {
    homeBtn.classList.add('is-active');
    linkBtn.classList.remove('is-active');
    openPlaylist(PLAYLISTS[0].id);
  });

  linkBtn.addEventListener('click', () => {
    linkBtn.classList.add('is-active');
    homeBtn.classList.remove('is-active');
    linkInput.focus();
  });

  openPlaylist(PLAYLISTS[0].id);
}

export const music = {
  name: 'Spotify',
  title: 'Spotify',
  tile: 'tile-music',
  desc: 'Every song on Spotify — real playlists and any link you paste.',
  render: renderMusic,
};
