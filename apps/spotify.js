/* Spotify app — plays real Spotify content inside its own window.
   Spotify blocks its full web player from being framed, so this window uses
   the official embed player for whatever link you paste. */

const DEFAULT = { type: 'playlist', id: '37i9dQZF1DXcBWIGoYBM5M' }; // Today's Top Hits
const TYPES = 'track|album|playlist|artist|episode|show';

export const parseSpotify = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const uri = raw.match(new RegExp(`^spotify:(${TYPES}):([A-Za-z0-9]+)`, 'i'));
  if (uri) return { type: uri[1].toLowerCase(), id: uri[2] };

  const link = raw.match(new RegExp(`open\\.spotify\\.com/(?:intl-[a-z-]+/)?(${TYPES})/([A-Za-z0-9]+)`, 'i'));
  if (link) return { type: link[1].toLowerCase(), id: link[2] };

  return null;
};

const embedUrl = (item) => `https://open.spotify.com/embed/${item.type}/${item.id}?utm_source=generator&theme=0`;

function renderSpotify(body) {
  body.innerHTML = `
    <div class="proxy">
      <div class="proxy-view is-frame">
        <form class="sp-bar">
          <span class="sp-dot" aria-hidden="true"></span>
          <input class="sp-input" type="text" aria-label="Spotify link"
            placeholder="Paste a Spotify link — track, album or playlist" autocomplete="off" spellcheck="false">
          <button class="sp-go" type="submit">Play</button>
        </form>
        <iframe class="proxy-frame sp-frame" title="Spotify" allow="encrypted-media; clipboard-write; autoplay"
          referrerpolicy="no-referrer"></iframe>
      </div>
    </div>`;

  const form = body.querySelector('.sp-bar');
  const input = body.querySelector('.sp-input');
  const frame = body.querySelector('.proxy-frame');

  const play = (item) => {
    frame.src = embedUrl(item);
    input.value = '';
    input.placeholder = `Playing ${item.type}`;
  };

  frame.src = embedUrl(DEFAULT);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const item = parseSpotify(input.value);
    if (!item) {
      input.classList.add('is-bad');
      input.value = '';
      input.placeholder = 'That is not a Spotify link — try open.spotify.com/…';
      return;
    }
    input.classList.remove('is-bad');
    play(item);
  });

  input.addEventListener('input', () => {
    if (!input.classList.contains('is-bad')) return;
    input.classList.remove('is-bad');
    input.placeholder = 'Paste a Spotify link — track, album or playlist';
  });
}

export const spotify = {
  name: 'Spotify',
  title: 'Spotify',
  tile: 'tile-spotify',
  desc: 'Music for everything you do.',
  render: renderSpotify,
};
