/* GitHub app — opens a GitHub Pages (github.io) link in its own window.
   Pages served by GitHub Pages allow framing, so the page loads for real. */

const KEY = 'angel.github.page';
const REFRESH_MS = 30000;

export const toGithubUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url;
  try { url = new URL(withScheme); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!/\.github\.io$/i.test(url.hostname)) return null;
  return url.href;
};

function renderGithub(body) {
  body.innerHTML = `
    <div class="proxy">
      <div class="proxy-view is-frame">
        <form class="gh-bar">
          <span class="gh-dot" aria-hidden="true"></span>
          <input class="gh-input" type="text" aria-label="GitHub Pages link"
            placeholder="Paste your github.io link — e.g. yourname.github.io" autocomplete="off" spellcheck="false">
          <button class="gh-go" type="submit">Open</button>
        </form>
        <div class="gh-body">
          <iframe class="proxy-frame gh-frame" title="GitHub Pages" referrerpolicy="no-referrer" hidden></iframe>
          <p class="gh-note">Paste the github.io link you want this window to open — it is remembered here.</p>
        </div>
      </div>
    </div>`;

  const form = body.querySelector('.gh-bar');
  const input = body.querySelector('.gh-input');
  const frame = body.querySelector('.gh-frame');
  const note = body.querySelector('.gh-note');

  let current = null;

  const fresh = (url) => {
    const next = new URL(url);
    next.searchParams.set('_fresh', String(Date.now()));
    return next.href;
  };

  const show = (url) => {
    current = url;
    frame.src = fresh(url);
    frame.hidden = false;
    note.hidden = true;
    input.placeholder = url.replace(/^https?:\/\//, '');
  };

  const saved = toGithubUrl(localStorage.getItem(KEY));
  if (saved) show(saved);

  /* Pick up new deploys without anyone reloading: refresh the page on its own. */
  const timer = setInterval(() => {
    if (!body.isConnected) return clearInterval(timer);
    if (!current || frame.hidden || document.hidden) return;
    frame.src = fresh(current);
  }, REFRESH_MS);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const url = toGithubUrl(input.value);
    if (!url) {
      input.classList.add('is-bad');
      input.value = '';
      input.placeholder = 'That is not a github.io link — try yourname.github.io';
      return;
    }
    input.classList.remove('is-bad');
    input.value = '';
    localStorage.setItem(KEY, url);
    show(url);
  });

  input.addEventListener('input', () => {
    if (!input.classList.contains('is-bad')) return;
    input.classList.remove('is-bad');
    input.placeholder = 'Paste your github.io link — e.g. yourname.github.io';
  });
}

export const github = {
  name: 'GitHub',
  title: 'GitHub',
  tile: 'tile-github',
  desc: 'Your GitHub Pages site in its own window.',
  render: renderGithub,
};
