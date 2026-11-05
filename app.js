const win = document.getElementById('readme-window');
const body = document.getElementById('readme-body');
const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');
const powerBtn = document.querySelector('[data-power]');

/* ---------- README ---------- */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

async function loadReadme() {
  try {
    const res = await fetch('/README.md', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    body.innerHTML = markdown(await res.text());
  } catch {
    body.innerHTML = '<p>Could not load README.md.</p>';
  }
}

/* ---------- window controls ---------- */
function openWindow() {
  win.classList.remove('is-hidden');
  win.classList.remove('is-max');
  startMenu.hidden = true;
  startBtn.setAttribute('aria-expanded', 'false');
}

function closeStart() {
  startMenu.hidden = true;
  startBtn.setAttribute('aria-expanded', 'false');
}

startBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  const open = startMenu.hidden;
  startMenu.hidden = !open;
  startBtn.setAttribute('aria-expanded', String(open));
});

startMenu.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('click', closeStart);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeStart();
});

document.querySelectorAll('[data-open]').forEach((el) => {
  el.addEventListener('click', openWindow);
});

win.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'close') win.classList.add('is-hidden');
    if (action === 'minimize') win.classList.add('is-hidden');
    if (action === 'maximize') win.classList.toggle('is-max');
  });
});

powerBtn.addEventListener('click', () => {
  body.innerHTML = '<h1>Power</h1><p>Angel\'s Windows is shutting down. Refresh the page to boot it again.</p>';
  win.classList.remove('is-hidden');
  closeStart();
});

/* ---------- clock ---------- */
const timeEl = document.getElementById('clock-time');
const dateEl = document.getElementById('clock-date');

function tick() {
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  dateEl.textContent = now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
}

tick();
setInterval(tick, 1000);
loadReadme();
