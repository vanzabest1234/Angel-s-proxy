/* Games made by me — the shelf of my own games.
   Add a game here and it shows up as a card: { id, name, desc, page, tags, cover } */
const GAMES = [
  {
    id: 'retrobowl',
    name: 'Retro Bowl',
    desc: 'Pixel football — call plays, read the defense and score before the clock runs out.',
    page: './retrobowl.html',
    tags: ['Sports', 'Pixel'],
    cover: 'rb',
  },
  {
    id: 'redline',
    name: 'Redline Rush',
    desc: 'Neon highway sprint — dodge traffic, grab coins and burn nitro for big points.',
    page: './redline.html',
    tags: ['Racing', 'Arcade'],
    cover: 'rush',
  },
];

const statsKey = (id) => `angel.games.${id}`;

function readStats(id) {
  try {
    return JSON.parse(localStorage.getItem(statsKey(id)) || '{}');
  } catch {
    return {};
  }
}

function writeStats(id, patch) {
  try {
    localStorage.setItem(statsKey(id), JSON.stringify({ ...readStats(id), ...patch }));
  } catch { /* storage blocked */ }
}

function bestLabel(id) {
  const best = Number(readStats(id).best) || 0;
  return best > 0 ? `Best ${best}` : 'No games played yet';
}

function renderMyGames(body) {
  body.innerHTML = `
    <div class="mygames">
      <header class="mg-hero">
        <div>
          <p class="mg-kicker">My shelf</p>
          <h1>Games made by me</h1>
          <p class="mg-sub">Everything here I built myself. Pick a game, set a score and come back to beat it.</p>
        </div>
        <div class="mg-count"><b>${GAMES.length}</b><span>${GAMES.length === 1 ? 'game' : 'games'}</span></div>
      </header>
      ${GAMES.length
        ? `<div class="mg-grid">${GAMES.map((game) => `
            <button class="mg-card" type="button" data-game="${game.id}">
              <span class="mg-cover mg-cover-${game.cover}" aria-hidden="true"><span class="mg-mark mg-mark-${game.cover}"></span></span>
              <span class="mg-body">
                <span class="mg-head">
                  <span class="mg-title">${game.name}</span>
                  <span class="mg-play">Play</span>
                </span>
                <span class="mg-desc">${game.desc}</span>
                <span class="mg-meta">
                  ${game.tags.map((tag) => `<span class="mg-pill">${tag}</span>`).join('')}
                  <span class="mg-best" data-best="${game.id}">${bestLabel(game.id)}</span>
                </span>
              </span>
            </button>`).join('')}</div>`
        : `<div class="mygames-empty">No games yet — the games I make will show up here as choices.</div>`}
    </div>`;

  body.querySelectorAll('[data-game]').forEach((card) => {
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      const game = GAMES.find((g) => g.id === card.dataset.game);
      if (game) openGame(body, game);
    });
  });
}

function openGame(body, game) {
  writeStats(game.id, { plays: (Number(readStats(game.id).plays) || 0) + 1 });

  body.innerHTML = `
    <div class="mygames-game">
      <div class="mygames-bar">
        <button class="mygames-back" type="button">← All games</button>
        <span class="mg-now">${game.name}</span>
        <span class="mg-live" data-live>${bestLabel(game.id)}</span>
        <button class="mygames-restart" type="button">Restart</button>
      </div>
      <iframe class="mygames-frame" title="${game.name}" src="${game.page}"></iframe>
    </div>`;

  const frame = body.querySelector('.mygames-frame');
  const live = body.querySelector('[data-live]');

  const onScore = (event) => {
    const data = event.data;
    if (!data || data.type !== `${game.id}:final` || event.source !== frame.contentWindow) return;
    const score = Number(data.you) || 0;
    const best = Math.max(Number(readStats(game.id).best) || 0, score);
    writeStats(game.id, { best, last: score });
    if (live) live.textContent = `Best ${best}`;
  };
  window.addEventListener('message', onScore);

  body.querySelector('.mygames-restart').addEventListener('click', (event) => {
    event.stopPropagation();
    frame.contentWindow.location.reload();
  });

  body.querySelector('.mygames-back').addEventListener('click', (event) => {
    event.stopPropagation();
    window.removeEventListener('message', onScore);
    renderMyGames(body);
  });
}

export const mygames = {
  name: 'Games made by me',
  title: 'Games made by me',
  tile: 'tile-mygames',
  desc: 'My own games, all in one place.',
  render: renderMyGames,
};
