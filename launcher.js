import { apps } from './apps.js';

/* The launcher reads the same registry as the desktop, so any app added to
   apps.js shows up here without editing this page. */
const ORDER = ['readme', 'files', 'browser', 'notes', 'store', 'calculator', 'calendar', 'weather', 'terminal', 'ai', 'settings'];

const grid = document.getElementById('l-grid');
const count = document.getElementById('l-count');
const timeEl = document.getElementById('l-time');
const dateEl = document.getElementById('l-date');
const greetEl = document.getElementById('l-greet');

const ids = [...ORDER.filter((id) => apps[id]), ...Object.keys(apps).filter((id) => !ORDER.includes(id))];

grid.innerHTML = ids.map((id) => {
  const app = apps[id];
  return `<a class="l-card" href="./?app=${encodeURIComponent(id)}">
    <span class="tile ${app.tile}" aria-hidden="true"></span>
    <span class="l-copy">
      <span class="l-card-name">${app.name}</span>
      <span class="l-card-desc">${app.desc}</span>
    </span>
  </a>`;
}).join('');

count.textContent = `${ids.length} apps`;

const greeting = (hour) => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

function tick() {
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  greetEl.textContent = greeting(now.getHours());
}

tick();
setInterval(tick, 1000);
