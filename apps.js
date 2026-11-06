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

/* ---------- Edge ---------- */
const isUrl = (value) => !/\s/.test(value) && /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}([/?#].*)?$/i.test(value);
const withScheme = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

const flattenTopics = (topics) => topics.flatMap((topic) =>
  topic.Topics ? flattenTopics(topic.Topics) : (topic.FirstURL && topic.Text ? [topic] : []));

function renderBrowser(body) {
  body.innerHTML = `
    <div class="browser">
      <div class="browser-bar">
        <button class="nav" data-nav="back" aria-label="Back">&#8249;</button>
        <button class="nav" data-nav="forward" aria-label="Forward">&#8250;</button>
        <button class="nav" data-nav="reload" aria-label="Reload">&#8635;</button>
        <form class="address" role="search">
          <input class="url" aria-label="Search or enter an address" placeholder="Search DuckDuckGo or enter an address" autocomplete="off" spellcheck="false">
        </form>
        <span class="browser-wip">Work in progress</span>
      </div>
      <div class="browser-page" data-page></div>
    </div>`;

  const page = body.querySelector('[data-page]');
  const input = body.querySelector('.url');
  let history = [{ type: 'home' }];
  let index = 0;
  let current = null;
  let visitToken = 0;

  const home = () => {
    current = null;
    input.value = '';
    page.innerHTML = `
      <div class="ddg-home">
        <div class="ddg-word">DuckDuckGo</div>
        <p class="ddg-tag">Search privately, right from Angel's Windows.</p>
        <form class="ddg-form">
          <input class="ddg-input" aria-label="Search DuckDuckGo" placeholder="Search DuckDuckGo">
          <button class="ddg-go" type="submit">Search</button>
        </form>
        <div class="ddg-chips">
          ${['Windows 11', 'DuckDuckGo privacy', 'web browsers'].map((q) => `<button class="chip" data-q="${attr(q)}">${esc(q)}</button>`).join('')}
        </div>
      </div>`;

    page.querySelector('.ddg-form').addEventListener('submit', (event) => {
      event.preventDefault();
      go(page.querySelector('.ddg-input').value);
    });
    page.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => go(chip.dataset.q));
    });
  };

  const search = async (query) => {
    current = null;
    input.value = query;
    page.innerHTML = `<div class="ddg-results"><p class="app-loading">Searching DuckDuckGo for “${esc(query)}”…</p></div>`;
    try {
      const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
      const data = await res.json();
      const topics = flattenTopics(data.RelatedTopics || []).slice(0, 8);
      const allResults = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

      const answer = data.AbstractText
        ? `<article class="ddg-card">
             <h2>${esc(data.Heading || query)}</h2>
             <p>${esc(data.AbstractText)}</p>
             ${data.AbstractURL ? `<a href="${attr(data.AbstractURL)}" target="_blank" rel="noopener noreferrer">${esc(data.AbstractSource || 'Read more')} &#8599;</a>` : ''}
           </article>`
        : '';

      const related = topics
        .map((topic) => `<button class="ddg-result" data-title="${attr(topic.Text.split(' - ')[0])}">
            <strong>${esc(topic.Text.split(' - ')[0])}</strong>
            <span>${esc(topic.Text.split(' - ').slice(1).join(' - ').slice(0, 110))}</span>
          </button>`)
        .join('');

      page.innerHTML = `<div class="ddg-results">
        <div class="ddg-results-head">
          <h2>${esc(query)}</h2>
          <a class="ddg-all" href="${attr(allResults)}" target="_blank" rel="noopener noreferrer">All results on DuckDuckGo &#8599;</a>
        </div>
        ${answer}
        ${related ? `<h3 class="ddg-sub">Related</h3><div class="ddg-list">${related}</div>` : ''}
        ${!answer && !related ? '<p class="muted">No instant answer for that one — open the full results on DuckDuckGo.</p>' : ''}
      </div>`;

      page.querySelectorAll('.ddg-result[data-title]').forEach((btn) => {
        btn.addEventListener('click', () => push({ type: 'search', query: btn.dataset.title }));
      });
    } catch {
      page.innerHTML = `<div class="ddg-results">
        <p>DuckDuckGo didn't answer inside the app.</p>
        <a class="ddg-all" href="https://duckduckgo.com/?q=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer">Open the search on DuckDuckGo &#8599;</a>
      </div>`;
    }
  };

  const readerView = (data) => {
    const wrap = document.createElement('div');
    wrap.className = 'reader';

    const head = document.createElement('header');
    head.className = 'reader-head';
    const title = document.createElement('h1');
    title.textContent = data.title || data.url;
    const meta = document.createElement('p');
    meta.className = 'reader-meta';
    meta.textContent = data.site ? `${data.site} · ` : '';
    const real = document.createElement('a');
    real.href = data.url;
    real.target = '_blank';
    real.rel = 'noopener noreferrer';
    real.textContent = 'Open the real page ↗';
    meta.append(real);
    head.append(title, meta);
    wrap.append(head);

    const article = document.createElement('article');
    article.className = 'reader-body';
    let list = null;

    for (const block of data.blocks || []) {
      if (block.t === 'li') {
        if (!list) { list = document.createElement('ul'); article.append(list); }
        const item = document.createElement('li');
        item.textContent = block.text;
        list.append(item);
        continue;
      }
      list = null;

      if (block.t === 'img') {
        const figure = document.createElement('figure');
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = block.alt || '';
        img.src = `/img?url=${encodeURIComponent(block.src)}&ref=${encodeURIComponent(data.url)}`;
        img.addEventListener('error', () => figure.remove());
        figure.append(img);
        if (block.alt) {
          const caption = document.createElement('figcaption');
          caption.textContent = block.alt;
          figure.append(caption);
        }
        article.append(figure);
        continue;
      }

      const tag = block.t === 'h' ? (block.level >= 3 ? 'h3' : 'h2')
        : block.t === 'q' ? 'blockquote'
          : block.t === 'pre' ? 'pre' : 'p';
      const node = document.createElement(tag);
      node.textContent = block.text;
      article.append(node);
    }

    if (!article.childElementCount) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = data.note || 'This page has no readable text — open the real page to see it.';
      article.append(empty);
    }

    wrap.append(article);
    return wrap;
  };

  const visit = async (url) => {
    current = url;
    input.value = url;
    const token = ++visitToken;
    page.innerHTML = `<div class="reader"><p class="app-loading">Opening ${esc(url.replace(/^https?:\/\//, ''))}…</p></div>`;

    let data;
    try {
      const res = await fetch(`/read?url=${encodeURIComponent(url)}`, { cache: 'no-store' });
      data = await res.json();
    } catch {
      data = { url, site: '', title: url.replace(/^https?:\/\//, ''), blocks: [], note: "Angel's proxy could not reach that address." };
    }

    if (token !== visitToken) return;
    page.innerHTML = '';
    page.append(readerView(data));
  };

  const show = (entry) => {
    if (entry.type === 'search') search(entry.query);
    else if (entry.type === 'url') visit(entry.url);
    else home();
  };

  const push = (entry) => {
    history = history.slice(0, index + 1);
    history.push(entry);
    index = history.length - 1;
    show(entry);
  };

  const go = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return;
    if (isUrl(value)) push({ type: 'url', url: withScheme(value) });
    else push({ type: 'search', query: value });
  };

  body.querySelector('.address').addEventListener('submit', (event) => {
    event.preventDefault();
    go(input.value);
  });

  body.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.nav;
      if (action === 'back' && index > 0) { index -= 1; show(history[index]); }
      if (action === 'forward' && index < history.length - 1) { index += 1; show(history[index]); }
      if (action === 'reload') show(history[index]);
    });
  });

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

/* ---------- registry ---------- */
export const apps = {
  readme: {
    name: 'README',
    title: "Angel's Windows — README",
    tile: 'tile-readme',
    desc: 'The repository README, rendered as a document.',
    render: renderReadme,
  },
  browser: {
    name: 'Edge',
    title: 'Edge — DuckDuckGo',
    tile: 'tile-edge',
    desc: 'Search DuckDuckGo privately or open an address.',
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
