import { calculator } from './apps/calculator.js';
import { calendar } from './apps/calendar.js';
import { weather } from './apps/weather.js';
import { terminal } from './apps/terminal.js';
import { ai } from './apps/ai.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

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

/* ---------- This PC ---------- */
async function renderFiles(body) {
  body.innerHTML = `
    <div class="explorer">
      <div class="explorer-head"><strong>Angel-s-proxy</strong><span>This PC › Repository</span></div>
      <div class="explorer-list" data-list><p class="app-loading">Reading folder…</p></div>
      <div class="explorer-preview" data-preview><p class="muted">Select a file to preview it.</p></div>
    </div>`;

  const list = body.querySelector('[data-list]');
  const preview = body.querySelector('[data-preview]');

  try {
    const res = await fetch('/api/files', { cache: 'no-store' });
    const items = await res.json();
    list.innerHTML = items
      .map((file) => `<button class="file" data-path="${attr(file.path)}">
        <span class="file-icon ${file.dir ? 'is-dir' : 'is-doc'}" aria-hidden="true"></span>
        <span class="file-name">${esc(file.path)}</span>
        <span class="file-size">${file.dir ? '' : formatSize(file.size)}</span>
      </button>`)
      .join('');

    list.querySelectorAll('.file').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const path = btn.dataset.path;
        list.querySelectorAll('.file.is-selected').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        preview.innerHTML = '<p class="app-loading">Opening…</p>';
        const file = await fetch(`/api/file?path=${encodeURIComponent(path)}`).then((r) => r.json());
        preview.innerHTML = `<div class="preview-head">${esc(path)}</div>` +
          (file.binary ? '<p class="muted">No preview for this file type.</p>' : `<pre class="preview-text">${esc(file.content)}</pre>`);
      });
    });
  } catch {
    list.innerHTML = '<p class="app-loading">Could not read the folder.</p>';
  }
}

/* ---------- Angel's Proxy browser ---------- */
const isAddress = (value) => /^https?:\/\//i.test(value) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value);
const withScheme = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);
const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

function proxyBlock(block) {
  if (block.t === 'h') return `<h3 class="proxy-h">${esc(block.text)}</h3>`;
  if (block.t === 'li') return `<p class="proxy-li">${esc(block.text)}</p>`;
  if (block.t === 'pre') return `<pre class="proxy-pre">${esc(block.text)}</pre>`;
  if (block.t === 'q') return `<blockquote class="proxy-q">${esc(block.text)}</blockquote>`;
  return `<p>${esc(block.text)}</p>`;
}

function renderBrowser(body) {
  body.innerHTML = '<div class="proxy"><div class="proxy-view"></div></div>';
  const view = body.querySelector('.proxy-view');

  const home = (value = '') => {
    view.className = 'proxy-view';
    view.innerHTML = `
      <div class="proxy-home">
        <div class="proxy-brand">
          <span class="proxy-mark" aria-hidden="true"></span>
          <div>
            <h1 class="proxy-word">Angel's <span>Proxy</span></h1>
            <p class="proxy-sub">Your own black and red browser</p>
          </div>
        </div>
        <form class="proxy-search" role="search">
          <input class="proxy-input" type="text" value="${attr(value)}" placeholder="Search DuckDuckGo or enter a URL"
            aria-label="Search DuckDuckGo or enter a URL" autocomplete="off" spellcheck="false">
          <button class="proxy-go" type="submit" aria-label="Search">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.4" fill="none" stroke="currentColor" stroke-width="1.9"/><line x1="12.8" y1="12.8" x2="17" y2="17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
          </button>
        </form>
        <p class="proxy-note">Searches go to DuckDuckGo</p>
      </div>`;

    const form = view.querySelector('.proxy-search');
    const input = view.querySelector('.proxy-input');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = input.value.trim();
      if (!query) return input.focus();
      return isAddress(query) ? page(withScheme(query)) : results(query);
    });
    input.focus();
    input.select();
  };

  const shell = (label, loading) => {
    view.className = 'proxy-view is-doc';
    view.innerHTML = `
      <div class="proxy-bar">
        <button class="proxy-back" type="button">← Home</button>
        <span class="proxy-crumb">${esc(label)}</span>
      </div>
      <div class="proxy-doc"><p class="proxy-loading">${esc(loading)}</p></div>`;
    view.querySelector('.proxy-back').addEventListener('click', (event) => {
      event.stopPropagation();
      home();
    });
    return view.querySelector('.proxy-doc');
  };

  const results = async (query) => {
    const doc = shell(`DuckDuckGo · ${query}`, 'Searching DuckDuckGo…');
    try {
      const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!data.results || !data.results.length) {
        doc.innerHTML = `<p class="proxy-loading">${esc(data.note || 'No results from DuckDuckGo.')}</p>`;
        return;
      }
      doc.innerHTML = `<ol class="proxy-results">${data.results.map((r) => `
        <li class="proxy-result">
          <button class="proxy-result-title" type="button" data-href="${attr(r.url)}">${esc(r.title)}</button>
          <span class="proxy-result-host">${esc(hostOf(r.url))}</span>
          ${r.snippet ? `<p class="proxy-result-text">${esc(r.snippet)}</p>` : ''}
        </li>`).join('')}</ol>`;
      doc.querySelectorAll('.proxy-result-title').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          page(button.dataset.href);
        });
      });
    } catch {
      doc.innerHTML = '<p class="proxy-loading">DuckDuckGo did not answer just now.</p>';
    }
  };

  const page = async (url) => {
    const doc = shell(hostOf(url), 'Loading…');
    try {
      const res = await fetch(`/read?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      const blocks = data.blocks || [];
      doc.innerHTML = blocks.length
        ? `<h2 class="proxy-title">${esc(data.title || hostOf(url))}</h2>
           <p class="proxy-site">${esc(data.site || hostOf(url))}</p>
           ${blocks.map(proxyBlock).join('')}`
        : `<h2 class="proxy-title">${esc(data.title || hostOf(url))}</h2>
           <p class="proxy-loading">${esc(data.note || 'Nothing readable on that page.')}</p>`;
    } catch {
      doc.innerHTML = '<p class="proxy-loading">That page did not load.</p>';
    }
  };

  home();
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

function renderSettings(body) {
  const currentAccent = localStorage.getItem('angel.accent') || ACCENTS[0][0];
  const currentWallpaper = localStorage.getItem('angel.wallpaper') || 'bloom';

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
      </div>

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

  body.querySelectorAll('[data-wallpaper]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.documentElement.dataset.wallpaper = btn.dataset.wallpaper;
      localStorage.setItem('angel.wallpaper', btn.dataset.wallpaper);
      mark('[data-wallpaper]', btn);
    });
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

/* ---------- registry ---------- */
export const apps = {
  readme: {
    name: 'README',
    title: "Angel's Windows — README",
    tile: 'tile-readme',
    desc: 'The repository README, rendered as a document.',
    render: renderReadme,
  },
  files: {
    name: 'This PC',
    title: 'This PC — Angel-s-proxy',
    tile: 'tile-pc',
    desc: 'Browse the repository files and preview them.',
    render: renderFiles,
  },
  browser: {
    name: "Angel's Proxy",
    title: "Angel's Proxy",
    tile: 'tile-angel',
    desc: 'Black and red browsing, in your own space.',
    render: renderBrowser,
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
