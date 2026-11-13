/* GitHub app — opens GitHub itself, or any GitHub Pages (github.io) site.
   github.com pages refuse to be framed, so those go through the reader frame;
   github.io pages are served directly. Either way the window keeps pulling the
   newest version of the page. */

const KEY = 'angel.github.page';
const HOME = 'https://github.com';
const REFRESH_MS = 30000;

export const toGithubUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url;
  try { url = new URL(withScheme); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase();
  const isGithub = host === 'github.com' || host.endsWith('.github.com') || host.endsWith('.github.io');
  return isGithub ? url.href : null;
};

/* github.io allows framing; github.com does not, so it is read through the proxy. */
const embedUrl = (url) => {
  const host = new URL(url).hostname.toLowerCase();
  return host.endsWith('.github.io') ? url : `/frame?url=${encodeURIComponent(url)}`;
};

function renderGithub(body) {
  body.innerHTML = `
    <div class="proxy">
      <div class="proxy-view is-frame">
        <form class="gh-bar">
          <span class="gh-dot" aria-hidden="true"></span>
          <input class="gh-input" type="text" aria-label="GitHub address"
            placeholder="github.com/… or yourname.github.io" autocomplete="off" spellcheck="false">
          <button class="gh-go" type="submit">Open</button>
        </form>
        <div class="gh-body">
          <iframe class="proxy-frame gh-frame" title="GitHub" referrerpolicy="no-referrer"></iframe>
        </div>
      </div>
    </div>`;

  const form = body.querySelector('.gh-bar');
  const input = body.querySelector('.gh-input');
  const frame = body.querySelector('.gh-frame');

  let current = null;

  const fresh = (url) => {
    const next = new URL(url, location.origin);
    next.searchParams.set('_fresh', String(Date.now()));
    return next.href;
  };

  const show = (url) => {
    current = url;
    frame.src = fresh(embedUrl(url));
    input.placeholder = url.replace(/^https?:\/\//, '');
  };

  /* Pick up new deploys without anyone reloading: refresh the page on its own. */
  const timer = setInterval(() => {
    if (!body.isConnected) return clearInterval(timer);
    if (!current || document.hidden) return;
    frame.src = fresh(embedUrl(current));
  }, REFRESH_MS);

  /* Links and searches inside the proxied page ask to navigate — follow them. */
  const onNavigate = (event) => {
    if (!body.isConnected) { window.removeEventListener('message', onNavigate); return; }
    const data = event.data;
    if (!data || data.source !== 'angels-proxy' || data.type !== 'navigate') return;
    if (frame.contentWindow !== event.source) return;
    const next = toGithubUrl(String(data.url || ''));
    if (!next) return;
    localStorage.setItem(KEY, next);
    show(next);
  };
  window.addEventListener('message', onNavigate);

  show(toGithubUrl(localStorage.getItem(KEY)) || HOME);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const url = toGithubUrl(input.value);
    if (!url) {
      input.classList.add('is-bad');
      input.value = '';
      input.placeholder = 'Only GitHub addresses — github.com/… or yourname.github.io';
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
    input.placeholder = current ? current.replace(/^https?:\/\//, '') : 'github.com/… or yourname.github.io';
  });
}

export const github = {
  name: 'GitHub',
  title: 'GitHub',
  tile: 'tile-github',
  desc: 'GitHub, and any GitHub Pages site, in its own window.',
  render: renderGithub,
};
