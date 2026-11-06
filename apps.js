import { calculator } from './apps/calculator.js';
import { calendar } from './apps/calendar.js';
import { weather } from './apps/weather.js';
import { terminal } from './apps/terminal.js';
import { ai } from './apps/ai.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

/* ---------- README ---------- */
function markdown(md) {
  const out = [];
  let list = [];
  const flush = () => {
    if (list.length) {
      out.push('<ul>' + list.map((li) => `<li>${li}</li>`).join('') + '</ul>');
      list = [];
    }
  };

  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      const level = Math.min(heading[1].length, 3);
      out.push(`<h${level}>${esc(heading[2])}</h${level}>`);
      continue;
    }

    const item = line.match(/^[-*+]\s+(.*)$/);
    if (item) { list.push(esc(item[1])); continue; }

    flush();
    out.push(`<p>${esc(line)}</p>`);
  }

  flush();
  return out.join('') || '<p>This file is empty — add some words to README.md.</p>';
}

async function renderReadme(body) {
  body.innerHTML = '<div class="doc"><p class="app-loading">Loading README…</p></div>';
  try {
    const res = await fetch('./README.md', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    body.innerHTML = `<div class="doc">${markdown(await res.text())}</div>`;
  } catch {
    body.innerHTML = '<div class="doc"><p>Could not load README.md.</p></div>';
  }
}

/* ---------- Proxy finds ---------- */
function renderProxyFinds(body) {
  body.innerHTML = '<div class="proxy-finds"></div>';
}

/* ---------- Settings ---------- */
const ACCENTS = [
  ['#4cc2ff', 'Sky'],
  ['#7c9cff', 'Blue'],
  ['#b47bff', 'Lilac'],
  ['#ff7a3d', 'Ember'],
  ['#37d3a4', 'Mint'],
  ['#ff5f9e', 'Rose'],
];

const WALLPAPERS = [
  ['bloom', 'Bloom'],
  ['sunset', 'Sunset'],
  ['mint', 'Mint'],
];

const WALLPAPER_MAX = 1920;

function readCustomWallpaper(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image'));
      img.onload = () => {
        const scale = Math.min(1, WALLPAPER_MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function applyCustomWallpaper(dataUrl) {
  localStorage.setItem('angel.wallpaper.custom', dataUrl);
  localStorage.setItem('angel.wallpaper', 'custom');
  document.documentElement.style.setProperty('--wallpaper-image', `url("${dataUrl}")`);
  document.documentElement.dataset.wallpaper = 'custom';
}

function renderSettings(body) {
  const currentAccent = localStorage.getItem('angel.accent') || ACCENTS[0][0];
  const currentWallpaper = localStorage.getItem('angel.wallpaper') || 'bloom';
  const customWallpaper = localStorage.getItem('angel.wallpaper.custom') || '';

  body.innerHTML = `
    <div class="settings">
      <h1>Personalization</h1>
      <p class="muted">Your changes are saved in this browser.</p>

      <h2>Accent colour</h2>
      <div class="swatches">
        ${ACCENTS.map(([color, name]) => `<button class="swatch${color === currentAccent ? ' is-on' : ''}" data-accent="${color}" title="${name}" aria-label="${name}">
          <span style="background:${color}"></span><em>${name}</em>
        </button>`).join('')}
      </div>

      <h2>Wallpaper</h2>
      <div class="wallpapers">
        ${WALLPAPERS.map(([id, name]) => `<button class="wp${id === currentWallpaper ? ' is-on' : ''}" data-wallpaper="${id}"><span class="wp-swatch wp-${id}"></span><em>${name}</em></button>`).join('')}
        <button class="wp${currentWallpaper === 'custom' ? ' is-on' : ''}" data-wallpaper="custom"><span class="wp-swatch wp-custom"></span><em>Custom</em></button>
      </div>
      <div class="wallpaper-tools">
        <button type="button" class="wall-pick">Choose image…</button>
        <button type="button" class="wall-clear"${customWallpaper ? '' : ' hidden'}>Remove</button>
        <span class="wall-status" data-wall-status>PNG, JPG or WebP — saved in this browser.</span>
      </div>
      <input type="file" id="wall-file" accept="image/*" hidden>

      <h2>About</h2>
      <dl class="about">
        <div><dt>Edition</dt><dd>Angel's Windows 11</dd></div>
        <div><dt>Build</dt><dd>Preview 24H2</dd></div>
        <div><dt>Owner</dt><dd>Angel</dd></div>
      </dl>
    </div>`;

  const mark = (selector, active) => body.querySelectorAll(selector).forEach((el) => el.classList.toggle('is-on', el === active));

  body.querySelectorAll('[data-accent]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.documentElement.style.setProperty('--accent', btn.dataset.accent);
      localStorage.setItem('angel.accent', btn.dataset.accent);
      mark('[data-accent]', btn);
    });
  });

  const fileInput = body.querySelector('#wall-file');
  const customTile = body.querySelector('[data-wallpaper="custom"]');
  const customSwatch = body.querySelector('.wp-custom');
  const clearBtn = body.querySelector('.wall-clear');
  const status = body.querySelector('[data-wall-status]');
  const idleStatus = 'PNG, JPG or WebP — saved in this browser.';

  if (customWallpaper) customSwatch.style.backgroundImage = `url("${customWallpaper}")`;

  body.querySelectorAll('[data-wallpaper]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.wallpaper;
      if (id === 'custom') {
        if (!localStorage.getItem('angel.wallpaper.custom')) { fileInput.click(); return; }
        applyCustomWallpaper(localStorage.getItem('angel.wallpaper.custom'));
        mark('[data-wallpaper]', btn);
        return;
      }
      document.documentElement.dataset.wallpaper = id;
      localStorage.setItem('angel.wallpaper', id);
      mark('[data-wallpaper]', btn);
    });
  });

  body.querySelector('.wall-pick').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    status.textContent = 'Applying…';
    try {
      const dataUrl = await readCustomWallpaper(file);
      applyCustomWallpaper(dataUrl);
      customSwatch.style.backgroundImage = `url("${dataUrl}")`;
      clearBtn.hidden = false;
      mark('[data-wallpaper]', customTile);
      status.textContent = 'Saved in this browser.';
    } catch {
      status.textContent = 'That image could not be used — try a smaller PNG, JPG or WebP.';
    }
    fileInput.value = '';
  });

  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('angel.wallpaper.custom');
    localStorage.setItem('angel.wallpaper', 'bloom');
    document.documentElement.style.removeProperty('--wallpaper-image');
    document.documentElement.dataset.wallpaper = 'bloom';
    customSwatch.style.backgroundImage = '';
    clearBtn.hidden = true;
    status.textContent = idleStatus;
    mark('[data-wallpaper]', body.querySelector('[data-wallpaper="bloom"]'));
  });
}

/* ---------- Notes ---------- */
function renderNotes(body) {
  body.innerHTML = `
    <div class="notes">
      <textarea class="notes-area" aria-label="Notes" placeholder="Write something… it stays in this browser."></textarea>
      <div class="notes-foot"><span class="muted" data-status>Saved automatically</span><span class="muted" data-count></span></div>
    </div>`;

  const area = body.querySelector('.notes-area');
  const status = body.querySelector('[data-status]');
  const count = body.querySelector('[data-count]');
  area.value = localStorage.getItem('angel.notes') || '';

  const updateCount = () => {
    const words = area.value.trim() ? area.value.trim().split(/\s+/).length : 0;
    count.textContent = `${words} word${words === 1 ? '' : 's'}`;
  };

  let timer;
  area.addEventListener('input', () => {
    localStorage.setItem('angel.notes', area.value);
    updateCount();
    status.textContent = 'Saving…';
    clearTimeout(timer);
    timer = setTimeout(() => { status.textContent = 'Saved automatically'; }, 600);
  });

  updateCount();
}

/* ---------- Store ---------- */
function renderStore(body, ctx) {
  body.innerHTML = `
    <div class="store">
      <h1>Store</h1>
      <p class="muted">Everything here is already installed — open it and try it.</p>
      <div class="store-grid">
        ${Object.entries(apps)
          .filter(([id]) => id !== 'store')
          .map(([id, app]) => `<article class="store-card">
            <span class="tile ${app.tile}" aria-hidden="true"></span>
            <h2>${esc(app.name)}</h2>
            <p>${esc(app.desc)}</p>
            <button class="store-open" data-open-app="${id}">Open</button>
          </article>`)
          .join('')}
      </div>
    </div>`;

  body.querySelectorAll('[data-open-app]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.openApp(btn.dataset.openApp));
  });
}

/* ---------- Games ---------- */
const GAMES_URL = 'https://cdn.jsdelivr.net/gh/VoidNetworkOnTop/pecho@main/loader.svg';

function renderGames(body) {
  body.innerHTML = `
    <div class="embed">
      <p class="embed-note">None of these games are made by me — all credit goes to the original owner.</p>
      <iframe class="embed-frame" src="${GAMES_URL}" title="Games" allow="fullscreen; autoplay" referrerpolicy="no-referrer"></iframe>
    </div>`;
}

/* ---------- Movies ---------- */
const MOVIES_URL = 'https://thd.sagarshrestha1999.com.np/movies';

function renderMovies(body) {
  body.innerHTML = `
    <div class="embed">
      <p class="embed-note">None of this is made by me — all credit goes to whoever owns this site.</p>
      <iframe class="embed-frame" src="${MOVIES_URL}" title="Movies" allow="fullscreen; autoplay" referrerpolicy="no-referrer"></iframe>
    </div>`;
}

/* ---------- registry ---------- */
export const apps = {
  readme: {
    name: 'README',
    title: "Angel's Windows — README",
    tile: 'tile-readme',
    desc: 'The repository README, rendered as a document.',
    render: renderReadme,
  },
  games: {
    name: 'Games',
    title: 'Games',
    tile: 'tile-games',
    desc: 'A pile of browser games, hosted by their original owner.',
    render: renderGames,
  },
  movies: {
    name: 'Movies',
    title: 'Movies',
    tile: 'tile-movies',
    desc: 'Movies hosted by someone else — all credit to them.',
    render: renderMovies,
  },
  browser: {
    name: 'Proxy finds',
    title: 'Proxy finds',
    tile: 'tile-proxy',
    desc: 'A blank window, ready for proxy links.',
    render: renderProxyFinds,
  },
  notes: {
    name: 'Notes',
    title: 'Notes',
    tile: 'tile-notes',
    desc: 'A scratchpad that saves as you type.',
    render: renderNotes,
  },
  settings: {
    name: 'Settings',
    title: 'Settings — Personalization',
    tile: 'tile-settings',
    desc: 'Change the accent colour and the wallpaper.',
    render: renderSettings,
  },
  calculator,
  calendar,
  weather,
  terminal,
  ai,
  store: {
    name: 'Store',
    title: 'Store',
    tile: 'tile-store',
    desc: 'Every app on this PC, ready to open.',
    render: renderStore,
  },
};
