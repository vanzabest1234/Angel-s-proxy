import { apps } from './apps.js';

const windowsEl = document.getElementById('windows');
const startMenu = document.getElementById('start-menu');
const startBtn = document.getElementById('start-btn');
const searchBtn = document.getElementById('search-btn');
const searchInput = document.getElementById('start-search-input');
const pinned = document.getElementById('pinned');
const powerBtn = document.querySelector('[data-power]');

const open = new Map();
let z = 20;
let opened = 0;

/* ---------- start menu ---------- */
function closeStart() {
  startMenu.hidden = true;
  startBtn.setAttribute('aria-expanded', 'false');
}

function openStart() {
  startMenu.hidden = false;
  startBtn.setAttribute('aria-expanded', 'true');
}

startBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  if (startMenu.hidden) openStart(); else closeStart();
});

searchBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  openStart();
  searchInput.focus();
});

startMenu.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('click', closeStart);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeStart();
});

searchInput.addEventListener('input', () => {
  const term = searchInput.value.trim().toLowerCase();
  pinned.querySelectorAll('.pin').forEach((pin) => {
    pin.hidden = Boolean(term) && !pin.textContent.toLowerCase().includes(term);
  });
});

powerBtn.addEventListener('click', () => {
  closeStart();
  const body = document.createElement('div');
  body.className = 'doc';
  body.innerHTML = "<h1>Shutting down</h1><p>Angel's Windows is closing your apps. Refresh the page to boot it again.</p>";
  createWindow({ id: 'power', title: "Angel's Windows", body });
});

/* ---------- windows ---------- */
function focusWindow(id) {
  const entry = open.get(id);
  if (!entry) return;
  entry.el.style.zIndex = String(++z);
  document.querySelectorAll('.window.is-active').forEach((w) => w.classList.remove('is-active'));
  entry.el.classList.add('is-active');
}

function createWindow({ id, title, body }) {
  const el = document.createElement('section');
  el.className = 'window';
  el.dataset.app = id;
  el.setAttribute('aria-label', title);
  el.style.setProperty('--dx', `${(opened % 4) * 14}px`);
  el.style.setProperty('--dy', `${(opened % 4) * 12}px`);
  el.innerHTML = `
    <header class="titlebar">
      <span class="win-title"></span>
      <div class="win-controls">
        <button class="wc wc-min" data-action="minimize" aria-label="Minimize"></button>
        <button class="wc wc-max" data-action="maximize" aria-label="Maximize"></button>
        <button class="wc wc-close" data-action="close" aria-label="Close"></button>
      </div>
    </header>
    <div class="win-body"></div>`;
  el.querySelector('.win-title').textContent = title;
  el.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'close' || action === 'minimize') el.classList.add('is-hidden');
      if (action === 'maximize') el.classList.toggle('is-max');
    });
  });
  el.addEventListener('mousedown', () => focusWindow(id));
  windowsEl.append(el);
  if (body) el.querySelector('.win-body').append(body);
  opened += 1;
  return { el, body: el.querySelector('.win-body') };
}

export function openApp(id) {
  const def = apps[id];
  if (!def) return;

  let entry = open.get(id);
  if (!entry) {
    const win = createWindow({ id, title: def.title, body: null });
    entry = { el: win.el, body: win.body };
    open.set(id, entry);
    def.render(win.body, { openApp });
  } else {
    entry.el.classList.remove('is-hidden');
  }

  focusWindow(id);
  closeStart();
}

document.querySelectorAll('[data-app]').forEach((el) => {
  el.addEventListener('click', () => openApp(el.dataset.app));
});

/* ---------- clock ---------- */
const timeEl = document.getElementById('clock-time');
const dateEl = document.getElementById('clock-date');

function tick() {
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  dateEl.textContent = now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
}

/* ---------- restore saved look ---------- */
const savedAccent = localStorage.getItem('angel.accent');
if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);
const savedWallpaper = localStorage.getItem('angel.wallpaper');
if (savedWallpaper) document.documentElement.dataset.wallpaper = savedWallpaper;

tick();
setInterval(tick, 1000);
openApp('browser');
