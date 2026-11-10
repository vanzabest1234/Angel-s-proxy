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
  syncTaskbar();
}

/* Running-app dots on the taskbar */
function syncTaskbar() {
  document.querySelectorAll('.tb-btn.tb-app').forEach((btn) => {
    const entry = open.get(btn.dataset.app);
    const visible = entry && !entry.el.classList.contains('is-min');
    const active = visible && entry.el.classList.contains('is-active');
    if (visible) btn.dataset.running = 'true'; else delete btn.dataset.running;
    if (active) btn.dataset.active = 'true'; else delete btn.dataset.active;
  });
}

function minimizeWindow(entry) {
  entry.el.classList.remove('is-active');
  entry.el.classList.add('is-min');
  syncTaskbar();
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
      if (action === 'close' || action === 'minimize') {
        const entry = open.get(id);
        if (entry) minimizeWindow(entry); else el.classList.add('is-min');
        syncTaskbar();
      }
      if (action === 'maximize') { el.classList.toggle('is-max'); focusWindow(id); }
    });
  });
  el.querySelector('.titlebar').addEventListener('dblclick', (event) => {
    if (event.target.closest('.win-controls')) return;
    el.classList.toggle('is-max');
    focusWindow(id);
  });
  el.addEventListener('mousedown', () => focusWindow(id));
  windowsEl.append(el);
  el.classList.add('is-opening');
  el.addEventListener('animationend', () => el.classList.remove('is-opening'), { once: true });
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
    if (def.maximized) win.el.classList.add('is-max');
    entry = { el: win.el, body: win.body };
    open.set(id, entry);
    def.render(win.body, { openApp, appsList: apps });
  } else {
    entry.el.classList.remove('is-min', 'is-hidden');
  }

  focusWindow(id);
  closeStart();
}

function toggleApp(id) {
  const entry = open.get(id);
  if (!entry) return openApp(id);
  if (entry.el.classList.contains('is-min')) return openApp(id);
  if (entry.el.classList.contains('is-active')) return minimizeWindow(entry);
  focusWindow(id);
}

document.querySelectorAll('[data-app]').forEach((el) => {
  el.addEventListener('click', () => {
    if (el.classList.contains('tb-app')) toggleApp(el.dataset.app);
    else openApp(el.dataset.app);
  });
});

/* ---------- desktop background ---------- */
const desktopEl = document.querySelector('.desktop');

function sendToBackground() {
  open.forEach(({ el }) => {
    el.classList.remove('is-active');
    el.classList.add('is-min');
  });
  syncTaskbar();
}

desktopEl.addEventListener('click', (event) => {
  // Use the dispatch path too: an app may re-render the clicked control, detaching
  // it from the document before the click reaches the desktop.
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  const inShell = path.some((node) => node instanceof Element &&
    (node.classList.contains('window') ||
     node.classList.contains('taskbar') ||
     node.classList.contains('start-menu') ||
     node.classList.contains('desktop-icons')));
  if (inShell || event.target.closest('.window, .taskbar, .start-menu, .desktop-icons')) return;
  sendToBackground();
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
const bootApp = new URLSearchParams(window.location.search).get('app');
openApp(bootApp && apps[bootApp] ? bootApp : 'browser');
